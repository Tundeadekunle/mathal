"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { dataStore, DemoStudent, DemoSubject } from "@/lib/store";
import { useAcademic } from "@/lib/academic-context";
import {
  PRIMARY_CLASSES,
  SECONDARY_CLASSES,
  computeGrade,
} from "@/lib/grading";
import {
  Save,
  Check,
  Award,
  AlertCircle,
  BookOpen,
  RefreshCw,
  CheckCircle2,
  Database,
} from "lucide-react";

interface StudentScoreEntry {
  studentId: string;
  studentName: string;
  admissionNo: string;
  ca1: number;
  ca2: number;
  exam: number;
  total: number;
  grade: string;
  remark: string;
}

export default function ScoresPage() {
  const { user } = useAuth();
  const { session: activeSession, term: activeTerm, sessions, terms, setSession: setActiveSession, setTerm: setActiveTerm } = useAcademic();
  const [section, setSection] = useState<"PRIMARY" | "SECONDARY">("PRIMARY");
  const [classLevel, setClassLevel] = useState("Basic 1");
  const [session, setSession] = useState(activeSession);
  const [term, setTerm] = useState(activeTerm);
  const [subjects, setSubjects] = useState<DemoSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("sub_1");
  const [scoreEntries, setScoreEntries] = useState<StudentScoreEntry[]>([]);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<string, "saved" | "unsaved" | "saving" | "error">>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [classesWithStudents, setClassesWithStudents] = useState<string[]>([]);

  // Sync with global academic period changes
  useEffect(() => {
    setSession(activeSession);
    setTerm(activeTerm);
  }, [activeSession, activeTerm]);

  const isTeacher = user?.role === "TEACHER";

  const teacherClasses =
    isTeacher && user?.assignedClasses
      ? user.assignedClasses.split(",").map((c) => c.trim()).filter(Boolean)
      : null;

  const teacherSubjects =
    isTeacher && user?.assignedSubjects
      ? user.assignedSubjects.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

  const hasTeacherAssignments =
    !isTeacher ||
    (Boolean(teacherClasses && teacherClasses.length > 0) &&
      Boolean(teacherSubjects && teacherSubjects.length > 0));

  const allSecClasses = section === "PRIMARY" ? PRIMARY_CLASSES : SECONDARY_CLASSES;
  const displayedClasses =
    isTeacher && teacherClasses && teacherClasses.length > 0
      ? allSecClasses.filter((c) => teacherClasses.includes(c)).length > 0
        ? allSecClasses.filter((c) => teacherClasses.includes(c))
        : teacherClasses
      : allSecClasses;

  useEffect(() => {
    async function loadSubjects() {
      try {
        const res = await fetch(`/api/subjects?section=${section}`);
        if (res.ok) {
          const d = await res.json();
          if (d.subjects && d.subjects.length > 0) {
            setSubjects(d.subjects);
            return;
          }
        }
      } catch {
        // fallback
      }
      const loadedSubs = dataStore.getSubjects(section);
      setSubjects(loadedSubs);
    }
    loadSubjects();
  }, [section]);

  const displayedSubjects =
    isTeacher && teacherSubjects && teacherSubjects.length > 0
      ? subjects.filter((s) => teacherSubjects.includes(s.name)).length > 0
        ? subjects.filter((s) => teacherSubjects.includes(s.name))
        : subjects
      : subjects;

  const classesKey = displayedClasses.join(",");
  const subjectsKey = displayedSubjects.map((s) => s.id).join(",");

  // Keep classLevel and selectedSubjectId within displayed selections
  useEffect(() => {
    if (displayedClasses.length > 0 && !displayedClasses.includes(classLevel)) {
      setClassLevel(displayedClasses[0]);
    }
  }, [classesKey, classLevel]);

  useEffect(() => {
    if (
      displayedSubjects.length > 0 &&
      !displayedSubjects.some((s) => s.id === selectedSubjectId)
    ) {
      setSelectedSubjectId(displayedSubjects[0].id);
    }
  }, [subjectsKey, selectedSubjectId]);

  const loadClassScores = async () => {
    try {
      // Also discover which classes have students
      fetch(`/api/students?section=${section}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.students) {
            const classes = Array.from(new Set(d.students.map((s: any) => s.classLevel as string))) as string[];
            setClassesWithStudents(classes);
          }
        })
        .catch(() => {});

      const [stuRes, scRes] = await Promise.all([
        fetch(`/api/students?section=${section}&classLevel=${encodeURIComponent(classLevel)}`),
        fetch(
          `/api/scores?classLevel=${encodeURIComponent(classLevel)}&session=${encodeURIComponent(session)}&term=${encodeURIComponent(term)}`
        ),
      ]);

      let classStudents: DemoStudent[] = [];
      if (stuRes.ok) {
        const d = await stuRes.json();
        if (d.students) classStudents = d.students;
      }

      let existingScores: any[] = [];
      if (scRes.ok) {
        const d = await scRes.json();
        if (d.scores) existingScores = d.scores;
      }

      const entries: StudentScoreEntry[] = classStudents.map((st) => {
        const match = existingScores.find(
          (s) => s.studentId === st.id && s.subjectId === selectedSubjectId
        );

        const ca1 = match ? match.ca1 : 0;
        const ca2 = match ? match.ca2 : 0;
        const exam = match ? match.exam : 0;
        const total = ca1 + ca2 + exam;
        const gradeInfo = computeGrade(total);

        return {
          studentId: st.id,
          studentName: `${st.firstName} ${st.lastName}`,
          admissionNo: st.admissionNo,
          ca1,
          ca2,
          exam,
          total,
          grade: gradeInfo.grade,
          remark: gradeInfo.remark,
        };
      });

      setScoreEntries(entries);
      setRowStatus({});
    } catch {
      const classStudents = dataStore.getStudents({ section, classLevel });
      const existingScores = dataStore.getScores(undefined, session, term);

      const entries: StudentScoreEntry[] = classStudents.map((st) => {
        const match = existingScores.find(
          (s) => s.studentId === st.id && s.subjectId === selectedSubjectId
        );

        const ca1 = match ? match.ca1 : 0;
        const ca2 = match ? match.ca2 : 0;
        const exam = match ? match.exam : 0;
        const total = ca1 + ca2 + exam;
        const gradeInfo = computeGrade(total);

        return {
          studentId: st.id,
          studentName: `${st.firstName} ${st.lastName}`,
          admissionNo: st.admissionNo,
          ca1,
          ca2,
          exam,
          total,
          grade: gradeInfo.grade,
          remark: gradeInfo.remark,
        };
      });

      setScoreEntries(entries);
    }
  };

  useEffect(() => {
    loadClassScores();
  }, [section, classLevel, selectedSubjectId, session, term]);

  const handleScoreChange = (
    studentId: string,
    field: "ca1" | "ca2" | "exam",
    val: string
  ) => {
    let num = parseFloat(val) || 0;
    if (num < 0) num = 0;

    // Check limits
    if ((field === "ca1" || field === "ca2") && num > 20) {
      setValidationWarning("Continuous Assessment (CA) maximum score is 20 marks.");
      num = 20;
    } else if (field === "exam" && num > 60) {
      setValidationWarning("Terminal Exam maximum score is 60 marks.");
      num = 60;
    } else {
      setValidationWarning(null);
    }

    setRowStatus((prev) => ({ ...prev, [studentId]: "unsaved" }));

    setScoreEntries((prev) =>
      prev.map((entry) => {
        if (entry.studentId !== studentId) return entry;

        const updated = { ...entry, [field]: num };
        const total = (updated.ca1 || 0) + (updated.ca2 || 0) + (updated.exam || 0);
        const gradeInfo = computeGrade(total);

        return {
          ...updated,
          total,
          grade: gradeInfo.grade,
          remark: gradeInfo.remark,
        };
      })
    );
  };

  // Immediate row-level save directly to Neon DB (triggered on input blur or Enter)
  const handleSaveRow = async (studentId: string) => {
    const entry = scoreEntries.find((e) => e.studentId === studentId);
    if (!entry) return;

    setRowStatus((prev) => ({ ...prev, [studentId]: "saving" }));
    setRowErrors((prev) => ({ ...prev, [studentId]: "" }));
    setSaveError(null);

    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: entry.studentId,
          subjectId: selectedSubjectId,
          session,
          term,
          ca1: entry.ca1,
          ca2: entry.ca2,
          exam: entry.exam,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save score to Neon DB.");
      }

      setRowStatus((prev) => ({ ...prev, [studentId]: "saved" }));
      setSavedNotice(`Score saved to Neon DB for ${entry.studentName}!`);
      setTimeout(() => setSavedNotice(null), 3500);

      setTimeout(() => {
        setRowStatus((prev) => {
          if (prev[studentId] === "saved") {
            const copy = { ...prev };
            delete copy[studentId];
            return copy;
          }
          return prev;
        });
      }, 3000);
    } catch (err: any) {
      setRowStatus((prev) => ({ ...prev, [studentId]: "error" }));
      setRowErrors((prev) => ({ ...prev, [studentId]: err.message || "Save failed." }));
      setSaveError(err.message || "Failed to save score to Neon DB.");
    }
  };

  // Batch save all scores directly to Neon DB
  const handleSaveAll = async () => {
    if (scoreEntries.length === 0) return;
    setIsSavingAll(true);
    setSaveError(null);
    setSavedNotice(null);

    const savingMap: Record<string, "saving"> = {};
    scoreEntries.forEach((e) => (savingMap[e.studentId] = "saving"));
    setRowStatus((prev) => ({ ...prev, ...savingMap }));

    const payload = scoreEntries.map((entry) => ({
      studentId: entry.studentId,
      subjectId: selectedSubjectId,
      session,
      term,
      ca1: entry.ca1,
      ca2: entry.ca2,
      exam: entry.exam,
    }));

    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: payload }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save scores to Neon DB.");
      }

      const savedMap: Record<string, "saved"> = {};
      scoreEntries.forEach((e) => (savedMap[e.studentId] = "saved"));
      setRowStatus(savedMap);

      setSavedNotice(
        data.message || `Successfully saved ${payload.length} score record(s) to Neon DB!`
      );
      setTimeout(() => setSavedNotice(null), 5000);

      setTimeout(() => {
        setRowStatus({});
      }, 3000);
    } catch (err: any) {
      const errMap: Record<string, "error"> = {};
      scoreEntries.forEach((e) => (errMap[e.studentId] = "error"));
      setRowStatus(errMap);
      setSaveError(err.message || "Failed to save scores to Neon DB.");
    } finally {
      setIsSavingAll(false);
    }
  };

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
  const hasUnsavedRows = Object.values(rowStatus).some((s) => s === "unsaved");
  const unsavedCount = Object.values(rowStatus).filter((s) => s === "unsaved").length;
  const classAvg =
    scoreEntries.length > 0
      ? Math.round(
          (scoreEntries.reduce((sum, e) => sum + e.total, 0) / scoreEntries.length) * 10
        ) / 10
      : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-black text-slate-900 tracking-tight">
            CA &amp; Exam Scores Entry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Input Continuous Assessment 1 (20), CA 2 (20), and Terminal Exam (60) scores. Automatically saves to Neon PostgreSQL on exit or blur.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={isSavingAll || scoreEntries.length === 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto cursor-pointer disabled:opacity-50"
        >
          {isSavingAll ? (
            <>
              <RefreshCw className="w-4 h-4 text-amber-300 animate-spin" />
              Saving to Neon DB...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-amber-300" />
              Save All to Neon DB
            </>
          )}
        </button>
      </div>

      {savedNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center justify-between gap-2 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{savedNotice}</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-mono bg-emerald-100/60 px-2 py-0.5 rounded">
            Neon DB Live
          </span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2 shadow-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span className="font-semibold">{saveError}</span>
        </div>
      )}

      {validationWarning && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>{validationWarning}</span>
        </div>
      )}

      {/* Allocation Pending Notice for Teachers */}
      {isTeacher && !hasTeacherAssignments && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-sm text-amber-950">Teaching Allocation Pending</span>
            <p className="mt-0.5 text-slate-600 leading-relaxed">
              Classes and subjects have not yet been allocated to your profile. At Mathal International Schools, only school administrators can assign classes and subjects to teachers. Please contact school administration to configure your academic duties.
            </p>
          </div>
        </div>
      )}

      {/* Filter / Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Section */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            School Section
          </label>
          <select
            value={section}
            onChange={(e) => {
              const sec = e.target.value as "PRIMARY" | "SECONDARY";
              setSection(sec);
              setClassLevel(sec === "PRIMARY" ? "Basic 1" : "JSS 1");
            }}
            className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
          >
            <option value="PRIMARY">Primary Wing</option>
            <option value="SECONDARY">Secondary Wing</option>
          </select>
        </div>

        {/* Class Level */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-600">
              Class Level
            </label>
            {isTeacher && teacherClasses && (
              <span className="text-[10px] text-emerald-600 font-bold">Assigned</span>
            )}
          </div>
          <select
            value={classLevel}
            onChange={(e) => setClassLevel(e.target.value)}
            className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
          >
            {displayedClasses.map((c) => (
              <option key={c} value={c}>
                {c} {classesWithStudents.includes(c) ? "• Enrolled" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-600">
              Subject
            </label>
            {isTeacher && teacherSubjects && (
              <span className="text-[10px] text-blue-600 font-bold">Assigned</span>
            )}
          </div>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
          >
            {displayedSubjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name} ({sub.code})
              </option>
            ))}
          </select>
        </div>

        {/* Academic Session */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Academic Session
          </label>
          <select
            value={session}
            onChange={(e) => {
              const s = e.target.value;
              setSession(s);
              setActiveSession(s);
            }}
            className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            {sessions.map((s) => (
              <option key={s} value={s}>
                {s} Session
              </option>
            ))}
          </select>
        </div>

        {/* Term */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Academic Term
          </label>
          <select
            value={term}
            onChange={(e) => {
              const t = e.target.value;
              setTerm(t);
              setActiveTerm(t);
            }}
            className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            {terms.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Information Strip */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-emerald-900">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-700" />
          <span>
            Recording: <strong>{currentSubject?.name}</strong> &bull; {classLevel} &bull; {term}, {session}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>
            Formula: <strong>CA 1 (20) + CA 2 (20) + Exam (60) = Total (100)</strong>
          </span>
          <span className="font-bold bg-emerald-100 px-2.5 py-1 rounded-lg">
            Class Average: {classAvg}%
          </span>
        </div>
      </div>

      {/* Scores Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Admission No</th>
                <th className="px-6 py-3.5">Student Name</th>
                <th className="px-4 py-3.5 text-center">CA 1 (20)</th>
                <th className="px-4 py-3.5 text-center">CA 2 (20)</th>
                <th className="px-4 py-3.5 text-center">Exam (60)</th>
                <th className="px-4 py-3.5 text-center">Total (100)</th>
                <th className="px-4 py-3.5 text-center">Grade</th>
                <th className="px-6 py-3.5">Remark</th>
                <th className="px-4 py-3.5 text-center">DB Status</th>
                <th className="px-4 py-3.5 text-center">Save</th>
                <th className="px-6 py-3.5 text-right">Report Card</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scoreEntries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <Database className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-slate-600 font-medium text-sm">
                        No students currently enrolled in <strong>{classLevel}</strong> in Neon DB.
                      </p>
                      {classesWithStudents.length > 0 && (
                        <div className="pt-1">
                          <p className="text-xs text-slate-400 mb-2">Available classes with registered students:</p>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            {classesWithStudents.map((cls) => (
                              <button
                                key={cls}
                                onClick={() => setClassLevel(cls)}
                                className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all cursor-pointer"
                              >
                                &rarr; Switch to {cls}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="pt-2">
                        <Link
                          href="/dashboard/students"
                          className="inline-flex text-xs font-bold text-emerald-700 hover:text-emerald-800 underline"
                        >
                          Register new students in Students Directory &rarr;
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                scoreEntries.map((entry) => {
                  const gradeColor = {
                    A: "bg-emerald-100 text-emerald-800 font-bold",
                    B: "bg-blue-100 text-blue-800 font-bold",
                    C: "bg-amber-100 text-amber-800 font-bold",
                    D: "bg-purple-100 text-purple-800 font-bold",
                    E: "bg-orange-100 text-orange-800 font-bold",
                    F: "bg-rose-100 text-rose-800 font-bold",
                  }[entry.grade] || "bg-slate-100 text-slate-700";

                  const st = rowStatus[entry.studentId];

                  return (
                    <tr key={entry.studentId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-bold text-xs text-emerald-950">
                        {entry.admissionNo}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-slate-900">
                        {entry.studentName}
                      </td>

                      {/* CA 1 */}
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={entry.ca1 || ""}
                          onChange={(e) =>
                            handleScoreChange(entry.studentId, "ca1", e.target.value)
                          }
                          onBlur={() => handleSaveRow(entry.studentId)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRow(entry.studentId);
                          }}
                          placeholder="0"
                          className="w-16 py-1.5 px-2 text-center text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                      </td>

                      {/* CA 2 */}
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={entry.ca2 || ""}
                          onChange={(e) =>
                            handleScoreChange(entry.studentId, "ca2", e.target.value)
                          }
                          onBlur={() => handleSaveRow(entry.studentId)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRow(entry.studentId);
                          }}
                          placeholder="0"
                          className="w-16 py-1.5 px-2 text-center text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                      </td>

                      {/* Exam */}
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="number"
                          min="0"
                          max="60"
                          step="0.5"
                          value={entry.exam || ""}
                          onChange={(e) =>
                            handleScoreChange(entry.studentId, "exam", e.target.value)
                          }
                          onBlur={() => handleSaveRow(entry.studentId)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRow(entry.studentId);
                          }}
                          placeholder="0"
                          className="w-20 py-1.5 px-2 text-center text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3.5 text-center font-bold text-slate-900 text-sm">
                        {entry.total}
                      </td>

                      {/* Grade */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-xs ${gradeColor}`}>
                          {entry.grade}
                        </span>
                      </td>

                      {/* Remark */}
                      <td className="px-6 py-3.5 text-xs font-medium text-slate-700">
                        {entry.remark}
                      </td>

                      {/* DB Status */}
                      <td className="px-4 py-3.5 text-center">
                        {st === "saving" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                            Saving...
                          </span>
                        ) : st === "saved" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Saved
                          </span>
                        ) : st === "error" ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200"
                            title={rowErrors[entry.studentId]}
                          >
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            Failed
                          </span>
                        ) : st === "unsaved" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Unsaved
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">Synced</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => handleSaveRow(entry.studentId)}
                          disabled={st === "saving"}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            st === "unsaved"
                              ? "bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xs"
                              : "bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700"
                          }`}
                          title="Save this score row to Neon DB"
                        >
                          <Save className="w-3 h-3" />
                          Save
                        </button>
                      </td>

                      {/* Report Card link */}
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          href={`/dashboard/results/${entry.studentId}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                        >
                          <Award className="w-3.5 h-3.5" />
                          View Result
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bottom Action Bar for Unsaved Scores */}
      {hasUnsavedRows && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-950/95 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-4 border border-slate-800 animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-200">
              <strong>{unsavedCount}</strong> unsaved student score{unsavedCount > 1 ? "s" : ""}
            </span>
          </div>
          <button
            onClick={handleSaveAll}
            disabled={isSavingAll}
            className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isSavingAll ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Saving to Neon DB...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save All to Neon DB
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
