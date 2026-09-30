import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AttendanceStatus } from "@prisma/client";
import { getAuthUserFromRequest, isClassAllocated, parseAllocations } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const authUser = await getAuthUserFromRequest(req);
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const classLevel = searchParams.get("classLevel");
    const arm = searchParams.get("arm");
    const studentId = searchParams.get("studentId");

    const where: any = {};

    // Enforce role-based access restrictions
    if (authUser?.role === "TEACHER") {
      const assigned = parseAllocations(authUser.assignedClasses);
      if (assigned.length === 0) {
        return NextResponse.json({ success: true, attendances: [] });
      }

      if (classLevel) {
        if (!isClassAllocated(authUser.assignedClasses, classLevel)) {
          return NextResponse.json(
            { error: `Access denied. You are only assigned to: ${assigned.join(", ")}.` },
            { status: 403 }
          );
        }
        where.classLevel = classLevel;
      } else {
        where.classLevel = { in: assigned };
      }
    } else if (authUser?.role === "STUDENT") {
      // Students can only view their own attendance
      if (authUser.studentId) {
        where.studentId = authUser.studentId;
      } else {
        return NextResponse.json({ success: true, attendances: [] });
      }
    } else {
      // ADMIN or public fallback with requested filters
      if (classLevel) where.classLevel = classLevel;
    }

    if (dateStr) {
      const dateObj = new Date(dateStr);
      // Start of day to end of day in UTC
      const start = new Date(dateObj.toISOString().split("T")[0] + "T00:00:00.000Z");
      const end = new Date(dateObj.toISOString().split("T")[0] + "T23:59:59.999Z");
      where.date = { gte: start, lte: end };
    }
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
    const authUser = await getAuthUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required. Please log in." },
        { status: 401 }
      );
    }

    if (authUser.role !== "TEACHER" && authUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden. Only teachers and administrators are authorized to mark attendance." },
        { status: 403 }
      );
    }

    const isTeacher = authUser.role === "TEACHER";
    const assignedClasses = parseAllocations(authUser.assignedClasses);

    if (isTeacher && assignedClasses.length === 0) {
      return NextResponse.json(
        { error: "Access denied. You do not have any assigned classes. Please contact the administrator." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { records } = body; // Array of { studentId, classLevel, arm, date, status, remarks, markedBy }

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "A list of attendance records is required." },
        { status: 400 }
      );
    }

    // Verify teacher authorization for all requested records
    if (isTeacher) {
      for (const item of records) {
        if (!isClassAllocated(authUser.assignedClasses, item.classLevel)) {
          return NextResponse.json(
            {
              error: `Access denied. You are not assigned to record attendance for class: "${item.classLevel}". Your assigned classes: ${assignedClasses.join(", ")}.`,
            },
            { status: 403 }
          );
        }
      }

      // Check student enrolled classes
      const studentIds = records.map((r) => r.studentId).filter(Boolean);
      const studentCheck = await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, firstName: true, lastName: true, classLevel: true },
      });

      for (const s of studentCheck) {
        if (!isClassAllocated(authUser.assignedClasses, s.classLevel)) {
          return NextResponse.json(
            {
              error: `Access denied. Pupil/Student ${s.firstName} ${s.lastName} belongs to class "${s.classLevel}", which is not assigned to you.`,
            },
            { status: 403 }
          );
        }
      }
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
          markedBy: item.markedBy || authUser.name || "Teacher",
          classLevel: item.classLevel,
          arm: item.arm,
        },
        create: {
          studentId: item.studentId,
          date: normalizedDate,
          status: (item.status as AttendanceStatus) || AttendanceStatus.PRESENT,
          remarks: item.remarks || null,
          markedBy: item.markedBy || authUser.name || "Teacher",
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
