import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Section, Gender, Role } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section");
    const classLevel = searchParams.get("classLevel");
    const arm = searchParams.get("arm");
    const search = searchParams.get("search");

    const where: any = {};
    if (section && section !== "ALL") {
      where.section = section as Section;
    }
    if (classLevel && classLevel !== "ALL") {
      where.classLevel = classLevel;
    }
    if (arm && arm !== "ALL") {
      where.arm = arm;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { admissionNo: { contains: search, mode: "insensitive" } },
        { guardianName: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: [{ classLevel: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      include: {
        user: {
          select: { id: true, email: true, phone: true },
        },
      },
    });

    return NextResponse.json({ success: true, students });
  } catch (error: any) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch students from Neon DB." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check authorization if session cookie is present
    const sessionCookie = req.cookies.get("mathal_session")?.value;
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(sessionCookie);
        if (sessionData?.role === "STUDENT") {
          return NextResponse.json(
            { error: "Access denied. Only Administrators and Teachers can enroll students." },
            { status: 403 }
          );
        }
      } catch {
        // Continue if cookie cannot be parsed
      }
    }

    const body = await req.json();
    const {
      email,
      password,
      firstName,
      lastName,
      otherName,
      section = "PRIMARY",
      classLevel = "Basic 1",
      arm = "Gold",
      gender = "MALE",
      dateOfBirth,
      bloodGroup = "O+",
      address,
      guardianName,
      guardianPhone,
      guardianEmail,
      guardianAddress,
      passportPhoto,
    } = body;

    const cleanEmail = email?.trim().toLowerCase();
    const cleanPassword = typeof password === "string" ? password.trim() : "";

    // Required fields validation
    if (!cleanEmail) {
      return NextResponse.json(
        { error: "Student email is required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid student email address." },
        { status: 400 }
      );
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      return NextResponse.json(
        { error: "Student password is required and must be at least 6 characters." },
        { status: 400 }
      );
    }

    if (!firstName?.trim() || !lastName?.trim() || !guardianName?.trim() || !guardianPhone?.trim()) {
      return NextResponse.json(
        { error: "First name, last name, guardian name and phone are required." },
        { status: 400 }
      );
    }

    // Check if user with this email already exists in Neon DB
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: `An account with email "${cleanEmail}" already exists. Please provide a unique email address.` },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const fullName = [firstName.trim(), otherName?.trim(), lastName.trim()].filter(Boolean).join(" ");

    const studentSection = (section as Section) || Section.PRIMARY;
    const prefix = studentSection === Section.PRIMARY ? "MIS/PRI" : "MIS/SEC";
    const currentYear = new Date().getFullYear();
    const studentPrefix = `${prefix}/${currentYear}/`;

    const existingStudents = await prisma.student.findMany({
      where: {
        admissionNo: {
          startsWith: studentPrefix,
        },
      },
      select: { admissionNo: true },
    });

    let maxStudentSeq = 0;
    for (const s of existingStudents) {
      const match = s.admissionNo.match(new RegExp(`^${prefix}/${currentYear}/(\\d+)`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxStudentSeq) {
          maxStudentSeq = num;
        }
      }
    }

    let studentSeq = maxStudentSeq + 1;
    let admissionNo = "";
    while (true) {
      const candidateAdmissionNo = `${studentPrefix}${String(studentSeq).padStart(3, "0")}`;
      const collision = await prisma.student.findUnique({
        where: { admissionNo: candidateAdmissionNo },
      });
      if (!collision) {
        admissionNo = candidateAdmissionNo;
        break;
      }
      studentSeq++;
    }

    const { student } = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            email: cleanEmail,
            name: fullName,
            passwordHash,
            role: Role.STUDENT,
            phone: guardianPhone?.trim() || null,
            avatarUrl: passportPhoto || null,
          },
        });

        const newStudent = await tx.student.create({
          data: {
            userId: user.id,
            admissionNo,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            otherName: otherName?.trim() || null,
            section: studentSection,
            classLevel,
            arm,
            gender: (gender as Gender) || Gender.MALE,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            bloodGroup: bloodGroup || "O+",
            address: address || null,
            passportPhoto: passportPhoto || null,
            guardianName: guardianName.trim(),
            guardianPhone: guardianPhone.trim(),
            guardianEmail: guardianEmail?.trim() || null,
            guardianAddress: guardianAddress || address || null,
          },
          include: {
            user: {
              select: { id: true, email: true, phone: true },
            },
          },
        });

        return { user, student: newStudent };
      },
      { maxWait: 15000, timeout: 25000 }
    );

    return NextResponse.json(
      {
        success: true,
        student,
        message: `Student enrolled successfully with Admission No: ${admissionNo} and portal login: ${cleanEmail}`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating student:", error);

    let message = error.message || "Failed to enroll student in Neon DB.";
    if (error.code === "P2002" || message.includes("Unique constraint failed")) {
      const target = (error.meta?.target as string[]) || [];
      if (target.includes("admissionNo") || message.includes("admissionNo")) {
        message = "A student with this Admission Number already exists. Please try again.";
      } else if (target.includes("email") || message.includes("email")) {
        message = "A user account with this email address already exists. Please provide a different email.";
      }
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
