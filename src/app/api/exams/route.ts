import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Section } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section");
    const classLevel = searchParams.get("classLevel");

    const where: any = {};
    if (section && section !== "ALL") where.section = section as Section;
    if (classLevel && classLevel !== "ALL") where.classLevel = classLevel;

    const exams = await prisma.cbtExam.findMany({
      where,
      include: {
        questions: true,
        submissions: {
          include: {
            student: {
              select: { firstName: true, lastName: true, admissionNo: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, exams });
  } catch (error: any) {
    console.error("Error fetching exams:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch exams from Neon DB." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      section = "PRIMARY",
      classLevel = "Basic 4",
      subject = "Mathematics",
      durationMinutes = 20,
      totalMarks = 30,
      passPercentage = 50,
      createdBy = "Staff",
      questions = [],
    } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Exam Title is required." },
        { status: 400 }
      );
    }

    const exam = await prisma.cbtExam.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        section: (section as Section) || Section.PRIMARY,
        classLevel,
        subject,
        durationMinutes: Number(durationMinutes) || 20,
        totalMarks: Number(totalMarks) || 30,
        passPercentage: Number(passPercentage) || 50,
        isActive: true,
        createdBy,
        questions: {
          create: questions.map((q: any, idx: number) => ({
            questionNumber: q.questionNumber || idx + 1,
            questionText: q.questionText,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: q.correctAnswer,
            marks: Number(q.marks) || 5,
            explanation: q.explanation || null,
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    return NextResponse.json({ success: true, exam }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating exam:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create exam in Neon DB." },
      { status: 500 }
    );
  }
}
