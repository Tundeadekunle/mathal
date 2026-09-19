"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useAcademic } from "@/lib/academic-context";
import { dataStore, DemoStudent, DemoCbtExam } from "@/lib/store";
import {
  Users,
  CalendarCheck,
  Award,
  GraduationCap,
  ArrowRight,
  Sparkles,
  School,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ChevronRight,
  Calendar,
  Check,
  SlidersHorizontal,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

export default function DashboardOverview() {
  const { user } = useAuth();
  const { session, term, sessions, terms, setSession, setTerm } = useAcademic();
  const [students, setStudents] = useState<DemoStudent[]>([]);
  const [exams, setExams] = useState<DemoCbtExam[]>([]);

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((d) => {
        if (d.students) setStudents(d.students);
      })
      .catch(() => setStudents(dataStore.getStudents()));

    fetch("/api/exams")
      .then((r) => r.json())
      .then((d) => {
        if (d.exams) setExams(d.exams);
      })
      .catch(() => setExams(dataStore.getExams()));
  }, []);

  if (!user) return null;

  const role = user.role;
  const primaryCount = students.filter((s) => s.section === "PRIMARY").length;
  const secondaryCount = students.filter((s) => s.section === "SECONDARY").length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1A36] via-[#0D224A] to-[#0A162C] text-white p-6 sm:p-8 shadow-sm border border-blue-900/40">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-700/60 text-amber-300 text-xs font-semibold mb-3 shadow-inner">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Academic Portal Active &bull; </span>
              <span className="font-bold underline decoration-amber-400">{session} {term}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight">
              Welcome back, {user.name}
            </h1>
            <p className="mt-1 text-sm text-blue-100/90 max-w-xl">
              {role === "ADMIN" &&
                "School Administration dashboard. Oversee primary & secondary enrollments, attendance, assessment results, and CBT testing."}
              {role === "TEACHER" &&
                "Teacher portal. Take daily attendance, record Continuous Assessment (CA1 & CA2) and Exam scores, and coordinate CBT tests."}
              {role === "STUDENT" &&
                "Pupil / Student portal. Review your daily attendance, take assigned CBT tests in the exam hall, and view or download your official terminal report card."}
            </p>
          </div>

          <div className="flex-shrink-0 flex items-center gap-3">
            {role === "STUDENT" ? (
              <Link
                href="/dashboard/results"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-sm shadow-md transition-all"
              >
                <Award className="w-4 h-4" />
                View My Result
              </Link>
            ) : (
              <Link
                href="/dashboard/scores"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-sm shadow-md transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Input Scores
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Teacher's Allocated Classes & Subjects Banner */}
      {role === "TEACHER" && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                user.assignedClasses || user.assignedSubjects
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {user.assignedClasses || user.assignedSubjects ? (
                <ShieldCheck className="w-6 h-6" />
              ) : (
                <AlertCircle className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-sm">
                  Official Academic Allocation
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Admin Assigned
                </span>
              </div>
              {user.assignedClasses || user.assignedSubjects ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-400">Assigned Classes: </span>
                    <strong className="text-slate-800">
                      {user.assignedClasses || "Pending"}
                    </strong>
                  </div>
                  <span className="text-slate-300">&bull;</span>
                  <div>
                    <span className="font-semibold text-slate-400">Assigned Subjects: </span>
                    <strong className="text-slate-800">
                      {user.assignedSubjects || "Pending"}
                    </strong>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                  Your teaching classes and subjects are currently pending allocation by school administrators. Please contact school administration to configure your academic duties.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <Link
              href="/dashboard/scores"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
            >
              Record Scores
            </Link>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{students.length}</div>
            <div className="text-xs font-semibold text-slate-500">Enrolled Students</div>
            <div className="text-[11px] text-emerald-600 font-medium">
              {primaryCount} Primary &bull; {secondaryCount} Secondary
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">96.8%</div>
            <div className="text-xs font-semibold text-slate-500">Attendance Rate</div>
            <div className="text-[11px] text-blue-600 font-medium">Today&apos;s Roll Marked</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{exams.length}</div>
            <div className="text-xs font-semibold text-slate-500">Active CBT Exams</div>
            <div className="text-[11px] text-purple-600 font-medium">Test Hall Open</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <School className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800 truncate max-w-[150px]">{term}</div>
            <div className="text-xs font-semibold text-slate-500">{session} Session</div>
            <div className="text-[11px] text-amber-600 font-medium">CA &amp; Exam Season</div>
          </div>
        </div>
      </div>

      {/* Academic Session & Term Switcher Panel */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white p-5 rounded-2xl border border-emerald-800/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">Current Academic Period:</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs">
                {session} &bull; {term}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Switching the session and term updates all grade books, report cards, and CBT testing parameters immediately.
            </p>
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-xl p-1 text-xs">
            <span className="px-2 text-[11px] font-bold text-slate-400">SESSION:</span>
            {sessions.map((s) => (
              <button
                key={s}
                onClick={() => setSession(s)}
                className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all ${
                  session === s
                    ? "bg-emerald-600 text-white shadow"
                    : "text-slate-300 hover:text-white hover:bg-slate-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-xl p-1 text-xs">
            <span className="px-2 text-[11px] font-bold text-slate-400">TERM:</span>
            {terms.map((t) => (
              <button
                key={t}
                onClick={() => setTerm(t)}
                className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all ${
                  term === t
                    ? "bg-amber-400 text-slate-950 font-bold shadow"
                    : "text-slate-300 hover:text-white hover:bg-slate-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Launch Actions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-bold text-slate-800">Quick Access Portals</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {role !== "STUDENT" && (
              <Link
                href="/dashboard/students"
                className="group p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 group-hover:text-emerald-800 transition-colors">
                    Pupils &amp; Students Directory
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Register new learners in Nursery, Basic 1-6, JSS, and SSS with automated admission IDs.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  Register &amp; Manage
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )}

            {role === "ADMIN" && (
              <Link
                href="/dashboard/teachers"
                className="group p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 group-hover:text-emerald-800 transition-colors">
                    Faculty &amp; Staff Allocations
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Assign and configure classes and curriculum subjects to teachers. Exclusive to school administrators.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  Assign Classes &amp; Subjects
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )}

            {role !== "STUDENT" && (
              <Link
                href="/dashboard/attendance"
                className="group p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-blue-500/50 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 group-hover:text-blue-800 transition-colors">
                    Daily Attendance Roll Call
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Mark class rosters with 1-click status (Present, Absent, Late, Excused) for today.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-blue-700">
                  Take Attendance
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )}

            {role !== "STUDENT" && (
              <Link
                href="/dashboard/scores"
                className="group p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-amber-500/50 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 group-hover:text-amber-800 transition-colors">
                    Continuous Assessment &amp; Exams
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Enter CA 1 (20), CA 2 (20), and Terminal Exam (60) with automatic grading &amp; remarks.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-amber-700">
                  Record Scores
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )}

            <Link
              href="/dashboard/exam-portal"
              className="group p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-purple-500/50 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 group-hover:text-purple-800 transition-colors">
                  CBT Online Exam Portal
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  {role === "STUDENT"
                    ? "Enter the timed test hall to take scheduled computer-based assessments."
                    : "Create and publish multiple-choice quizzes and tests with auto-grading."}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-purple-700">
                {role === "STUDENT" ? "Enter Exam Hall" : "Manage CBT Exams"}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/dashboard/results"
              className="group p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between sm:col-span-2"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 group-hover:text-emerald-800 transition-colors">
                  Terminal Report Cards with School Crest Watermark
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Generate official terminal reports featuring the Mathal International Schools crest watermark background, comprehensive subject breakdowns, psychomotor ratings, and 1-click PDF download.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                Generate &amp; Download Result Sheet
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>

        {/* Sidebar Status / Active Tests */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-800">Active CBT Tests</h2>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-sm">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800 mb-1">
                  <span className="px-2 py-0.5 rounded bg-emerald-100/70 font-bold">
                    {exam.section} &bull; {exam.classLevel}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3 h-3" />
                    {exam.durationMinutes} mins
                  </span>
                </div>
                <h4 className="font-bold text-slate-800 text-sm">{exam.title}</h4>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {exam.questions.length} questions ({exam.totalMarks} marks)
                  </span>
                  <Link
                    href={`/dashboard/exam-portal/${exam.id}/take`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
                  >
                    Start Exam
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-slate-100 text-center">
              <Link
                href="/dashboard/exam-portal"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                View all scheduled exams &rarr;
              </Link>
            </div>
          </div>

          {/* School Motto Callout */}
          <div className="rounded-2xl bg-emerald-900 text-emerald-100 p-5 border border-emerald-800">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              School Philosophy
            </div>
            <p className="text-xs italic leading-relaxed text-emerald-200">
              &ldquo;At Mathal International Schools, we nurture every child&apos;s moral foundation, intellectual curiosity, and creative brilliance for a radiant future.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
