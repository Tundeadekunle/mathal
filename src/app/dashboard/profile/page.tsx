"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  User,
  Mail,
  Phone,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Save,
  GraduationCap,
  BookOpen,
  Calendar,
  Heart,
  Home,
  Users,
  Camera,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
} from "lucide-react";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"personal" | "academic" | "security">("personal");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    avatarUrl: "",
    // Teacher
    title: "",
    qualification: "",
    // Student
    guardianName: "",
    guardianPhone: "",
    guardianEmail: "",
    guardianAddress: "",
    bloodGroup: "",
    dateOfBirth: "",
    address: "",
    // Security
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Full fetched profile for read-only displays
  const [fullProfile, setFullProfile] = useState<any>(null);

  // Load profile from API
  const loadProfile = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/auth/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const u = data.user;
          setFullProfile(u);
          setFormData((prev) => ({
            ...prev,
            name: u.name || "",
            email: u.email || "",
            phone: u.phone || "",
            avatarUrl: u.avatarUrl || u.student?.passportPhoto || "",
            title: u.teacher?.title || "",
            qualification: u.teacher?.qualification || "",
            guardianName: u.student?.guardianName || "",
            guardianPhone: u.student?.guardianPhone || "",
            guardianEmail: u.student?.guardianEmail || "",
            guardianAddress: u.student?.guardianAddress || "",
            bloodGroup: u.student?.bloodGroup || "",
            dateOfBirth: u.student?.dateOfBirth ? u.student.dateOfBirth.substring(0, 10) : "",
            address: u.student?.address || "",
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          }));
        }
      }
    } catch (err: any) {
      console.error("Error loading profile:", err);
      setErrorMsg("Failed to load full profile data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate password confirmation if changing password
    if (formData.newPassword) {
      if (!formData.currentPassword) {
        setErrorMsg("Please enter your current password to set a new password.");
        setActiveTab("security");
        return;
      }
      if (formData.newPassword.length < 6) {
        setErrorMsg("New password must be at least 6 characters long.");
        setActiveTab("security");
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setErrorMsg("New password and confirm password do not match.");
        setActiveTab("security");
        return;
      }
    }

    setSaving(true);

    try {
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        avatarUrl: formData.avatarUrl.trim() || undefined,
      };

      if (formData.newPassword) {
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
      }

      if (user?.role === "TEACHER") {
        payload.title = formData.title.trim() || undefined;
        payload.qualification = formData.qualification.trim() || undefined;
      }

      if (user?.role === "STUDENT") {
        payload.guardianName = formData.guardianName.trim() || undefined;
        payload.guardianPhone = formData.guardianPhone.trim() || undefined;
        payload.guardianEmail = formData.guardianEmail.trim() || undefined;
        payload.guardianAddress = formData.guardianAddress.trim() || undefined;
        payload.bloodGroup = formData.bloodGroup.trim() || undefined;
        payload.dateOfBirth = formData.dateOfBirth || undefined;
        payload.address = formData.address.trim() || undefined;
        payload.passportPhoto = formData.avatarUrl.trim() || undefined;
      }

      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      // Re-sync session state
      await refreshUser();
      await loadProfile();

      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      setSuccessMsg(data.message || "Profile updated successfully!");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const role = user?.role || "STUDENT";

  const roleBadge = {
    ADMIN: { label: "System Administrator", color: "bg-amber-400 text-emerald-950 font-bold" },
    TEACHER: { label: "Faculty / Teacher", color: "bg-emerald-600 text-white font-semibold" },
    STUDENT: { label: "Pupil / Student", color: "bg-cyan-600 text-white font-semibold" },
  }[role];

  // Initials generator
  const getInitials = (nameStr: string) => {
    const parts = nameStr.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0]?.[0]?.toUpperCase() || "M";
  };

  if (loading && !fullProfile) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        <p className="text-xs text-slate-500 font-medium">Loading user profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-100/70 text-emerald-800 px-2 py-0.5 rounded">
            Live Synchronized
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Hero Profile Card */}
      <div className="bg-gradient-to-br from-[#0B1A36] via-[#0D224A] to-[#122A5C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-900/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar Display */}
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-800 border-2 border-amber-400/80 shadow-lg flex items-center justify-center flex-shrink-0">
              {formData.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={formData.avatarUrl}
                  alt={formData.name || "User Avatar"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback if image fails to load
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-serif text-3xl font-black text-amber-300 bg-blue-950">
                  {getInitials(formData.name || user?.name || "User")}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("personal")}
              className="absolute -bottom-2 -right-2 p-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl shadow-md transition-transform hover:scale-105 cursor-pointer"
              title="Change Profile Photo / Avatar"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* User Identifiers */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
              <span className="text-[11px] font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active Account
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white">
              {formData.title ? `${formData.title} ` : ""}
              {formData.name || "User Profile"}
            </h1>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs text-blue-200">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-blue-300" />
                {formData.email}
              </span>
              {formData.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-blue-300" />
                  {formData.phone}
                </span>
              )}
            </div>

            {/* Institutional ID Badges */}
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {user?.admissionNo && (
                <span className="px-3 py-1 rounded-xl bg-blue-950/80 border border-blue-800/80 text-[11px] font-mono text-amber-300">
                  Admission No: <strong>{user.admissionNo}</strong>
                </span>
              )}
              {user?.staffId && (
                <span className="px-3 py-1 rounded-xl bg-blue-950/80 border border-blue-800/80 text-[11px] font-mono text-amber-300">
                  Staff ID: <strong>{user.staffId}</strong>
                </span>
              )}
              {fullProfile?.student?.classLevel && (
                <span className="px-3 py-1 rounded-xl bg-blue-950/80 border border-blue-800/80 text-[11px] text-blue-200">
                  Class: <strong>{fullProfile.student.classLevel} {fullProfile.student.arm ? `(${fullProfile.student.arm})` : ""}</strong>
                </span>
              )}
              {fullProfile?.teacher?.assignedSection && (
                <span className="px-3 py-1 rounded-xl bg-blue-950/80 border border-blue-800/80 text-[11px] text-blue-200">
                  Section: <strong>{fullProfile.teacher.assignedSection} Wing</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Edit Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 pt-3 gap-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "personal"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <User className="w-4 h-4" />
            Personal Details
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("academic")}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "academic"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            {role === "TEACHER" ? (
              <>
                <BookOpen className="w-4 h-4" />
                Teaching &amp; Faculty
              </>
            ) : role === "STUDENT" ? (
              <>
                <GraduationCap className="w-4 h-4" />
                Student &amp; Guardian Info
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                System Administration
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "security"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Security &amp; Password
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* TAB 1: PERSONAL INFORMATION */}
          {activeTab === "personal" && (
            <div className="space-y-5 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-sm">Personal Information</h3>
                <p className="text-xs text-slate-500">
                  Update your contact details and visual presentation on Mathal School portals.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Ibrahim Musa"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. name@mathalschools.com"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g. +234 801 234 5678"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Profile Avatar / Photo URL
                  </label>
                  <div className="relative">
                    <Camera className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="url"
                      name="avatarUrl"
                      value={formData.avatarUrl}
                      onChange={handleChange}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Direct link to a square passport photo or avatar picture.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROLE-SPECIFIC DETAILS */}
          {activeTab === "academic" && (
            <div className="space-y-5 animate-in fade-in">
              {role === "TEACHER" && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-800 text-sm">Faculty &amp; Teaching Credentials</h3>
                    <p className="text-xs text-slate-500">
                      Manage your academic qualifications and professional title.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Professional Title
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="e.g. Mr., Mrs., Dr., Ustaz, Mal."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Educational Qualification(s)
                      </label>
                      <input
                        type="text"
                        name="qualification"
                        value={formData.qualification}
                        onChange={handleChange}
                        placeholder="e.g. B.Sc (Ed) Mathematics, NCE, M.Ed"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Read-Only Official Allocations */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-emerald-700" />
                        Official School Record (Read-Only)
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold bg-slate-200/70 px-2 py-0.5 rounded-full">
                        Admin Managed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                          Staff ID
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {fullProfile?.teacher?.staffId || user?.staffId || "N/A"}
                        </span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                          Assigned Section
                        </span>
                        <span className="font-bold text-slate-800">
                          {fullProfile?.teacher?.assignedSection || "Universal"}
                        </span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                          Assigned Classes
                        </span>
                        <span className="font-semibold text-slate-800">
                          {fullProfile?.teacher?.assignedClasses || "No classes assigned"}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      To modify assigned classes or institutional staff ID, please contact the school administrative office.
                    </p>
                  </div>
                </div>
              )}

              {role === "STUDENT" && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-800 text-sm">Student Bio &amp; Guardian Details</h3>
                    <p className="text-xs text-slate-500">
                      Keep your home address, medical health metrics, and emergency contacts up to date.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Date of Birth
                      </label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Blood Group
                      </label>
                      <div className="relative">
                        <Heart className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                          name="bloodGroup"
                          value={formData.bloodGroup}
                          onChange={handleChange}
                          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="">Select Blood Group</option>
                          {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((bg) => (
                            <option key={bg} value={bg}>
                              {bg}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Residential Home Address
                      </label>
                      <div className="relative">
                        <Home className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <textarea
                          rows={2}
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          placeholder="e.g. 15 Sultan Bello Road, Kaduna"
                          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                      <h4 className="font-bold text-slate-800 text-xs mb-3 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-700" />
                        Parent / Guardian Contact
                      </h4>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Guardian Name
                      </label>
                      <input
                        type="text"
                        name="guardianName"
                        value={formData.guardianName}
                        onChange={handleChange}
                        placeholder="e.g. Alhaji Aliyu Bello"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Guardian Phone Number
                      </label>
                      <input
                        type="tel"
                        name="guardianPhone"
                        value={formData.guardianPhone}
                        onChange={handleChange}
                        placeholder="e.g. +234 803 111 2222"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Guardian Email
                      </label>
                      <input
                        type="email"
                        name="guardianEmail"
                        value={formData.guardianEmail}
                        onChange={handleChange}
                        placeholder="guardian@example.com"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Guardian Contact Address
                      </label>
                      <input
                        type="text"
                        name="guardianAddress"
                        value={formData.guardianAddress}
                        onChange={handleChange}
                        placeholder="Office or home address"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Read-Only Academic Record */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-cyan-700" />
                        Academic Enrollment Status (Read-Only)
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold bg-slate-200/70 px-2 py-0.5 rounded-full">
                        Registrar Managed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                          Admission No
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {fullProfile?.student?.admissionNo || user?.admissionNo || "N/A"}
                        </span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                          Class Level
                        </span>
                        <span className="font-bold text-slate-800">
                          {fullProfile?.student?.classLevel || "N/A"}
                        </span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                          Class Arm
                        </span>
                        <span className="font-bold text-slate-800">
                          {fullProfile?.student?.arm || "Default"}
                        </span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                          Section
                        </span>
                        <span className="font-bold text-slate-800">
                          {fullProfile?.student?.section || "Primary"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {role === "ADMIN" && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-800 text-sm">System Administration Privileges</h3>
                    <p className="text-xs text-slate-500">
                      Your account holds full administrative governance over Mathal International Schools.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-950">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      Administrator Access Level
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700">
                      <li>Full control over Student admissions, promotions, and transfers.</li>
                      <li>Faculty hiring, teacher profiles, and official class allocations.</li>
                      <li>Publishing and verification of CA scores, examination papers, and term report cards.</li>
                      <li>Creation and management of early childhood (KG 1-2, Nursery) and primary/secondary curricula.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SECURITY & PASSWORD */}
          {activeTab === "security" && (
            <div className="space-y-5 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-sm">Security &amp; Password Management</h3>
                <p className="text-xs text-slate-500">
                  Leave these fields blank if you do not wish to change your password.
                </p>
              </div>

              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      placeholder="Enter current password"
                      className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showNewPass ? "text" : "password"}
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showNewPass ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-type new password"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={loadProfile}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
            >
              Reset Changes
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
