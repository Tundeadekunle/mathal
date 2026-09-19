"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { dataStore, DemoStudent } from "@/lib/store";
import {
  PRIMARY_CLASSES,
  SECONDARY_CLASSES,
  CLASS_ARMS,
} from "@/lib/grading";
import {
  CheckCircle2,
  XCircle,
  Save,
  Check,
  Users,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export default function AttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [section, setSection] = useState<"PRIMARY" | "SECONDARY">("PRIMARY");
  const [classLevel, setClassLevel] = useState("Basic 4");
  const [arm, setArm] = useState("Gold");
  const [students, setStudents] = useState<DemoStudent[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; remarks: string }>
  >({});
  const [savedNotice, setSavedNotice] = useState(false);

  const { user } = useAuth();
  const isTeacher = user?.role === "TEACHER";

  const teacherClasses =
    isTeacher && user?.assignedClasses
      ? user.assignedClasses.split(",").map((c) => c.trim()).filter(Boolean)
      : null;

  const allSecClasses = section === "PRIMARY" ? PRIMARY_CLASSES : SECONDARY_CLASSES;
  const displayedClasses =
    isTeacher && teacherClasses && teacherClasses.length > 0
      ? allSecClasses.filter((c) => teacherClasses.includes(c)).length > 0
        ? allSecClasses.filter((c) => teacherClasses.includes(c))
        : teacherClasses
      : allSecClasses;

  const classesKey = displayedClasses.join(",");

  useEffect(() => {
    if (displayedClasses.length > 0 && !displayedClasses.includes(classLevel)) {
      setClassLevel(displayedClasses[0]);
    }
  }, [classesKey, classLevel]);

  // Load students and existing attendance from Neon DB
  useEffect(() => {
    async function load() {
      try {
        const [stuRes, attRes] = await Promise.all([
          fetch(`/api/students?section=${section}&classLevel=${encodeURIComponent(classLevel)}&arm=${arm}`),
          fetch(`/api/attendance?date=${date}&classLevel=${encodeURIComponent(classLevel)}&arm=${arm}`),
        ]);

        let classStudents: DemoStudent[] = [];
        if (stuRes.ok) {
          const d = await stuRes.json();
          if (d.students) classStudents = d.students;
        }

        let existing: any[] = [];
        if (attRes.ok) {
          const d = await attRes.json();
          if (d.attendances) existing = d.attendances;
        }

        setStudents(classStudents);

        const initialMap: Record<
          string,
          { status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; remarks: string }
        > = {};

        classStudents.forEach((st) => {
          const match = existing.find((e) => e.studentId === st.id);
          if (match) {
            initialMap[st.id] = { status: match.status, remarks: match.remarks || "" };
          } else {
            initialMap[st.id] = { status: "PRESENT", remarks: "" };
          }
        });

        setAttendanceMap(initialMap);
      } catch {
        const classStudents = dataStore
          .getStudents({ section, classLevel })
          .filter((s) => s.arm === arm);
        setStudents(classStudents);
      }
    }

    load();
  }, [section, classLevel, arm, date]);

  const handleStatusChange = (
    studentId: string,
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
  ) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const handleMarkAll = (status: "PRESENT" | "ABSENT") => {
    const updated = { ...attendanceMap };
    students.forEach((s) => {
      if (updated[s.id]) {
        updated[s.id].status = status;
      }
    });
    setAttendanceMap(updated);
  };

  const handleSave = async () => {
    const records = students.map((st) => ({
      studentId: st.id,
      classLevel,
      arm,
      date,
      status: attendanceMap[st.id]?.status || "PRESENT",
      remarks: attendanceMap[st.id]?.remarks || undefined,
    }));

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });
      if (res.ok) {
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 4000);
      }
    } catch {
      dataStore.saveAttendance(records as any);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 4000);
    }
  };

  // Metrics
  const totalStudents = students.length;
  const presentCount = Object.values(attendanceMap).filter(
    (a) => a.status === "PRESENT" || a.status === "LATE"
  ).length;
  const absentCount = Object.values(attendanceMap).filter(
    (a) => a.status === "ABSENT"
  ).length;
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-black text-slate-900 tracking-tight">
            Daily Attendance Register
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Conduct morning roll call for primary pupils and secondary students. Auto-syncs with terminal reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleMarkAll("PRESENT")}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Mark All Present
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 text-amber-300" />
            Save Register
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 shadow-sm animate-fade-in">
          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>
            Attendance register for <strong>{classLevel} ({arm})</strong> on <strong>{date}</strong> saved successfully!
          </span>
        </div>
      )}

      {/* Allocation Pending Notice for Teachers */}
      {isTeacher && (!teacherClasses || teacherClasses.length === 0) && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-sm text-amber-950">Teaching Allocation Pending</span>
            <p className="mt-0.5 text-slate-600 leading-relaxed">
              Classes have not yet been assigned to your profile by the administration. In Mathal International Schools, only school administrators have authority to assign classes to teachers. Please contact school administration to allocate your classes.
            </p>
          </div>
        </div>
      )}

      {/* Class and Date Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Date Picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Roll Call Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>
        </div>

        {/* Section Picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            School Section
          </label>
          <select
            value={section}
            onChange={(e) => {
              const sec = e.target.value as "PRIMARY" | "SECONDARY";
              setSection(sec);
              setClassLevel(sec === "PRIMARY" ? "Basic 4" : "JSS 2");
            }}
            className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
          >
            <option value="PRIMARY">Primary Wing</option>
            <option value="SECONDARY">Secondary Wing</option>
          </select>
        </div>

        {/* Class Level Picker */}
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
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Arm Picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Class Arm
          </label>
          <select
            value={arm}
            onChange={(e) => setArm(e.target.value)}
            className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
          >
            {CLASS_ARMS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{totalStudents}</div>
            <div className="text-[11px] text-slate-500">In Class</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-700">{presentCount}</div>
            <div className="text-[11px] text-slate-500">Present Today</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-rose-700">{absentCount}</div>
            <div className="text-[11px] text-slate-500">Absent Today</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-blue-700">{attendanceRate}%</div>
            <div className="text-[11px] text-slate-500">Attendance Rate</div>
          </div>
        </div>
      </div>

      {/* Roster Roll Call Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">
            Attendance Sheet &bull; {classLevel} ({arm}) &bull; {date}
          </h3>
          <span className="text-xs text-slate-400">
            Click status pill to toggle
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Admission No</th>
                <th className="px-6 py-3.5">Pupil / Student Name</th>
                <th className="px-6 py-3.5">Gender</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Notes / Reasons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No pupils or students enrolled in {classLevel} ({arm}) yet.
                  </td>
                </tr>
              ) : (
                students.map((st) => {
                  const currentStatus = attendanceMap[st.id]?.status || "PRESENT";
                  const remarks = attendanceMap[st.id]?.remarks || "";

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-xs text-emerald-950">
                        {st.admissionNo}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900">
                          {st.firstName} {st.lastName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                        {st.gender}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, "PRESENT")}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              currentStatus === "PRESENT"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, "ABSENT")}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              currentStatus === "ABSENT"
                                ? "bg-rose-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, "LATE")}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              currentStatus === "LATE"
                                ? "bg-amber-500 text-white shadow-sm"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            Late
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, "EXCUSED")}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              currentStatus === "EXCUSED"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            Excused
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={remarks}
                          onChange={(e) => handleRemarksChange(st.id, e.target.value)}
                          placeholder="Optional remark..."
                          className="w-full text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
