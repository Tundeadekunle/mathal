import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      studentIds,
      classLevel,
      arm,
      section,
      resultsApproved,
      approvedBy = "Administrator/Teacher",
    } = body;

    if (resultsApproved === undefined) {
      return NextResponse.json(
        { error: "resultsApproved (boolean) is required." },
        { status: 400 }
      );
    }

    const where: any = {};

    if (Array.isArray(studentIds) && studentIds.length > 0) {
      where.id = { in: studentIds };
    } else {
      if (classLevel && classLevel !== "ALL") {
        where.classLevel = classLevel;
      }
      if (arm && arm !== "ALL") {
        where.arm = arm;
      }
      if (section && section !== "ALL") {
        where.section = section;
      }
    }

    const approved = Boolean(resultsApproved);
    const updateData: any = {
      resultsApproved: approved,
      resultsApprovedBy: approved ? approvedBy : null,
      resultsApprovedAt: approved ? new Date() : null,
    };

    const result = await prisma.student.updateMany({
      where,
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Successfully ${approved ? "approved" : "withheld"} report card and score access for ${result.count} student(s).`,
    });
  } catch (error: any) {
    console.error("Bulk approval error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process bulk approval." },
      { status: 500 }
    );
  }
}
