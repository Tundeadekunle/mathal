import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role, Section, Gender } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      password,
      role = "STUDENT",
      phone,
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
      staffId,
      qualification,
      passportPhoto,
    } = body;

    const cleanEmail = email?.trim().toLowerCase();
    const cleanName = name?.trim();

    if (!cleanName || !cleanEmail) {
      return NextResponse.json(
        { error: "Full Name and Email are required." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    // Check if email already exists in Neon DB
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please log in instead." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = (role as Role) || Role.STUDENT;
    const currentYear = new Date().getFullYear();

    // Run creation in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email: cleanEmail,
          name: cleanName,
          passwordHash,
          role: userRole,
          phone: phone || null,
        },
      });

      let createdStudent = null;
      let createdTeacher = null;

      // 2. Role-specific profile creation
      if (userRole === Role.STUDENT) {
        const studentSection = (section as Section) || Section.PRIMARY;
        const prefix = studentSection === Section.PRIMARY ? "MIS/PRI" : "MIS/SEC";

        // Count existing students in this section and year for clean sequential admission numbering
        const studentCount = await tx.student.count({
          where: { section: studentSection },
        });
        const sequence = String(studentCount + 1).padStart(3, "0");
        const admissionNo = `${prefix}/${currentYear}/${sequence}`;

        const nameParts = cleanName.split(" ");
        const firstName = nameParts[0] || "Student";
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Learner";

        createdStudent = await tx.student.create({
          data: {
            userId: user.id,
            admissionNo,
            firstName,
            lastName,
            section: studentSection,
            classLevel: classLevel || (studentSection === Section.SECONDARY ? "JSS 1" : "Basic 1"),
            arm: arm || "Gold",
            gender: (gender as Gender) || Gender.MALE,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            bloodGroup: bloodGroup || "O+",
            address: address || null,
            passportPhoto: passportPhoto || null,
            guardianName: guardianName || `${cleanName}'s Guardian`,
            guardianPhone: guardianPhone || phone || "+234 000 000 0000",
            guardianEmail: guardianEmail || cleanEmail,
            guardianAddress: guardianAddress || address || null,
          },
        });
      } else if (userRole === Role.TEACHER) {
        const teacherCount = await tx.teacher.count();
        const sequence = String(teacherCount + 1).padStart(3, "0");
        const assignedStaffId = staffId?.trim() || `MIS/STF/${currentYear}/${sequence}`;

        // Only school administrators can assign classes and subjects to teachers.
        // Self-registration explicitly initializes these to null.
        createdTeacher = await tx.teacher.create({
          data: {
            userId: user.id,
            staffId: assignedStaffId,
            qualification: qualification || "B.Sc (Ed)",
            assignedClasses: null,
            assignedSubjects: null,
            assignedSection: (section as Section) || Section.BOTH,
          },
        });
      }

      return { user, student: createdStudent, teacher: createdTeacher };
    }, { maxWait: 15000, timeout: 25000 });

    const userPayload = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      phone: result.user.phone || undefined,
      studentId: result.student?.id,
      admissionNo: result.student?.admissionNo,
      passportPhoto: result.student?.passportPhoto || undefined,
      staffId: result.teacher?.staffId,
      teacherId: result.teacher?.id,
      assignedClasses: result.teacher?.assignedClasses,
      assignedSubjects: result.teacher?.assignedSubjects,
      assignedSection: result.teacher?.assignedSection,
    };

    const response = NextResponse.json(
      {
        success: true,
        user: userPayload,
        student: result.student,
        teacher: result.teacher,
        message: "Account created successfully in real time!",
      },
      { status: 201 }
    );

    // Set real-time session cookie
    response.cookies.set("mathal_session", JSON.stringify(userPayload), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error.message || "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
