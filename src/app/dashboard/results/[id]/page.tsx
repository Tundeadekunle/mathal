"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useAcademic } from "@/lib/academic-context";
import { dataStore, DemoTermReport, DemoStudent } from "@/lib/store";
import {
  AFFECTIVE_DOMAINS,
  PSYCHOMOTOR_DOMAINS,
  RATING_SCALE,
} from "@/lib/grading";
import {
  Download,
  ArrowLeft,
  CheckCircle,
  Save,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Camera,
  Upload,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { validateImageFile, compressPassportImage } from "@/lib/image-utils";

export default function StudentResultSheetPage() {
  const params = useParams();
  const id = params?.id as string;
  const { session, term, sessions, terms, setSession, setTerm } = useAcademic();
  const { user } = useAuth();

  const [student, setStudent] = useState<DemoStudent | null>(null);
  const [report, setReport] = useState<DemoTermReport | null>(null);

  // Passport Modal State
  const [showPassportModal, setShowPassportModal] = useState(false);
  const [passportPreview, setPassportPreview] = useState<string | null>(null);
  const [isUpdatingPassport, setIsUpdatingPassport] = useState(false);
  const [passportError, setPassportError] = useState<string | null>(null);

  // Teacher & Principal Interactive Evaluation State
  const [affectiveRating, setAffectiveRating] = useState<Record<string, number>>({});
  const [psychomotorRating, setPsychomotorRating] = useState<Record<string, number>>({});
  const [teacherRemark, setTeacherRemark] = useState("");
  const [principalRemark, setPrincipalRemark] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canRate = user?.role === "TEACHER" || user?.role === "ADMIN";

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(
          `/api/reports/${encodeURIComponent(id)}?session=${encodeURIComponent(session)}&term=${encodeURIComponent(term)}`
        );
        if (res.ok) {
          const d = await res.json();
          if (d.report && d.student) {
            setStudent(d.student);
            setPassportPreview(d.student.passportPhoto || null);
            setReport(d.report);
            setAffectiveRating(d.report.affectiveRating || {});
            setPsychomotorRating(d.report.psychomotorRating || {});
            setTeacherRemark(d.report.teacherRemark || "");
            setPrincipalRemark(d.report.principalRemark || "");
            return;
          }
        }
      } catch {
        // fallback
      }

      const st = dataStore.getStudentById(id);
      if (st) {
        setStudent(st);
        setPassportPreview(st.passportPhoto || null);
        const rep = dataStore.getStudentReportCard(st.id, session, term);
        setReport(rep);
        setAffectiveRating(rep?.affectiveRating || {});
        setPsychomotorRating(rep?.psychomotorRating || {});
        setTeacherRemark(rep?.teacherRemark || "");
        setPrincipalRemark(rep?.principalRemark || "");
      }
    }

    loadReport();
  }, [id, session, term]);

  const handlePassportPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setPassportPreview(compressed);
    } catch (err: any) {
      setPassportError(err.message || "Failed to process photo.");
    } finally {
      setIsUpdatingPassport(false);
    }
  };

  const handleSavePassportPhoto = async () => {
    if (!student) return;
    setIsUpdatingPassport(true);
    setPassportError(null);

    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passportPhoto: passportPreview || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save passport photo.");
      }

      setStudent((prev) => (prev ? { ...prev, passportPhoto: passportPreview || undefined } : null));
      setShowPassportModal(false);
      setSaveNotice(`Passport photo for ${student.firstName} updated successfully in Neon DB!`);
      setTimeout(() => setSaveNotice(null), 4000);
    } catch (err: any) {
      setPassportError(err.message || "Failed to update passport photo.");
    } finally {
      setIsUpdatingPassport(false);
    }
  };

  const handleAffectiveChange = (trait: string, val: number) => {
    setAffectiveRating((prev) => ({
      ...prev,
      [trait]: val,
    }));
  };

  const handlePsychomotorChange = (skill: string, val: number) => {
    setPsychomotorRating((prev) => ({
      ...prev,
      [skill]: val,
    }));
  };

  const handleSaveEvaluation = async () => {
    if (!student) return;
    setIsSaving(true);
    setSaveNotice(null);
    setSaveError(null);

    try {
      const res = await fetch(`/api/reports/${student.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session,
          term,
          affectiveRating,
          psychomotorRating,
          teacherRemark,
          principalRemark,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save evaluation.");
      }

      setSaveNotice(`Evaluation & Remarks successfully saved for ${student.firstName} in Neon DB!`);
      setTimeout(() => setSaveNotice(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || "Could not save ratings and remarks to Neon DB.");
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!student || !report) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-slate-500">Loading Student Report Card...</p>
          <Link
            href="/dashboard/results"
            className="mt-3 inline-flex text-xs font-bold text-emerald-700"
          >
            &larr; Back to Results
          </Link>
        </div>
      </div>
    );
  }

  // Ensure all domains have a display value
  const displayAffective: Record<string, number> = {};
  AFFECTIVE_DOMAINS.forEach((trait) => {
    displayAffective[trait] = affectiveRating[trait] ?? report.affectiveRating?.[trait] ?? 5;
  });

  const displayPsychomotor: Record<string, number> = {};
  PSYCHOMOTOR_DOMAINS.forEach((skill) => {
    displayPsychomotor[skill] = psychomotorRating[skill] ?? report.psychomotorRating?.[skill] ?? 5;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Control Action Bar (Hidden during Print) */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/results"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Return to Results"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Terminal Report: {student.firstName} {student.lastName}
            </h2>
            <p className="text-xs text-slate-500">
              Admission No: {student.admissionNo} &bull; {report.term}, {report.session}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Period Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <select
              value={session}
              onChange={(e) => setSession(e.target.value)}
              className="py-1 px-2 text-xs bg-white border border-slate-300 rounded-lg text-emerald-950 font-semibold focus:ring-1 focus:ring-emerald-500"
            >
              {sessions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="py-1 px-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-amber-500"
            >
              {terms.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Teacher Save Evaluation Button */}
          {canRate && (
            <button
              onClick={handleSaveEvaluation}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Evaluation
                </>
              )}
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-300" />
            Download PDF / Print
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveNotice && (
        <div className="no-print p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center gap-2.5 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{saveNotice}</span>
        </div>
      )}

      {saveError && (
        <div className="no-print p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Teacher Rating Banner */}
      {canRate && (
        <div className="no-print p-3.5 rounded-xl bg-[#0B1A36] text-blue-100 border border-blue-900 flex items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-300 flex-shrink-0" />
            <span>
              <strong>Teacher Assessment Active:</strong> Click any score from <strong>1 to 5</strong> in the Affective and Psychomotor domain tables below, and personalize your remark.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-blue-950 text-amber-300 font-mono font-bold text-[10px] border border-blue-800">
            1=Very Poor &bull; 5=Excellent
          </span>
        </div>
      )}

      {/* Printable Report Sheet Document */}
      <div className="printable-card relative bg-white rounded-2xl border-2 border-emerald-950/20 shadow-xl p-3.5 sm:p-8 md:p-10 max-w-4xl mx-auto overflow-hidden">
        {/* =========================================================================
            WATERMARK: Centered official School Crest in the background 
            ========================================================================= */}
        <div className="result-watermark-overlay" aria-hidden="true">
          <img
            src="/mathal-logo.jpg"
            alt="Mathal International Schools Official Watermark"
            className="w-4/5 max-w-[500px] select-none pointer-events-none"
          />
        </div>

        {/* Content Container (Layered above watermark) */}
        <div className="relative z-10 space-y-4 sm:space-y-6 text-slate-900">
          {/* Header Block */}
          <div className="border-b-2 border-emerald-900 pb-4 sm:pb-5">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              {/* Left Crest */}
              <div className="flex-shrink-0 w-12 h-12 sm:w-20 sm:h-20 relative">
                <Image
                  src="/mathal-logo.jpg"
                  alt="Mathal Schools Crest"
                  fill
                  sizes="(max-width: 640px) 48px, 80px"
                  priority
                  className="drop-shadow-sm rounded-lg object-contain"
                />
              </div>

              {/* Center School Details */}
              <div className="text-center flex-1 min-w-0">
                <h1 className="text-base sm:text-2xl md:text-3xl font-serif font-black tracking-tight text-emerald-950 uppercase leading-tight">
                  MATHAL INTERNATIONAL SCHOOLS
                </h1>
                <p className="text-[9px] sm:text-xs md:text-sm font-bold text-emerald-800 tracking-wider uppercase mt-0.5 sm:mt-1 truncate">
                  {report.section === "PRIMARY"
                    ? "PRIMARY & NURSERY WING"
                    : "SECONDARY & HIGH SCHOOL WING"}
                </p>
                <p className="text-[8px] sm:text-[11px] font-serif italic text-amber-800 font-semibold mt-0.5 hidden xs:block">
                  &ldquo;Knowledge is Light &bull; Virtue and Excellence&rdquo;
                </p>
                <p className="text-[8px] sm:text-[10px] text-slate-600 mt-0.5 sm:mt-1 font-medium hidden sm:block">
                  12 Crescent Avenue, GRA Extension &bull; Tel: +234 803 123 4567, +234 802 987 6543
                </p>
                <p className="text-[8px] sm:text-[10px] text-slate-600 font-medium hidden sm:block">
                  Email: info@mathal.edu.ng &bull; Web: www.mathal.edu.ng
                </p>
              </div>

              {/* Right Pupil Photo / Passport Frame */}
              <div className="flex-shrink-0 w-14 h-16 sm:w-22 sm:h-26 md:w-24 md:h-28 rounded-xl border-2 border-emerald-950/20 bg-white p-1 shadow-sm overflow-hidden flex flex-col items-center justify-center relative group">
                {student.passportPhoto ? (
                  <img
                    src={student.passportPhoto}
                    alt={`${student.firstName} ${student.lastName} Passport`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full rounded-lg bg-slate-50 flex flex-col items-center justify-center p-0.5 sm:p-1 text-center text-[8px] sm:text-[10px] text-slate-400">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-200 mb-0.5 sm:mb-1 flex items-center justify-center font-bold text-slate-500 text-xs">
                      {student.firstName?.[0]}{student.lastName?.[0]}
                    </div>
                    <span className="hidden sm:inline">Passport</span>
                  </div>
                )}

                {canRate && (
                  <button
                    type="button"
                    onClick={() => setShowPassportModal(true)}
                    title="Upload or change student passport photo"
                    className="no-print absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer text-[10px] font-semibold gap-0.5"
                  >
                    <Camera className="w-4 h-4" />
                    <span className="hidden sm:inline">{student.passportPhoto ? "Change" : "Upload"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="mt-3 sm:mt-4 py-1.5 px-3 sm:px-4 bg-[#0B1A36] text-white rounded-lg flex flex-col xs:flex-row items-center justify-between gap-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-center xs:text-left">
              <span>CONTINUOUS ASSESSMENT &amp; REPORT SHEET</span>
              <span className="text-amber-300 font-mono text-[10px] sm:text-xs">
                {report.session} &bull; {report.term}
              </span>
            </div>
          </div>

          {/* Student Profile & Bio-Data Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs bg-slate-50/80 p-3 sm:p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase font-semibold block">
                Pupil / Student Name
              </span>
              <span className="font-bold text-slate-900 text-xs sm:text-sm truncate block">
                {student.firstName} {student.lastName}
              </span>
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase font-semibold block">
                Admission Number
              </span>
              <span className="font-mono font-bold text-emerald-950 text-xs sm:text-sm">
                {student.admissionNo}
              </span>
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase font-semibold block">
                Class &amp; Stream
              </span>
              <span className="font-bold text-slate-900 text-xs sm:text-sm">
                {student.classLevel} ({student.arm})
              </span>
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase font-semibold block">
                Gender / Sex
              </span>
              <span className="font-bold text-slate-900 text-xs sm:text-sm">{student.gender}</span>
            </div>

            <div>
              <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase font-semibold block">
                Class Position
              </span>
              <span className="font-bold text-emerald-800 text-xs sm:text-sm">
                {report.position}
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-normal">
                  {" "}out of {report.totalStudents}
                </span>
              </span>
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase font-semibold block">
                Overall Average
              </span>
              <span className="font-black text-slate-900 text-xs sm:text-sm">
                {report.averageScore}%
              </span>
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase font-semibold block">
                Times School Opened
              </span>
              <span className="font-semibold text-slate-900 text-xs">
                {report.timesSchoolOpened} Days
              </span>
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase font-semibold block">
                Attendance Record
              </span>
              <span className="font-semibold text-slate-900 text-xs">
                {report.timesPresent} P &bull; {report.timesAbsent} A
              </span>
            </div>
          </div>

          {/* Academic Cognitive Domain Scores Table */}
          <div className="border border-slate-300 rounded-xl overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs border-collapse min-w-[540px] sm:min-w-full">
              <thead className="bg-emerald-900 text-white font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Curriculum Subject</th>
                  <th className="py-2.5 px-2 text-center">CA 1 (20)</th>
                  <th className="py-2.5 px-2 text-center">CA 2 (20)</th>
                  <th className="py-2.5 px-2 text-center">Exam (60)</th>
                  <th className="py-2.5 px-2 text-center bg-emerald-950 text-amber-300">
                    Total (100)
                  </th>
                  <th className="py-2.5 px-2 text-center">Grade</th>
                  <th className="py-2.5 px-3">Remarks / Performance Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {report.scores.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No assessment scores recorded for this term yet.
                    </td>
                  </tr>
                ) : (
                  report.scores.map((sc) => {
                    const gradeBg = {
                      A: "bg-emerald-100 text-emerald-900 font-black",
                      B: "bg-blue-100 text-blue-900 font-bold",
                      C: "bg-amber-100 text-amber-900 font-bold",
                      D: "bg-purple-100 text-purple-900 font-bold",
                      E: "bg-orange-100 text-orange-900 font-bold",
                      F: "bg-rose-100 text-rose-900 font-black",
                    }[sc.grade] || "bg-slate-100 text-slate-800";

                    return (
                      <tr key={sc.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {sc.subjectName}
                        </td>
                        <td className="py-2 px-2 text-center">{sc.ca1}</td>
                        <td className="py-2 px-2 text-center">{sc.ca2}</td>
                        <td className="py-2 px-2 text-center">{sc.exam}</td>
                        <td className="py-2 px-2 text-center font-black text-slate-950 bg-emerald-50 text-sm">
                          {sc.total}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${gradeBg}`}>
                            {sc.grade}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-medium">
                          {sc.remark}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs">
                <tr>
                  <td colSpan={4} className="py-2 px-3 text-right text-slate-700 uppercase">
                    Grand Total Score: <strong>{report.totalScore}</strong> &bull; Overall Average:
                  </td>
                  <td className="py-2 px-2 text-center font-black text-emerald-950 text-sm bg-amber-100">
                    {report.averageScore}%
                  </td>
                  <td colSpan={2} className="py-2 px-3 text-slate-700">
                    Grade Key: A(75-100) B(65-74) C(50-64) D(45-49) E(40-44) F(0-39)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* =========================================================================
              Behavioral & Psychomotor Skills Rating Tables (Teacher Pickable)
              ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Affective Traits */}
            <div className="border border-slate-300 rounded-xl overflow-hidden bg-white/90 shadow-xs">
              <div className="bg-emerald-950 text-white font-bold text-[10px] uppercase tracking-wider py-1.5 px-3 flex items-center justify-between">
                <span>Affective Domain (Character &amp; Behavior)</span>
                {canRate && (
                  <span className="text-[9px] text-amber-300 font-normal no-print">
                    Click 1-5 to rate
                  </span>
                )}
              </div>
              <div className="p-2.5 divide-y divide-slate-100 text-[11px]">
                {Object.entries(displayAffective).map(([trait, rating]) => (
                  <div key={trait} className="py-1.5 flex items-center justify-between gap-2">
                    <span className="text-slate-800 font-medium">{trait}</span>
                    <div className="flex gap-1 items-center flex-shrink-0">
                      {[1, 2, 3, 4, 5].map((val) => {
                        const isSelected = val === rating;
                        return canRate ? (
                          <button
                            type="button"
                            key={val}
                            onClick={() => handleAffectiveChange(trait, val)}
                            title={`${trait}: ${val} (${RATING_SCALE.find((r) => r.value === val)?.label})`}
                            className={`w-7 h-7 sm:w-6 sm:h-6 rounded-md text-[11px] sm:text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? "bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-500 font-black scale-105"
                                : "bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-900 border border-slate-200"
                            }`}
                          >
                            {val}
                          </button>
                        ) : (
                          <span
                            key={val}
                            className={`w-5 h-5 sm:w-4 sm:h-4 rounded text-[10px] sm:text-[9px] font-bold flex items-center justify-center ${
                              isSelected
                                ? "bg-emerald-800 text-white font-bold"
                                : "text-slate-300"
                            }`}
                          >
                            {val}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Psychomotor Skills */}
            <div className="border border-slate-300 rounded-xl overflow-hidden bg-white/90 shadow-xs">
              <div className="bg-emerald-950 text-white font-bold text-[10px] uppercase tracking-wider py-1.5 px-3 flex items-center justify-between">
                <span>Psychomotor Domain (Practical &amp; Physical)</span>
                {canRate && (
                  <span className="text-[9px] text-amber-300 font-normal no-print">
                    Click 1-5 to rate
                  </span>
                )}
              </div>
              <div className="p-2.5 divide-y divide-slate-100 text-[11px]">
                {Object.entries(displayPsychomotor).map(([skill, rating]) => (
                  <div key={skill} className="py-1.5 flex items-center justify-between gap-2">
                    <span className="text-slate-800 font-medium">{skill}</span>
                    <div className="flex gap-1 items-center flex-shrink-0">
                      {[1, 2, 3, 4, 5].map((val) => {
                        const isSelected = val === rating;
                        return canRate ? (
                          <button
                            type="button"
                            key={val}
                            onClick={() => handlePsychomotorChange(skill, val)}
                            title={`${skill}: ${val} (${RATING_SCALE.find((r) => r.value === val)?.label})`}
                            className={`w-7 h-7 sm:w-6 sm:h-6 rounded-md text-[11px] sm:text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-400 font-black scale-105"
                                : "bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-900 border border-slate-200"
                            }`}
                          >
                            {val}
                          </button>
                        ) : (
                          <span
                            key={val}
                            className={`w-5 h-5 sm:w-4 sm:h-4 rounded text-[10px] sm:text-[9px] font-bold flex items-center justify-center ${
                              isSelected
                                ? "bg-amber-600 text-white font-bold"
                                : "text-slate-300"
                            }`}
                          >
                            {val}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rating Scale Legend */}
          <div className="text-[10px] text-slate-500 flex flex-wrap items-center justify-center gap-4 bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-700">Rating Key:</span>
            {RATING_SCALE.map((s) => (
              <span key={s.value} className="font-medium">
                <strong>{s.value}</strong> = {s.label.split(" - ")[1]}
              </span>
            ))}
          </div>

          {/* Remarks & Endorsements */}
          <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/80 space-y-3 text-xs">
            <div>
              <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider mb-1">
                Class Teacher&apos;s Remarks:
              </span>
              {canRate ? (
                <div className="space-y-1.5">
                  <textarea
                    rows={2}
                    value={teacherRemark}
                    onChange={(e) => setTeacherRemark(e.target.value)}
                    placeholder="Enter customized class teacher remark..."
                    className="w-full text-xs font-serif italic p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                  {/* Quick Suggestion Chips */}
                  <div className="flex flex-wrap gap-1.5 no-print">
                    <span className="text-[10px] font-semibold text-slate-400 self-center">Quick remark:</span>
                    {[
                      "An exceptionally brilliant, diligent and well-behaved pupil.",
                      "Commendable academic progress. Maintain this exemplary focus.",
                      "Good performance with room for improvement in analytical subjects.",
                      "Shows potential but needs to dedicate more hours to study.",
                    ].map((rem, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setTeacherRemark(rem)}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-200/80 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 transition-colors cursor-pointer"
                      >
                        {rem.slice(0, 32)}...
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-1 font-serif italic text-slate-800 text-sm leading-snug">
                  &ldquo;{teacherRemark || report.teacherRemark}&rdquo;
                </p>
              )}

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                <span>
                  Teacher: <strong>{user?.role === "TEACHER" ? user.name : "Class Teacher"}</strong>
                </span>
                <span className="font-serif italic font-bold text-emerald-900">
                  Signed &amp; Approved
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider mb-1">
                Principal / Headmaster&apos;s Remarks:
              </span>
              {canRate ? (
                <div className="space-y-1.5">
                  <textarea
                    rows={2}
                    value={principalRemark}
                    onChange={(e) => setPrincipalRemark(e.target.value)}
                    placeholder="Enter official principal/headmaster terminal remark and endorsement..."
                    className="w-full text-xs font-serif italic p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-amber-500"
                  />
                  {/* Quick Suggestion Chips for Principal */}
                  <div className="flex flex-wrap gap-1.5 no-print">
                    <span className="text-[10px] font-semibold text-slate-400 self-center">Quick endorsement:</span>
                    {[
                      "Outstanding terminal performance! Keep up this exemplary diligence and dedication.",
                      "Commendable academic progress this term. Maintain this focus and consistency.",
                      "A satisfactory result with strong potential for greater excellence.",
                      "Promoted to the next class with distinction. Congratulations!",
                      "Capable of much better results. Extra guidance and diligence strongly advised.",
                    ].map((rem, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPrincipalRemark(rem)}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-200/80 hover:bg-amber-100 hover:text-amber-950 text-slate-700 transition-colors cursor-pointer"
                      >
                        {rem.slice(0, 34)}...
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-1 font-serif italic text-slate-800 text-sm leading-snug">
                  &ldquo;{principalRemark || report.principalRemark}&rdquo;
                </p>
              )}

              <div className="mt-3 flex items-end justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                <div className="self-end pb-1">
                  Next Term Resumption Date:{" "}
                  <strong className="text-emerald-950 font-bold">{report.nextTermBegins}</strong>
                </div>
                <div className="text-right flex flex-col items-end">
                  {/* Director / Principal Official Signature */}
                  <div className="h-11 sm:h-12 w-32 flex items-center justify-center mb-0.5">
                    <img
                      src="/mth-sig.jpg"
                      alt="Director / Principal's Official Signature"
                      className="h-full w-full object-contain mix-blend-multiply drop-shadow-xs"
                    />
                  </div>
                  <div className="font-serif font-black text-emerald-950 uppercase text-[10px] tracking-wide border-t border-slate-400 pt-0.5 min-w-[130px] text-center">
                    Mrs. Dosunmu Adetutu
                  </div>
                  <div className="text-[9px] text-slate-500 text-center min-w-[130px]">Director / Principal</div>
                </div>
              </div>
            </div>
          </div>

          {/* Official Stamp & Security Seal */}
          <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200">
            <div>
              Mathal MIS Official Certified Document &bull; Generated on{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
            <div className="flex items-center gap-1 font-semibold text-emerald-800">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              Verified Authentic School Record
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar during Evaluation (No-Print) */}
      {canRate && (
        <div className="no-print max-w-4xl mx-auto p-4 rounded-2xl bg-white border border-slate-200/80 shadow-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              Ratings and remarks save directly to your Neon PostgreSQL database.
            </span>
          </div>
          <button
            onClick={handleSaveEvaluation}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving Evaluation...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-amber-300" />
                Save Terminal Evaluation
              </>
            )}
          </button>
        </div>
      )}

      {/* Passport Photo Upload & Update Modal */}
      {showPassportModal && student && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Update Student Passport
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {student.firstName} {student.lastName} &bull; {student.admissionNo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPassportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center py-4 space-y-4">
              {/* Photo Preview */}
              <div className="relative w-36 h-44 rounded-2xl border-2 border-emerald-900/20 bg-slate-50 flex items-center justify-center overflow-hidden shadow-md">
                {passportPreview ? (
                  <img
                    src={passportPreview}
                    alt={`${student.firstName}'s Passport Preview`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-slate-400 p-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xl mb-2">
                      {student.firstName?.[0]}{student.lastName?.[0]}
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
                  {student.classLevel} ({student.arm}) &bull; {student.section} Wing
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Upload a clean, clear passport picture. It will be saved directly into Neon DB and appear on printouts.
                </p>
              </div>

              {passportError && (
                <div className="w-full p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">
                  {passportError}
                </div>
              )}

              {/* Upload & Clear controls */}
              <div className="flex items-center gap-2 pt-2">
                <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-all">
                  <Upload className="w-4 h-4 text-amber-300" />
                  <span>{passportPreview ? "Choose New Photo" : "Upload Photo"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handlePassportPhotoSelect}
                    className="hidden"
                  />
                </label>

                {passportPreview && (
                  <button
                    type="button"
                    onClick={() => setPassportPreview(null)}
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
                onClick={() => setShowPassportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePassportPhoto}
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
