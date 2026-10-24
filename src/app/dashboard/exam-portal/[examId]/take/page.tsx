"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { dataStore, DemoCbtExam } from "@/lib/store";
import { computeGrade } from "@/lib/grading";
import confetti from "canvas-confetti";
import {
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Printer,
  FileText,
  UserCheck,
  ShieldCheck,
  LogIn,
} from "lucide-react";

interface QuestionReviewItem {
  questionId: string;
  questionNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  userAnswer: string;
  correctAnswer: string;
  marksPossible: number;
  marksAwarded: number;
  isCorrect: boolean;
  explanation?: string | null;
}

interface DetailedSubmissionResult {
  score: number;
  totalPossible: number;
  percentage: number;
  grade: string;
  remark: string;
  passed: boolean;
  breakdown: QuestionReviewItem[];
  student: {
    id?: string;
    name: string;
    admissionNo: string;
    email?: string;
    classLevel?: string;
    section?: string;
  };
  submittedAt: string;
}

export default function TakeExamPage() {
  const params = useParams();
  const { user } = useAuth();
  const examId = params?.examId as string;

  const [exam, setExam] = useState<DemoCbtExam | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(1200); // 20 mins default
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<DetailedSubmissionResult | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handleSubmitRef = useRef<() => void>(() => {});

  useEffect(() => {
    async function loadExam() {
      try {
        const res = await fetch(`/api/exams/${examId}`);
        if (res.ok) {
          const d = await res.json();
          if (d.exam) {
            setExam(d.exam);
            setTimeLeftSeconds(d.exam.durationMinutes * 60);
            return;
          }
        }
      } catch {
        // fallback
      }
      const loadedExam = dataStore.getExamById(examId);
      if (loadedExam) {
        setExam(loadedExam);
        setTimeLeftSeconds(loadedExam.durationMinutes * 60);
      }
    }
    loadExam();
  }, [examId]);

  // Live Timer Countdown
  useEffect(() => {
    if (isSubmitted || !exam) return;

    timerRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [exam, isSubmitted]);

  const handleSelectOption = (questionId: string, choice: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: choice,
    }));
  };

  const handleSubmit = async () => {
    if (!exam || isSubmitted || isSubmitting) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setIsSubmitting(true);

    // Calculate score locally as fallback
    let localScore = 0;
    const localBreakdown: QuestionReviewItem[] = exam.questions.map((q) => {
      const ans = (answers[q.id] || answers[String(q.questionNumber)] || "").toUpperCase();
      const isCorrect = ans && ans === q.correctAnswer.toUpperCase();
      const marksAwarded = isCorrect ? q.marks : 0;
      if (isCorrect) localScore += q.marks;

      return {
        questionId: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        userAnswer: ans || "Unanswered",
        correctAnswer: q.correctAnswer,
        marksPossible: q.marks,
        marksAwarded,
        isCorrect: !!isCorrect,
      };
    });

    const localPercentage = Math.round((localScore / exam.totalMarks) * 100);
    const localPassed = localPercentage >= exam.passPercentage;
    const localGradeInfo = computeGrade(localPercentage);

    const fallbackResult: DetailedSubmissionResult = {
      score: localScore,
      totalPossible: exam.totalMarks,
      percentage: localPercentage,
      grade: localGradeInfo.grade,
      remark: localGradeInfo.remark,
      passed: localPassed,
      breakdown: localBreakdown,
      student: {
        id: user?.studentId || user?.id,
        name: user?.name || "Student Candidate",
        admissionNo: user?.admissionNo || "MIS/STU/2026/001",
        email: user?.email,
        classLevel: exam.classLevel,
        section: exam.section,
      },
      submittedAt: new Date().toISOString(),
    };

    // Save submission to Neon DB
    try {
      const studentIdentifier = user?.studentId || user?.admissionNo || user?.email || user?.id || "student";
      const res = await fetch(`/api/exams/${exam.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentIdentifier,
          answers,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSubmissionResult({
            score: data.score,
            totalPossible: data.totalPossible,
            percentage: data.percentage,
            grade: data.grade || localGradeInfo.grade,
            remark: data.remark || localGradeInfo.remark,
            passed: data.passed,
            breakdown: data.breakdown || localBreakdown,
            student: {
              id: data.student?.id || user?.studentId,
              name: data.student?.name || user?.name || "Student Candidate",
              admissionNo: data.student?.admissionNo || user?.admissionNo || "MIS/STU/2026/001",
              email: data.student?.email || user?.email,
              classLevel: data.student?.classLevel || exam.classLevel,
              section: data.student?.section || exam.section,
            },
            submittedAt: data.submission?.submittedAt || new Date().toISOString(),
          });
          setIsSubmitted(true);
          setShowConfirmModal(false);

          if (data.passed) {
            try {
              confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
            } catch {
              // ignore
            }
          }
          return;
        }
      }
    } catch {
      // fallback to local store
      dataStore.submitExam({
        examId: exam.id,
        examTitle: exam.title,
        studentId: user?.id || "student",
        studentName: user?.name || "Student",
        score: localScore,
        totalPossible: exam.totalMarks,
        percentage: localPercentage,
        passed: localPassed,
        answers,
      });
    } finally {
      setIsSubmitting(false);
    }

    setSubmissionResult(fallbackResult);
    setIsSubmitted(true);
    setShowConfirmModal(false);

    if (localPassed) {
      try {
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  });

  // Login Check Guard
  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center mb-4">
            <LogIn className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-serif font-black text-slate-900">
            Student Login Required
          </h2>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Please log in with your student email and password to enter the CBT Examination hall. Your results will be saved and recorded to your academic file.
          </p>
          <div className="mt-6">
            <Link
              href={`/login?redirect=/dashboard/exam-portal/${examId}/take`}
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 shadow-md transition-all"
            >
              <UserCheck className="w-4 h-4" />
              <span>Log In with Email &amp; Password</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-slate-500">Loading CBT Examination...</p>
        </div>
      </div>
    );
  }

  // Format timer MM:SS
  const mins = Math.floor(timeLeftSeconds / 60);
  const secs = timeLeftSeconds % 60;
  const timeFormatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  const isUrgent = timeLeftSeconds < 120; // less than 2 minutes

  const currentQ = exam.questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = exam.questions.length;

  // POST-SUBMISSION DETAILED RESULT SLIP (STUDENT VIEW & TEACHER RECORDING)
  if (isSubmitted && submissionResult) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-3 sm:px-4 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-6 sm:p-9 text-slate-900 print:shadow-none print:border-none print:p-0">
          {/* Top School Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-900 text-amber-300 flex items-center justify-center font-serif font-black text-2xl shadow-md flex-shrink-0">
                M
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-serif font-black text-slate-900">
                  Mathal International Schools
                </h1>
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  CBT Examination Result Slip &bull; Candidate Copy
                </p>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Saved &amp; Authenticated in School Database
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Result Slip</span>
              </button>
            </div>
          </div>

          {/* Candidate Profile Details Card */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Candidate Name</span>
              <div className="font-bold text-slate-900 truncate mt-0.5">
                {submissionResult.student.name}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Email Address</span>
              <div className="font-bold text-slate-900 truncate mt-0.5">
                {submissionResult.student.email || user.email}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Admission No</span>
              <div className="font-bold text-slate-900 mt-0.5">
                {submissionResult.student.admissionNo || "MIS/2026/001"}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Class &amp; Section</span>
              <div className="font-bold text-slate-900 mt-0.5">
                {submissionResult.student.classLevel || exam.classLevel} &bull; {exam.section}
              </div>
            </div>
          </div>

          {/* Exam Info Row */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-900">
            <div>
              Exam: <strong>{exam.title}</strong> &bull; Subject: <strong>{exam.subject}</strong>
            </div>
            <div>
              Date Completed: <strong>{new Date(submissionResult.submittedAt).toLocaleString()}</strong>
            </div>
          </div>

          {/* Big Score Cards */}
          <div className="my-6 grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-400">Marks Score</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {submissionResult.score} / {submissionResult.totalPossible}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="text-[10px] font-bold uppercase text-emerald-700">Percentage</div>
              <div className="text-2xl font-black text-emerald-800 mt-1">
                {submissionResult.percentage}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="text-[10px] font-bold uppercase text-amber-700">Grade &amp; Remark</div>
              <div className="text-lg font-black text-amber-900 mt-1">
                Grade {submissionResult.grade} &bull; {submissionResult.remark}
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                submissionResult.passed
                  ? "bg-emerald-700 text-white border-emerald-800"
                  : "bg-rose-600 text-white border-rose-700"
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                Examination Outcome
              </div>
              <div className="text-xl font-black mt-1">
                {submissionResult.passed ? "PASSED" : "FAILED"}
              </div>
            </div>
          </div>

          {/* Question Breakdown Review */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span>Question Breakdown &amp; Analysis ({submissionResult.breakdown.length} Questions)</span>
              </h3>
              <span className="text-xs text-slate-400 font-semibold">
                Pass Mark: {exam.passPercentage}%
              </span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {submissionResult.breakdown.map((qItem, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border text-xs transition-colors ${
                    qItem.isCorrect
                      ? "bg-emerald-50/70 border-emerald-200"
                      : "bg-rose-50/70 border-rose-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-bold text-slate-900">
                      Question {qItem.questionNumber}: {qItem.questionText}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black flex-shrink-0 ${
                        qItem.isCorrect ? "bg-emerald-700 text-white" : "bg-rose-700 text-white"
                      }`}
                    >
                      {qItem.isCorrect ? `+${qItem.marksAwarded} pts` : `0 / ${qItem.marksPossible} pts`}
                    </span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500">Your Selection:</span>{" "}
                      <strong className={qItem.isCorrect ? "text-emerald-800" : "text-rose-700"}>
                        Option {qItem.userAnswer}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Correct Answer:</span>{" "}
                      <strong className="text-emerald-800">
                        Option {qItem.correctAnswer}
                      </strong>
                    </div>
                  </div>

                  {qItem.explanation && (
                    <div className="mt-2 text-[11px] text-slate-500 bg-white/70 p-2 rounded-lg border border-slate-200">
                      <strong>Note:</strong> {qItem.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Official Teacher Recording Slip */}
          <div className="mt-6 p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 space-y-2">
            <div className="font-bold flex items-center justify-between text-amber-950">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-800" />
                Teacher Grade Recording &amp; Verification Slip
              </span>
              <span className="text-[10px] text-amber-800 font-normal">
                Present this slip or submit on portal for termly CA / Exam entry
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] border-t border-amber-200/80">
              <div>
                <span className="text-slate-500">Recorded Into Component:</span>
                <div className="font-bold text-slate-800 mt-0.5">[  ] CA 1 &nbsp; [  ] CA 2 &nbsp; [  ] Exam</div>
              </div>
              <div>
                <span className="text-slate-500">Teacher Signature:</span>
                <div className="border-b border-slate-400 mt-3 h-4"></div>
              </div>
              <div>
                <span className="text-slate-500">Recording Date:</span>
                <div className="border-b border-slate-400 mt-3 h-4"></div>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              href="/dashboard/exam-portal"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors text-center"
            >
              &larr; Return to CBT Portal
            </Link>

            <Link
              href="/dashboard/results"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs shadow-md transition-all"
            >
              <span>View Terminal Report Card</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // EXAM HALL IN-PROGRESS VIEW
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Exam Hall Top Bar */}
      <div className="sticky top-14 sm:static z-20 bg-emerald-950 text-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-lg border border-emerald-800/80 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
            <Sparkles className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">Mathal CBT Examination Hall</span>
          </div>
          <h2 className="text-sm sm:text-lg font-bold text-white mt-0.5 truncate">{exam.title}</h2>
          <div className="text-[11px] sm:text-xs text-emerald-300 truncate">
            Candidate: <strong>{user.name}</strong> ({user.email}) &bull; Class: {exam.classLevel}
          </div>
        </div>

        {/* Live Timer Countdown */}
        <div
          className={`px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl border flex items-center gap-2 sm:gap-3 transition-all flex-shrink-0 ${
            isUrgent
              ? "bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse"
              : "bg-emerald-900 border-emerald-700 text-amber-300"
          }`}
        >
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <div className="text-right sm:text-left">
            <div className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider hidden sm:block">
              Time Left
            </div>
            <div className="text-base sm:text-xl font-mono font-black">{timeFormatted}</div>
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Question Strip */}
      <div className="lg:hidden bg-white p-2 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-1.5 overflow-x-auto">
        <span className="text-[11px] font-bold text-slate-400 pl-1 flex-shrink-0">Q:</span>
        {exam.questions.map((q, idx) => {
          const isAnswered = !!answers[q.id];
          const isCurrent = idx === currentIdx;

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIdx(idx)}
              className={`min-w-[34px] h-[34px] rounded-lg text-xs font-bold transition-all flex items-center justify-center flex-shrink-0 cursor-pointer ${
                isCurrent
                  ? "ring-2 ring-amber-400 bg-emerald-800 text-white shadow-xs"
                  : isAnswered
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Main Question Sheet */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-8">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 mb-4 sm:mb-6">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full">
                Question {currentIdx + 1} of {totalQuestions}
              </span>
              <span className="text-xs text-slate-400">
                Mark value: <strong>{currentQ.marks} pts</strong>
              </span>
            </div>

            {/* Question Text */}
            <h3 className="text-sm sm:text-lg font-semibold text-slate-900 leading-relaxed mb-5 sm:mb-6">
              {currentQ.questionText}
            </h3>

            {/* Options List */}
            <div className="space-y-2.5 sm:space-y-3">
              {(["A", "B", "C", "D"] as const).map((optKey) => {
                const optText = currentQ[`option${optKey}` as keyof typeof currentQ];
                const isSelected = answers[currentQ.id] === optKey;

                return (
                  <button
                    key={optKey}
                    type="button"
                    onClick={() => handleSelectOption(currentQ.id, optKey)}
                    className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-center gap-3 cursor-pointer min-h-[50px] ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs"
                        : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/70 text-slate-800"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black transition-colors flex-shrink-0 ${
                        isSelected
                          ? "bg-emerald-700 text-white"
                          : "bg-white border border-slate-300 text-slate-600"
                      }`}
                    >
                      {optKey}
                    </div>
                    <span className="text-xs sm:text-sm">{optText}</span>
                  </button>
                );
              })}
            </div>

            {/* Navigation & Submit Controls */}
            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer min-h-[44px]"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-2">
                {currentIdx < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIdx((prev) => Math.min(totalQuestions - 1, prev + 1))}
                    className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer min-h-[44px]"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-5 sm:px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 text-xs font-black shadow-md transition-all cursor-pointer min-h-[44px]"
                  >
                    <span>Finish &amp; Submit</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Question Palette */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
            <h4 className="font-bold text-slate-800 text-sm mb-3">Question Palette</h4>

            <div className="grid grid-cols-5 gap-2">
              {exam.questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentIdx;

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                      isCurrent
                        ? "ring-2 ring-amber-400 bg-emerald-800 text-white shadow-md"
                        : isAnswered
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-600" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-slate-200" />
                <span>Unanswered ({totalQuestions - answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-800 ring-2 ring-amber-400" />
                <span>Current Question</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="w-full mt-4 sm:mt-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs shadow-md transition-all text-center cursor-pointer min-h-[44px]"
            >
              Finish &amp; Submit Exam
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Submit CBT Examination?
            </h3>
            <p className="mt-2 text-xs text-slate-500">
              Candidate: <strong>{user.name}</strong> ({user.email})<br />
              You have answered <strong>{answeredCount}</strong> out of{" "}
              <strong>{totalQuestions}</strong> questions. Once submitted, your scores will be computed and your official result slip will be displayed.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Continue Test
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="px-5 py-2 rounded-xl text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Yes, Submit Exam"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
