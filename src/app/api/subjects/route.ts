import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Section } from "@prisma/client";

const DEFAULT_SUBJECTS = [
  { name: "Mathematics", code: "MTH", section: Section.BOTH, description: "General Mathematics for Primary & Secondary" },
  { name: "English Language", code: "ENG", section: Section.BOTH, description: "Grammar, Comprehension, and Composition" },
  { name: "Number Work", code: "NWK", section: Section.PRIMARY, description: "Early numeracy, counting and basic calculations for KG & Primary" },
  { name: "Letter Work", code: "LTW", section: Section.PRIMARY, description: "Literacy, alphabet recognition, and handwriting for KG & Primary" },
  { name: "Rhymes & Poems", code: "RHY", section: Section.PRIMARY, description: "Nursery rhymes, diction and auditory skills for KG & Primary" },
  { name: "Health & Physical Habits", code: "HPH", section: Section.PRIMARY, description: "Personal hygiene, physical play and safety habits" },
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      code,
      section = "PRIMARY",
      description,
      autoAssignToTeacher = true,
      teacherId,
      userId,
    } = body;

    // Authenticate session (Teacher or Admin)
    const sessionCookie = req.cookies.get("mathal_session")?.value;
    let currentUser: any = null;

    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(sessionCookie);
        if (sessionData?.id) {
          currentUser = await prisma.user.findUnique({
            where: { id: sessionData.id },
            include: { teacher: true },
          });
        }
      } catch {
        // invalid cookie
      }
    }

    // Fallback authentication if cookie was missing/expired but teacherId or userId was provided
    if (!currentUser && (teacherId || userId)) {
      if (teacherId) {
        const teacherRec = await prisma.teacher.findUnique({
          where: { id: teacherId },
          include: { user: true },
        });
        if (teacherRec?.user) {
          currentUser = { ...teacherRec.user, teacher: teacherRec };
        }
      } else if (userId) {
        currentUser = await prisma.user.findUnique({
          where: { id: userId },
          include: { teacher: true },
        });
      }
    }

    if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Authentication required. Only teachers and administrators can create subjects." },
        { status: 403 }
      );
    }

    // Ensure teacher profile is attached if user is a teacher
    if (currentUser.role === "TEACHER" && !currentUser.teacher) {
      currentUser.teacher = await prisma.teacher.findUnique({
        where: { userId: currentUser.id },
      });
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Subject name is required." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Auto-generate code if omitted
    let finalCode = code && typeof code === "string" && code.trim()
      ? code.trim().toUpperCase()
      : trimmedName
          .replace(/[^a-zA-Z0-9]/g, "")
          .substring(0, 4)
          .toUpperCase();

    if (!finalCode) {
      finalCode = `SUB${Math.floor(100 + Math.random() * 900)}`;
    }

    // Check if code or name already exists
    const existing = await prisma.subject.findFirst({
      where: {
        OR: [
          { code: finalCode },
          { name: { equals: trimmedName, mode: "insensitive" } },
        ],
      },
    });

    let subject;
    if (existing) {
      subject = existing;
    } else {
      let secEnum: Section = Section.PRIMARY;
      if (section === "SECONDARY") secEnum = Section.SECONDARY;
      if (section === "BOTH") secEnum = Section.BOTH;

      subject = await prisma.subject.create({
        data: {
          name: trimmedName,
          code: finalCode,
          section: secEnum,
          description: description?.trim() || null,
        },
      });
    }

    // If teacher requested auto-assign or is creating it, add to their assignedSubjects
    let updatedAssignedSubjects: string[] | null = null;
    if (autoAssignToTeacher && currentUser.teacher) {
      const currentRaw = currentUser.teacher.assignedSubjects || "";
      const currentList = currentRaw
        ? currentRaw.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

      if (!currentList.some((s: string) => s.toLowerCase() === subject.name.toLowerCase())) {
        currentList.push(subject.name);
        await prisma.teacher.update({
          where: { id: currentUser.teacher.id },
          data: {
            assignedSubjects: currentList.join(","),
          },
        });
        updatedAssignedSubjects = currentList;
      } else {
        updatedAssignedSubjects = currentList;
      }
    }

    const response = NextResponse.json(
      {
        success: true,
        subject,
        updatedAssignedSubjects,
        message: existing
          ? `Subject "${subject.name}" (${subject.code}) is now active for your classes.`
          : `Subject "${subject.name}" (${subject.code}) created successfully and added to your classes!`,
      },
      { status: 201 }
    );

    // Synchronize mathal_session cookie with the updated assignedSubjects
    if (updatedAssignedSubjects) {
      try {
        const rawCookie = req.cookies.get("mathal_session")?.value;
        if (rawCookie) {
          const parsed = JSON.parse(rawCookie);
          parsed.assignedSubjects = updatedAssignedSubjects.join(",");
          response.cookies.set("mathal_session", JSON.stringify(parsed), {
            path: "/",
            httpOnly: false,
            maxAge: 60 * 60 * 24 * 7,
          });
        }
      } catch {
        // ignore cookie sync error
      }
    }

    return response;
  } catch (error: any) {
    console.error("Error creating subject:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create subject." },
      { status: 500 }
    );
  }
}

