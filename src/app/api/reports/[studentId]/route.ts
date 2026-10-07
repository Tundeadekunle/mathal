import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AFFECTIVE_DOMAINS, PSYCHOMOTOR_DOMAINS } from "@/lib/grading";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const { searchParams } = new URL(req.url);
    const session = searchParams.get("session") || "2024/2025";
    const term = searchParams.get("term") || "First Term";

    // Find student
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: studentId },
          { admissionNo: { equals: studentId, mode: "insensitive" } },
        ],
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    // Student's scores in this session & term
    const scores = await prisma.scoreRecord.findMany({
      where: {
        studentId: student.id,
        session,
        term,
      },
      include: {
        subject: true,
      },
      orderBy: { subject: { name: "asc" } },
    });

    const totalScore = scores.reduce((sum, s) => sum + s.total, 0);
    const averageScore = scores.length > 0 ? Math.round((totalScore / scores.length) * 10) / 10 : 0;

    // Find classmates in the same classLevel and arm to compute class rank
    const peers = await prisma.student.findMany({
      where: {
        classLevel: student.classLevel,
        arm: student.arm,
      },
      select: { id: true },
    });

    const peerIds = peers.map((p) => p.id);

    // Get scores for all peers in this session & term
    const peerScores = await prisma.scoreRecord.findMany({
      where: {
        studentId: { in: peerIds },
        session,
        term,
      },
      select: {
        studentId: true,
        total: true,
      },
    });

    // Sum totals per peer
    const peerTotalsMap: Record<string, number> = {};
    peerIds.forEach((id) => {
      peerTotalsMap[id] = 0;
    });
    peerScores.forEach((ps) => {
      peerTotalsMap[ps.studentId] = (peerTotalsMap[ps.studentId] || 0) + ps.total;
    });

    const peerRanks = Object.entries(peerTotalsMap)
      .map(([id, sum]) => ({ id, sum }))
      .sort((a, b) => b.sum - a.sum);

    const rankIdx = peerRanks.findIndex((p) => p.id === student.id);
    const position = rankIdx >= 0 ? rankIdx + 1 : 1;

    // Attendance stats
    const attendances = await prisma.attendance.findMany({
      where: { studentId: student.id },
    });

    const timesPresent = attendances.filter(
      (a) => a.status === "PRESENT" || a.status === "LATE"
    ).length || 116;
    const timesAbsent = attendances.filter((a) => a.status === "ABSENT").length || 4;

    // Check for existing persisted teacher-evaluated report in Neon DB
    const existingTermReport = await prisma.termReport.findUnique({
      where: {
        studentId_session_term: {
          studentId: student.id,
          session,
          term,
        },
      },
    });

    // 1. Affective Domain Ratings:
    // If teacher already rated in Neon DB, use the teacher's ratings.
    // Otherwise, generate standard defaults across all AFFECTIVE_DOMAINS.
    const affectiveRating: Record<string, number> = {};
    let savedAffective: Record<string, number> = {};
    if (existingTermReport?.affectiveRating) {
      try {
        savedAffective = JSON.parse(existingTermReport.affectiveRating);
      } catch {
        // fallback
      }
    }
    AFFECTIVE_DOMAINS.forEach((trait) => {
      affectiveRating[trait] = typeof savedAffective[trait] === "number" ? savedAffective[trait] : 5;
    });

    // 2. Psychomotor Domain Ratings:
    // If teacher already rated in Neon DB, use the teacher's ratings.
    // Otherwise, generate standard defaults across all PSYCHOMOTOR_DOMAINS.
    const psychomotorRating: Record<string, number> = {};
    let savedPsychomotor: Record<string, number> = {};
    if (existingTermReport?.psychomotorRating) {
      try {
        savedPsychomotor = JSON.parse(existingTermReport.psychomotorRating);
      } catch {
        // fallback
      }
    }
    PSYCHOMOTOR_DOMAINS.forEach((skill) => {
      psychomotorRating[skill] = typeof savedPsychomotor[skill] === "number" ? savedPsychomotor[skill] : 5;
    });

    let teacherRemark = existingTermReport?.teacherRemark || "";
    if (!teacherRemark) {
      if (averageScore < 50) {
        teacherRemark = "Shows potential but needs to dedicate more hours to study and complete homework.";
      } else if (averageScore < 70) {
        teacherRemark = "A good performance with room for greater excellence in analytical subjects.";
      } else {
        teacherRemark = "An exceptionally brilliant, diligent and well-behaved pupil. Has maintained top academic standards.";
      }
    }

    let principalRemark = existingTermReport?.principalRemark || "";
    if (!principalRemark) {
      if (averageScore < 50) {
        principalRemark = "Has to sit up next term. Extra tutoring strongly advised.";
      } else if (averageScore < 70) {
        principalRemark = "Commendable progress. Maintain consistency next term.";
      } else {
        principalRemark = "Outstanding terminal performance! Keep up this exemplary diligence and dedication.";
      }
    }

    const report = {
      id: existingTermReport?.id || `rep_${student.id}_${session.replace("/", "_")}_${term.replace(/\s+/g, "_")}`,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName} ${student.otherName || ""}`.trim(),
      admissionNo: student.admissionNo,
      section: student.section,
      session,
      term,
      classLevel: student.classLevel,
      arm: student.arm,
      totalScore,
      averageScore,
      position,
      totalStudents: peers.length || 1,
      timesSchoolOpened: existingTermReport?.timesSchoolOpened || 120,
      timesPresent,
      timesAbsent,
      teacherRemark,
      principalRemark,
      nextTermBegins: existingTermReport?.nextTermBegins || "January 12, 2026",
      affectiveRating,
      psychomotorRating,
      hasTeacherEvaluated: Boolean(existingTermReport?.affectiveRating || existingTermReport?.psychomotorRating),
      resultsApproved: Boolean(student.resultsApproved),
      resultsApprovedBy: student.resultsApprovedBy,
      resultsApprovedAt: student.resultsApprovedAt,
      scores: scores.map((s) => ({
        id: s.id,
        subjectId: s.subjectId,
        subjectName: s.subject.name,
        ca1: s.ca1,
        ca2: s.ca2,
        exam: s.exam,
        total: s.total,
        grade: s.grade,
        remark: s.remark,
      })),
    };

    return NextResponse.json({ success: true, report, student });
  } catch (error: any) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate report from Neon DB." },
      { status: 500 }
    );
  }
}

// Teacher & Admin Endpoint to Pick & Save Affective and Psychomotor Domain Ratings
export async function POST(
  req: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;

    // 1. Session & Role Verification
    const nextHeaders: any = await import("next/headers");
    const cookieStore = await nextHeaders.cookies();
    const sessionCookie = cookieStore?.get?.("mathal_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Authentication required. Please log in as a teacher or administrator." },
        { status: 401 }
      );
    }

    let sessionData: any;
    try {
      sessionData = JSON.parse(sessionCookie);
    } catch {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    if (!sessionData?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    // Check user in Neon DB
    const authUser = await prisma.user.findUnique({
      where: { id: sessionData.id },
      select: { id: true, role: true, name: true },
    });

    if (!authUser || (authUser.role !== "TEACHER" && authUser.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Forbidden. Only teachers and administrators are authorized to evaluate and pick ratings for affective and psychomotor domains." },
        { status: 403 }
      );
    }

    // 2. Find Student
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: studentId },
          { admissionNo: { equals: studentId, mode: "insensitive" } },
        ],
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student record not found." }, { status: 404 });
    }

    const body = await req.json();
    const {
      session = "2024/2025",
      term = "First Term",
      teacherRemark,
      principalRemark,
      nextTermBegins,
    } = body;
    const affectiveRating = body.affectiveRating || body.affectiveRatings;
    const psychomotorRating = body.psychomotorRating || body.psychomotorRatings;

    // Compute academic scores & totals
    const scores = await prisma.scoreRecord.findMany({
      where: { studentId: student.id, session, term },
    });
    const totalScore = scores.reduce((sum, s) => sum + s.total, 0);
    const averageScore = scores.length > 0 ? Math.round((totalScore / scores.length) * 10) / 10 : 0;

    // Peers & Position
    const peers = await prisma.student.findMany({
      where: { classLevel: student.classLevel, arm: student.arm },
      select: { id: true },
    });
    const peerIds = peers.map((p) => p.id);
    const peerScores = await prisma.scoreRecord.findMany({
      where: { studentId: { in: peerIds }, session, term },
      select: { studentId: true, total: true },
    });
    const peerTotalsMap: Record<string, number> = {};
    peerIds.forEach((id) => (peerTotalsMap[id] = 0));
    peerScores.forEach((ps) => {
      peerTotalsMap[ps.studentId] = (peerTotalsMap[ps.studentId] || 0) + ps.total;
    });
    const peerRanks = Object.entries(peerTotalsMap)
      .map(([id, sum]) => ({ id, sum }))
      .sort((a, b) => b.sum - a.sum);
    const rankIdx = peerRanks.findIndex((p) => p.id === student.id);
    const position = rankIdx >= 0 ? rankIdx + 1 : 1;

    // Clean and validate ratings (clamp integers between 1 and 5)
    const cleanAffective: Record<string, number> = {};
    if (affectiveRating && typeof affectiveRating === "object") {
      Object.entries(affectiveRating).forEach(([k, v]) => {
        const num = Number(v);
        cleanAffective[k] = Math.min(5, Math.max(1, isNaN(num) ? 5 : Math.round(num)));
      });
    }

    const cleanPsychomotor: Record<string, number> = {};
    if (psychomotorRating && typeof psychomotorRating === "object") {
      Object.entries(psychomotorRating).forEach(([k, v]) => {
        const num = Number(v);
        cleanPsychomotor[k] = Math.min(5, Math.max(1, isNaN(num) ? 5 : Math.round(num)));
      });
    }

    // Persist evaluation directly to Neon DB
    const upserted = await prisma.termReport.upsert({
      where: {
        studentId_session_term: {
          studentId: student.id,
          session,
          term,
        },
      },
      create: {
        studentId: student.id,
        session,
        term,
        classLevel: student.classLevel,
        arm: student.arm,
        totalScore,
        averageScore,
        position,
        totalStudents: peers.length || 1,
        affectiveRating: JSON.stringify(cleanAffective),
        psychomotorRating: JSON.stringify(cleanPsychomotor),
        teacherRemark: teacherRemark || null,
        principalRemark: principalRemark || null,
        nextTermBegins: nextTermBegins || "January 12, 2026",
      },
      update: {
        totalScore,
        averageScore,
        position,
        totalStudents: peers.length || 1,
        affectiveRating: JSON.stringify(cleanAffective),
        psychomotorRating: JSON.stringify(cleanPsychomotor),
        ...(teacherRemark !== undefined ? { teacherRemark } : {}),
        ...(principalRemark !== undefined ? { principalRemark } : {}),
        ...(nextTermBegins !== undefined ? { nextTermBegins } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Affective and Psychomotor ratings successfully saved for ${student.firstName} ${student.lastName}!`,
      report: {
        id: upserted.id,
        studentId: upserted.studentId,
        session: upserted.session,
        term: upserted.term,
        affectiveRating: cleanAffective,
        psychomotorRating: cleanPsychomotor,
        teacherRemark: upserted.teacherRemark,
        principalRemark: upserted.principalRemark,
      },
    });
  } catch (error: any) {
    console.error("Save report error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save teacher evaluation." },
      { status: 500 }
    );
  }
}
