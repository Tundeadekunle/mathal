"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { PRIMARY_CLASSES, SECONDARY_CLASSES } from "@/lib/grading";
import {
  BookOpen,
  Plus,
  Check,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  BookmarkCheck,
} from "lucide-react";

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  section: "PRIMARY" | "SECONDARY" | "BOTH";
  description?: string | null;
}

const COMMON_PRESETS = [
  { name: "Number Work", code: "NWK", section: "PRIMARY" as const, description: "Early numeracy, counting, shapes and arithmetic for KG & Primary" },
  { name: "Letter Work", code: "LTW", section: "PRIMARY" as const, description: "Alphabet recognition, phonics, reading and handwriting for KG & Primary" },
  { name: "Rhymes & Poems", code: "RHY", section: "PRIMARY" as const, description: "Nursery rhymes, auditory discrimination and verbal recitation" },
  { name: "Health & Physical Habits", code: "HPH", section: "PRIMARY" as const, description: "Personal hygiene, body parts, and safety rules for young learners" },
  { name: "Social Habits", code: "SHB", section: "PRIMARY" as const, description: "Good manners, community relations and family values" },
  { name: "Handwriting & Creative Arts", code: "HCA", section: "PRIMARY" as const, description: "Tracing, pencil control, coloring, craft and drawing" },
  { name: "Phonics & Diction", code: "PHN", section: "PRIMARY" as const, description: "Letter-sound correspondences, blending and pronunciation" },
  { name: "French Language", code: "FRN", section: "BOTH" as const, description: "Introductory French vocabulary, grammar and conversation" },
  { name: "Arabic & Quranic Studies", code: "ARB", section: "BOTH" as const, description: "Arabic alphabet, basic vocabulary and recitation" },
];

export default function SubjectsPage() {
  const { user, refreshUser } = useAuth();
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("ALL");

  // Create Subject Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    section: "PRIMARY" as "PRIMARY" | "SECONDARY" | "BOTH",
    description: "",
    autoAssign: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Teacher allocation editing
  const [teacherAssignedSubjects, setTeacherAssignedSubjects] = useState<string[]>([]);
  const [teacherAssignedClasses, setTeacherAssignedClasses] = useState<string[]>([]);
  const [isSavingAllocation, setIsSavingAllocation] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);

  const isTeacher = user?.role === "TEACHER";

  // Initialize teacher assignments from user profile
  useEffect(() => {
    if (user?.assignedSubjects) {
      setTeacherAssignedSubjects(
        user.assignedSubjects.split(",").map((s) => s.trim()).filter(Boolean)
      );
    } else {
      setTeacherAssignedSubjects([]);
    }

    if (user?.assignedClasses) {
      setTeacherAssignedClasses(
        user.assignedClasses.split(",").map((c) => c.trim()).filter(Boolean)
      );
    } else {
      setTeacherAssignedClasses([]);
    }
  }, [user?.assignedSubjects, user?.assignedClasses]);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subjects");
      if (res.ok) {
        const data = await res.json();
        if (data.subjects) {
          setSubjects(data.subjects);
        }
      }
    } catch (err) {
      console.error("Error loading subjects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const showErrorToast = (msg: string) => {
    setToastError(msg);
    setTimeout(() => setToastError(null), 4500);
  };

  // Toggle subject for current teacher
  const handleToggleSubject = async (subjectName: string) => {
    if (!isTeacher || !user?.teacherId) return;

    const isAlreadyAssigned = teacherAssignedSubjects.some(
      (s) => s.toLowerCase() === subjectName.toLowerCase()
    );

    const updatedList = isAlreadyAssigned
      ? teacherAssignedSubjects.filter((s) => s.toLowerCase() !== subjectName.toLowerCase())
      : [...teacherAssignedSubjects, subjectName];

    setTeacherAssignedSubjects(updatedList);
    setIsSavingAllocation(true);

    try {
      const res = await fetch(`/api/teachers/${user.teacherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedSubjects: updatedList,
          assignedClasses: teacherAssignedClasses,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update assigned subjects.");
      }

      await refreshUser();
      showToast(
        isAlreadyAssigned
          ? `Removed "${subjectName}" from your classes.`
          : `Added "${subjectName}" to your classes!`
      );
    } catch (err: any) {
      setTeacherAssignedSubjects(teacherAssignedSubjects); // revert
      showErrorToast(err.message || "Failed to update subject allocation.");
    } finally {
      setIsSavingAllocation(false);
    }
  };

  // Toggle class for current teacher
  const handleToggleClass = async (className: string) => {
    if (!isTeacher || !user?.teacherId) return;

    const isAlreadyAssigned = teacherAssignedClasses.includes(className);
    const updatedClasses = isAlreadyAssigned
      ? teacherAssignedClasses.filter((c) => c !== className)
      : [...teacherAssignedClasses, className];

    setTeacherAssignedClasses(updatedClasses);
    setIsSavingAllocation(true);

    try {
      const res = await fetch(`/api/teachers/${user.teacherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedClasses: updatedClasses,
          assignedSubjects: teacherAssignedSubjects,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update assigned classes.");
      }

      await refreshUser();
      showToast(
        isAlreadyAssigned
          ? `Class "${className}" unassigned.`
          : `Class "${className}" added to your teaching profile!`
      );
    } catch (err: any) {
      setTeacherAssignedClasses(teacherAssignedClasses); // revert
      showErrorToast(err.message || "Failed to update class allocation.");
    } finally {
      setIsSavingAllocation(false);
    }
  };

  // Submit Create New Subject
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Please enter a subject name.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          section: formData.section,
          description: formData.description.trim() || undefined,
          autoAssignToTeacher: isTeacher && formData.autoAssign,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create subject.");
      }

      await loadSubjects();
      if (isTeacher) {
        await refreshUser();
      }

      setShowCreateModal(false);
      setFormData({
        name: "",
        code: "",
        section: "PRIMARY",
        description: "",
        autoAssign: true,
      });

      showToast(data.message || `Subject "${data.subject?.name}" created successfully!`);
    } catch (err: any) {
      setFormError(err.message || "Failed to create subject.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyPreset = (preset: typeof COMMON_PRESETS[0]) => {
    setFormData({
      name: preset.name,
      code: preset.code,
      section: preset.section,
      description: preset.description,
      autoAssign: true,
    });
  };

  // Filtered subjects
  const filteredSubjects = subjects.filter((s) => {
    const matchesSection =
      sectionFilter === "ALL" ||
      s.section === sectionFilter ||
      s.section === "BOTH";

    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSection && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-emerald-900 text-emerald-100 shadow-2xl border border-emerald-700 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {toastError && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-rose-900 text-rose-100 shadow-2xl border border-rose-700 flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastError}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B1A36] via-[#0E234B] to-[#0B1A36] rounded-2xl p-6 sm:p-8 text-white border border-blue-900/50 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-700/60 text-amber-300 text-xs font-semibold mb-2 shadow-inner">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Academic Curriculum &bull; Primary &amp; Secondary Wings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight">
            Subjects &amp; Class Curriculum
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-blue-100/90 max-w-2xl leading-relaxed">
            {isTeacher
              ? "Create new subjects, add subjects to your assigned classes (including KG 1 & KG 2), and manage your active teaching allocations."
              : "Explore official curriculum subjects, create specialized courses, and manage academic allocations for all wings."}
          </p>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto">
          <button
            onClick={() => {
              setShowCreateModal(true);
              setFormError(null);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs shadow-md transition-all cursor-pointer min-h-[42px]"
          >
            <Plus className="w-4 h-4 text-emerald-950" />
            Create New Subject
          </button>
        </div>
      </div>

      {/* Teacher Allocation Overview Box */}
      {isTeacher && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <BookmarkCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-sm">
                  My Teaching Portfolio &bull; Classes &amp; Subjects
                </h2>
                <p className="text-[11px] text-slate-500">
                  Select your classes and click subjects below to instantly add or remove them from your active teaching list.
                </p>
              </div>
            </div>

            {isSavingAllocation && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Saving updates...
              </span>
            )}
          </div>

          {/* Classes Selector for Teacher */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Assigned Classes ({teacherAssignedClasses.length} selected):
            </label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider self-center mr-1">
                Primary / KG:
              </span>
              {PRIMARY_CLASSES.map((cls) => {
                const active = teacherAssignedClasses.includes(cls);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => handleToggleClass(cls)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                      active
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {cls}
                    {active && <Check className="w-3 h-3 inline ml-1.5" />}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2.5">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider self-center mr-1">
                Secondary:
              </span>
              {SECONDARY_CLASSES.map((cls) => {
                const active = teacherAssignedClasses.includes(cls);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => handleToggleClass(cls)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                      active
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {cls}
                    {active && <Check className="w-3 h-3 inline ml-1.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Teacher Active Subjects Badge Bar */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700">
                Subjects Added to My Classes ({teacherAssignedSubjects.length}):
              </span>
              <span className="text-[11px] text-slate-400">
                Click any subject card in the catalog to add/remove
              </span>
            </div>
            {teacherAssignedSubjects.length === 0 ? (
              <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                You haven&apos;t added any subjects yet. Click &quot;+ Add to My Classes&quot; on any subject in the catalog below, or create a custom subject for your class!
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {teacherAssignedSubjects.map((subName) => (
                  <span
                    key={subName}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    <BookOpen className="w-3 h-3 text-emerald-600" />
                    <strong>{subName}</strong>
                    <button
                      type="button"
                      onClick={() => handleToggleSubject(subName)}
                      className="hover:text-rose-600 ml-1 rounded p-0.5"
                      title="Remove from my classes"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by subject name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="ALL">All Sections</option>
            <option value="PRIMARY">Primary &amp; KG Wing</option>
            <option value="SECONDARY">Secondary Wing</option>
            <option value="BOTH">Universal (Both Wings)</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 self-end sm:self-center">
          Showing <strong>{filteredSubjects.length}</strong> of {subjects.length} subjects
        </div>
      </div>

      {/* Subjects Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
          <p className="text-xs text-slate-500">Loading curriculum subjects...</p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No subjects found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No subjects match "${searchQuery}". Try a different keyword or create this subject.`
              : "No subjects available in this category yet."}
          </p>
          <button
            onClick={() => {
              setFormData({
                name: searchQuery,
                code: "",
                section: "PRIMARY",
                description: "",
                autoAssign: true,
              });
              setShowCreateModal(true);
            }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create &quot;{searchQuery || "New Subject"}&quot;
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((sub) => {
            const isAssigned = isTeacher && teacherAssignedSubjects.some(
              (s) => s.toLowerCase() === sub.name.toLowerCase() || s.toLowerCase() === sub.code.toLowerCase()
            );

            return (
              <div
                key={sub.id}
                className={`bg-white rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                  isAssigned
                    ? "border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm"
                    : "border-slate-200/80 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {sub.code}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sub.section === "PRIMARY"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : sub.section === "SECONDARY"
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {sub.section === "BOTH" ? "Primary & Secondary" : sub.section === "PRIMARY" ? "Primary & KG" : "Secondary"}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm leading-snug">
                    {sub.name}
                  </h3>

                  {sub.description && (
                    <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {sub.description}
                    </p>
                  )}
                </div>

                {isTeacher && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleToggleSubject(sub.name)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isAssigned
                          ? "bg-emerald-50 hover:bg-rose-50 text-emerald-700 hover:text-rose-700 border border-emerald-200 hover:border-rose-200"
                          : "bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm"
                      }`}
                    >
                      {isAssigned ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Active in My Classes (Remove)</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to My Classes</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Subject Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-[#0B1A36] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-lg">Create New Subject</h3>
                  <p className="text-[11px] text-blue-200">
                    Add a curriculum subject for your class or school
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubject} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Quick Presets for Early Childhood / Primary */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Quick Presets (KG &amp; Primary):
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50">
                  {COMMON_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 text-slate-700 transition-colors shadow-2xs"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Letter Work, Number Work, Phonics, French..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Subject Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subject Code (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. LTW, NWK, MTH"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Auto-generated if empty
                  </span>
                </div>

                {/* Section */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Section
                  </label>
                  <select
                    value={formData.section}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        section: e.target.value as "PRIMARY" | "SECONDARY" | "BOTH",
                      })
                    }
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="PRIMARY">Primary &amp; KG</option>
                    <option value="SECONDARY">Secondary Wing</option>
                    <option value="BOTH">Universal (Both)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief curriculum description or learning objectives..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                />
              </div>

              {/* Auto-assign Checkbox for Teachers */}
              {isTeacher && (
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoAssign}
                    onChange={(e) => setFormData({ ...formData, autoAssign: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-emerald-950">
                    Add this subject to my active classes immediately
                  </span>
                </label>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Create Subject
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
