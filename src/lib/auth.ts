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

export function parseAllocations(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isClassAllocated(
  assignedClasses: string | null | undefined,
  classLevel: string
): boolean {
  if (!assignedClasses || !classLevel) return false;
  const list = parseAllocations(assignedClasses);
  const target = classLevel.trim().toLowerCase();
  return list.some((c) => c.toLowerCase() === target);
}

export function isSubjectAllocated(
  assignedSubjects: string | null | undefined,
  subjectIdentifier: string
): boolean {
  if (!assignedSubjects || !subjectIdentifier) return false;
  const list = parseAllocations(assignedSubjects);
  const target = subjectIdentifier.trim().toLowerCase();
  return list.some((s) => s.toLowerCase() === target);
}

export async function getAuthUserFromRequest(req: Request): Promise<AuthUser | null> {
  try {
    let sessionCookie: string | undefined;

    // 1. Try parsing from Cookie header of the request
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("mathal_session="));
      if (match) {
        sessionCookie = decodeURIComponent(match.substring("mathal_session=".length));
      }
    }

    // 2. Fallback to next/headers cookies() if available
    if (!sessionCookie) {
      try {
        const nextHeaders: any = await import("next/headers");
        const cookieStore = await nextHeaders.cookies();
        sessionCookie = cookieStore?.get?.("mathal_session")?.value;
      } catch {
        // ignore
      }
    }

    if (!sessionCookie) return null;

    let parsed: any;
    try {
      parsed = JSON.parse(sessionCookie);
    } catch {
      return null;
    }

    if (!parsed?.id) return null;

    const dbUser = await prisma.user.findUnique({
      where: { id: parsed.id },
      include: { student: true, teacher: true },
    });

    if (!dbUser) return null;

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
  } catch {
    return null;
  }
}
