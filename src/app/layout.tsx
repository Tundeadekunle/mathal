import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { AcademicProvider } from "@/lib/academic-context";

export const metadata: Metadata = {
  title: "Mathal International Schools | Excellence in Primary & Secondary Education",
  description:
    "Official portal for Mathal International Schools - Student Registration, Attendance Tracking, Continuous Assessment (CA) & Exam Results, CBT Exam Portal, and Downloadable Terminal Reports.",
  icons: {
    icon: "/mathal-logo.jpg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased bg-slate-50 text-slate-900">
        <AuthProvider>
          <AcademicProvider>{children}</AcademicProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
