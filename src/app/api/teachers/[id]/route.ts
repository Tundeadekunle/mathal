import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Section } from "@prisma/client";

// Helper to verify admin permissions from session cookie
async function verifyAdmin(req: NextRequest): Promise<{ isAdmin: boolean; error?: string; status?: number }> {
  const sessionCookie = req.cookies.get("mathal_session")?.value;

  if (!sessionCookie) {
    return { isAdmin: false, error: "Authentication required. Please sign in as an administrator.", status: 401 };
  }

  try {
    const sessionData = JSON.parse(sessionCookie);
    if (!sessionData?.id) {
      return { isAdmin: false, error: "Invalid session.", status: 401 };
    }

    // Verify against Neon DB to guarantee fresh role and revoke any forged cookies
    const user = await prisma.user.findUnique({
      where: { id: sessionData.id },
      select: { id: true, role: true, name: true },
    });

    if (!user || user.role !== "ADMIN") {
      return {
        isAdmin: false,
        error: "Forbidden. Only school administrators are authorized to assign classes and subjects to teachers.",
        status: 403,
      };
    }

    return { isAdmin: true };
  } catch {
    return { isAdmin: false, error: "Failed to verify administrator privileges.", status: 500 };
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

    // Strictly enforce admin role
    const authCheck = await verifyAdmin(req);
    if (!authCheck.isAdmin) {
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
