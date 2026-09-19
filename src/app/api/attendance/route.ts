import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AttendanceStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const classLevel = searchParams.get("classLevel");
    const arm = searchParams.get("arm");
    const studentId = searchParams.get("studentId");

    const where: any = {};
    if (dateStr) {
      const dateObj = new Date(dateStr);
      // Start of day to end of day in UTC
      const start = new Date(dateObj.toISOString().split("T")[0] + "T00:00:00.000Z");
      const end = new Date(dateObj.toISOString().split("T")[0] + "T23:59:59.999Z");
      where.date = { gte: start, lte: end };
    }
    if (classLevel) where.classLevel = classLevel;
    if (arm) where.arm = arm;
    if (studentId) where.studentId = studentId;

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            admissionNo: true,
            firstName: true,
            lastName: true,
            classLevel: true,
            arm: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, attendances });
  } catch (error: any) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch attendance from Neon DB." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { records } = body; // Array of { studentId, classLevel, arm, date, status, remarks, markedBy }

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "A list of attendance records is required." },
        { status: 400 }
      );
    }

    const saved = [];
    for (const item of records) {
      const dateVal = new Date(item.date);
      // Normalized to midnight UTC
      const normalizedDate = new Date(dateVal.toISOString().split("T")[0] + "T00:00:00.000Z");

      const record = await prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId: item.studentId,
            date: normalizedDate,
          },
        },
        update: {
          status: (item.status as AttendanceStatus) || AttendanceStatus.PRESENT,
          remarks: item.remarks || null,
          markedBy: item.markedBy || null,
          classLevel: item.classLevel,
          arm: item.arm,
        },
        create: {
          studentId: item.studentId,
          date: normalizedDate,
          status: (item.status as AttendanceStatus) || AttendanceStatus.PRESENT,
          remarks: item.remarks || null,
          markedBy: item.markedBy || null,
          classLevel: item.classLevel,
          arm: item.arm,
        },
      });
      saved.push(record);
    }

    return NextResponse.json({
      success: true,
      count: saved.length,
      message: `Successfully saved ${saved.length} attendance record(s) to Neon DB.`,
    });
  } catch (error: any) {
    console.error("Error saving attendance:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save attendance records to Neon DB." },
      { status: 500 }
    );
  }
}
