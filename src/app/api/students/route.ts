import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Section, Gender } from "@prisma/client";

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
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

    if (!firstName?.trim() || !lastName?.trim() || !guardianName?.trim() || !guardianPhone?.trim()) {
      return NextResponse.json(
        { error: "First name, last name, guardian name and phone are required." },
        { status: 400 }
      );
    }

    const studentSection = (section as Section) || Section.PRIMARY;
    const prefix = studentSection === Section.PRIMARY ? "MIS/PRI" : "MIS/SEC";
    const currentYear = new Date().getFullYear();

    const count = await prisma.student.count({
      where: { section: studentSection },
    });
    const sequence = String(count + 1).padStart(3, "0");
    const admissionNo = `${prefix}/${currentYear}/${sequence}`;

    const student = await prisma.student.create({
      data: {
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
    });

    return NextResponse.json(
      { success: true, student, message: `Student enrolled successfully with ID ${admissionNo}` },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating student:", error);
    return NextResponse.json(
      { error: error.message || "Failed to enroll student in Neon DB." },
      { status: 500 }
    );
  }
}
