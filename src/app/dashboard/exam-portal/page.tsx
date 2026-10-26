"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { dataStore, DemoCbtExam, DemoExamSubmission } from "@/lib/store";
import { parseExamQuestions, applyAnswerKeyToQuestions, ParsedQuestion } from "@/lib/cbt-parser";
import {
  PRIMARY_CLASSES,
  SECONDARY_CLASSES,
} from "@/lib/grading";
import {
  GraduationCap,
  Clock,
  Plus,
  Play,
  Award,
  X,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Printer,
  Database,
  Trash2,
  Key,
  Calendar,
  Lock,
  RotateCcw,
  Send,
  Eye,
} from "lucide-react";
import {
  getExamAvailability,
  formatExamDate,
} from "@/lib/cbt-availability";

interface ExtendedSubmission extends DemoExamSubmission {
  admissionNo?: string;
  studentEmail?: string;
  classLevel?: string;
  section?: string;
  subject?: string;
  answersJson?: string;
  recordedStatus?: string | null;
}

const SAMPLE_QUESTIONS_TEXT = `1. What is the value of 15 multiplied by 4?
A) 50
B) 60
C) 70
D) 45
Answer: B

2. Which of the following is an even number?
A. 21
B. 35
*C. 48*
D. 59
Explanation: 48 is divisible by 2 with no remainder.

3. The capital city of Nigeria is:
[ ] A) Lagos
[x] B) Abuja
[ ] C) Port Harcourt
[ ] D) Kaduna

4. Which gas do human beings inhale to stay alive?
A) Carbon Dioxide
B) Hydrogen
C) Nitrogen
D) Oxygen
Ans: D

5. What is the fraction representation of 50%?
A) 1/4
B) 1/2
C) 3/4
D) 2/3
Answer: B`;

export default function ExamPortalPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<DemoCbtExam[]>([]);
  const [submissions, setSubmissions] = useState<ExtendedSubmission[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sectionFilter, setSectionFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "SCHEDULED" | "EXPIRED">("ALL");

  // Create Exam Form Mode: "paste" | "manual"
  const [createMode, setCreateMode] = useState<"paste" | "manual">("paste");
  const [rawQuestionsText, setRawQuestionsText] = useState(SAMPLE_QUESTIONS_TEXT);
  const [rawAnswerKey, setRawAnswerKey] = useState("1. B, 2. C, 3. B, 4. D, 5. B");
  const [defaultMarks, setDefaultMarks] = useState(5);
  const [parseNotice, setParseNotice] = useState<string | null>(null);
  const [isDetectingAnswers, setIsDetectingAnswers] = useState(false);

  // Exam Details Form State
  const [examForm, setExamForm] = useState({
    title: "",
    description: "",
    section: "PRIMARY" as "PRIMARY" | "SECONDARY",
    classLevel: "Basic 4",
    subject: "Mathematics",
    durationMinutes: 20,
    passPercentage: 50,
    publishScheduleMode: "immediate" as "immediate" | "scheduled",
    scheduledPublishAt: "",
    questions: [] as ParsedQuestion[],
  });

  // Modal: View Student Result Slip
  const [selectedSubmissionForSlip, setSelectedSubmissionForSlip] = useState<{
    submission: ExtendedSubmission;
    exam?: DemoCbtExam;
    breakdown?: any[];
  } | null>(null);

  // Modal: Teacher Record CBT Score to Database Grade Book
  const [recordScoreModal, setRecordScoreModal] = useState<{
    submission: ExtendedSubmission;
    targetField: "ca1" | "ca2" | "exam";
    session: string;
    term: string;
    scaledScore: number;
    maxFieldMarks: number;
  } | null>(null);

  const [isRecordingScore, setIsRecordingScore] = useState(false);
  const [recordingSuccess, setRecordingSuccess] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordedMap, setRecordedMap] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch("/api/exams");
      if (res.ok) {
        const d = await res.json();
        if (d.exams) {
          setExams(d.exams);
          const allSubs: ExtendedSubmission[] = [];
          d.exams.forEach((ex: any) => {
            if (ex.submissions) {
              ex.submissions.forEach((s: any) => {
                allSubs.push({
                  id: s.id,
                  examId: s.examId,
                  examTitle: ex.title,
                  subject: ex.subject,
                  studentId: s.studentId,
                  studentName: s.student
                    ? `${s.student.firstName} ${s.student.lastName}`
                    : "Student",
                  admissionNo: s.student?.admissionNo,
                  studentEmail: s.student?.user?.email,
                  classLevel: s.student?.classLevel || ex.classLevel,
                  section: s.student?.section || ex.section,
                  score: s.score,
                  totalPossible: s.totalPossible,
                  percentage: s.percentage,
                  passed: s.passed,
                  submittedAt: s.submittedAt,
                  answersJson: s.answersJson,
                });
              });
            }
          });
          setSubmissions(allSubs);
          return;
        }
      }
    } catch {
      // fallback
    }

    setExams(dataStore.getExams());
    setSubmissions(dataStore.getSubmissions());
  };

  // Run parser on raw pasted text and pasted right options
  const handleParseQuestions = () => {
    if (!rawQuestionsText.trim()) {
      setParseNotice("Please paste questions into the box first.");
      return;
    }
    const result = parseExamQuestions(rawQuestionsText, defaultMarks, rawAnswerKey);
    if (result.questions.length === 0) {
      setParseNotice("Could not detect any valid questions. Please check the numbering and options.");
      return;
    }

    setExamForm((prev) => ({
      ...prev,
      questions: result.questions,
    }));

    const highConfidenceCount = result.questions.filter((q) => q.confidence === "high").length;
    setParseNotice(
      `Detected ${result.totalQuestions} questions! ${highConfidenceCount} right answers applied from your pasted options/key. Total Marks: ${result.totalMarks} pts.`
    );
  };

  // Explicitly apply pasted right options to the questions
  const handleApplyAnswerKey = () => {
    if (!rawAnswerKey.trim()) {
      setParseNotice("Please paste or type the right options in the Answer Key box.");
      return;
    }

    if (examForm.questions.length === 0) {
      handleParseQuestions();
      return;
    }

    const updated = applyAnswerKeyToQuestions(examForm.questions, rawAnswerKey);
    setExamForm((prev) => ({
      ...prev,
      questions: updated,
    }));
    setParseNotice(`Successfully applied pasted right options to all ${updated.length} questions!`);
  };

  // Re-verify and auto-solve answers via API/curriculum solver
  const handleSmartDetectAnswers = async () => {
    if (!rawQuestionsText.trim() && examForm.questions.length === 0) {
      setParseNotice("Please paste questions into the box first.");
      return;
    }

    setIsDetectingAnswers(true);
    setParseNotice("Analyzing questions, curriculum facts, and applying right answers...");

    try {
      const res = await fetch("/api/exams/detect-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: rawQuestionsText,
          rawAnswerKey,
          questions: examForm.questions,
          defaultMarks,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          setExamForm((prev) => ({
            ...prev,
            questions: data.questions,
          }));
          const solvedCount = data.questions.filter((q: any) => q.confidence === "high").length;
          setParseNotice(
            `Detection complete! Verified right answers for ${solvedCount} of ${data.questions.length} questions.`
          );
          return;
        }
      }
    } catch {
      // fallback
    } finally {
      setIsDetectingAnswers(false);
    }

    handleParseQuestions();
  };

  const handleToggleCorrectAnswer = (questionIdx: number, newChoice: "A" | "B" | "C" | "D") => {
    setExamForm((prev) => {
      const updated = [...prev.questions];
      updated[questionIdx] = {
        ...updated[questionIdx],
        correctAnswer: newChoice,
        confidence: "high",
        detectedFrom: `Teacher selected: Option ${newChoice}`,
      };
      return { ...prev, questions: updated };
    });
  };

  const handleUpdateQuestionMarks = (questionIdx: number, marks: number) => {
    setExamForm((prev) => {
      const updated = [...prev.questions];
      updated[questionIdx] = {
        ...updated[questionIdx],
        marks: Math.max(1, marks),
      };
      return { ...prev, questions: updated };
    });
  };

  const handleApplyUniformMarks = (marks: number) => {
    setDefaultMarks(marks);
    setExamForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => ({ ...q, marks })),
    }));
  };

  const handleDeleteQuestion = (questionIdx: number) => {
    setExamForm((prev) => {
      const filtered = prev.questions.filter((_, idx) => idx !== questionIdx);
      return {
        ...prev,
        questions: filtered.map((q, idx) => ({ ...q, questionNumber: idx + 1 })),
      };
    });
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (examForm.questions.length === 0) {
      alert("Please paste and parse exam questions or add at least one question before publishing.");
      return;
    }

    const totalMarks = examForm.questions.reduce((sum, q) => sum + q.marks, 0);

    let scheduledDate: string | null = null;
    let publishedAt = new Date().toISOString();
    let expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    if (examForm.publishScheduleMode === "scheduled" && examForm.scheduledPublishAt) {
      const parsed = new Date(examForm.scheduledPublishAt);
      if (!isNaN(parsed.getTime())) {
        scheduledDate = parsed.toISOString();
        publishedAt = parsed.toISOString();
        expiresAt = new Date(parsed.getTime() + 24 * 60 * 60 * 1000).toISOString();
      }
    }

    const payload = {
      title: examForm.title.trim(),
      description: examForm.description.trim() || undefined,
      section: examForm.section,
      classLevel: examForm.classLevel,
      subject: examForm.subject.trim(),
      durationMinutes: Number(examForm.durationMinutes),
      totalMarks,
      passPercentage: Number(examForm.passPercentage),
      isActive: true,
      createdBy: user?.name || "Teacher",
      scheduledPublishAt: scheduledDate,
      publishedAt,
      expiresAt,
      questions: examForm.questions.map((q, idx) => ({
        questionNumber: idx + 1,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        marks: q.marks,
        explanation: q.explanation || undefined,
      })),
    };

    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await loadData();
        setShowCreateModal(false);
        // Reset form
        setExamForm({
          title: "",
          description: "",
          section: "PRIMARY",
          classLevel: "Basic 4",
          subject: "Mathematics",
          durationMinutes: 20,
          passPercentage: 50,
          publishScheduleMode: "immediate",
          scheduledPublishAt: "",
          questions: [],
        });
        setParseNotice(null);
        return;
      }
    } catch {
      // fallback
    }

    dataStore.addExam({
      ...payload,
      questions: payload.questions.map((q, idx) => ({ ...q, id: `q_${idx + 1}` })),
    });
    loadData();
    setShowCreateModal(false);
  };

  // Teacher actions: Publish Now, Reopen for 24h, or Delete
  const handleExamAction = async (examId: string, action: "publish_now" | "reopen_24h" | "delete") => {
    try {
      if (action === "delete") {
        if (!confirm("Are you sure you want to delete this CBT examination?")) return;
        const res = await fetch(`/api/exams/${examId}`, { method: "DELETE" });
        if (res.ok) {
          await loadData();
          return;
        }
      } else {
        const res = await fetch(`/api/exams/${examId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (res.ok) {
          await loadData();
          return;
        }
      }
    } catch {
      // fallback for local mock
    }

    // Local fallback
    const target = dataStore.getExamById(examId);
    if (target) {
      const now = new Date();
      if (action === "publish_now") {
        target.scheduledPublishAt = null;
        target.publishedAt = now.toISOString();
        target.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        target.isActive = true;
      } else if (action === "reopen_24h") {
        target.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        target.isActive = true;
      }
      loadData();
    }
  };

  // Open Result Slip Modal
  const handleOpenResultSlip = (subm: ExtendedSubmission) => {
    const parentExam = exams.find((e) => e.id === subm.examId);
    let breakdown: any[] = [];

    if (parentExam && subm.answersJson) {
      try {
        const answers = JSON.parse(subm.answersJson);
        breakdown = parentExam.questions.map((q) => {
          const ans = (answers[q.id] || answers[String(q.questionNumber)] || "").toUpperCase();
          const isCorrect = ans && ans === q.correctAnswer.toUpperCase();
          return {
            questionNumber: q.questionNumber,
            questionText: q.questionText,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            userAnswer: ans || "Unanswered",
            correctAnswer: q.correctAnswer,
            marks: q.marks,
            isCorrect,
          };
        });
      } catch {
        // ignore
      }
    }

    setSelectedSubmissionForSlip({
      submission: subm,
      exam: parentExam,
      breakdown,
    });
  };

  // Initiate Teacher Score Record Modal
  const handleInitiateRecordScore = (subm: ExtendedSubmission) => {
    // Default to CA 1 (max 20)
    const maxMarks = 20;
    const scaled = Math.round((subm.percentage / 100) * maxMarks * 10) / 10;

    setRecordScoreModal({
      submission: subm,
      targetField: "ca1",
      session: "2026/2027",
      term: "First Term",
      scaledScore: scaled,
      maxFieldMarks: maxMarks,
    });
    setRecordingSuccess(null);
    setRecordingError(null);
  };

  // Confirm Record Score into Database
  const handleConfirmRecordScore = async () => {
    if (!recordScoreModal) return;
    setIsRecordingScore(true);
    setRecordingSuccess(null);
    setRecordingError(null);

    try {
      const res = await fetch("/api/exams/record-cbt-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: recordScoreModal.submission.id,
          studentId: recordScoreModal.submission.studentId,
          examId: recordScoreModal.submission.examId,
          targetField: recordScoreModal.targetField,
          session: recordScoreModal.session,
          term: recordScoreModal.term,
          subjectName: recordScoreModal.submission.subject,
          customScore: recordScoreModal.scaledScore,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRecordingSuccess(data.message || "Score successfully recorded to database!");
        setRecordedMap((prev) => ({
          ...prev,
          [recordScoreModal.submission.id]: `${recordScoreModal.targetField.toUpperCase()} (${recordScoreModal.scaledScore} pts)`,
        }));
        setTimeout(() => {
          setRecordScoreModal(null);
          setRecordingSuccess(null);
        }, 1800);
      } else {
        setRecordingError(data.error || "Failed to record score to database.");
      }
    } catch (err: any) {
      setRecordingError(err.message || "Network error recording score.");
    } finally {
      setIsRecordingScore(false);
    }
  };

  const role = user?.role || "STUDENT";
  const isStaff = role === "ADMIN" || role === "TEACHER";

  const filteredExams = exams.filter((e) => {
    if (sectionFilter !== "ALL" && e.section !== sectionFilter) return false;
    if (statusFilter !== "ALL") {
      const avail = getExamAvailability(e);
      if (avail.status !== statusFilter) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Computer-Based Testing (CBT) Portal</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-sans font-bold">
              PostgreSQL
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Conduct timed online assessments, schedule exam releases, enforce 24-hour student access windows, and record CBT marks in real time.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => {
              setShowCreateModal(true);
              if (examForm.questions.length === 0) {
                // Preload sample questions for convenience
                const result = parseExamQuestions(rawQuestionsText, defaultMarks);
                setExamForm((prev) => ({
                  ...prev,
                  title: prev.title || "Mathematics Termly CA Examination",
                  questions: result.questions,
                }));
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            Create CBT Exam (Schedule / Auto-Detect)
          </button>
        )}
      </div>

      {/* Filter Tabs: Wings & Availability Status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2 bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-xs overflow-x-auto">
          <button
            onClick={() => setSectionFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              sectionFilter === "ALL"
                ? "bg-emerald-800 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Wings
          </button>
          <button
            onClick={() => setSectionFilter("PRIMARY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              sectionFilter === "PRIMARY"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Primary Wing
          </button>
          <button
            onClick={() => setSectionFilter("SECONDARY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              sectionFilter === "SECONDARY"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Secondary Wing
          </button>
        </div>

        {/* Availability Filter */}
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-xs text-xs overflow-x-auto">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Status ({exams.length})
          </button>
          <button
            onClick={() => setStatusFilter("OPEN")}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              statusFilter === "OPEN"
                ? "bg-emerald-700 text-white"
                : "text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Active (24h)
          </button>
          <button
            onClick={() => setStatusFilter("SCHEDULED")}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              statusFilter === "SCHEDULED"
                ? "bg-blue-600 text-white"
                : "text-blue-700 hover:bg-blue-50"
            }`}
          >
            <Calendar className="w-3 h-3" />
            Scheduled
          </button>
          <button
            onClick={() => setStatusFilter("EXPIRED")}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              statusFilter === "EXPIRED"
                ? "bg-rose-700 text-white"
                : "text-rose-700 hover:bg-rose-50"
            }`}
          >
            <Lock className="w-3 h-3" />
            Closed / Expired
          </button>
        </div>
      </div>

      {/* Scheduled Exams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {filteredExams.length === 0 ? (
          <div className="col-span-1 md:col-span-2 bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
            No exams match the selected filter criteria.
          </div>
        ) : (
          filteredExams.map((exam) => {
            const avail = getExamAvailability(exam);

            return (
              <div
                key={exam.id}
                className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-all group ${
                  avail.isExpired
                    ? "border-slate-200 opacity-90"
                    : avail.isScheduled
                    ? "border-blue-200 hover:border-blue-400"
                    : "border-slate-200/80 hover:border-emerald-400"
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold truncate ${
                          exam.section === "PRIMARY"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-blue-100 text-blue-900"
                        }`}
                      >
                        {exam.section} &bull; {exam.classLevel}
                      </span>

                      {/* 24-Hour Availability / Scheduling Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${avail.statusBadge.bgClass} ${avail.statusBadge.textClass} ${avail.statusBadge.borderClass}`}
                      >
                        {avail.isScheduled ? (
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                        ) : avail.isExpired ? (
                          <Lock className="w-3 h-3 flex-shrink-0" />
                        ) : (
                          <Clock className="w-3 h-3 flex-shrink-0" />
                        )}
                        <span>{avail.statusBadge.label}</span>
                      </span>
                    </div>

                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 flex-shrink-0">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {exam.durationMinutes} Mins
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                    {exam.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2">
                    {exam.description || "Timed assessment with instant auto-grading and answer analysis."}
                  </p>

                  {/* Schedule & 24h Window Details Box */}
                  <div className="mt-3 bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/70 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Published / Opens:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {formatExamDate(avail.publishDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        Access Window (24h):
                      </span>
                      <span
                        className={`font-semibold ${
                          avail.isExpired ? "text-rose-700" : "text-emerald-800"
                        }`}
                      >
                        {avail.isExpired ? "Closed on " : "Available until "}
                        {formatExamDate(avail.expiryDate)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 py-2.5 px-3 bg-slate-50 rounded-xl text-center text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">
                        Subject
                      </div>
                      <div className="font-bold text-slate-800 truncate">{exam.subject}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">
                        Questions
                      </div>
                      <div className="font-bold text-slate-800">{exam.questions.length} Items</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">
                        Total Marks
                      </div>
                      <div className="font-bold text-emerald-700">{exam.totalMarks} pts</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 sm:mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    Created by: <strong>{exam.createdBy}</strong>
                  </span>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Teacher Action Controls */}
                    {isStaff && (
                      <>
                        {avail.isScheduled && (
                          <button
                            type="button"
                            onClick={() => handleExamAction(exam.id, "publish_now")}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                            title="Publish immediately and activate 24-hour access window now"
                          >
                            <Send className="w-3 h-3" />
                            <span>Publish Now</span>
                          </button>
                        )}

                        {avail.isExpired && (
                          <button
                            type="button"
                            onClick={() => handleExamAction(exam.id, "reopen_24h")}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                            title="Reopen examination for students for an additional 24 hours"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reopen 24h</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleExamAction(exam.id, "delete")}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete exam"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Entry or Preview Button */}
                    {isStaff ? (
                      <Link
                        href={`/dashboard/exam-portal/${exam.id}/take`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview Exam</span>
                      </Link>
                    ) : avail.isScheduled ? (
                      <button
                        disabled
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-100 text-blue-900 font-bold text-xs cursor-not-allowed opacity-90"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Scheduled (Opens {formatExamDate(avail.publishDate)})</span>
                      </button>
                    ) : avail.isExpired ? (
                      <button
                        disabled
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-200 text-slate-600 font-bold text-xs cursor-not-allowed"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Exam Closed (24hr Window Ended)</span>
                      </button>
                    ) : (
                      <Link
                        href={`/dashboard/exam-portal/${exam.id}/take`}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs shadow-md transition-all group-hover:scale-105 min-h-[44px]"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Enter Exam Hall</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Recent CBT Submissions & Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Student CBT Examination Submissions &amp; Result Slips
              </h3>
              <p className="text-xs text-slate-400">
                Saved in Neon PostgreSQL database. Teachers can review question breakdowns and record marks into the school grade book.
              </p>
            </div>
          </div>

          <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            Total Submissions: <strong className="text-emerald-800">{submissions.length}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Student Details</th>
                <th className="px-4 py-3">Exam / Subject</th>
                <th className="px-4 py-3 text-center">Score</th>
                <th className="px-4 py-3 text-center">Percentage</th>
                <th className="px-4 py-3 text-center">Outcome</th>
                <th className="px-4 py-3 text-right">Actions for Teachers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                    No examination attempts submitted yet.
                  </td>
                </tr>
              ) : (
                submissions.map((subm) => {
                  const recordedBadge = recordedMap[subm.id] || subm.recordedStatus;

                  return (
                    <tr key={subm.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 text-xs">{subm.studentName}</div>
                        <div className="text-[11px] text-slate-400">
                          {subm.admissionNo || "Admission No"} &bull; {subm.studentEmail || "student@email.com"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        <div className="font-medium text-slate-800">{subm.examTitle}</div>
                        <div className="text-[11px] text-emerald-700 font-semibold">{subm.subject || "Mathematics"}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-xs text-slate-800">
                        {subm.score} / {subm.totalPossible}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-xs text-emerald-700">
                        {subm.percentage}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            subm.passed
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {subm.passed ? "PASSED" : "FAILED"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {recordedBadge && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              {recordedBadge}
                            </span>
                          )}

                          <button
                            onClick={() => handleOpenResultSlip(subm)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                            title="View candidate's full exam slip"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span>Slip</span>
                          </button>

                          {role !== "STUDENT" && (
                            <button
                              onClick={() => handleInitiateRecordScore(subm)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-emerald-950 text-xs font-bold transition-all shadow-xs cursor-pointer"
                              title="Record this CBT score into CA or Exam in database"
                            >
                              <Database className="w-3.5 h-3.5" />
                              <span>Record</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE CBT EXAM MODAL with BULK QUESTION PASTE & AUTO-DETECTION */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Create CBT Examination
                  </h3>
                  <p className="text-xs text-slate-500">
                    Paste raw question banks directly or build manually. The system automatically detects right answers.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-5">
              {/* Exam Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Exam Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={examForm.title}
                    onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                    placeholder="e.g. Basic 4 Mathematics Termly CA Test"
                    className="w-full text-xs py-2 px-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Instructions / Description
                  </label>
                  <input
                    type="text"
                    value={examForm.description}
                    onChange={(e) =>
                      setExamForm({ ...examForm, description: e.target.value })
                    }
                    placeholder="e.g. Read each question carefully and select the correct option."
                    className="w-full text-xs py-2 px-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Section
                  </label>
                  <select
                    value={examForm.section}
                    onChange={(e) => {
                      const sec = e.target.value as "PRIMARY" | "SECONDARY";
                      setExamForm({
                        ...examForm,
                        section: sec,
                        classLevel: sec === "PRIMARY" ? "Basic 4" : "JSS 2",
                      });
                    }}
                    className="w-full text-xs py-2 px-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="PRIMARY">Primary Wing</option>
                    <option value="SECONDARY">Secondary Wing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Class Level
                  </label>
                  <select
                    value={examForm.classLevel}
                    onChange={(e) =>
                      setExamForm({ ...examForm, classLevel: e.target.value })
                    }
                    className="w-full text-xs py-2 px-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    {(examForm.section === "PRIMARY"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={examForm.subject}
                    onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                    placeholder="e.g. Mathematics"
                    className="w-full text-xs py-2 px-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Duration (Mins)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="180"
                      required
                      value={examForm.durationMinutes}
                      onChange={(e) =>
                        setExamForm({ ...examForm, durationMinutes: Number(e.target.value) })
                      }
                      className="w-full text-xs py-2 px-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pass Mark (%)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      required
                      value={examForm.passPercentage}
                      onChange={(e) =>
                        setExamForm({ ...examForm, passPercentage: Number(e.target.value) })
                      }
                      className="w-full text-xs py-2 px-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Publishing Schedule & 24-Hour Student Access Window */}
                <div className="sm:col-span-2 bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-700" />
                      Publishing Schedule &amp; 24-Hour Student Access
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full flex items-center gap-1 self-start sm:self-auto">
                      <Clock className="w-3 h-3 text-emerald-700" />
                      Available for 24 Hours to Students
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                    <label
                      onClick={() => setExamForm({ ...examForm, publishScheduleMode: "immediate" })}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        examForm.publishScheduleMode === "immediate"
                          ? "bg-white border-emerald-600 shadow-xs ring-1 ring-emerald-500"
                          : "bg-white/70 border-slate-200 hover:bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="publishScheduleMode"
                        checked={examForm.publishScheduleMode === "immediate"}
                        onChange={() => setExamForm({ ...examForm, publishScheduleMode: "immediate" })}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="text-xs">
                        <div className="font-bold text-slate-900">Publish Immediately</div>
                        <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                          Opens immediately on saving and remains active for students for exactly 24 hours.
                        </div>
                      </div>
                    </label>

                    <label
                      onClick={() => setExamForm({ ...examForm, publishScheduleMode: "scheduled" })}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        examForm.publishScheduleMode === "scheduled"
                          ? "bg-white border-emerald-600 shadow-xs ring-1 ring-emerald-500"
                          : "bg-white/70 border-slate-200 hover:bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="publishScheduleMode"
                        checked={examForm.publishScheduleMode === "scheduled"}
                        onChange={() => setExamForm({ ...examForm, publishScheduleMode: "scheduled" })}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="text-xs flex-1">
                        <div className="font-bold text-slate-900">Schedule for Specific Date &amp; Time</div>
                        <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                          Locks until scheduled time arrives, then automatically opens for 24 hours.
                        </div>
                      </div>
                    </label>
                  </div>

                  {examForm.publishScheduleMode === "scheduled" && (
                    <div className="bg-white p-3 rounded-xl border border-emerald-300 space-y-2">
                      <label className="block text-xs font-bold text-slate-800">
                        Select Opening Date &amp; Time:
                      </label>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <input
                          type="datetime-local"
                          required={examForm.publishScheduleMode === "scheduled"}
                          value={examForm.scheduledPublishAt}
                          onChange={(e) =>
                            setExamForm({ ...examForm, scheduledPublishAt: e.target.value })
                          }
                          className="flex-1 text-xs py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                        />
                      </div>
                      {examForm.scheduledPublishAt && (
                        <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 leading-relaxed">
                          <strong>Active Period:</strong> Opens on{" "}
                          <strong>{new Date(examForm.scheduledPublishAt).toLocaleString()}</strong> and closes automatically on{" "}
                          <strong>
                            {new Date(
                              new Date(examForm.scheduledPublishAt).getTime() + 24 * 60 * 60 * 1000
                            ).toLocaleString()}
                          </strong>{" "}
                          (24-hour limit).
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Mode Selection Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setCreateMode("paste")}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    createMode === "paste"
                      ? "bg-emerald-800 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Paste Questions &amp; Auto-Detect Answers</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateMode("manual")}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    createMode === "manual"
                      ? "bg-emerald-800 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Manual Form ({examForm.questions.length})</span>
                </button>
              </div>

              {/* TAB 1: BULK PASTE & AUTO-DETECTION */}
              {createMode === "paste" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-800">
                        Paste Exam Questions Below:
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Supports Word, PDF, or text questions with options (A, B, C, D) and answers tagged via <code>Answer: B</code>, <code>*B*</code>, <code>[x] B</code>, or an answer key block.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setRawQuestionsText(SAMPLE_QUESTIONS_TEXT);
                        const res = parseExamQuestions(SAMPLE_QUESTIONS_TEXT, defaultMarks);
                        setExamForm((prev) => ({ ...prev, questions: res.questions }));
                        setParseNotice("Sample questions loaded & answers detected!");
                      }}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer self-start"
                    >
                      Load Sample Questions
                    </button>
                  </div>

                  <textarea
                    rows={8}
                    value={rawQuestionsText}
                    onChange={(e) => setRawQuestionsText(e.target.value)}
                    placeholder="1. Question text&#10;A) Option A&#10;B) Option B&#10;C) Option C&#10;D) Option D&#10;Answer: B"
                    className="w-full font-mono text-xs p-3.5 bg-slate-900 text-emerald-300 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                  />

                  {/* OPTIONAL/SEPARATE ANSWER KEY INPUT */}
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-600" />
                        <span>Paste Right Options / Marking Guide Key:</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setRawAnswerKey("1. B, 2. C, 3. B, 4. B, 5. C");
                        }}
                        className="text-[11px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                      >
                        Sample Key
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={rawAnswerKey}
                        onChange={(e) => setRawAnswerKey(e.target.value)}
                        placeholder="e.g. 1. B, 2. C, 3. B, 4. D  OR  B, C, B, D, A  OR  1-B, 2-C"
                        className="flex-1 font-mono text-xs px-3 py-2 bg-white text-slate-900 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={handleApplyAnswerKey}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <Key className="w-3.5 h-3.5" />
                        Apply Right Options
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-normal">
                      Have a separate answer sheet? Paste it above. Accepts formats like: <span className="font-mono font-semibold">1. B, 2. C</span> or <span className="font-mono font-semibold">B, C, B, D</span> or <span className="font-mono font-semibold">1-B 2-C</span>.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 font-semibold">
                        Default Marks per Question:
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 5, 10].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleApplyUniformMarks(m)}
                            className={`px-2 py-1 rounded text-xs font-bold cursor-pointer ${
                              defaultMarks === m
                                ? "bg-emerald-700 text-white"
                                : "bg-white border text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {m} pts
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleParseQuestions}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Parse Text
                      </button>

                      <button
                        type="button"
                        disabled={isDetectingAnswers}
                        onClick={handleSmartDetectAnswers}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {isDetectingAnswers ? "Analyzing & Solving..." : "Smart Auto-Detect & Solve Answers"}
                      </button>
                    </div>
                  </div>

                  {parseNotice && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{parseNotice}</span>
                    </div>
                  )}
                </div>
              )}

              {/* QUICK ANSWER KEY STRIP & REVIEW DETECTED QUESTIONS LIST */}
              {examForm.questions.length > 0 && (
                <div className="space-y-3 pt-2">
                  {/* QUICK ANSWER KEY STRIP */}
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-emerald-700" />
                        Quick Answer Key Summary (Click any letter to change)
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {examForm.questions.map((q) => `${q.questionNumber}:${q.correctAnswer}`).join("  |  ")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {examForm.questions.map((q, idx) => (
                        <div key={idx} className="flex items-center bg-white border border-slate-200 rounded-lg p-1 text-[11px] shadow-2xs">
                          <span className="font-bold text-slate-500 mr-1 pl-1">Q{q.questionNumber}:</span>
                          {(["A", "B", "C", "D"] as const).map((letter) => (
                            <button
                              key={letter}
                              type="button"
                              onClick={() => handleToggleCorrectAnswer(idx, letter)}
                              className={`w-5 h-5 rounded font-bold text-[10px] flex items-center justify-center transition-all cursor-pointer ${
                                q.correctAnswer === letter
                                  ? "bg-emerald-700 text-white shadow-2xs font-black"
                                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              }`}
                            >
                              {letter}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span>Detected Questions ({examForm.questions.length} Items)</span>
                      <span className="text-emerald-700 font-black">
                        &bull; Total: {examForm.questions.reduce((s, q) => s + q.marks, 0)} pts
                      </span>
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Click any option letter [A, B, C, D] to adjust the right answer.
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {examForm.questions.map((q, qIdx) => (
                      <div
                        key={qIdx}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2 hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-emerald-800 text-white font-bold text-xs flex items-center justify-center">
                              {q.questionNumber}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {q.questionText}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex items-center gap-1 text-[11px]">
                              <span className="text-slate-400">Marks:</span>
                              <input
                                type="number"
                                min="1"
                                max="50"
                                value={q.marks}
                                onChange={(e) =>
                                  handleUpdateQuestionMarks(qIdx, Number(e.target.value))
                                }
                                className="w-12 text-center text-xs py-0.5 border border-slate-200 rounded font-bold"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(qIdx)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              title="Delete question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Options Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-xs">
                          {(["A", "B", "C", "D"] as const).map((opt) => {
                            const isCorrect = q.correctAnswer === opt;
                            const text = q[`option${opt}` as keyof ParsedQuestion];

                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleToggleCorrectAnswer(qIdx, opt)}
                                className={`text-left p-2 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                                  isCorrect
                                    ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-1 ring-emerald-500"
                                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                <span className="truncate pr-1">
                                  <strong>{opt})</strong> {String(text)}
                                </span>
                                {isCorrect && (
                                  <span className="text-[10px] bg-emerald-700 text-white px-1.5 py-0.5 rounded font-black flex-shrink-0">
                                    RIGHT ANSWER
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Detection Note with Confidence Styling */}
                        {q.confidence === "low" ? (
                          <div className="text-[11px] p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 flex items-center gap-1.5 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <span>
                              <strong>Needs Teacher Confirmation:</strong>{" "}
                              {q.detectedFrom || "Click Option A, B, C, or D above to set correct answer."}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-1.5 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span>
                              <strong>Detected Right Answer (Option {q.correctAnswer}):</strong>{" "}
                              {q.detectedFrom}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit / Cancel Buttons */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  {examForm.questions.length} questions ready to be published to Neon DB.
                </span>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={examForm.questions.length === 0}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Publish CBT Exam to Portal
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TEACHER VIEW STUDENT CBT RESULT SLIP */}
      {selectedSubmissionForSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto print:shadow-none print:border-none">
            {/* Header / Brand */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-900 text-amber-300 flex items-center justify-center font-serif font-black text-xl shadow-md">
                  M
                </div>
                <div>
                  <h2 className="text-lg font-serif font-black text-slate-900">
                    Mathal International Schools
                  </h2>
                  <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider">
                    Official CBT Examination Result Slip
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={() => setSelectedSubmissionForSlip(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Candidate Details Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-5 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Student Name</span>
                <div className="font-bold text-slate-900 truncate">
                  {selectedSubmissionForSlip.submission.studentName}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Admission No</span>
                <div className="font-bold text-slate-900 truncate">
                  {selectedSubmissionForSlip.submission.admissionNo || "MIS/PRI/2026/001"}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Class &amp; Wing</span>
                <div className="font-bold text-slate-900">
                  {selectedSubmissionForSlip.submission.classLevel} &bull; {selectedSubmissionForSlip.submission.section}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Completed On</span>
                <div className="font-bold text-slate-900">
                  {new Date(selectedSubmissionForSlip.submission.submittedAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Score Metric Highlights */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-emerald-950 text-white text-center mb-6">
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-300">Marks Obtained</div>
                <div className="text-xl sm:text-2xl font-black mt-0.5 text-white">
                  {selectedSubmissionForSlip.submission.score} / {selectedSubmissionForSlip.submission.totalPossible}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-300">Percentage</div>
                <div className="text-xl sm:text-2xl font-black mt-0.5 text-amber-300">
                  {selectedSubmissionForSlip.submission.percentage}%
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-300">Examination Outcome</div>
                <div className="mt-1">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-black uppercase ${
                      selectedSubmissionForSlip.submission.passed
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                    }`}
                  >
                    {selectedSubmissionForSlip.submission.passed ? "PASSED" : "FAILED"}
                  </span>
                </div>
              </div>
            </div>

            {/* Question by Question Review */}
            {selectedSubmissionForSlip.breakdown && selectedSubmissionForSlip.breakdown.length > 0 && (
              <div className="space-y-3 mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Question Breakdown Review
                </h4>
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {selectedSubmissionForSlip.breakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs ${
                        item.isCorrect
                          ? "bg-emerald-50/60 border-emerald-200"
                          : "bg-rose-50/60 border-rose-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-slate-900">
                          {item.questionNumber}. {item.questionText}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            item.isCorrect ? "bg-emerald-700 text-white" : "bg-rose-700 text-white"
                          }`}
                        >
                          {item.isCorrect ? `+${item.marks} pts` : "0 pts"}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400">Student Answer:</span>{" "}
                          <strong
                            className={item.isCorrect ? "text-emerald-800" : "text-rose-700"}
                          >
                            Option {item.userAnswer}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Right Answer:</span>{" "}
                          <strong className="text-emerald-800">
                            Option {item.correctAnswer}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Official Teacher Signature & Recording Box */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950">
              <div className="font-bold flex items-center gap-1.5 text-amber-900 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Teacher Recording Verification</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px]">
                <div>
                  <span className="text-amber-800">Assigned Teacher:</span>
                  <div className="font-bold text-slate-800">{user?.name || "Subject Teacher"}</div>
                </div>
                <div>
                  <span className="text-amber-800">Grade Book Entry:</span>
                  <div className="font-bold text-slate-800">
                    {recordedMap[selectedSubmissionForSlip.submission.id] || "Pending Recording"}
                  </div>
                </div>
                <div>
                  <span className="text-amber-800">Official Stamp:</span>
                  <div className="font-bold text-emerald-800">VERIFIED &bull; MATHAL CBT</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD CBT SCORE DIRECTLY INTO DATABASE SCORE SHEET */}
      {recordScoreModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-base">
                  Record Score to Grade Book
                </h3>
              </div>
              <button
                onClick={() => setRecordScoreModal(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {recordingSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{recordingSuccess}</span>
              </div>
            )}

            {recordingError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{recordingError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500">Student:</div>
                <div className="font-bold text-slate-900 text-sm">
                  {recordScoreModal.submission.studentName}
                </div>
                <div className="text-slate-500">
                  CBT Score:{" "}
                  <strong>
                    {recordScoreModal.submission.score} / {recordScoreModal.submission.totalPossible} (
                    {recordScoreModal.submission.percentage}%)
                  </strong>
                </div>
                <div className="text-slate-500">
                  Subject: <strong>{recordScoreModal.submission.subject || "Mathematics"}</strong>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Record into Score Sheet Field:
                </label>
                <select
                  value={recordScoreModal.targetField}
                  onChange={(e) => {
                    const field = e.target.value as "ca1" | "ca2" | "exam";
                    const max = field === "exam" ? 60 : 20;
                    const scaled =
                      Math.round((recordScoreModal.submission.percentage / 100) * max * 10) / 10;
                    setRecordScoreModal({
                      ...recordScoreModal,
                      targetField: field,
                      maxFieldMarks: max,
                      scaledScore: scaled,
                    });
                  }}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ca1">Continuous Assessment 1 (CA 1 - Max 20 marks)</option>
                  <option value="ca2">Continuous Assessment 2 (CA 2 - Max 20 marks)</option>
                  <option value="exam">Terminal Examination (Exam - Max 60 marks)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Session</label>
                  <input
                    type="text"
                    value={recordScoreModal.session}
                    onChange={(e) =>
                      setRecordScoreModal({ ...recordScoreModal, session: e.target.value })
                    }
                    className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Term</label>
                  <select
                    value={recordScoreModal.term}
                    onChange={(e) =>
                      setRecordScoreModal({ ...recordScoreModal, term: e.target.value })
                    }
                    className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl"
                  >
                    <option value="First Term">First Term</option>
                    <option value="Second Term">Second Term</option>
                    <option value="Third Term">Third Term</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Calculated Mark to Record (Max {recordScoreModal.maxFieldMarks} pts):
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={recordScoreModal.maxFieldMarks}
                  value={recordScoreModal.scaledScore}
                  onChange={(e) =>
                    setRecordScoreModal({
                      ...recordScoreModal,
                      scaledScore: Number(e.target.value),
                    })
                  }
                  className="w-full py-2 px-3 font-mono font-bold text-base bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Automatically scaled from student&apos;s {recordScoreModal.submission.percentage}% CBT score. You can fine-tune this value.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRecordScoreModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRecordingScore}
                  onClick={handleConfirmRecordScore}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isRecordingScore ? "Saving to Database..." : "Save to Student's Grade Sheet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
