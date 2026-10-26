/**
 * Utility functions for CBT Exam scheduling and 24-hour availability windows.
 */

export interface ExamAvailabilityInfo {
  isScheduled: boolean;
  isExpired: boolean;
  isOpen: boolean;
  publishDate: Date;
  scheduledDate: Date | null;
  expiryDate: Date;
  timeUntilOpenMs: number;
  timeUntilExpiryMs: number;
  status: "SCHEDULED" | "OPEN" | "EXPIRED" | "INACTIVE";
  statusBadge: {
    label: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
  };
}

export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return "0 mins";

  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min${minutes === 1 ? "" : "s"}`;
}

export function formatExamDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "N/A";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function getExamAvailability(exam: {
  scheduledPublishAt?: string | Date | null;
  publishedAt?: string | Date | null;
  expiresAt?: string | Date | null;
  createdAt?: string | Date | null;
  isActive?: boolean;
}): ExamAvailabilityInfo {
  const now = new Date();

  // Scheduled date (if set for future)
  const scheduledDate = exam.scheduledPublishAt ? new Date(exam.scheduledPublishAt) : null;
  const isScheduled = !!scheduledDate && !isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > now.getTime();

  // Publish date: scheduled time if in future/past, or publishedAt, or createdAt, or now
  let publishDate: Date;
  if (exam.publishedAt && !isNaN(new Date(exam.publishedAt).getTime())) {
    publishDate = new Date(exam.publishedAt);
  } else if (scheduledDate && !isNaN(scheduledDate.getTime())) {
    publishDate = scheduledDate;
  } else if (exam.createdAt && !isNaN(new Date(exam.createdAt).getTime())) {
    publishDate = new Date(exam.createdAt);
  } else {
    publishDate = now;
  }

  // Expiry date: strictly 24 hours after publishDate if expiresAt is not explicitly provided
  let expiryDate: Date;
  if (exam.expiresAt && !isNaN(new Date(exam.expiresAt).getTime())) {
    expiryDate = new Date(exam.expiresAt);
  } else {
    // 24 hours from publishDate
    expiryDate = new Date(publishDate.getTime() + 24 * 60 * 60 * 1000);
  }

  const isExpired = now.getTime() >= expiryDate.getTime();
  const isActive = exam.isActive !== false;
  const isOpen = !isScheduled && !isExpired && isActive;

  const timeUntilOpenMs = isScheduled ? Math.max(0, scheduledDate!.getTime() - now.getTime()) : 0;
  const timeUntilExpiryMs = isOpen ? Math.max(0, expiryDate.getTime() - now.getTime()) : 0;

  let status: ExamAvailabilityInfo["status"] = "OPEN";
  let statusBadge: ExamAvailabilityInfo["statusBadge"];

  if (!isActive) {
    status = "INACTIVE";
    statusBadge = {
      label: "Disabled / Inactive",
      bgClass: "bg-slate-100",
      textClass: "text-slate-600",
      borderClass: "border-slate-200",
    };
  } else if (isScheduled) {
    status = "SCHEDULED";
    statusBadge = {
      label: `Scheduled: Opens in ${formatRemainingTime(timeUntilOpenMs)}`,
      bgClass: "bg-blue-50",
      textClass: "text-blue-800",
      borderClass: "border-blue-200",
    };
  } else if (isExpired) {
    status = "EXPIRED";
    statusBadge = {
      label: "Access Closed (24hr Window Expired)",
      bgClass: "bg-rose-50",
      textClass: "text-rose-800",
      borderClass: "border-rose-200",
    };
  } else {
    status = "OPEN";
    statusBadge = {
      label: `Available Now: Closes in ${formatRemainingTime(timeUntilExpiryMs)}`,
      bgClass: "bg-emerald-50",
      textClass: "text-emerald-800",
      borderClass: "border-emerald-200",
    };
  }

  return {
    isScheduled,
    isExpired,
    isOpen,
    publishDate,
    scheduledDate,
    expiryDate,
    timeUntilOpenMs,
    timeUntilExpiryMs,
    status,
    statusBadge,
  };
}
