import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

    // Resolve student
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

    const exam = await prisma.cbtExam.findUnique({
      where: { id: examId },
      include: { questions: true },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found." }, { status: 404 });
    }

    // Score answers
    let score = 0;
    let totalPossible = 0;

    exam.questions.forEach((q) => {
      totalPossible += q.marks;
      // Match by question id or question number
      const answered = answers[q.id] || answers[String(q.questionNumber)];
      if (answered && answered.toUpperCase() === q.correctAnswer.toUpperCase()) {
        score += q.marks;
      }
    });

    const percentage = totalPossible > 0 ? Math.round((score / totalPossible) * 100 * 10) / 10 : 0;
    const passed = percentage >= exam.passPercentage;

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

    return NextResponse.json({
      success: true,
      submission: {
        ...submission,
        examTitle: exam.title,
        studentName: `${student.firstName} ${student.lastName}`,
      },
      score,
      totalPossible,
      percentage,
      passed,
    });
  } catch (error: any) {
    console.error("Error submitting exam:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit exam to Neon DB." },
      { status: 500 }
    );
  }
}
