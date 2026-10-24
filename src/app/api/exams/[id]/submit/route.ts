import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { computeGrade } from "@/lib/grading";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params;
    const body = await req.json();
    const { studentId, answers } = body; // answers: Record<string, string> where key is question id or number

    if (!studentId || !answers) {
      return NextResponse.json(
        { error: "Student ID and answers are required." },
        { status: 400 }
      );
    }

    const exam = await prisma.cbtExam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          orderBy: { questionNumber: "asc" },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found." }, { status: 404 });
    }

    // Resolve student across ID, userId, admissionNo, or email
    let student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: studentId },
          { userId: studentId },
          { admissionNo: { equals: studentId, mode: "insensitive" } },
          { user: { email: { equals: studentId, mode: "insensitive" } } },
        ],
      },
      include: {
        user: true,
      },
    });

    if (!student) {
      // Check if studentId belongs to a User account
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { id: studentId },
            { email: { equals: studentId, mode: "insensitive" } },
          ],
        },
        include: { student: true },
      });

      if (user?.student) {
        student = { ...user.student, user };
      } else if (user) {
        // Create student profile automatically linked to this user
        const currentYear = new Date().getFullYear();
        const prefix = exam.section === "PRIMARY" ? "MIS/PRI" : "MIS/SEC";
        const admissionNo = `${prefix}/${currentYear}/${Math.floor(100 + Math.random() * 900)}`;
        const nameParts = user.name.split(" ");
        const created = await prisma.student.create({
          data: {
            userId: user.id,
            admissionNo,
            firstName: nameParts[0] || "Student",
            lastName: nameParts.slice(1).join(" ") || "Learner",
            section: exam.section,
            classLevel: exam.classLevel,
            arm: "Gold",
            gender: "MALE",
            guardianName: `${user.name}'s Guardian`,
            guardianPhone: user.phone || "+234 000 000 0000",
            guardianEmail: user.email,
          },
          include: { user: true },
        });
        student = created;
      }
    }

    if (!student) {
      return NextResponse.json(
        { error: "Student record not found. Please log in with a valid student email or admission number." },
        { status: 404 }
      );
    }

    // Score answers and build question breakdown
    let score = 0;
    let totalPossible = 0;

    const breakdown = exam.questions.map((q) => {
      totalPossible += q.marks;
      const answered = (answers[q.id] || answers[String(q.questionNumber)] || "").toString().trim().toUpperCase();
      const isCorrect = answered && answered === q.correctAnswer.toUpperCase();
      const marksAwarded = isCorrect ? q.marks : 0;
      if (isCorrect) {
        score += q.marks;
      }

      return {
        questionId: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        userAnswer: answered || "Unanswered",
        correctAnswer: q.correctAnswer,
        marksPossible: q.marks,
        marksAwarded,
        isCorrect: !!isCorrect,
        explanation: q.explanation || null,
      };
    });

    const percentage = totalPossible > 0 ? Math.round((score / totalPossible) * 100 * 10) / 10 : 0;
    const passed = percentage >= exam.passPercentage;
    const gradeInfo = computeGrade(percentage);

    // Persist in Neon DB
    const submission = await prisma.examSubmission.create({
      data: {
        examId: exam.id,
        studentId: student.id,
        score,
        totalPossible,
        percentage,
        passed,
        answersJson: JSON.stringify(answers),
      },
    });

    const studentFullName = `${student.firstName} ${student.lastName}`;

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        examId: exam.id,
        examTitle: exam.title,
        subject: exam.subject,
        classLevel: exam.classLevel,
        section: exam.section,
        studentId: student.id,
        studentName: studentFullName,
        admissionNo: student.admissionNo,
        studentEmail: student.user?.email || null,
        score,
        totalPossible,
        percentage,
        grade: gradeInfo.grade,
        remark: gradeInfo.remark,
        passed,
        submittedAt: submission.submittedAt,
        answersJson: submission.answersJson,
      },
      score,
      totalPossible,
      percentage,
      grade: gradeInfo.grade,
      remark: gradeInfo.remark,
      passed,
      breakdown,
      student: {
        id: student.id,
        name: studentFullName,
        admissionNo: student.admissionNo,
        classLevel: student.classLevel,
        section: student.section,
        email: student.user?.email,
      },
      exam: {
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        classLevel: exam.classLevel,
        passPercentage: exam.passPercentage,
        durationMinutes: exam.durationMinutes,
      },
    });
  } catch (error: any) {
    console.error("Error submitting exam:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit exam to Neon DB." },
      { status: 500 }
    );
  }
}
