import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Section, Gender, StudentStatus } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id },
          { admissionNo: { equals: id, mode: "insensitive" } },
        ],
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, phone: true },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    console.error("Error fetching student:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch student from Neon DB." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Verify student exists
    const existing = await prisma.student.findFirst({
      where: {
        OR: [
          { id },
          { admissionNo: { equals: id, mode: "insensitive" } },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    const updateData: any = {};

    if (body.passportPhoto !== undefined) {
      updateData.passportPhoto = body.passportPhoto; // Base64 or null
    }

    if (body.firstName !== undefined) updateData.firstName = body.firstName.trim();
    if (body.lastName !== undefined) updateData.lastName = body.lastName.trim();
    if (body.otherName !== undefined) updateData.otherName = body.otherName?.trim() || null;
    if (body.section !== undefined) updateData.section = body.section as Section;
    if (body.classLevel !== undefined) updateData.classLevel = body.classLevel;
    if (body.arm !== undefined) updateData.arm = body.arm;
    if (body.gender !== undefined) updateData.gender = body.gender as Gender;
    if (body.dateOfBirth !== undefined) {
      updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    }
    if (body.bloodGroup !== undefined) updateData.bloodGroup = body.bloodGroup;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.guardianName !== undefined) updateData.guardianName = body.guardianName.trim();
    if (body.guardianPhone !== undefined) updateData.guardianPhone = body.guardianPhone.trim();
    if (body.guardianEmail !== undefined) updateData.guardianEmail = body.guardianEmail?.trim() || null;
    if (body.guardianAddress !== undefined) updateData.guardianAddress = body.guardianAddress;
    if (body.status !== undefined) updateData.status = body.status as StudentStatus;

    const updatedStudent = await prisma.student.update({
      where: { id: existing.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      student: updatedStudent,
      message: "Student record updated successfully in Neon DB.",
    });
  } catch (error: any) {
    console.error("Error updating student:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update student in Neon DB." },
      { status: 500 }
    );
  }
}
