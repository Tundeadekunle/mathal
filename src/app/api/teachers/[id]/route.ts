import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Section } from "@prisma/client";

// Helper to verify admin or self-teacher permissions from session cookie
async function verifyTeacherOrAdmin(
  req: NextRequest,
  teacherId: string
): Promise<{ authorized: boolean; isAdmin: boolean; isSelfTeacher: boolean; error?: string; status?: number }> {
  const sessionCookie = req.cookies.get("mathal_session")?.value;

  if (!sessionCookie) {
    return { authorized: false, isAdmin: false, isSelfTeacher: false, error: "Authentication required. Please sign in.", status: 401 };
  }

  try {
    const sessionData = JSON.parse(sessionCookie);
    if (!sessionData?.id) {
      return { authorized: false, isAdmin: false, isSelfTeacher: false, error: "Invalid session.", status: 401 };
    }

    // Verify against Neon DB to guarantee fresh role and ownership
    const user = await prisma.user.findUnique({
      where: { id: sessionData.id },
      include: { teacher: true },
    });

    if (!user) {
      return { authorized: false, isAdmin: false, isSelfTeacher: false, error: "User not found.", status: 401 };
    }

    if (user.role === "ADMIN") {
      return { authorized: true, isAdmin: true, isSelfTeacher: false };
    }

    if (user.role === "TEACHER" && user.teacher && user.teacher.id === teacherId) {
      return { authorized: true, isAdmin: false, isSelfTeacher: true };
    }

    return {
      authorized: false,
      isAdmin: false,
      isSelfTeacher: false,
      error: "Forbidden. You can only manage classes and subjects for your own teacher profile.",
      status: 403,
    };
  } catch {
    return { authorized: false, isAdmin: false, isSelfTeacher: false, error: "Failed to verify privileges.", status: 500 };
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found." }, { status: 404 });
    }

    return NextResponse.json({ teacher }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Enforce admin or self-teacher role
    const authCheck = await verifyTeacherOrAdmin(req, id);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status || 403 }
      );
    }

    const body = await req.json();
    const { assignedClasses, assignedSubjects, assignedSection } = body;

    // Format classes (array or comma-separated string)
    let formattedClasses: string | null = null;
    if (Array.isArray(assignedClasses)) {
      formattedClasses = assignedClasses.map((c: string) => c.trim()).filter(Boolean).join(",");
    } else if (typeof assignedClasses === "string") {
      formattedClasses = assignedClasses.trim();
    }

    // Format subjects (array or comma-separated string)
    let formattedSubjects: string | null = null;
    if (Array.isArray(assignedSubjects)) {
      formattedSubjects = assignedSubjects.map((s: string) => s.trim()).filter(Boolean).join(",");
    } else if (typeof assignedSubjects === "string") {
      formattedSubjects = assignedSubjects.trim();
    }

    const updateData: any = {
      assignedClasses: formattedClasses || null,
      assignedSubjects: formattedSubjects || null,
    };

    if (assignedSection && Object.values(Section).includes(assignedSection as Section)) {
      updateData.assignedSection = assignedSection as Section;
    }

    const updatedTeacher = await prisma.teacher.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        teacher: {
          id: updatedTeacher.id,
          userId: updatedTeacher.userId,
          staffId: updatedTeacher.staffId,
          name: updatedTeacher.user.name,
          email: updatedTeacher.user.email,
          qualification: updatedTeacher.qualification,
          assignedSection: updatedTeacher.assignedSection,
          assignedClasses: updatedTeacher.assignedClasses
            ? updatedTeacher.assignedClasses.split(",").map((c) => c.trim()).filter(Boolean)
            : [],
          assignedClassesRaw: updatedTeacher.assignedClasses || "",
          assignedSubjects: updatedTeacher.assignedSubjects
            ? updatedTeacher.assignedSubjects.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          assignedSubjectsRaw: updatedTeacher.assignedSubjects || "",
        },
        message: `Successfully updated teaching allocation for ${updatedTeacher.user.name}!`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Assign teacher error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update teacher allocation." },
      { status: 500 }
    );
  }
}
