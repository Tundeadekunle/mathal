"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";
import {
  PRIMARY_CLASSES,
  SECONDARY_CLASSES,
  CLASS_ARMS,
} from "@/lib/grading";
import {
  BookOpen,
  GraduationCap,
  Lock,
  Mail,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Check,
  Eye,
  EyeOff,
  Camera,
  Upload,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { validateImageFile, compressPassportImage } from "@/lib/image-utils";

export default function RegisterPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [role, setRole] = useState<"STUDENT" | "TEACHER" | "ADMIN">("STUDENT");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    // Student specifics
    section: "PRIMARY" as "PRIMARY" | "SECONDARY",
    classLevel: "Basic 4",
    arm: "Gold",
    gender: "MALE" as "MALE" | "FEMALE",
    dateOfBirth: "2015-06-18",
    bloodGroup: "O+",
    address: "",
    passportPhoto: "",
    guardianName: "",
    guardianPhone: "",
    // Teacher specifics
    staffId: "",
    qualification: "B.Sc (Ed) Mathematics",
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [compressingPhoto, setCompressingPhoto] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Real-time password strength calculation
  const passwordStrength = useMemo(() => {
    const pwd = formData.password;
    if (!pwd) return { score: 0, label: "Empty", color: "bg-slate-700" };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-rose-500" };
    if (score <= 3) return { score: 2, label: "Fair", color: "bg-amber-500" };
    if (score === 4) return { score: 3, label: "Good", color: "bg-blue-500" };
    return { score: 4, label: "Strong", color: "bg-emerald-500" };
  }, [formData.password]);

  // Real-time password match check
  const passwordsMatch = useMemo(() => {
    if (!formData.confirmPassword) return null;
    return formData.password === formData.confirmPassword;
  }, [formData.password, formData.confirmPassword]);

  // Real-time generated student Admission No / Staff ID preview
  const previewId = useMemo(() => {
    const year = new Date().getFullYear();
    if (role === "STUDENT") {
      const prefix = formData.section === "PRIMARY" ? "MIS/PRI" : "MIS/SEC";
      return `${prefix}/${year}/XXX`;
    } else if (role === "TEACHER") {
      return `MIS/STF/${year}/XXX`;
    }
    return `MIS/ADM/${year}/XXX`;
  }, [role, formData.section]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError(null);
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setPhotoError(validation.error || "Invalid image file.");
      return;
    }

    try {
      setCompressingPhoto(true);
      const compressed = await compressPassportImage(file);
      setPhotoPreview(compressed);
      setFormData((prev) => ({ ...prev, passportPhoto: compressed }));
    } catch (err: any) {
      setPhotoError(err.message || "Failed to process photo.");
    } finally {
      setCompressingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setFormData((prev) => ({ ...prev, passportPhoto: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setLoading(true);

    try {
      const res = await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role,
        phone: formData.phone,
        section: formData.section,
        classLevel: formData.classLevel,
        arm: formData.arm,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        bloodGroup: formData.bloodGroup,
        address: formData.address,
        passportPhoto: formData.passportPhoto || undefined,
        guardianName: formData.guardianName || `${formData.name}'s Guardian`,
        guardianPhone: formData.guardianPhone || formData.phone,
        staffId: formData.staffId || undefined,
        qualification: formData.qualification || undefined,
      });

      if (res.success) {
        setSuccessNotice(
          `Welcome to Mathal International Schools, ${formData.name}! Your account has been activated.`
        );
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        setError(res.message || "Registration could not be completed.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Image: Mathal Logo Watermark */}
      <div
        className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="w-[500px] h-[500px] max-w-[85vw] max-h-[85vw] bg-center bg-no-repeat bg-contain opacity-[0.06] rounded-3xl"
          style={{ backgroundImage: "url('/mathal-logo.jpg')" }}
        />
      </div>

      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center z-10">
        <Link href="/" className="inline-block mb-3">
          <Logo size={60} variant="light" />
        </Link>
        <h2 className="text-2xl sm:text-3xl font-serif font-black text-white tracking-tight">
          Create Your Portal Account
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-emerald-300">
          Real-time enrollment for pupils, students, teachers, and guardians.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10">
        <div className="bg-slate-800/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-emerald-800/50 sm:px-10">
          {/* Role Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-900/80 p-1 border border-slate-700/60 mb-6">
            <button
              type="button"
              onClick={() => setRole("STUDENT")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                role === "STUDENT"
                  ? "bg-cyan-600 text-white shadow-md font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Pupil / Student
            </button>
            <button
              type="button"
              onClick={() => setRole("TEACHER")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                role === "TEACHER"
                  ? "bg-emerald-600 text-white shadow-md font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Teacher / Staff
            </button>
            <button
              type="button"
              onClick={() => setRole("ADMIN")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                role === "ADMIN"
                  ? "bg-amber-400 text-emerald-950 shadow-md font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Management
            </button>
          </div>

          {/* ID Format Preview Pill */}
          <div className="mb-5 p-3 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>
                Auto-assigned ID pattern:{" "}
                <strong className="font-mono text-amber-300">{previewId}</strong>
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded font-semibold">
              Live Real-Time Sync
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={
                      role === "STUDENT"
                        ? "e.g. Tariq Olawale"
                        : "e.g. Mrs. Grace Adebayo"
                    }
                    className="block w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="learner@mathal.edu.ng"
                    className="block w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Password & Confirm with Real-time Strength */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="block w-full pl-9 pr-9 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden flex gap-0.5">
                      <div
                        className={`h-full ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    placeholder="Retype password"
                    className="block w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Real-time match feedback */}
                {passwordsMatch !== null && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px]">
                    {passwordsMatch ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Passwords match
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Passwords do not match
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Student Role Specifics */}
            {role === "STUDENT" && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/80 space-y-3">
                <div className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">
                  Academic Placement &bull; Student Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
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
                      className="w-full text-xs py-1.5 px-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="PRIMARY">Primary Wing</option>
                      <option value="SECONDARY">Secondary Wing</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Class Level
                    </label>
                    <select
                      value={formData.classLevel}
                      onChange={(e) =>
                        setFormData({ ...formData, classLevel: e.target.value })
                      }
                      className="w-full text-xs py-1.5 px-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                    >
                      {(formData.section === "PRIMARY"
                        ? PRIMARY_CLASSES
                        : SECONDARY_CLASSES
                      ).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Arm / Stream
                    </label>
                    <select
                      value={formData.arm}
                      onChange={(e) => setFormData({ ...formData, arm: e.target.value })}
                      className="w-full text-xs py-1.5 px-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                    >
                      {CLASS_ARMS.map((arm) => (
                        <option key={arm} value={arm}>
                          {arm}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          gender: e.target.value as "MALE" | "FEMALE",
                        })
                      }
                      className="w-full text-xs py-1.5 px-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData({ ...formData, dateOfBirth: e.target.value })
                      }
                      className="w-full text-xs py-1.5 px-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Blood Group
                    </label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) =>
                        setFormData({ ...formData, bloodGroup: e.target.value })
                      }
                      className="w-full text-xs py-1.5 px-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Parent / Guardian Name
                    </label>
                    <input
                      type="text"
                      value={formData.guardianName}
                      onChange={(e) =>
                        setFormData({ ...formData, guardianName: e.target.value })
                      }
                      placeholder="e.g. Alhaji Danladi"
                      className="w-full text-xs py-1.5 px-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Guardian Phone
                    </label>
                    <input
                      type="text"
                      value={formData.guardianPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, guardianPhone: e.target.value })
                      }
                      placeholder="+234 803 000 0000"
                      className="w-full text-xs py-1.5 px-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                {/* Passport Photograph Upload Component */}
                <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative w-16 h-20 rounded-lg border border-dashed border-slate-600 bg-slate-900/90 flex flex-col items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Passport preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500 p-1 text-center">
                        <Camera className="w-5 h-5 mb-0.5 text-slate-500" />
                        <span className="text-[8px] font-semibold leading-tight">Passport Photo</span>
                      </div>
                    )}
                    {compressingPhoto && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-1 w-full">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300">
                        Passport Photograph (Optional)
                      </span>
                      {photoPreview && (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded">
                          Attached
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Upload pupil/student face photo (JPG, PNG, WebP).
                    </p>

                    <div className="flex items-center gap-2 pt-0.5 justify-center sm:justify-start">
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-semibold text-[11px] cursor-pointer shadow-sm transition-all">
                        <Upload className="w-3 h-3 text-cyan-200" />
                        <span>{photoPreview ? "Change" : "Upload Passport"}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                      </label>

                      {photoPreview && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 text-[11px] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {photoError && (
                      <p className="text-[10px] text-rose-400 font-semibold">{photoError}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Teacher Role Specifics */}
            {role === "TEACHER" && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/80 space-y-3">
                <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                  Staff Information &bull; Faculty Profile
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Highest Academic / Teaching Qualification
                  </label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) =>
                      setFormData({ ...formData, qualification: e.target.value })
                    }
                    placeholder="e.g. B.Sc (Ed) Mathematics, NCE, M.Ed"
                    className="w-full text-xs py-2 px-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-xs flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300">Admin-Allocated Teaching Assignments:</span>
                    <p className="mt-0.5 text-[11px] text-slate-300 leading-relaxed">
                      Only school administrators can assign classes and subjects to teachers. Once registered, your principal or administrator will allocate your classes and subjects from the administration panel.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 transition-all shadow-lg shadow-amber-400/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Registering in Real Time..." : "Complete Sign Up"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-700/60 text-center">
            <p className="text-xs text-slate-400">
              Already have an enrolled portal account?{" "}
              <Link
                href="/login"
                className="font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors ml-1"
              >
                Sign In here &rarr;
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
