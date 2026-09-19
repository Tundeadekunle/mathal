import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { computeGrade } from "@/lib/grading";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const subjectId = searchParams.get("subjectId");
    const session = searchParams.get("session");
    const term = searchParams.get("term");
    const classLevel = searchParams.get("classLevel");
    const arm = searchParams.get("arm");

    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (subjectId) where.subjectId = subjectId;
    if (session) where.session = session;
    if (term) where.term = term;
    if (classLevel || arm) {
      where.student = {};
      if (classLevel) where.student.classLevel = classLevel;
      if (arm) where.student.arm = arm;
    }

    const scores = await prisma.scoreRecord.findMany({
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
            section: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [{ student: { lastName: "asc" } }, { subject: { name: "asc" } }],
    });

    return NextResponse.json({ success: true, scores });
  } catch (error: any) {
    console.error("Error fetching scores:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch scores from Neon DB." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // 1. Session & Role Verification against Neon DB
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
      return NextResponse.json({ error: "Invalid session cookie." }, { status: 401 });
    }

    if (!sessionData?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const authUser = await prisma.user.findUnique({
      where: { id: sessionData.id },
      select: { id: true, role: true, name: true, teacher: true },
    });

    if (!authUser || (authUser.role !== "TEACHER" && authUser.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Forbidden. Only teachers and administrators are authorized to enter or modify scores." },
        { status: 403 }
      );
    }

    // 2. Parse payload - support batch array or single score item
    const body = await req.json();
    let rawScores: any[] = [];

    if (Array.isArray(body.scores)) {
      rawScores = body.scores;
    } else if (body.score && typeof body.score === "object") {
      rawScores = [body.score];
    } else if (body.studentId && body.subjectId) {
      rawScores = [body];
    }

    if (rawScores.length === 0) {
      return NextResponse.json(
        { error: "Score data is required. Provide 'scores' array or 'studentId' and 'subjectId'." },
        { status: 400 }
      );
    }

    const savedRecords: any[] = [];
    const affectedStudents = new Set<string>();

    for (const item of rawScores) {
      if (!item.studentId || !item.subjectId) {
        continue;
      }

      const session = item.session || "2026/2027";
      const term = item.term || "First Term";

      // Resolve student in Neon DB (by ID or admissionNo)
      const student = await prisma.student.findFirst({
        where: {
          OR: [
            { id: item.studentId },
            { admissionNo: { equals: item.studentId, mode: "insensitive" } },
          ],
        },
        select: { id: true, firstName: true, lastName: true, admissionNo: true },
      });

      if (!student) {
        console.warn(`Student not found in Neon DB: ${item.studentId}`);
        continue;
      }

      // Resolve subject in Neon DB (by ID, code, or name)
      const subject = await prisma.subject.findFirst({
        where: {
          OR: [
            { id: item.subjectId },
            { code: { equals: item.subjectId, mode: "insensitive" } },
            { name: { equals: item.subjectId, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, code: true },
      });

      if (!subject) {
        console.warn(`Subject not found in Neon DB: ${item.subjectId}`);
        continue;
      }

      // Validate & Clamp marks
      const ca1 = Math.min(20, Math.max(0, Number(item.ca1) || 0));
      const ca2 = Math.min(20, Math.max(0, Number(item.ca2) || 0));
      const exam = Math.min(60, Math.max(0, Number(item.exam) || 0));
      const total = Math.min(100, Math.round((ca1 + ca2 + exam) * 10) / 10);
      const gradeInfo = computeGrade(total);

      // Upsert into ScoreRecord in Neon DB
      const record = await prisma.scoreRecord.upsert({
        where: {
          studentId_subjectId_session_term: {
            studentId: student.id,
            subjectId: subject.id,
            session,
            term,
          },
        },
        update: {
          ca1,
          ca2,
          exam,
          total,
          grade: gradeInfo.grade,
          remark: gradeInfo.remark,
        },
        create: {
          studentId: student.id,
          subjectId: subject.id,
          session,
          term,
          ca1,
          ca2,
          exam,
          total,
          grade: gradeInfo.grade,
          remark: gradeInfo.remark,
        },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, admissionNo: true },
          },
          subject: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      savedRecords.push(record);
      affectedStudents.add(student.id);

      // Recalculate and update TermReport summary in Neon DB if one exists
      const studentAllScores = await prisma.scoreRecord.findMany({
        where: { studentId: student.id, session, term },
        select: { total: true },
      });

      const totalScoreSum = studentAllScores.reduce((sum, s) => sum + s.total, 0);
      const avgScore = studentAllScores.length > 0
        ? Math.round((totalScoreSum / studentAllScores.length) * 10) / 10
        : 0;

      await prisma.termReport.updateMany({
        where: { studentId: student.id, session, term },
        data: {
          totalScore: totalScoreSum,
          averageScore: avgScore,
        },
      });
    }

    if (savedRecords.length === 0) {
      return NextResponse.json(
        { error: "No matching student or subject records could be resolved in Neon DB." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      count: savedRecords.length,
      message: `Successfully saved ${savedRecords.length} score record(s) to Neon DB.`,
      records: savedRecords,
    });
  } catch (error: any) {
    console.error("Error saving scores to Neon DB:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save scores to Neon DB." },
      { status: 500 }
    );
  }
}
