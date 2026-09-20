"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";
import { useAcademic } from "@/lib/academic-context";
import {
  LayoutDashboard,
  UserPlus,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  Award,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  BookOpen,
  Calendar,
  Check,
  Users,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { session, term, sessions, terms, setSession, setTerm, addSession } = useAcademic();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [academicMenuOpen, setAcademicMenuOpen] = useState(false);
  const [newSessionInput, setNewSessionInput] = useState("");

  // If not logged in, redirect to login
  React.useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  const role = user.role;

  // Nav links based on role
  const navItems = [
    {
      label: "Dashboard Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["ADMIN", "TEACHER", "STUDENT"],
    },
    {
      label: "Pupils & Students",
      href: "/dashboard/students",
      icon: UserPlus,
      roles: ["ADMIN", "TEACHER"],
    },
    {
      label: "Faculty & Staff",
      href: "/dashboard/teachers",
      icon: Users,
      roles: ["ADMIN"],
    },
    {
      label: "Daily Attendance",
      href: "/dashboard/attendance",
      icon: ClipboardList,
      roles: ["ADMIN", "TEACHER"],
    },
    {
      label: "CA & Exam Scores",
      href: "/dashboard/scores",
      icon: FileCheck2,
      roles: ["ADMIN", "TEACHER"],
    },
    {
      label: "CBT Exam Portal",
      href: "/dashboard/exam-portal",
      icon: GraduationCap,
      roles: ["ADMIN", "TEACHER", "STUDENT"],
    },
    {
      label: "Terminal Report Cards",
      href: "/dashboard/results",
      icon: Award,
      roles: ["ADMIN", "TEACHER", "STUDENT"],
    },
  ].filter((item) => item.roles.includes(role));

  const roleBadgeColor = {
    ADMIN: "bg-amber-400 text-emerald-950 font-bold",
    TEACHER: "bg-emerald-600 text-white font-semibold",
    STUDENT: "bg-cyan-600 text-white font-semibold",
  }[role];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#0B1A36] text-white border-b border-blue-900/50 shadow-md no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-blue-200 hover:text-white hover:bg-blue-900 focus:outline-none"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link href="/dashboard" className="flex items-center">
              <Logo size={40} variant="light" />
            </Link>
          </div>

          {/* Academic Session & Term Switcher */}
          <div className="relative">
            <button
              onClick={() => setAcademicMenuOpen(!academicMenuOpen)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-blue-950/80 hover:bg-blue-900/90 border border-blue-800/60 text-xs text-blue-200 transition-all shadow-inner group"
              title="Click to switch Academic Session & Term"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline font-medium text-blue-100">{session} Session</span>
              <span className="hidden sm:inline text-blue-400">&bull;</span>
              <span className="font-bold text-amber-300">{term}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-blue-300 transition-transform duration-200 ${academicMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {academicMenuOpen && (
              <div
                className="absolute right-0 sm:left-auto sm:right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-xs sm:w-72 rounded-2xl bg-[#09152B]/95 backdrop-blur-md border border-blue-800/60 shadow-2xl p-4 z-50 text-xs text-slate-100 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white text-sm">Academic Period</span>
                  </div>
                  <button
                    onClick={() => setAcademicMenuOpen(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Session Selector */}
                <div className="mt-3">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    SELECT ACADEMIC SESSION
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {sessions.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setSession(s);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg font-medium text-xs text-center border transition-all ${
                          session === s
                            ? "bg-emerald-600 border-emerald-400 text-white font-bold shadow-sm"
                            : "bg-slate-800/80 border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Add Custom Session Input */}
                  <div className="mt-2 flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. 2027/2028"
                      value={newSessionInput}
                      onChange={(e) => setNewSessionInput(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={() => {
                        if (newSessionInput.trim()) {
                          addSession(newSessionInput.trim());
                          setNewSessionInput("");
                        }
                      }}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Term Selector */}
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    SELECT ACADEMIC TERM
                  </label>
                  <div className="space-y-1">
                    {terms.map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setTerm(t);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          term === t
                            ? "bg-amber-400 text-slate-950 shadow-md font-bold"
                            : "bg-slate-800/60 hover:bg-slate-800 text-slate-200"
                        }`}
                      >
                        <span>{t}</span>
                        {term === t && <Check className="w-3.5 h-3.5 text-slate-950" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-2 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Changes apply immediately across all dashboards
                </div>
              </div>
            )}
          </div>

          {/* Real User Profile Badge */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900 text-xs border border-blue-800/60 transition-colors cursor-pointer"
                title="Account Details"
              >
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${roleBadgeColor}`}>
                  {role}
                </span>
                <span className="hidden sm:inline text-slate-100 font-semibold truncate max-w-[130px]">
                  {user.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
              </button>

              {roleMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-xl bg-[#09152B] border border-blue-800/60 shadow-2xl py-3 px-4 z-50 text-xs"
                  onClick={() => setRoleMenuOpen(false)}
                >
                  <div className="pb-2 border-b border-slate-800 mb-2">
                    <div className="font-bold text-white text-sm">{user.name}</div>
                    <div className="text-[11px] text-blue-300 truncate">{user.email}</div>
                    {user.admissionNo && (
                      <div className="mt-1 text-[11px] text-amber-300 font-mono">
                        Admission No: <strong>{user.admissionNo}</strong>
                      </div>
                    )}
                    {user.staffId && (
                      <div className="mt-1 text-[11px] text-amber-300 font-mono">
                        Staff ID: <strong>{user.staffId}</strong>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Role: <strong className="text-slate-200">{role}</strong></span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Neon DB Synced
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex gap-6">
        {/* Sidebar (Desktop) */}
        <aside className="hidden md:flex flex-col w-64 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 h-fit sticky top-24 no-print">
          <div className="mb-4 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Navigation Menu
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? "bg-[#0B1A36] text-white shadow-md shadow-blue-950/30"
                      : "text-slate-600 hover:text-blue-950 hover:bg-blue-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-amber-300" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-4 border-t border-slate-100 px-2">
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
              <div className="text-[11px] font-bold text-blue-950 uppercase">
                Mathal MIS
              </div>
              <div className="text-[11px] text-blue-700 mt-0.5">
                Primary &bull; Secondary
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                Logged in as: <strong className="text-slate-700 capitalize">{role.toLowerCase()}</strong>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden no-print"
            onClick={() => setMobileOpen(false)}
          >
            <div
              className="w-80 max-w-[85vw] bg-white h-full p-4 sm:p-5 shadow-2xl flex flex-col overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <Logo size={36} />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700 min-w-[40px] min-h-[40px] flex items-center justify-center"
                  aria-label="Close navigation drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Profile Card in Drawer */}
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[170px]">{user.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${roleBadgeColor}`}>
                    {role}
                  </span>
                </div>
                {user.admissionNo && (
                  <div className="text-[11px] text-emerald-800 font-mono mt-0.5">
                    Admission: {user.admissionNo}
                  </div>
                )}
                {user.staffId && (
                  <div className="text-[11px] text-emerald-800 font-mono mt-0.5">
                    Staff ID: {user.staffId}
                  </div>
                )}
              </div>

              {/* Academic Period Selector in Mobile Drawer */}
              <div className="mt-3 p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-blue-950 uppercase tracking-wider">
                    Academic Period
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    {term}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {sessions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSession(s)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                        session === s
                          ? "bg-emerald-700 border-emerald-800 text-white font-bold shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {terms.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTerm(t)}
                      className={`px-1 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        term === t
                          ? "bg-amber-400 border-amber-500 text-blue-950 shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {t.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              <nav className="mt-3 space-y-1 flex-1">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                        active
                          ? "bg-[#0B1A36] text-white shadow-md shadow-blue-950/30"
                          : "text-slate-600 hover:text-blue-950 hover:bg-blue-50"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? "text-amber-300" : "text-slate-400"}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <button
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
