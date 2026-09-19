import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Section } from "@prisma/client";

const DEFAULT_SUBJECTS = [
  { name: "Mathematics", code: "MTH", section: Section.BOTH, description: "General Mathematics for Primary & Secondary" },
  { name: "English Language", code: "ENG", section: Section.BOTH, description: "Grammar, Comprehension, and Composition" },
  { name: "Basic Science & Technology", code: "BST", section: Section.PRIMARY, description: "Foundational Sciences for Primary Pupils" },
  { name: "Social Studies & Civic Education", code: "SSC", section: Section.BOTH, description: "Civic values, community and history" },
  { name: "Agricultural Science", code: "AGR", section: Section.BOTH, description: "Farming, Crops and Livestock Management" },
  { name: "Information & Comm. Technology (ICT)", code: "ICT", section: Section.BOTH, description: "Computer literacy, coding & typing" },
  { name: "Physics", code: "PHY", section: Section.SECONDARY, description: "Mechanics, Heat, Sound and Waves" },
  { name: "Chemistry", code: "CHM", section: Section.SECONDARY, description: "Inorganic, Organic and Physical Chemistry" },
  { name: "Biology", code: "BIO", section: Section.SECONDARY, description: "Ecology, Anatomy and Genetics" },
  { name: "Islamic Religious Studies / CRS", code: "IRS", section: Section.BOTH, description: "Moral & Religious Instruction" },
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section");

    // Check count; auto-seed if empty
    const count = await prisma.subject.count();
    if (count === 0) {
      for (const s of DEFAULT_SUBJECTS) {
        await prisma.subject.upsert({
          where: { code: s.code },
          update: {},
          create: s,
        });
      }
    }

    const whereClause: any = {};
    if (section && section !== "ALL") {
      whereClause.OR = [
        { section: section as Section },
        { section: Section.BOTH },
      ];
    }

    const subjects = await prisma.subject.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, subjects });
  } catch (error: any) {
    console.error("Error fetching subjects:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch subjects from database." },
      { status: 500 }
    );
  }
}
