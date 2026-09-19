import { NextResponse } from "next/server";
import { dataStore } from "@/lib/store";

export async function GET() {
  return NextResponse.json({
    message: "Mathal International Schools Data Layer initialized.",
    stats: {
      studentsCount: dataStore.getStudents().length,
      examsCount: dataStore.getExams().length,
      scoresCount: dataStore.getScores().length,
    },
  });
}
