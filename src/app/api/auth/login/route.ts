import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Email / Admission Number and password are required." },
        { status: 400 }
      );
    }

    const clean = identifier.trim().toLowerCase();

    // Query exclusively against real users in Neon DB
    const prismaUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: clean, mode: "insensitive" } },
          { student: { admissionNo: { equals: identifier.trim(), mode: "insensitive" } } },
          { teacher: { staffId: { equals: identifier.trim(), mode: "insensitive" } } },
        ],
      },
      include: {
        student: true,
        teacher: true,
      },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: "Account not found. Please verify your Email or Admission No, or sign up." },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, prismaUser.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Incorrect password. Please verify and try again." },
        { status: 401 }
      );
    }

    const authenticatedUser = {
      id: prismaUser.id,
      email: prismaUser.email,
      name: prismaUser.name,
      role: prismaUser.role,
      phone: prismaUser.phone || undefined,
      studentId: prismaUser.student?.id,
      admissionNo: prismaUser.student?.admissionNo,
      passportPhoto: prismaUser.student?.passportPhoto || undefined,
      staffId: prismaUser.teacher?.staffId,
      teacherId: prismaUser.teacher?.id,
      assignedClasses: prismaUser.teacher?.assignedClasses,
      assignedSubjects: prismaUser.teacher?.assignedSubjects,
      assignedSection: prismaUser.teacher?.assignedSection,
    };

    const response = NextResponse.json(
      {
        success: true,
        user: authenticatedUser,
        message: `Welcome back, ${authenticatedUser.name}!`,
      },
      { status: 200 }
    );

    // Set real-time session cookie
    response.cookies.set("mathal_session", JSON.stringify(authenticatedUser), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error.message || "Sign in failed." },
      { status: 500 }
    );
  }
}
