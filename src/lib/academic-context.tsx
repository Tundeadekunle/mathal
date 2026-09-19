"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { dataStore } from "./store";

export const TERMS = ["First Term", "Second Term", "Third Term"] as const;
export type AcademicTerm = (typeof TERMS)[number];

interface AcademicContextType {
  session: string;
  term: string;
  sessions: string[];
  terms: string[];
  setSession: (session: string) => void;
  setTerm: (term: string) => void;
  setPeriod: (session: string, term: string) => void;
  addSession: (newSession: string) => void;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export function AcademicProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<string>("2024/2025");
  const [term, setTermState] = useState<string>("First Term");
  const [sessions, setSessionsState] = useState<string[]>([
    "2023/2024",
    "2024/2025",
    "2025/2026",
    "2026/2027",
  ]);

  // Initialize from dataStore and localStorage on client mount
  useEffect(() => {
    try {
      const initial = dataStore.getActivePeriod();
      const savedSession = localStorage.getItem("mathal_academic_session");
      const savedTerm = localStorage.getItem("mathal_academic_term");

      const activeSess = savedSession || initial.session;
      const activeTrm = savedTerm || initial.term;

      setSessionState(activeSess);
      setTermState(activeTrm);
      setSessionsState(initial.sessions);

      dataStore.setActivePeriod(activeSess, activeTrm);
    } catch {
      // Fallback in case of SSR or restricted storage
    }
  }, []);

  const setSession = (newSession: string) => {
    setSessionState(newSession);
    dataStore.setActivePeriod(newSession, term);
    try {
      localStorage.setItem("mathal_academic_session", newSession);
    } catch {}
  };

  const setTerm = (newTerm: string) => {
    setTermState(newTerm);
    dataStore.setActivePeriod(session, newTerm);
    try {
      localStorage.setItem("mathal_academic_term", newTerm);
    } catch {}
  };

  const setPeriod = (newSession: string, newTerm: string) => {
    setSessionState(newSession);
    setTermState(newTerm);
    dataStore.setActivePeriod(newSession, newTerm);
    try {
      localStorage.setItem("mathal_academic_session", newSession);
      localStorage.setItem("mathal_academic_term", newTerm);
    } catch {}
  };

  const addSession = (newSession: string) => {
    const trimmed = newSession.trim();
    if (!trimmed) return;
    const updated = dataStore.addSession(trimmed);
    setSessionsState([...updated]);
    setSession(trimmed);
  };

  return (
    <AcademicContext.Provider
      value={{
        session,
        term,
        sessions,
        terms: [...TERMS],
        setSession,
        setTerm,
        setPeriod,
        addSession,
      }}
    >
      {children}
    </AcademicContext.Provider>
  );
}

export function useAcademic() {
  const context = useContext(AcademicContext);
  if (!context) {
    throw new Error("useAcademic must be used within an AcademicProvider");
  }
  return context;
}
