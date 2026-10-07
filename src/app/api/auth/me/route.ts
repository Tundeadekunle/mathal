import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("mathal_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    let sessionData: any;
    try {
      sessionData = JSON.parse(sessionCookie);
    } catch {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    if (!sessionData?.id) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Verify against Neon DB in real-time
    const user = await prisma.user.findUnique({
      where: { id: sessionData.id },
      include: {
        student: true,
        teacher: true,
      },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone || undefined,
      avatarUrl: user.avatarUrl || undefined,
      studentId: user.student?.id,
      admissionNo: user.student?.admissionNo,
      passportPhoto: user.student?.passportPhoto || undefined,
      resultsApproved: (user.student as any)?.resultsApproved ?? false,
      staffId: user.teacher?.staffId,
      teacherId: user.teacher?.id,
      assignedClasses: user.teacher?.assignedClasses,
      assignedSubjects: user.teacher?.assignedSubjects,
      assignedSection: user.teacher?.assignedSection,
    };

    return NextResponse.json({ user: payload }, { status: 200 });
  } catch (error: any) {
    console.error("Session verification error:", error);
    return NextResponse.json({ user: null, error: error.message }, { status: 500 });
  }
}
