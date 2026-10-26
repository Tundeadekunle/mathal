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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, scheduledPublishAt, isActive } = body;

    const existing = await prisma.cbtExam.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Exam not found." }, { status: 404 });
    }

    const dataToUpdate: any = {};

    if (action === "publish_now") {
      const now = new Date();
      dataToUpdate.scheduledPublishAt = null;
      dataToUpdate.publishedAt = now;
      dataToUpdate.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      dataToUpdate.isActive = true;
    } else if (action === "reopen_24h") {
      const now = new Date();
      dataToUpdate.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      dataToUpdate.isActive = true;
    } else if (action === "reschedule" && scheduledPublishAt) {
      const parsed = new Date(scheduledPublishAt);
      if (!isNaN(parsed.getTime())) {
        dataToUpdate.scheduledPublishAt = parsed;
        dataToUpdate.publishedAt = parsed;
        dataToUpdate.expiresAt = new Date(parsed.getTime() + 24 * 60 * 60 * 1000);
      }
    } else {
      if (typeof isActive === "boolean") dataToUpdate.isActive = isActive;
      if (scheduledPublishAt !== undefined) {
        if (!scheduledPublishAt) {
          dataToUpdate.scheduledPublishAt = null;
        } else {
          const parsed = new Date(scheduledPublishAt);
          if (!isNaN(parsed.getTime())) {
            dataToUpdate.scheduledPublishAt = parsed;
            dataToUpdate.publishedAt = parsed;
            dataToUpdate.expiresAt = new Date(parsed.getTime() + 24 * 60 * 60 * 1000);
          }
        }
      }
    }

    const updated = await prisma.cbtExam.update({
      where: { id },
      data: dataToUpdate,
      include: {
        questions: { orderBy: { questionNumber: "asc" } },
      },
    });

    return NextResponse.json({ success: true, exam: updated });
  } catch (error: any) {
    console.error("Error updating exam:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update exam." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.cbtExam.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Exam deleted successfully." });
  } catch (error: any) {
    console.error("Error deleting exam:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete exam." },
      { status: 500 }
    );
  }
}
