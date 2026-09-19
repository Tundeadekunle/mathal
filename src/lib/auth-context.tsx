"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  phone?: string;
  avatarUrl?: string;
  studentId?: string;
  admissionNo?: string;
  passportPhoto?: string;
  staffId?: string;
  teacherId?: string;
  assignedClasses?: string | null;
  assignedSubjects?: string | null;
  assignedSection?: "PRIMARY" | "SECONDARY" | "BOTH";
}

// Alias for backwards compatibility
export type DemoUser = AuthUser;

export interface SignupParams {
  name: string;
  email: string;
  password?: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  phone?: string;
  section?: "PRIMARY" | "SECONDARY";
  classLevel?: string;
  arm?: string;
  gender?: "MALE" | "FEMALE";
  dateOfBirth?: string;
  bloodGroup?: string;
  address?: string;
  passportPhoto?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianAddress?: string;
  staffId?: string;
  qualification?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (
    identifier: string,
    password?: string
  ) => Promise<{ success: boolean; user?: AuthUser; message?: string }>;
  signup: (params: SignupParams) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem("mathal_auth_user", JSON.stringify(data.user));
          return;
        }
      }
    } catch {
      // offline or error
    }

    // Fallback to localStorage if API request fails
    const saved = localStorage.getItem("mathal_auth_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, []);

  const login = async (identifier: string, password?: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const json = await res.json();

      if (res.ok && json.user) {
        setUser(json.user);
        localStorage.setItem("mathal_auth_user", JSON.stringify(json.user));
        return { success: true, user: json.user };
      } else {
        return {
          success: false,
          message: json.error || "Authentication failed. Please verify your credentials.",
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Unable to reach server. Please check your connection.",
      };
    }
  };

  const signup = async (params: SignupParams) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const json = await res.json();

      if (res.ok && json.user) {
        setUser(json.user);
        localStorage.setItem("mathal_auth_user", JSON.stringify(json.user));
        return { success: true, message: json.message };
      } else {
        return {
          success: false,
          message: json.error || "Registration failed. Please check your details.",
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Network error. Please try again.",
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("mathal_auth_user");
    document.cookie = "mathal_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
