// Server-side Auth helper backed by Neon DB
import prisma from "./prisma";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  phone?: string;
  avatarUrl?: string;
  studentId?: string;
  admissionNo?: string;
  staffId?: string;
  teacherId?: string;
  assignedClasses?: string | null;
  assignedSubjects?: string | null;
  assignedSection?: "PRIMARY" | "SECONDARY" | "BOTH";
}

export async function getServerSession(): Promise<AuthUser | null> {
  try {
    const nextHeaders: any = await import("next/headers");
    const cookieStore = await nextHeaders.cookies();
    const sessionCookie = cookieStore?.get?.("mathal_session")?.value;

    if (sessionCookie) {
      const parsed = JSON.parse(sessionCookie);
      if (parsed?.id) {
        // Optionally verify against Neon DB
        const dbUser = await prisma.user.findUnique({
          where: { id: parsed.id },
          include: { student: true, teacher: true },
        });

        if (dbUser) {
          return {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role as "ADMIN" | "TEACHER" | "STUDENT",
            phone: dbUser.phone || undefined,
            studentId: dbUser.student?.id,
            admissionNo: dbUser.student?.admissionNo,
            staffId: dbUser.teacher?.staffId,
            teacherId: dbUser.teacher?.id,
            assignedClasses: dbUser.teacher?.assignedClasses,
            assignedSubjects: dbUser.teacher?.assignedSubjects,
            assignedSection: dbUser.teacher?.assignedSection as any,
          };
        }
      }
    }
  } catch {
    // ignore
  }

  return null;
}
