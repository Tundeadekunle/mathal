import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { computeGrade } from "@/lib/grading";
import { getAuthUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUserFromRequest(req);
    if (!authUser || (authUser.role !== "TEACHER" && authUser.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized. Only teachers and administrators can record CBT scores into the grade book." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      submissionId,
      studentId,
      examId,
      targetField = "ca1", // "ca1" (max 20), "ca2" (max 20), or "exam" (max 60)
      session = "2026/2027",
      term = "First Term",
      subjectName,
      customScore,
    } = body;

    // 1. Resolve submission if provided
    let submission = null;
    if (submissionId) {
      submission = await prisma.examSubmission.findUnique({
        where: { id: submissionId },
        include: {
          exam: true,
          student: {
            include: { user: true },
          },
        },
      });
    } else if (studentId && examId) {
      submission = await prisma.examSubmission.findFirst({
        where: { studentId, examId },
        orderBy: { submittedAt: "desc" },
        include: {
          exam: true,
          student: {
            include: { user: true },
          },
        },
      });
    }

    const resolvedStudentId = submission?.studentId || studentId;
    if (!resolvedStudentId) {
      return NextResponse.json(
        { error: "Student could not be resolved from submission." },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id: resolvedStudentId },
      include: { user: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found in database." }, { status: 404 });
    }

    const resolvedSubjectName = subjectName || submission?.exam.subject || "Mathematics";

    // 2. Resolve Subject in DB
    let subject = await prisma.subject.findFirst({
      where: {
        OR: [
          { name: { equals: resolvedSubjectName, mode: "insensitive" } },
          { code: { equals: resolvedSubjectName, mode: "insensitive" } },
        ],
      },
    });

    if (!subject) {
      // Auto-create subject if it doesn't exist yet
      const code = resolvedSubjectName.substring(0, 3).toUpperCase();
      subject = await prisma.subject.create({
        data: {
          name: resolvedSubjectName,
          code,
          section: student.section,
        },
      });
    }

    // 3. Calculate score to record
    let rawScoreToRecord = 0;
    if (customScore !== undefined && customScore !== null) {
      rawScoreToRecord = Number(customScore);
    } else if (submission) {
      // Scale percentage to max allowed for targetField
      // ca1: max 20, ca2: max 20, exam: max 60
      const maxFieldMarks = targetField === "exam" ? 60 : 20;
      rawScoreToRecord = Math.round((submission.percentage / 100) * maxFieldMarks * 10) / 10;
    }

    // Existing score record if any
    const existing = await prisma.scoreRecord.findUnique({
      where: {
        studentId_subjectId_session_term: {
          studentId: student.id,
          subjectId: subject.id,
          session,
          term,
        },
      },
    });

    let ca1 = existing?.ca1 || 0;
    let ca2 = existing?.ca2 || 0;
    let examVal = existing?.exam || 0;

    if (targetField === "ca1") {
      ca1 = Math.min(20, Math.max(0, rawScoreToRecord));
    } else if (targetField === "ca2") {
      ca2 = Math.min(20, Math.max(0, rawScoreToRecord));
    } else if (targetField === "exam") {
      examVal = Math.min(60, Math.max(0, rawScoreToRecord));
    }

    const total = Math.min(100, Math.round((ca1 + ca2 + examVal) * 10) / 10);
    const gradeInfo = computeGrade(total);

    const updatedScore = await prisma.scoreRecord.upsert({
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
        exam: examVal,
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
        exam: examVal,
        total,
        grade: gradeInfo.grade,
        remark: gradeInfo.remark,
      },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNo: true } },
        subject: { select: { name: true, code: true } },
      },
    });

    // Update TermReport if exists
    const allScores = await prisma.scoreRecord.findMany({
      where: { studentId: student.id, session, term },
      select: { total: true },
    });
    const totalScoreSum = allScores.reduce((sum, s) => sum + s.total, 0);
    const avgScore = allScores.length > 0 ? Math.round((totalScoreSum / allScores.length) * 10) / 10 : 0;

    await prisma.termReport.updateMany({
      where: { studentId: student.id, session, term },
      data: {
        totalScore: totalScoreSum,
        averageScore: avgScore,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully recorded ${rawScoreToRecord} pts into ${targetField.toUpperCase()} for ${student.firstName} ${student.lastName} (${subject.name}).`,
      scoreRecord: updatedScore,
      targetField,
      recordedValue: rawScoreToRecord,
    });
  } catch (error: any) {
    console.error("Error recording CBT score:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record CBT score into database." },
      { status: 500 }
    );
  }
}
