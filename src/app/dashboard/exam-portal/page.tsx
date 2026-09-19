"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { dataStore, DemoCbtExam, DemoExamSubmission } from "@/lib/store";
import {
  PRIMARY_CLASSES,
  SECONDARY_CLASSES,
} from "@/lib/grading";
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  Plus,
  Play,
  Award,
  BookOpen,
  X,
  FileCheck2,
  Sparkles,
} from "lucide-react";

export default function ExamPortalPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<DemoCbtExam[]>([]);
  const [submissions, setSubmissions] = useState<DemoExamSubmission[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sectionFilter, setSectionFilter] = useState<string>("ALL");

  // New Exam Form State
  const [examForm, setExamForm] = useState({
    title: "",
    description: "",
    section: "PRIMARY" as "PRIMARY" | "SECONDARY",
    classLevel: "Basic 4",
    subject: "Mathematics",
    durationMinutes: 20,
    passPercentage: 50,
    questions: [
      {
        questionNumber: 1,
        questionText: "What is 15 multiplied by 4?",
        optionA: "50",
        optionB: "60",
        optionC: "70",
        optionD: "45",
        correctAnswer: "B" as "A" | "B" | "C" | "D",
        marks: 10,
      },
      {
        questionNumber: 2,
        questionText: "Which of the following is an even number?",
        optionA: "21",
        optionB: "35",
        optionC: "48",
        optionD: "59",
        correctAnswer: "C" as "A" | "B" | "C" | "D",
        marks: 10,
      },
    ],
  });

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
          // Collect submissions from exams
          const allSubs: DemoExamSubmission[] = [];
          d.exams.forEach((ex: any) => {
            if (ex.submissions) {
              ex.submissions.forEach((s: any) => {
                allSubs.push({
                  id: s.id,
                  examId: s.examId,
                  examTitle: ex.title,
                  studentId: s.studentId,
                  studentName: s.student
                    ? `${s.student.firstName} ${s.student.lastName}`
                    : "Student",
                  score: s.score,
                  totalPossible: s.totalPossible,
                  percentage: s.percentage,
                  passed: s.passed,
                  submittedAt: s.submittedAt,
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

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalMarks = examForm.questions.reduce((sum, q) => sum + q.marks, 0);

    const payload = {
      title: examForm.title,
      description: examForm.description,
      section: examForm.section,
      classLevel: examForm.classLevel,
      subject: examForm.subject,
      durationMinutes: Number(examForm.durationMinutes),
      totalMarks,
      passPercentage: Number(examForm.passPercentage),
      isActive: true,
      createdBy: user?.name || "Teacher",
      questions: examForm.questions.map((q, idx) => ({
        ...q,
        questionNumber: idx + 1,
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

  const role = user?.role || "STUDENT";
  const filteredExams =
    sectionFilter === "ALL"
      ? exams
      : exams.filter((e) => e.section === sectionFilter);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-black text-slate-900 tracking-tight">
            Computer-Based Testing (CBT) Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Conduct timed online assessments, mid-term tests, and mock exams with instant auto-grading.
          </p>
        </div>

        {role !== "STUDENT" && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            Create CBT Exam
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200/80 shadow-sm w-fit">
        <button
          onClick={() => setSectionFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            sectionFilter === "ALL"
              ? "bg-emerald-800 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All Exams ({exams.length})
        </button>
        <button
          onClick={() => setSectionFilter("PRIMARY")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            sectionFilter === "PRIMARY"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Primary Wing
        </button>
        <button
          onClick={() => setSectionFilter("SECONDARY")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            sectionFilter === "SECONDARY"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Secondary Wing
        </button>
      </div>

      {/* Scheduled Exams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredExams.map((exam) => (
          <div
            key={exam.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between hover:border-emerald-400 transition-all group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    exam.section === "PRIMARY"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-blue-100 text-blue-900"
                  }`}
                >
                  {exam.section} &bull; {exam.classLevel}
                </span>

                <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  {exam.durationMinutes} Minutes
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                {exam.title}
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                {exam.description}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 py-3 px-3 bg-slate-50 rounded-xl text-center text-xs">
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

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Created by: <strong>{exam.createdBy}</strong>
              </span>

              <Link
                href={`/dashboard/exam-portal/${exam.id}/take`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs shadow-md transition-all group-hover:scale-105"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {role === "STUDENT" ? "Enter Exam Hall" : "Preview / Take Test"}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Recent CBT Submissions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-emerald-700" />
          <h3 className="font-bold text-slate-900 text-sm">Recent Exam Attempts &amp; Scores</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Exam Title</th>
                <th className="px-4 py-3 text-center">Score</th>
                <th className="px-4 py-3 text-center">Percentage</th>
                <th className="px-4 py-3 text-center">Outcome</th>
                <th className="px-4 py-3 text-right">Date Completed</th>
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
                submissions.map((subm) => (
                  <tr key={subm.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-bold text-slate-900 text-xs">
                      {subm.studentName}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {subm.examTitle}
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
                    <td className="px-4 py-3 text-right text-xs text-slate-400">
                      {new Date(subm.submittedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create CBT Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Create New CBT Examination
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Exam Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={examForm.title}
                    onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                    placeholder="e.g. Basic 4 Mathematics Termly CA Test"
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description &amp; Instructions
                  </label>
                  <input
                    type="text"
                    value={examForm.description}
                    onChange={(e) =>
                      setExamForm({ ...examForm, description: e.target.value })
                    }
                    placeholder="e.g. Answer all questions carefully within the allocated time."
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    School Section
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
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="PRIMARY">Primary Wing</option>
                    <option value="SECONDARY">Secondary Wing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Class Level
                  </label>
                  <select
                    value={examForm.classLevel}
                    onChange={(e) =>
                      setExamForm({ ...examForm, classLevel: e.target.value })
                    }
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject Name
                  </label>
                  <input
                    type="text"
                    required
                    value={examForm.subject}
                    onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                    placeholder="e.g. Mathematics"
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duration (Minutes)
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
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 shadow-md"
                >
                  Publish CBT Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
