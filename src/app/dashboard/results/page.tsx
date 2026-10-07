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
  Eye,
  Calendar,
  CheckCircle2,
  Lock,
  Unlock,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function ResultsDirectoryPage() {
  const { user } = useAuth();
  const { session, term, sessions, terms, setSession, setTerm } = useAcademic();
  const [students, setStudents] = useState<DemoStudent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [approvalNotice, setApprovalNotice] = useState<string | null>(null);

  const loadStudents = () => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((d) => {
        if (d.students) setStudents(d.students);
      })
      .catch(() => setStudents(dataStore.getStudents()));
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const role = user?.role || "STUDENT";
  const isTeacher = role === "TEACHER";
  const isAdmin = role === "ADMIN";
  const canManageApproval = isAdmin || isTeacher;

  // Teacher classes check
  const teacherClasses =
    isTeacher && user?.assignedClasses
      ? user.assignedClasses.split(",").map((c) => c.trim()).filter(Boolean)
      : null;

  const canManageStudentApproval = (student: DemoStudent) => {
    if (isAdmin) return true;
    if (isTeacher) {
      if (!teacherClasses || teacherClasses.length === 0) return true;
      return teacherClasses.includes(student.classLevel);
    }
    return false;
  };

  const handleToggleApproval = async (student: DemoStudent) => {
    if (!canManageStudentApproval(student)) return;
    const newStatus = !student.resultsApproved;
    setUpdatingId(student.id);

    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultsApproved: newStatus,
          approvedBy: `${user?.name} (${role})`,
        }),
      });

      if (res.ok) {
        setStudents((prev) =>
          prev.map((s) =>
            s.id === student.id
              ? {
                  ...s,
                  resultsApproved: newStatus,
                  resultsApprovedBy: newStatus ? `${user?.name} (${role})` : null,
                  resultsApprovedAt: newStatus ? new Date().toISOString() : null,
                }
              : s
          )
        );
        setApprovalNotice(
          `${student.firstName}'s report card & score access is now ${newStatus ? "APPROVED" : "WITHHELD"}.`
        );
        setTimeout(() => setApprovalNotice(null), 4000);
      }
    } catch {
      // fallback
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBulkApproval = async (approve: boolean) => {
    const targetStudents = filtered.filter((s) => canManageStudentApproval(s));
    if (targetStudents.length === 0) return;

    setIsBulkUpdating(true);
    try {
      const studentIds = targetStudents.map((s) => s.id);
      const res = await fetch("/api/students/bulk-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds,
          resultsApproved: approve,
          approvedBy: `${user?.name} (${role})`,
        }),
      });

      if (res.ok) {
        setStudents((prev) =>
          prev.map((s) =>
            studentIds.includes(s.id)
              ? {
                  ...s,
                  resultsApproved: approve,
                  resultsApprovedBy: approve ? `${user?.name} (${role})` : null,
                  resultsApprovedAt: approve ? new Date().toISOString() : null,
                }
              : s
          )
        );
        setApprovalNotice(
          `Successfully ${approve ? "approved" : "withheld"} report card & score access for ${studentIds.length} student(s)!`
        );
        setTimeout(() => setApprovalNotice(null), 5000);
      }
    } catch {
      // fallback
    } finally {
      setIsBulkUpdating(false);
    }
  };

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
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student by name or admission no..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select
            value={sectionFilter}
            onChange={(e) => {
              setSectionFilter(e.target.value);
              setClassFilter("ALL");
            }}
            className="w-full py-2 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Wings</option>
            <option value="PRIMARY">Primary Wing</option>
            <option value="SECONDARY">Secondary Wing</option>
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full py-2 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            className="w-full py-2 px-2.5 text-xs bg-emerald-50/60 border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-emerald-950"
          >
            {sessions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="w-full py-2 px-2.5 text-xs bg-amber-50/60 border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-900"
          >
            {terms.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notice Message */}
      {approvalNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{approvalNotice}</span>
          </div>
        </div>
      )}

      {/* Admin and Teacher Bulk Approval Toolbar */}
      {canManageApproval && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Result Viewing &amp; Download Clearance</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 font-normal px-2 py-0.5 rounded-full">
                  {role === "ADMIN" ? "Admin Master Control" : "Class Teacher Control"}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Control which students can see their score breakdown and download their terminal report sheet.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => handleBulkApproval(true)}
              disabled={isBulkUpdating || filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              title="Grant viewing and downloading clearance to all students displayed below"
            >
              {isBulkUpdating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
              Approve All ({filtered.length})
            </button>

            <button
              onClick={() => handleBulkApproval(false)}
              disabled={isBulkUpdating || filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-700 font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              title="Withhold viewing access from all students displayed below"
            >
              <Lock className="w-3.5 h-3.5" />
              Withhold All
            </button>
          </div>
        </div>
      )}

      {/* Student Result Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((student) => {
          const report = dataStore.getStudentReportCard(student.id, session, term);
          const isApproved = Boolean(student.resultsApproved);
          const canManageThis = canManageStudentApproval(student);
          const isUpdatingThis = updatingId === student.id;

          return (
            <div
              key={student.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                isApproved
                  ? "border-emerald-200/90 hover:border-emerald-400"
                  : "border-slate-200/80 hover:border-amber-300 bg-slate-50/30"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-bold text-xs text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded">
                    {student.admissionNo}
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        student.section === "PRIMARY"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {student.section}
                    </span>

                    {/* Result Approval Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isApproved
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-amber-100 text-amber-900 border border-amber-300"
                      }`}
                      title={
                        isApproved
                          ? `Approved by ${student.resultsApprovedBy || "Teacher/Admin"}`
                          : "Student cannot view or download report card"
                      }
                    >
                      {isApproved ? (
                        <>
                          <Unlock className="w-2.5 h-2.5 text-emerald-700" />
                          Approved
                        </>
                      ) : (
                        <>
                          <Lock className="w-2.5 h-2.5 text-amber-700" />
                          Pending
                        </>
                      )}
                    </span>
                  </div>
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

                {/* Student specific status info */}
                {role === "STUDENT" && !isApproved && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-[11px] leading-tight">
                      <strong>Result Clearance Pending:</strong> Your report card is awaiting approval from your class teacher or administration.
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                {/* Teacher / Admin Toggle Button */}
                {canManageThis ? (
                  <button
                    onClick={() => handleToggleApproval(student)}
                    disabled={isUpdatingThis}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isApproved
                        ? "bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200"
                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300"
                    }`}
                    title={isApproved ? "Revoke student view access" : "Approve student to view & download result"}
                  >
                    {isUpdatingThis ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : isApproved ? (
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    {isApproved ? "Revoke" : "Approve Access"}
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    {report?.scores.length || 0} Subjects Scored
                  </span>
                )}

                {role === "STUDENT" && !isApproved ? (
                  <button
                    disabled
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed"
                    title="Clearance required before viewing"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Locked
                  </button>
                ) : (
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
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
