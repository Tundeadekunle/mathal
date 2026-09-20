"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { dataStore, DemoCbtExam } from "@/lib/store";
import confetti from "canvas-confetti";
import {
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Award,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function TakeExamPage() {
  const params = useParams();
  const { user } = useAuth();
  const examId = params?.examId as string;

  const [exam, setExam] = useState<DemoCbtExam | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(1200); // 20 mins default
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    score: number;
    totalPossible: number;
    percentage: number;
    passed: boolean;
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
          handleSubmit();
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
    if (!exam || isSubmitted) return;

    if (timerRef.current) clearInterval(timerRef.current);

    // Calculate score
    let score = 0;
    exam.questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) {
        score += q.marks;
      }
    });

    const percentage = Math.round((score / exam.totalMarks) * 100);
    const passed = percentage >= exam.passPercentage;

    const summary = {
      score,
      totalPossible: exam.totalMarks,
      percentage,
      passed,
    };

    // Save submission to Neon DB
    try {
      await fetch(`/api/exams/${exam.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: user?.studentId || user?.admissionNo || user?.id,
          answers,
        }),
      });
    } catch {
      dataStore.submitExam({
        examId: exam.id,
        examTitle: exam.title,
        studentId: user?.id || "student",
        studentName: user?.name || "Student",
        score,
        totalPossible: exam.totalMarks,
        percentage,
        passed,
        answers,
      });
    }

    setResultSummary(summary);
    setIsSubmitted(true);
    setShowConfirmModal(false);

    // Trigger celebratory confetti if passed
    if (passed) {
      try {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    }
  };

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

  // Post-submission results view
  if (isSubmitted && resultSummary) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/20 text-amber-500 mx-auto flex items-center justify-center mb-4">
            <Award className="w-9 h-9" />
          </div>

          <span
            className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 ${
              resultSummary.passed
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {resultSummary.passed ? "Examination Passed" : "Needs Improvement"}
          </span>

          <h1 className="text-2xl sm:text-3xl font-serif font-black text-slate-900">
            {resultSummary.passed ? "Congratulations!" : "Exam Completed"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            You have successfully completed <strong>{exam.title}</strong>
          </p>

          <div className="my-8 py-6 px-8 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Score</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {resultSummary.score} / {resultSummary.totalPossible}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Percentage</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {resultSummary.percentage}%
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Passing Mark</div>
              <div className="text-2xl font-black text-slate-500 mt-1">
                {exam.passPercentage}%
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard/exam-portal"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Return to Exam Portal
            </Link>
            <Link
              href="/dashboard/results"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs shadow-md transition-all"
            >
              View Terminal Report Sheet
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Exam Hall Top Bar - Sticky on Mobile */}
      <div className="sticky top-14 sm:static z-20 bg-emerald-950 text-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-lg border border-emerald-800/80 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
            <Sparkles className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">CBT Hall &bull; Mathal</span>
          </div>
          <h2 className="text-sm sm:text-lg font-bold text-white mt-0.5 truncate">{exam.title}</h2>
          <div className="text-[11px] sm:text-xs text-emerald-300 truncate">
            {user?.name || "Student"} &bull; {exam.classLevel}
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
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-8">
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
                    className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer min-h-[44px]"
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
                    <span>Submit</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Question Palette */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
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
              Finish &amp; Submit
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
              Submit Examination?
            </h3>
            <p className="mt-2 text-xs text-slate-500">
              You have answered <strong>{answeredCount}</strong> out of{" "}
              <strong>{totalQuestions}</strong> questions. Once submitted, you cannot change your answers.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Continue Test
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-5 py-2 rounded-xl text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 shadow-md"
              >
                Yes, Submit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
