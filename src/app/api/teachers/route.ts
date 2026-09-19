import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section");

    const where: any = {};
    if (section && section !== "ALL" && section !== "BOTH") {
      where.OR = [
        { assignedSection: section },
        { assignedSection: "BOTH" },
      ];
    }

    const teachers = await prisma.teacher.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
      orderBy: { staffId: "asc" },
    });

    const formatted = teachers.map((t) => ({
      id: t.id,
      userId: t.userId,
      staffId: t.staffId,
      name: t.user.name,
      email: t.user.email,
      phone: t.user.phone,
      title: t.title,
      qualification: t.qualification,
      assignedSection: t.assignedSection,
      assignedClasses: t.assignedClasses ? t.assignedClasses.split(",").map((c) => c.trim()).filter(Boolean) : [],
      assignedClassesRaw: t.assignedClasses || "",
      assignedSubjects: t.assignedSubjects ? t.assignedSubjects.split(",").map((s) => s.trim()).filter(Boolean) : [],
      assignedSubjectsRaw: t.assignedSubjects || "",
      createdAt: t.createdAt,
    }));

    return NextResponse.json({ teachers: formatted }, { status: 200 });
  } catch (error: any) {
    console.error("Fetch teachers error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch teachers." },
      { status: 500 }
    );
  }
}
