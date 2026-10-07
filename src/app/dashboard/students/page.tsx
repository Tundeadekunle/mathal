"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAcademic } from "@/lib/academic-context";
import { dataStore, DemoStudent } from "@/lib/store";
import {
  PRIMARY_CLASSES,
  SECONDARY_CLASSES,
  CLASS_ARMS,
} from "@/lib/grading";
import { useAuth } from "@/lib/auth-context";
import {
  UserPlus,
  Search,
  Users,
  Award,
  Check,
  X,
  Camera,
  Upload,
  Trash2,
  RefreshCw,
  Lock,
  Unlock,
} from "lucide-react";
import { validateImageFile, compressPassportImage } from "@/lib/image-utils";

export default function StudentsPage() {
  const { user } = useAuth();
  const { session } = useAcademic();
  const [students, setStudents] = useState<DemoStudent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<"ALL" | "PRIMARY" | "SECONDARY">("ALL");
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [showModal, setShowModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Passport Modal for Existing Students
  const [selectedStudentForPassport, setSelectedStudentForPassport] = useState<DemoStudent | null>(null);
  const [passportModalPreview, setPassportModalPreview] = useState<string | null>(null);
  const [isUpdatingPassport, setIsUpdatingPassport] = useState(false);
  const [passportError, setPassportError] = useState<string | null>(null);
  const [updatingApprovalId, setUpdatingApprovalId] = useState<string | null>(null);

  const isTeacher = user?.role === "TEACHER";
  const isAdmin = user?.role === "ADMIN";
  const teacherClasses =
    isTeacher && user?.assignedClasses
      ? user.assignedClasses.split(",").map((c) => c.trim()).filter(Boolean)
      : null;

  const canManageClearance = (student: DemoStudent) => {
    if (isAdmin) return true;
    if (isTeacher) {
      if (!teacherClasses || teacherClasses.length === 0) return true;
      return teacherClasses.includes(student.classLevel);
    }
    return false;
  };

  const handleToggleStudentClearance = async (student: DemoStudent) => {
    if (!canManageClearance(student)) return;
    const newStatus = !student.resultsApproved;
    setUpdatingApprovalId(student.id);

    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultsApproved: newStatus,
          approvedBy: `${user?.name} (${user?.role})`,
        }),
      });

      if (res.ok) {
        setStudents((prev) =>
          prev.map((s) =>
            s.id === student.id
              ? {
                  ...s,
                  resultsApproved: newStatus,
                  resultsApprovedBy: newStatus ? `${user?.name} (${user?.role})` : null,
                  resultsApprovedAt: newStatus ? new Date().toISOString() : null,
                }
              : s
          )
        );
        setNotification(
          `${student.firstName} ${student.lastName}'s report card & score access is now ${newStatus ? "APPROVED" : "WITHHELD"}.`
        );
        setTimeout(() => setNotification(null), 5000);
      }
    } catch {
      // fallback
    } finally {
      setUpdatingApprovalId(null);
    }
  };

  // Registration Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    otherName: "",
    section: "PRIMARY" as "PRIMARY" | "SECONDARY",
    classLevel: "Basic 1",
    arm: "Gold",
    gender: "MALE" as "MALE" | "FEMALE",
    dateOfBirth: "2017-06-15",
    bloodGroup: "O+",
    address: "",
    passportPhoto: "",
    guardianName: "",
    guardianPhone: "",
    guardianEmail: "",
    guardianAddress: "",
  });

  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);
  const [formPhotoError, setFormPhotoError] = useState<string | null>(null);
  const [compressingPhoto, setCompressingPhoto] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const loadStudents = async () => {
    try {
      const res = await fetch("/api/students");
      if (res.ok) {
        const d = await res.json();
        if (d.students) {
          setStudents(d.students);
          return;
        }
      }
    } catch {
      // fallback
    }
    setStudents([...dataStore.getStudents()]);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const filteredStudents = students.filter((s) => {
    const matchesSection = selectedSection === "ALL" || s.section === selectedSection;
    const matchesClass =
      selectedClass === "ALL" ||
      s.classLevel === selectedClass ||
      s.classLevel.replace(/\s+/g, "").toLowerCase() === selectedClass.replace(/\s+/g, "").toLowerCase();
    const fullName = `${s.firstName} ${s.lastName} ${s.otherName || ""}`.toLowerCase();
    const cleanSearch = searchQuery.toLowerCase().trim();
    const matchesQuery =
      fullName.includes(cleanSearch) ||
      s.admissionNo.toLowerCase().includes(cleanSearch) ||
      s.classLevel.toLowerCase().replace(/\s+/g, "").includes(cleanSearch.replace(/\s+/g, "")) ||
      s.guardianName.toLowerCase().includes(cleanSearch);
    return matchesSection && matchesClass && matchesQuery;
  });

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormPhotoError(null);
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setFormPhotoError(validation.error || "Invalid image file.");
      return;
    }

    try {
      setCompressingPhoto(true);
      const compressed = await compressPassportImage(file);
      setFormPhotoPreview(compressed);
      setFormData((prev) => ({ ...prev, passportPhoto: compressed }));
    } catch (err: any) {
      setFormPhotoError(err.message || "Failed to process photo.");
    } finally {
      setCompressingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setFormPhotoPreview(null);
    setFormData((prev) => ({ ...prev, passportPhoto: "" }));
  };

  // Open modal to view/update existing student passport
  const openPassportModal = (student: DemoStudent) => {
    setSelectedStudentForPassport(student);
    setPassportModalPreview(student.passportPhoto || null);
    setPassportError(null);
  };

  const handleExistingPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPassportError(null);
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setPassportError(validation.error || "Invalid image file.");
      return;
    }

    try {
      setIsUpdatingPassport(true);
      const compressed = await compressPassportImage(file);
      setPassportModalPreview(compressed);
    } catch (err: any) {
      setPassportError(err.message || "Failed to process photo.");
    } finally {
      setIsUpdatingPassport(false);
    }
  };

  const handleSaveStudentPassport = async () => {
    if (!selectedStudentForPassport) return;
    setIsUpdatingPassport(true);
    setPassportError(null);

    try {
      const res = await fetch(`/api/students/${selectedStudentForPassport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passportPhoto: passportModalPreview || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update passport photograph.");
      }

      setStudents((prev) =>
        prev.map((s) =>
          s.id === selectedStudentForPassport.id
            ? { ...s, passportPhoto: passportModalPreview || undefined }
            : s
        )
      );

      setNotification(
        `Passport photo for ${selectedStudentForPassport.firstName} ${selectedStudentForPassport.lastName} saved successfully in Neon DB!`
      );
      setSelectedStudentForPassport(null);
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setPassportError(err.message || "Could not save photo to Neon DB.");
    } finally {
      setIsUpdatingPassport(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        await loadStudents();
        setShowModal(false);
        setNotification(
          `Successfully registered ${data.student.firstName} ${data.student.lastName} with Admission No: ${data.student.admissionNo} into Neon DB`
        );

        // Reset Form
        setFormData({
          firstName: "",
          lastName: "",
          otherName: "",
          section: "PRIMARY",
          classLevel: "Basic 1",
          arm: "Gold",
          gender: "MALE",
          dateOfBirth: "2017-06-15",
          bloodGroup: "O+",
          address: "",
          passportPhoto: "",
          guardianName: "",
          guardianPhone: "",
          guardianEmail: "",
          guardianAddress: "",
        });
        setFormPhotoPreview(null);
        setFormPhotoError(null);

        setTimeout(() => setNotification(null), 6000);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to register student.");
      }
    } catch {
      alert("Error saving student to Neon DB.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-black text-slate-900 tracking-tight">
            Pupils &amp; Students Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Enroll and manage primary pupils and secondary students across all academic classes and arms.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4 text-amber-300" />
          Enroll New Student
        </button>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-emerald-500 hover:text-emerald-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, admission no, or guardian..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        {/* Section & Class Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full md:w-auto">
          <select
            value={selectedSection}
            onChange={(e) => {
              setSelectedSection(e.target.value as any);
              setSelectedClass("ALL");
            }}
            className="py-2 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="ALL">All Wings (Primary &amp; Sec)</option>
            <option value="PRIMARY">Primary Wing</option>
            <option value="SECONDARY">Secondary Wing</option>
          </select>

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="py-2 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="ALL">All Classes</option>
            {(selectedSection === "PRIMARY"
              ? PRIMARY_CLASSES
              : selectedSection === "SECONDARY"
              ? SECONDARY_CLASSES
              : [...PRIMARY_CLASSES, ...SECONDARY_CLASSES]
            ).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-slate-800 text-xs sm:text-sm">
              Enrolled Roster ({filteredStudents.length} Students)
            </h3>
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400">
            {session} Active
          </span>
        </div>

        {/* Mobile View: High Density Cards */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No pupils or students found matching your criteria.
            </div>
          ) : (
            filteredStudents.map((s) => (
              <div key={s.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openPassportModal(s)}
                      className="relative flex-shrink-0 cursor-pointer"
                      title="Click to view or upload passport"
                    >
                      {s.passportPhoto ? (
                        <img
                          src={s.passportPhoto}
                          alt={`${s.firstName}'s Passport`}
                          className="w-11 h-11 rounded-xl object-cover border border-emerald-600/30 shadow-xs"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs border border-emerald-200 shadow-xs">
                          {s.firstName?.[0]}{s.lastName?.[0]}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-xs">
                        <Camera className="w-2.5 h-2.5" />
                      </div>
                    </button>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {s.firstName} {s.lastName}
                      </h4>
                      <span className="font-mono font-semibold text-xs text-emerald-950">
                        {s.admissionNo}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      s.section === "PRIMARY"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {s.section}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Class</span>
                    <strong className="text-slate-800">{s.classLevel} ({s.arm})</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Gender</span>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        s.gender === "FEMALE"
                          ? "bg-pink-50 text-pink-700"
                          : "bg-indigo-50 text-indigo-700"
                      }`}
                    >
                      {s.gender}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Guardian: <strong className="text-slate-700">{s.guardianName}</strong></span>
                    {s.guardianPhone && (
                      <a href={`tel:${s.guardianPhone}`} className="text-emerald-700 font-bold underline">
                        {s.guardianPhone}
                      </a>
                    )}
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {canManageClearance(s) && (
                    <button
                      type="button"
                      onClick={() => handleToggleStudentClearance(s)}
                      disabled={updatingApprovalId === s.id}
                      className={`inline-flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl font-bold text-xs transition-colors min-h-[40px] ${
                        s.resultsApproved
                          ? "bg-emerald-50 hover:bg-rose-50 text-emerald-800 hover:text-rose-700 border border-emerald-300"
                          : "bg-amber-100 hover:bg-emerald-50 text-amber-900 hover:text-emerald-800 border border-amber-300"
                      }`}
                      title={s.resultsApproved ? "Revoke clearance" : "Approve result clearance"}
                    >
                      {updatingApprovalId === s.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : s.resultsApproved ? (
                        <Unlock className="w-3.5 h-3.5" />
                      ) : (
                        <Lock className="w-3.5 h-3.5" />
                      )}
                      <span>{s.resultsApproved ? "Approved" : "Approve"}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openPassportModal(s)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors min-h-[40px]"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Passport</span>
                  </button>
                  <Link
                    href={`/dashboard/results/${s.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors min-h-[40px]"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-300" />
                    <span>Report Card</span>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Admission No</th>
                <th className="px-6 py-3.5">Pupil / Student Name</th>
                <th className="px-6 py-3.5">Section</th>
                <th className="px-6 py-3.5">Class &amp; Arm</th>
                <th className="px-6 py-3.5">Gender</th>
                <th className="px-6 py-3.5">Parent / Guardian</th>
                <th className="px-4 py-3.5 text-center">Result Clearance</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No pupils or students found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-emerald-900 text-xs">
                      {s.admissionNo}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openPassportModal(s)}
                          title="Click to view or change passport photograph"
                          className="relative group flex-shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-full"
                        >
                          {s.passportPhoto ? (
                            <img
                              src={s.passportPhoto}
                              alt={`${s.firstName}'s Passport`}
                              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-600/30 shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs border border-emerald-200 shadow-sm">
                              {s.firstName?.[0]}{s.lastName?.[0]}
                            </div>
                          )}
                          <div className="absolute inset-0 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-3.5 h-3.5" />
                          </div>
                        </button>
                        <div>
                          <div className="font-bold text-slate-900">
                            {s.firstName} {s.lastName}
                          </div>
                          {s.otherName && (
                            <div className="text-[11px] text-slate-400">{s.otherName}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.section === "PRIMARY"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {s.section}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-800">{s.classLevel}</span>
                      <span className="ml-1 text-xs text-slate-500 font-medium">({s.arm})</span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          s.gender === "FEMALE"
                            ? "bg-pink-50 text-pink-700"
                            : "bg-indigo-50 text-indigo-700"
                        }`}
                      >
                        {s.gender}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="font-semibold text-slate-800">{s.guardianName}</div>
                      <div className="text-[11px] text-slate-400">{s.guardianPhone}</div>
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      {canManageClearance(s) ? (
                        <button
                          type="button"
                          onClick={() => handleToggleStudentClearance(s)}
                          disabled={updatingApprovalId === s.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                            s.resultsApproved
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                              : "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300"
                          }`}
                          title={
                            s.resultsApproved
                              ? `Approved by ${s.resultsApprovedBy || "Teacher/Admin"}. Click to withhold.`
                              : "Pending clearance. Click to approve."
                          }
                        >
                          {updatingApprovalId === s.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : s.resultsApproved ? (
                            <Unlock className="w-3 h-3 text-emerald-700" />
                          ) : (
                            <Lock className="w-3 h-3 text-amber-700" />
                          )}
                          <span>{s.resultsApproved ? "Approved" : "Withheld"}</span>
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.resultsApproved
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {s.resultsApproved ? "Approved" : "Pending"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openPassportModal(s)}
                          title="Upload or change student passport photo"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5 text-slate-500" />
                          <span className="hidden lg:inline">Passport</span>
                        </button>
                        <Link
                          href={`/dashboard/results/${s.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition-colors"
                        >
                          <Award className="w-3.5 h-3.5" />
                          Report Card
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Register New Pupil / Student
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                1. Academic Placement
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    School Section
                  </label>
                  <select
                    value={formData.section}
                    onChange={(e) => {
                      const sec = e.target.value as "PRIMARY" | "SECONDARY";
                      setFormData({
                        ...formData,
                        section: sec,
                        classLevel: sec === "PRIMARY" ? "Basic 1" : "JSS 1",
                      });
                    }}
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="PRIMARY">Primary School</option>
                    <option value="SECONDARY">Secondary School</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Class Level
                  </label>
                  <select
                    value={formData.classLevel}
                    onChange={(e) => setFormData({ ...formData, classLevel: e.target.value })}
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    {(formData.section === "PRIMARY" ? PRIMARY_CLASSES : SECONDARY_CLASSES).map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Arm / Stream
                  </label>
                  <select
                    value={formData.arm}
                    onChange={(e) => setFormData({ ...formData, arm: e.target.value })}
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    {CLASS_ARMS.map((arm) => (
                      <option key={arm} value={arm}>
                        {arm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2">
                2. Personal Information &amp; Passport Photo
              </div>

              {/* Passport Photograph Upload Component */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-20 h-24 rounded-xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                  {formPhotoPreview ? (
                    <img
                      src={formPhotoPreview}
                      alt="Passport preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                      <Camera className="w-6 h-6 mb-1 text-slate-400" />
                      <span className="text-[9px] font-semibold leading-tight">Passport Photo</span>
                    </div>
                  )}
                  {compressingPhoto && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1.5 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Pupil / Student Passport Photo
                    </span>
                    {formPhotoPreview && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Ready to Save
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Upload a clear face photo (JPG, PNG, WebP). It will be saved directly into Neon DB for terminal report cards.
                  </p>

                  <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer shadow-sm transition-all">
                      <Upload className="w-3.5 h-3.5 text-amber-300" />
                      <span>{formPhotoPreview ? "Change Photo" : "Upload Passport"}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>

                    {formPhotoPreview && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  {formPhotoError && (
                    <p className="text-[11px] text-rose-600 font-semibold">{formPhotoError}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="e.g. Maryam"
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Name / Surname *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="e.g. Adeleke"
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Other Name
                  </label>
                  <input
                    type="text"
                    value={formData.otherName}
                    onChange={(e) => setFormData({ ...formData, otherName: e.target.value })}
                    placeholder="e.g. Boluwatife"
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value as "MALE" | "FEMALE" })
                    }
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="AB+">AB+</option>
                  </select>
                </div>
              </div>

              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2">
                3. Parent / Guardian Information
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Guardian Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    placeholder="e.g. Barrister T. Adeleke"
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.guardianPhone}
                    onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                    placeholder="e.g. +234 803 111 2233"
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Guardian Email
                  </label>
                  <input
                    type="email"
                    value={formData.guardianEmail}
                    onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                    placeholder="parent@example.com"
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: e.target.value,
                        guardianAddress: e.target.value,
                      })
                    }
                    placeholder="Street, City"
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 shadow-md"
                >
                  Complete Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Existing Student Passport Update Modal */}
      {selectedStudentForPassport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Student Passport Photo
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedStudentForPassport.firstName} {selectedStudentForPassport.lastName} &bull; {selectedStudentForPassport.admissionNo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForPassport(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center py-4 space-y-4">
              {/* Photo Preview Container */}
              <div className="relative w-36 h-44 rounded-2xl border-2 border-emerald-900/20 bg-slate-50 flex items-center justify-center overflow-hidden shadow-md">
                {passportModalPreview ? (
                  <img
                    src={passportModalPreview}
                    alt={`${selectedStudentForPassport.firstName} Passport`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-slate-400 p-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xl mb-2">
                      {selectedStudentForPassport.firstName?.[0]}
                      {selectedStudentForPassport.lastName?.[0]}
                    </div>
                    <span className="text-xs font-medium">No photo uploaded</span>
                  </div>
                )}

                {isUpdatingPassport && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs font-semibold text-slate-700">
                  {selectedStudentForPassport.classLevel} ({selectedStudentForPassport.arm}) &bull; {selectedStudentForPassport.section} Wing
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Upload a standard, centered passport photograph. The photo will appear immediately on all official terminal report sheets.
                </p>
              </div>

              {passportError && (
                <div className="w-full p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">
                  {passportError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-all">
                  <Upload className="w-4 h-4 text-amber-300" />
                  <span>{passportModalPreview ? "Choose New Photo" : "Upload Photo"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleExistingPhotoSelect}
                    className="hidden"
                  />
                </label>

                {passportModalPreview && (
                  <button
                    type="button"
                    onClick={() => setPassportModalPreview(null)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 mt-2">
              <button
                type="button"
                onClick={() => setSelectedStudentForPassport(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStudentPassport}
                disabled={isUpdatingPassport}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isUpdatingPassport ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save to Neon DB</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
