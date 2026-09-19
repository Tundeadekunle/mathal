"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  PRIMARY_CLASSES,
  SECONDARY_CLASSES,
} from "@/lib/grading";
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  SlidersHorizontal,
  BookOpen,
  Check,
  X,
  Plus,
  RefreshCw,
} from "lucide-react";

interface TeacherRecord {
  id: string;
  userId: string;
  staffId: string;
  name: string;
  email: string;
  phone?: string;
  title?: string;
  qualification?: string;
  assignedSection: "PRIMARY" | "SECONDARY" | "BOTH";
  assignedClasses: string[];
  assignedClassesRaw: string;
  assignedSubjects: string[];
  assignedSubjectsRaw: string;
  createdAt: string;
}

interface SubjectRecord {
  id: string;
  name: string;
  code: string;
  section: string;
}

export default function TeachersManagementPage() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSection, setFilterSection] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ALLOCATED" | "PENDING">("ALL");

  // Assignment Modal State
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRecord | null>(null);
  const [editSection, setEditSection] = useState<"PRIMARY" | "SECONDARY" | "BOTH">("BOTH");
  const [editClasses, setEditClasses] = useState<string[]>([]);
  const [editSubjects, setEditSubjects] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        fetch("/api/teachers"),
        fetch("/api/subjects"),
      ]);

      if (tRes.ok) {
        const tData = await tRes.json();
        if (tData.teachers) setTeachers(tData.teachers);
      }

      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData.subjects) setSubjects(sData.subjects);
      }
    } catch (err) {
      console.error("Error loading teachers or subjects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAssignModal = (teacher: TeacherRecord) => {
    setSelectedTeacher(teacher);
    setEditSection(teacher.assignedSection || "BOTH");
    setEditClasses([...teacher.assignedClasses]);
    setEditSubjects([...teacher.assignedSubjects]);
    setActionError(null);
  };

  const closeAssignModal = () => {
    setSelectedTeacher(null);
    setActionError(null);
  };

  const toggleClass = (className: string) => {
    setEditClasses((prev) =>
      prev.includes(className)
        ? prev.filter((c) => c !== className)
        : [...prev, className]
    );
  };

  const toggleSubject = (subjectName: string) => {
    setEditSubjects((prev) =>
      prev.includes(subjectName)
        ? prev.filter((s) => s !== subjectName)
        : [...prev, subjectName]
    );
  };

  const handleSaveAssignment = async () => {
    if (!selectedTeacher) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/teachers/${selectedTeacher.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedSection: editSection,
          assignedClasses: editClasses,
          assignedSubjects: editSubjects,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update teacher assignment.");
      }

      // Update local state
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === selectedTeacher.id
            ? {
                ...t,
                assignedSection: editSection,
                assignedClasses: editClasses,
                assignedClassesRaw: editClasses.join(", "),
                assignedSubjects: editSubjects,
                assignedSubjectsRaw: editSubjects.join(", "),
              }
            : t
        )
      );

      setSuccessToast(`Teaching allocations updated for ${selectedTeacher.name}!`);
      setTimeout(() => setSuccessToast(null), 4000);
      closeAssignModal();
    } catch (err: any) {
      setActionError(err.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  // Access check: Only ADMIN can manage and assign
  if (user.role !== "ADMIN") {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-200">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Administrator Access Required</h2>
        <p className="mt-2 text-sm text-slate-500 max-w-md">
          Only school administrators and management are authorized to assign classes and subjects to teachers.
        </p>
      </div>
    );
  }

  // Filtered teachers
  const filteredTeachers = teachers.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      t.name.toLowerCase().includes(q) ||
      t.staffId.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.assignedSubjectsRaw.toLowerCase().includes(q) ||
      t.assignedClassesRaw.toLowerCase().includes(q);

    const matchesSection =
      filterSection === "ALL" ||
      t.assignedSection === filterSection ||
      t.assignedSection === "BOTH";

    const isAllocated = t.assignedClasses.length > 0 && t.assignedSubjects.length > 0;
    const matchesStatus =
      filterStatus === "ALL" ||
      (filterStatus === "ALLOCATED" && isAllocated) ||
      (filterStatus === "PENDING" && !isAllocated);

    return matchesSearch && matchesSection && matchesStatus;
  });

  const totalTeachers = teachers.length;
  const fullyAllocated = teachers.filter(
    (t) => t.assignedClasses.length > 0 && t.assignedSubjects.length > 0
  ).length;
  const pendingAllocation = totalTeachers - fullyAllocated;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white p-6 sm:p-8 shadow-sm">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-700 text-amber-300 text-xs font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Faculty Control &bull; Neon DB Backed</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight">
              Faculty &amp; Teacher Allocations
            </h1>
            <p className="mt-1 text-sm text-emerald-100/90 max-w-2xl">
              Assign and manage teaching responsibilities across Primary and Secondary wings. As an administrator, only you have authority to allocate classes and subjects to teachers.
            </p>
          </div>

          <div className="flex-shrink-0 flex items-center gap-2">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-white text-xs font-semibold border border-emerald-700/80 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center gap-2.5 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{totalTeachers}</div>
            <div className="text-xs font-semibold text-slate-500">Total Teaching Faculty</div>
            <div className="text-[11px] text-emerald-600 font-medium">Registered Staff</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{fullyAllocated}</div>
            <div className="text-xs font-semibold text-slate-500">Fully Allocated</div>
            <div className="text-[11px] text-blue-600 font-medium">Classes &amp; Subjects Set</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{pendingAllocation}</div>
            <div className="text-xs font-semibold text-slate-500">Pending Assignment</div>
            <div className="text-[11px] text-amber-600 font-medium">Awaiting Admin Action</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{subjects.length}</div>
            <div className="text-xs font-semibold text-slate-500">Curriculum Subjects</div>
            <div className="text-[11px] text-purple-600 font-medium">Available for Allocation</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by teacher name, staff ID, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Section Filter */}
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
          >
            <option value="ALL">All Sections</option>
            <option value="PRIMARY">Primary Wing</option>
            <option value="SECONDARY">Secondary Wing</option>
            <option value="BOTH">Both Wings</option>
          </select>

          {/* Allocation Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="ALLOCATED">Fully Allocated</option>
            <option value="PENDING">Pending Assignment</option>
          </select>
        </div>
      </div>

      {/* Teachers Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Staff ID</th>
                <th className="px-6 py-3.5">Teacher / Faculty</th>
                <th className="px-4 py-3.5">Qualification</th>
                <th className="px-4 py-3.5">Assigned Section</th>
                <th className="px-6 py-3.5">Assigned Classes</th>
                <th className="px-6 py-3.5">Assigned Subjects</th>
                <th className="px-6 py-3.5 text-right">Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Loading faculty records from Neon DB...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No teacher records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t) => {
                  const hasClasses = t.assignedClasses.length > 0;
                  const hasSubjects = t.assignedSubjects.length > 0;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-xs text-emerald-950">
                        {t.staffId}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                        <div className="text-xs text-slate-400">{t.email}</div>
                      </td>

                      <td className="px-4 py-4 text-xs font-medium text-slate-600">
                        {t.qualification || "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                          {t.assignedSection === "BOTH"
                            ? "Primary & Secondary"
                            : t.assignedSection === "PRIMARY"
                            ? "Primary Wing"
                            : "Secondary Wing"}
                        </span>
                      </td>

                      {/* Assigned Classes */}
                      <td className="px-6 py-4">
                        {hasClasses ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {t.assignedClasses.map((cls) => (
                              <span
                                key={cls}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800"
                              >
                                {cls}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <AlertCircle className="w-3 h-3" />
                            Pending Classes
                          </span>
                        )}
                      </td>

                      {/* Assigned Subjects */}
                      <td className="px-6 py-4">
                        {hasSubjects ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {t.assignedSubjects.map((sub) => (
                              <span
                                key={sub}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800"
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <AlertCircle className="w-3 h-3" />
                            Pending Subjects
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openAssignModal(t)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs shadow-sm transition-all cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          Assign
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#0B1A36] text-white flex items-center justify-between border-b border-blue-900/60">
              <div>
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Administrator Assignment Portal
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Assign Class &amp; Subject &bull; {selectedTeacher.name}
                </h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  Staff ID: <strong className="font-mono text-amber-300">{selectedTeacher.staffId}</strong> &bull; {selectedTeacher.qualification}
                </p>
              </div>
              <button
                onClick={closeAssignModal}
                className="p-1 rounded-lg text-blue-300 hover:text-white hover:bg-blue-900/80 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {actionError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* 1. School Section Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  1. Designated School Wing
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["PRIMARY", "SECONDARY", "BOTH"] as const).map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setEditSection(sec)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        editSection === sec
                          ? "bg-emerald-800 border-emerald-800 text-white shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {sec === "BOTH" ? "Both Wings" : sec === "PRIMARY" ? "Primary Only" : "Secondary Only"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Assign Classes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Assigned Classes ({editClasses.length} selected)
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        setEditClasses(
                          Array.from(new Set([...editClasses, ...PRIMARY_CLASSES]))
                        )
                      }
                      className="text-emerald-700 font-bold hover:underline"
                    >
                      + All Primary
                    </button>
                    <span className="text-slate-300">&bull;</span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditClasses(
                          Array.from(new Set([...editClasses, ...SECONDARY_CLASSES]))
                        )
                      }
                      className="text-emerald-700 font-bold hover:underline"
                    >
                      + All Secondary
                    </button>
                    <span className="text-slate-300">&bull;</span>
                    <button
                      type="button"
                      onClick={() => setEditClasses([])}
                      className="text-rose-600 font-bold hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Primary classes group */}
                {(editSection === "PRIMARY" || editSection === "BOTH") && (
                  <div className="mb-3">
                    <div className="text-[11px] font-bold text-emerald-800 mb-1.5">
                      Primary Classes:
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {PRIMARY_CLASSES.map((cls) => {
                        const selected = editClasses.includes(cls);
                        return (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => toggleClass(cls)}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                              selected
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-sm font-bold"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {cls}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Secondary classes group */}
                {(editSection === "SECONDARY" || editSection === "BOTH") && (
                  <div>
                    <div className="text-[11px] font-bold text-blue-800 mb-1.5">
                      Secondary Classes:
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {SECONDARY_CLASSES.map((cls) => {
                        const selected = editClasses.includes(cls);
                        return (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => toggleClass(cls)}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                              selected
                                ? "bg-blue-600 border-blue-600 text-white shadow-sm font-bold"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {cls}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Assign Subjects */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    3. Assigned Curriculum Subjects ({editSubjects.length} selected)
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setEditSubjects(subjects.map((s) => s.name))}
                      className="text-emerald-700 font-bold hover:underline"
                    >
                      + Select All
                    </button>
                    <span className="text-slate-300">&bull;</span>
                    <button
                      type="button"
                      onClick={() => setEditSubjects([])}
                      className="text-rose-600 font-bold hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 bg-slate-50 border border-slate-200 rounded-xl">
                  {subjects.length === 0 ? (
                    <div className="col-span-2 p-4 text-center text-xs text-slate-400">
                      No subjects available in database.
                    </div>
                  ) : (
                    subjects.map((sub) => {
                      const selected = editSubjects.includes(sub.name);
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => toggleSubject(sub.name)}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium border text-left transition-all cursor-pointer ${
                            selected
                              ? "bg-amber-100 border-amber-300 text-amber-950 font-bold"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span className="truncate pr-2">
                            {sub.name} <span className="text-slate-400 font-normal">({sub.code})</span>
                          </span>
                          {selected ? (
                            <Check className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          ) : (
                            <Plus className="w-4 h-4 text-slate-300 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Changes take effect in real time in Neon DB.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeAssignModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignment}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving to Neon DB...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-amber-300" />
                      Save Assignment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
