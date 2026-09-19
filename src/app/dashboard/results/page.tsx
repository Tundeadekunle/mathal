"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useAcademic } from "@/lib/academic-context";
import { dataStore, DemoStudent } from "@/lib/store";
import {
  PRIMARY_CLASSES,
  SECONDARY_CLASSES,
} from "@/lib/grading";
import {
  Award,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  School,
  FileCheck2,
} from "lucide-react";

export default function ResultsDirectoryPage() {
  const { user } = useAuth();
  const { session, term, sessions, terms, setSession, setTerm } = useAcademic();
  const [students, setStudents] = useState<DemoStudent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((d) => {
        if (d.students) setStudents(d.students);
      })
      .catch(() => setStudents(dataStore.getStudents()));
  }, []);

  const role = user?.role || "STUDENT";

  // Filter students
  const filtered = students.filter((s) => {
    // If student role, only show own result
    if (role === "STUDENT") {
      const match =
        s.id === user?.studentId ||
        s.admissionNo === user?.admissionNo ||
        s.id === user?.id ||
        (user?.name && `${s.firstName} ${s.lastName}`.toLowerCase() === user.name.toLowerCase());
      if (match) return true;
      if (user?.studentId || user?.admissionNo) return false;
    }
    const matchesSec = sectionFilter === "ALL" || s.section === sectionFilter;
    const matchesCls = classFilter === "ALL" || s.classLevel === classFilter;
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    const matchesQuery =
      fullName.includes(searchQuery.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSec && matchesCls && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-black text-slate-900 tracking-tight">
            Terminal Results &amp; Report Cards
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official terminal report sheets with watermark school background, psychomotor ratings, and PDF export.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 self-start sm:self-auto">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>{session} &bull; {term}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student by name or admission no..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:inline" />
          <select
            value={sectionFilter}
            onChange={(e) => {
              setSectionFilter(e.target.value);
              setClassFilter("ALL");
            }}
            className="py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Wings</option>
            <option value="PRIMARY">Primary Wing</option>
            <option value="SECONDARY">Secondary Wing</option>
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Classes</option>
            {(sectionFilter === "PRIMARY"
              ? PRIMARY_CLASSES
              : sectionFilter === "SECONDARY"
              ? SECONDARY_CLASSES
              : [...PRIMARY_CLASSES, ...SECONDARY_CLASSES]
            ).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={session}
            onChange={(e) => setSession(e.target.value)}
            className="py-2 px-3 text-sm bg-emerald-50/60 border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-emerald-950"
          >
            {sessions.map((s) => (
              <option key={s} value={s}>
                {s} Session
              </option>
            ))}
          </select>

          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="py-2 px-3 text-sm bg-amber-50/60 border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-900"
          >
            {terms.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Student Result Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((student) => {
          const report = dataStore.getStudentReportCard(student.id, session, term);

          return (
            <div
              key={student.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-bold text-xs text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded">
                    {student.admissionNo}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      student.section === "PRIMARY"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {student.section}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base">
                  {student.firstName} {student.lastName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {student.classLevel} &bull; {student.arm} Arm
                </p>

                {report && (
                  <div className="mt-4 py-3 px-3.5 bg-slate-50 rounded-xl grid grid-cols-2 gap-2 text-center text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Average
                      </div>
                      <div className="font-black text-slate-900 mt-0.5">
                        {report.averageScore}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Class Position
                      </div>
                      <div className="font-black text-emerald-700 mt-0.5">
                        {report.position} / {report.totalStudents}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">
                  {report?.scores.length || 0} Subjects Scored
                </span>

                <Link
                  href={`/dashboard/results/${student.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs shadow-sm transition-all"
                >
                  {role === "STUDENT" ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      View &amp; Print
                    </>
                  ) : (
                    <>
                      <Award className="w-3.5 h-3.5" />
                      Evaluate &amp; Print
                    </>
                  )}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
