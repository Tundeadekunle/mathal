"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import {
  UserCheck,
  ClipboardList,
  GraduationCap,
  FileCheck2,
  Download,
  ShieldCheck,
  ArrowRight,
  BookOpen,
  Award,
  Sparkles,
  School,
  CheckCircle2,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1A36] via-[#09152B] to-[#050C19] text-slate-100 flex flex-col selection:bg-amber-400 selection:text-blue-950 relative overflow-x-hidden">
      {/* Background Image: Mathal Logo Watermark */}
      <div
        className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="w-full h-full bg-center bg-no-repeat opacity-[0.07] scale-105 transition-opacity"
          style={{
            backgroundImage: "url('/mathal-logo.jpg')",
            backgroundSize: "min(640px, 85vw)",
            backgroundPosition: "center 38%",
          }}
        />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0B1A36]/90 border-b border-blue-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Logo size={48} variant="light" />

          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="px-3 sm:px-4 py-2 text-sm font-medium text-blue-200 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-3 sm:px-4 py-2 text-sm font-bold text-blue-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md shadow-amber-400/20"
            >
              Sign Up
            </Link>
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900/80 hover:bg-blue-800 text-white font-semibold text-sm border border-blue-600/60 transition-all"
            >
              Dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 relative z-10">
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
          {/* Subtle Background Glows in Navy & Gold */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Hero Centered Logo Background Watermark */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] max-w-[90vw] max-h-[90vw] pointer-events-none opacity-[0.08] select-none flex items-center justify-center"
            aria-hidden="true"
          >
            <img
              src="/mathal-logo.jpg"
              alt=""
              className="w-full h-full object-contain filter drop-shadow-2xl rounded-3xl"
            />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/80 border border-blue-700/60 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-8 backdrop-blur-sm shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Primary &amp; Secondary Integrated School Portal
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight text-white leading-tight">
                MATHAL <span className="text-amber-400">INTERNATIONAL</span> SCHOOLS
              </h1>
              <p className="mt-2 text-xl sm:text-2xl font-serif italic text-blue-200/90 font-normal">
                &ldquo;Knowledge is Light &bull; Virtue and Excellence&rdquo;
              </p>

              <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
                Comprehensive digital educational portal tailored for pupils, students, teachers, and administrators. Seamlessly manage registration, daily attendance, continuous assessments, CBT exams, and verifiable terminal reports.
              </p>

              {/* Portal Access Actions */}
              <div className="mt-10 p-6 rounded-2xl bg-[#0E1E3D]/80 border border-blue-800/60 backdrop-blur-sm max-w-xl mx-auto shadow-xl">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/login"
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-bold text-blue-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/20"
                  >
                    <span>Sign In to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/register"
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-bold text-white bg-blue-700 hover:bg-blue-600 border border-blue-500/50 transition-all shadow-lg shadow-blue-950/40"
                  >
                    <span>Create Account &rarr;</span>
                  </Link>
                </div>

                <div className="mt-4 pt-3 border-t border-blue-900/50 flex items-center justify-around text-[11px] text-blue-300/90">
                  <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Admin Portal</span>
                  <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 text-blue-300" /> Teachers &amp; Staff</span>
                  <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-cyan-300" /> Pupils &amp; Students</span>
                </div>
              </div>
            </div>

            {/* Core Modules Grid */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1: Registration */}
              <div className="p-6 rounded-2xl bg-[#0E1E3D]/60 border border-blue-900/50 hover:border-blue-500/70 transition-all hover:shadow-xl hover:shadow-blue-950/70">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Pupils &amp; Students Registration
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  Streamlined enrollment for both Primary (KG 1-2, Nursery 1-3, Basic 1-6) and Secondary (JSS 1-3, SSS 1-3) wings with parent profiles and auto-generated student IDs.
                </p>
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                  <CheckCircle2 className="w-4 h-4" /> Multi-section &bull; Class &amp; Arm allocation
                </div>
              </div>

              {/* Feature 2: Daily Attendance */}
              <div className="p-6 rounded-2xl bg-[#0E1E3D]/60 border border-blue-900/50 hover:border-blue-500/70 transition-all hover:shadow-xl hover:shadow-blue-950/70">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Daily Attendance Tracker
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  Fast class-by-class roll calls for teachers. One-click status marking (Present, Absent, Late, Excused) with automatic termly attendance aggregates.
                </p>
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
                  <CheckCircle2 className="w-4 h-4" /> Automatic report card synchronization
                </div>
              </div>

              {/* Feature 3: CA & Exam Scores */}
              <div className="p-6 rounded-2xl bg-[#0E1E3D]/60 border border-blue-900/50 hover:border-blue-500/70 transition-all hover:shadow-xl hover:shadow-blue-950/70">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  CA Scores &amp; Exam Input
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  Teachers enter CA 1 (20), CA 2 (20), and Terminal Exam (60) scores. The system calculates totals, assigns letter grades (A-F), and auto-generates remarks.
                </p>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <CheckCircle2 className="w-4 h-4" /> Real-time 100-mark validation &amp; positions
                </div>
              </div>

              {/* Feature 4: Online CBT Exam Portal */}
              <div className="p-6 rounded-2xl bg-[#0E1E3D]/60 border border-blue-900/50 hover:border-blue-500/70 transition-all hover:shadow-xl hover:shadow-blue-950/70">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Computer-Based Exam Portal
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  Teachers build multiple-choice assessments. Students take timed exams in a dedicated test hall with interactive countdown timer and auto-submission.
                </p>
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                  <CheckCircle2 className="w-4 h-4" /> Live timer &bull; Question navigator &bull; Instant grade
                </div>
              </div>

              {/* Feature 5: Watermark Downloadable Result */}
              <div className="p-6 rounded-2xl bg-[#0E1E3D]/60 border border-blue-900/50 hover:border-blue-500/70 transition-all hover:shadow-xl hover:shadow-blue-950/70">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                  <Download className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Watermarked Result Sheets
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  Pupils and students can view and download their official report sheets. Features the Mathal International Schools crest centered as an elegant background watermark!
                </p>
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
                  <CheckCircle2 className="w-4 h-4" /> High-DPI PDF &amp; print-ready formatting
                </div>
              </div>

              {/* Feature 6: Affective & Psychomotor Domains */}
              <div className="p-6 rounded-2xl bg-[#0E1E3D]/60 border border-blue-900/50 hover:border-blue-500/70 transition-all hover:shadow-xl hover:shadow-blue-950/70">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Holistic Student Evaluation
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  Rate behavioral domains including punctuality, neatness, honesty, attentiveness, and psychomotor skills such as handwriting, crafts, and sports on a 5-point scale.
                </p>
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                  <CheckCircle2 className="w-4 h-4" /> Teacher &amp; Principal remarks &bull; Next resumption
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-blue-900/40 bg-[#050C19]/95 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-amber-400" />
            <span>&copy; {new Date().getFullYear()} Mathal International Schools. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4 text-blue-400">
            <span>Primary Wing</span>
            <span>&bull;</span>
            <span>Secondary Wing</span>
            <span>&bull;</span>
            <span className="text-amber-400">Motto: Knowledge is Light</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
