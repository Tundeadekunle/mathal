import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const exam = await prisma.cbtExam.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { questionNumber: "asc" },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, exam });
  } catch (error: any) {
    console.error("Error fetching exam:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch exam from Neon DB." },
      { status: 500 }
    );
  }
}
