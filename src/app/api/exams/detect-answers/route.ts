import { NextResponse } from "next/server";
import { parseExamQuestions, applyAnswerKeyToQuestions, ParsedQuestion } from "@/lib/cbt-parser";
import { solveQuestion } from "@/lib/cbt-solver";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rawText, rawAnswerKey = "", questions: inputQuestions, defaultMarks = 5 } = body;

    let questions: ParsedQuestion[] = [];

    if (rawText && typeof rawText === "string") {
      const parsed = parseExamQuestions(rawText, defaultMarks, rawAnswerKey);
      questions = parsed.questions;
    } else if (Array.isArray(inputQuestions)) {
      questions = inputQuestions.map((q: any, idx: number) => {
        const options = {
          A: q.optionA || "",
          B: q.optionB || "",
          C: q.optionC || "",
          D: q.optionD || "",
        };

        let currentAns = q.correctAnswer;
        let method = q.detectedFrom || "";
        let confidence = q.confidence || "medium";

        // Try intelligent solver
        const solved = solveQuestion(q.questionText, options);
        if (solved.detectedAnswer) {
          currentAns = solved.detectedAnswer;
          method = solved.reason;
          confidence = solved.confidence;
        }

        return {
          questionNumber: q.questionNumber || idx + 1,
          questionText: q.questionText,
          optionA: options.A,
          optionB: options.B,
          optionC: options.C,
          optionD: options.D,
          correctAnswer: currentAns || "A",
          marks: q.marks || defaultMarks,
          explanation: q.explanation || solved.reason,
          detectedFrom: method,
          confidence,
        };
      });
    }

    // Apply explicit pasted answer key if provided
    if (rawAnswerKey && rawAnswerKey.trim()) {
      questions = applyAnswerKeyToQuestions(questions, rawAnswerKey);
    } else {
      // Re-solve questions that don't have high confidence
      questions = questions.map((q) => {
        if (q.confidence === "high") return q;

        const options = {
          A: q.optionA,
          B: q.optionB,
          C: q.optionC,
          D: q.optionD,
        };

        const solved = solveQuestion(q.questionText, options);
        if (solved.detectedAnswer) {
          return {
            ...q,
            correctAnswer: solved.detectedAnswer,
            detectedFrom: solved.reason,
            confidence: solved.confidence,
            explanation: q.explanation || solved.reason,
          };
        }

        return q;
      });
    }

    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 5), 0);

    return NextResponse.json({
      success: true,
      questions,
      totalQuestions: questions.length,
      totalMarks,
      message: `Detected and verified answers for ${questions.length} questions.`,
    });
  } catch (error: any) {
    console.error("Error detecting answers:", error);
    return NextResponse.json(
      { error: error.message || "Failed to auto-detect answers." },
      { status: 500 }
    );
  }
}
