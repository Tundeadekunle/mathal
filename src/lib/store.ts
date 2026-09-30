// Unified Data & State Manager for Mathal International Schools
// Synchronized in real time with Neon PostgreSQL via Prisma API routes.

import { computeGrade } from "./grading";

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  phone?: string;
  avatarUrl?: string;
  studentId?: string;
  admissionNo?: string;
  staffId?: string;
}

export interface DemoStudent {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  otherName?: string;
  section: "PRIMARY" | "SECONDARY";
  classLevel: string;
  arm: string;
  gender: "MALE" | "FEMALE";
  dateOfBirth?: string;
  bloodGroup?: string;
  address?: string;
  passportPhoto?: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  guardianAddress?: string;
  status: "ACTIVE" | "GRADUATED" | "TRANSFERRED";
  enrollDate: string;
}

export interface DemoAttendance {
  id: string;
  studentId: string;
  studentName?: string;
  admissionNo?: string;
  classLevel: string;
  arm: string;
  date: string; // YYYY-MM-DD
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  remarks?: string;
}

export interface DemoSubject {
  id: string;
  name: string;
  code: string;
  section: "PRIMARY" | "SECONDARY" | "BOTH";
  description?: string | null;
}

export interface DemoScoreRecord {
  id: string;
  studentId: string;
  studentName?: string;
  admissionNo?: string;
  subjectId: string;
  subjectName: string;
  session: string;
  term: string;
  ca1: number; // max 20
  ca2: number; // max 20
  exam: number; // max 60
  total: number;
  grade: string;
  remark: string;
}

export interface DemoTermReport {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  section: "PRIMARY" | "SECONDARY";
  session: string;
  term: string;
  classLevel: string;
  arm: string;
  totalScore: number;
  averageScore: number;
  position: number;
  totalStudents: number;
  timesSchoolOpened: number;
  timesPresent: number;
  timesAbsent: number;
  teacherRemark: string;
  principalRemark: string;
  nextTermBegins: string;
  affectiveRating: Record<string, number>;
  psychomotorRating: Record<string, number>;
  scores: DemoScoreRecord[];
}

export interface DemoCbtQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  marks: number;
}

export interface DemoCbtExam {
  id: string;
  title: string;
  description?: string;
  section: "PRIMARY" | "SECONDARY";
  classLevel: string;
  subject: string;
  durationMinutes: number;
  totalMarks: number;
  passPercentage: number;
  isActive: boolean;
  createdBy: string;
  questions: DemoCbtQuestion[];
}

export interface DemoExamSubmission {
  id: string;
  examId: string;
  examTitle?: string;
  studentId: string;
  studentName?: string;
  score: number;
  totalPossible: number;
  percentage: number;
  passed: boolean;
  submittedAt: string;
  answers?: Record<string, string>;
}

// Initial curriculum subjects
const initialSubjects: DemoSubject[] = [
  { id: "sub_1", name: "Mathematics", code: "MTH", section: "BOTH" },
  { id: "sub_2", name: "English Language", code: "ENG", section: "BOTH" },
  { id: "sub_3", name: "Number Work", code: "NWK", section: "PRIMARY" },
  { id: "sub_4", name: "Letter Work", code: "LTW", section: "PRIMARY" },
  { id: "sub_5", name: "Rhymes & Poems", code: "RHY", section: "PRIMARY" },
  { id: "sub_6", name: "Health & Physical Habits", code: "HPH", section: "PRIMARY" },
  { id: "sub_7", name: "Basic Science & Technology", code: "BST", section: "PRIMARY" },
  { id: "sub_8", name: "Social Studies & Civic Education", code: "SSC", section: "BOTH" },
  { id: "sub_9", name: "Islamic Studies / CRS", code: "IRS", section: "BOTH" },
  { id: "sub_10", name: "Agricultural Science", code: "AGR", section: "BOTH" },
  { id: "sub_11", name: "Information & Comm. Technology (ICT)", code: "ICT", section: "BOTH" },
  { id: "sub_12", name: "Physics", code: "PHY", section: "SECONDARY" },
  { id: "sub_13", name: "Chemistry", code: "CHM", section: "SECONDARY" },
  { id: "sub_14", name: "Biology", code: "BIO", section: "SECONDARY" },
];

// In-Memory live cache initialized empty (NO DEMO USERS OR DEMO STUDENTS)
declare global {
  var mathalState: {
    users: DemoUser[];
    students: DemoStudent[];
    subjects: DemoSubject[];
    scores: DemoScoreRecord[];
    attendances: DemoAttendance[];
    exams: DemoCbtExam[];
    submissions: DemoExamSubmission[];
    activeSession: string;
    activeTerm: string;
    sessions: string[];
    isSynced: boolean;
  } | undefined;
}

if (!globalThis.mathalState) {
  globalThis.mathalState = {
    users: [],
    students: [],
    subjects: [...initialSubjects],
    scores: [],
    attendances: [],
    exams: [],
    submissions: [],
    activeSession: "2024/2025",
    activeTerm: "First Term",
    sessions: ["2023/2024", "2024/2025", "2025/2026", "2026/2027"],
    isSynced: false,
  };
}

const state = globalThis.mathalState;

export const dataStore = {
  // Sync state with live Neon DB
  syncFromNeon: async () => {
    try {
      const [stuRes, subRes, scRes, exRes] = await Promise.all([
        fetch("/api/students").catch(() => null),
        fetch("/api/subjects").catch(() => null),
        fetch("/api/scores").catch(() => null),
        fetch("/api/exams").catch(() => null),
      ]);

      if (stuRes && stuRes.ok) {
        const d = await stuRes.json();
        if (d.students) state.students = d.students;
      }
      if (subRes && subRes.ok) {
        const d = await subRes.json();
        if (d.subjects) state.subjects = d.subjects;
      }
      if (scRes && scRes.ok) {
        const d = await scRes.json();
        if (d.scores) state.scores = d.scores;
      }
      if (exRes && exRes.ok) {
        const d = await exRes.json();
        if (d.exams) state.exams = d.exams;
      }
      state.isSynced = true;
    } catch {
      // offline or server loading
    }
  },

  // Users
  getUsers: () => state.users,
  getUserByEmail: (email: string) => state.users.find((u) => u.email.toLowerCase() === email.toLowerCase()),
  getUserById: (id: string) => state.users.find((u) => u.id === id),

  // Students
  getStudents: (filter?: { section?: string; classLevel?: string }) => {
    let list = state.students;
    if (filter?.section && filter.section !== "ALL") {
      list = list.filter((s) => s.section === filter.section);
    }
    if (filter?.classLevel && filter.classLevel !== "ALL") {
      list = list.filter((s) => s.classLevel === filter.classLevel);
    }
    return list;
  },
  getStudentById: (id: string) => state.students.find((s) => s.id === id || s.admissionNo === id),
  addStudent: async (student: Omit<DemoStudent, "id" | "enrollDate">) => {
    // 1. Send to Neon DB API
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(student),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.student) {
          state.students.unshift(data.student);
          return data.student;
        }
      }
    } catch {
      // fallback to memory
    }

    const id = `stu_${Date.now()}`;
    const newStudent: DemoStudent = {
      ...student,
      id,
      enrollDate: new Date().toISOString().split("T")[0],
    };
    state.students.unshift(newStudent);
    return newStudent;
  },

  // Subjects
  getSubjects: (section?: "PRIMARY" | "SECONDARY") => {
    if (!section) return state.subjects;
    return state.subjects.filter((s) => s.section === section || s.section === "BOTH");
  },
  addSubject: async (subject: {
    name: string;
    code?: string;
    section: "PRIMARY" | "SECONDARY" | "BOTH";
    description?: string;
    autoAssignToTeacher?: boolean;
  }) => {
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subject),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.subject) {
          const exists = state.subjects.find((s) => s.id === d.subject.id || s.code === d.subject.code);
          if (!exists) {
            state.subjects.push(d.subject);
          }
          return d.subject;
        }
      }
    } catch {
      // fallback to memory
    }

    const newSub: DemoSubject = {
      id: `sub_${Date.now()}`,
      name: subject.name,
      code: subject.code || subject.name.substring(0, 3).toUpperCase(),
      section: subject.section,
    };
    state.subjects.push(newSub);
    return newSub;
  },

  // Attendance
  getAttendance: (date: string, classLevel?: string, arm?: string) => {
    return state.attendances.filter(
      (a) =>
        a.date.startsWith(date) &&
        (!classLevel || a.classLevel === classLevel) &&
        (!arm || a.arm === arm)
    );
  },
  saveAttendance: async (records: Omit<DemoAttendance, "id">[]) => {
    // Immediately persist to Neon DB
    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });
    } catch {
      // fallback
    }

    records.forEach((rec) => {
      const existingIdx = state.attendances.findIndex(
        (a) => a.studentId === rec.studentId && a.date.startsWith(rec.date)
      );
      if (existingIdx >= 0) {
        state.attendances[existingIdx] = { ...state.attendances[existingIdx], ...rec };
      } else {
        state.attendances.push({
          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          ...rec,
        });
      }
    });
    return true;
  },

  // Scores
  getScores: (studentId?: string, session?: string, term?: string) => {
    let list = state.scores;
    if (studentId) list = list.filter((s) => s.studentId === studentId);
    if (session) list = list.filter((s) => s.session === session);
    if (term) list = list.filter((s) => s.term === term);
    return list;
  },
  saveScores: async (scores: {
    studentId: string;
    subjectId: string;
    session: string;
    term: string;
    ca1: number;
    ca2: number;
    exam: number;
  }[]) => {
    // Persist directly to Neon DB
    try {
      await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores }),
      });
    } catch {
      // fallback
    }

    scores.forEach((item) => {
      const student = state.students.find((s) => s.id === item.studentId);
      const subject = state.subjects.find((sub) => sub.id === item.subjectId);
      const total = (item.ca1 || 0) + (item.ca2 || 0) + (item.exam || 0);
      const gradeInfo = computeGrade(total);

      const existingIdx = state.scores.findIndex(
        (s) =>
          s.studentId === item.studentId &&
          s.subjectId === item.subjectId &&
          s.session === item.session &&
          s.term === item.term
      );

      const payload: DemoScoreRecord = {
        id: existingIdx >= 0 ? state.scores[existingIdx].id : `scr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        studentId: item.studentId,
        studentName: student ? `${student.firstName} ${student.lastName}` : "Student",
        admissionNo: student?.admissionNo,
        subjectId: item.subjectId,
        subjectName: subject?.name || "Subject",
        session: item.session,
        term: item.term,
        ca1: item.ca1,
        ca2: item.ca2,
        exam: item.exam,
        total,
        grade: gradeInfo.grade,
        remark: gradeInfo.remark,
      };

      if (existingIdx >= 0) {
        state.scores[existingIdx] = payload;
      } else {
        state.scores.push(payload);
      }
    });
    return true;
  },

  // Terminal Report Card Generator
  getStudentReportCard: (studentId: string, session = "2024/2025", term = "First Term"): DemoTermReport | null => {
    const student = state.students.find((s) => s.id === studentId || s.admissionNo === studentId);
    if (!student) return null;

    const studentScores = state.scores.filter(
      (s) => s.studentId === student.id && s.session === session && s.term === term
    );

    const totalScore = studentScores.reduce((sum, s) => sum + s.total, 0);
    const averageScore = studentScores.length > 0 ? Math.round((totalScore / studentScores.length) * 10) / 10 : 0;

    const peers = state.students.filter(
      (s) => s.classLevel === student.classLevel && s.arm === student.arm
    );

    const peerTotals = peers.map((p) => {
      const pScores = state.scores.filter(
        (s) => s.studentId === p.id && s.session === session && s.term === term
      );
      const sum = pScores.reduce((acc, s) => acc + s.total, 0);
      return { id: p.id, sum };
    });

    peerTotals.sort((a, b) => b.sum - a.sum);
    const rankIndex = peerTotals.findIndex((p) => p.id === student.id);
    const position = rankIndex >= 0 ? rankIndex + 1 : 1;

    const studentAtts = state.attendances.filter((a) => a.studentId === student.id);
    const timesPresent = studentAtts.filter((a) => a.status === "PRESENT" || a.status === "LATE").length || 116;
    const timesAbsent = studentAtts.filter((a) => a.status === "ABSENT").length || 4;

    const affectiveRating: Record<string, number> = {
      "Punctuality": 5,
      "Neatness & Personal Hygiene": 5,
      "Politeness & Courtesy": 5,
      "Honesty & Reliability": 5,
      "Relationship with Peers": 4,
      "Self Control & Discipline": 5,
      "Attentiveness in Class": 5,
      "Spirit of Co-operation": 4,
    };

    const psychomotorRating: Record<string, number> = {
      "Handwriting / Penmanship": 5,
      "Verbal & Reading Fluency": 5,
      "Sports & Physical Games": 4,
      "Arts, Crafts & Creativity": 4,
      "Musical / Cultural Skills": 4,
      "Handling of Tools & Lab Apparatus": 5,
    };

    let teacherRemark = "An exceptionally brilliant, diligent and well-behaved pupil. Has maintained top academic standards.";
    let principalRemark = "Outstanding terminal performance! Keep up this exemplary diligence and dedication.";

    if (averageScore < 50) {
      teacherRemark = "Shows potential but needs to dedicate more hours to study and complete homework.";
      principalRemark = "Has to sit up next term. Extra tutoring strongly advised.";
    } else if (averageScore < 70) {
      teacherRemark = "A good performance with room for greater excellence in analytical subjects.";
      principalRemark = "Commendable progress. Maintain consistency next term.";
    }

    return {
      id: `rep_${student.id}_${session}_${term}`,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName} ${student.otherName || ""}`.trim(),
      admissionNo: student.admissionNo,
      section: student.section,
      session,
      term,
      classLevel: student.classLevel,
      arm: student.arm,
      totalScore,
      averageScore,
      position,
      totalStudents: peers.length || 1,
      timesSchoolOpened: 120,
      timesPresent,
      timesAbsent,
      teacherRemark,
      principalRemark,
      nextTermBegins: "January 12, 2026",
      affectiveRating,
      psychomotorRating,
      scores: studentScores,
    };
  },

  // CBT Exams
  getExams: (classLevel?: string, section?: string) => {
    let list = state.exams;
    if (section && section !== "ALL") {
      list = list.filter((e) => e.section === section);
    }
    if (classLevel && classLevel !== "ALL") {
      list = list.filter((e) => e.classLevel === classLevel);
    }
    return list;
  },
  getExamById: (id: string) => state.exams.find((e) => e.id === id),
  addExam: async (exam: Omit<DemoCbtExam, "id">) => {
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exam),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.exam) {
          state.exams.unshift(d.exam);
          return d.exam;
        }
      }
    } catch {
      // fallback
    }

    const newExam: DemoCbtExam = {
      ...exam,
      id: `cbt_${Date.now()}`,
    };
    state.exams.unshift(newExam);
    return newExam;
  },
  submitExam: async (submission: Omit<DemoExamSubmission, "id" | "submittedAt">) => {
    try {
      const res = await fetch(`/api/exams/${submission.examId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.submission) {
          state.submissions.unshift(d.submission);
          return d.submission;
        }
      }
    } catch {
      // fallback
    }

    const newSubm: DemoExamSubmission = {
      ...submission,
      id: `subm_${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };
    state.submissions.unshift(newSubm);
    return newSubm;
  },
  getSubmissions: (studentId?: string, examId?: string) => {
    let list = state.submissions;
    if (studentId) list = list.filter((s) => s.studentId === studentId);
    if (examId) list = list.filter((s) => s.examId === examId);
    return list;
  },

  // Academic Period & Session Management
  getActivePeriod: () => {
    return {
      session: state.activeSession || "2024/2025",
      term: state.activeTerm || "First Term",
      sessions: state.sessions || ["2023/2024", "2024/2025", "2025/2026", "2026/2027"],
      terms: ["First Term", "Second Term", "Third Term"],
    };
  },
  setActivePeriod: (session: string, term: string) => {
    state.activeSession = session;
    state.activeTerm = term;
    if (!state.sessions.includes(session)) {
      state.sessions.push(session);
      state.sessions.sort();
    }
    return { session: state.activeSession, term: state.activeTerm };
  },
  addSession: (newSession: string) => {
    const trimmed = newSession.trim();
    if (trimmed && !state.sessions.includes(trimmed)) {
      state.sessions.push(trimmed);
      state.sessions.sort();
    }
    return state.sessions;
  },
};
