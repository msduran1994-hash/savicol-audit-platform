import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInDays, isPast, parseISO } from "date-fns";
import { AUDIT_STATUS, type AuditStatus } from "./constants";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function getDaysRemaining(endDate: string): number {
  return differenceInDays(parseISO(endDate), new Date());
}

export function getEffectiveStatus(
  status: AuditStatus,
  endDate: string
): AuditStatus {
  if (status === "COMPLETED") return "COMPLETED";
  if (status !== "COMPLETED" && isPast(parseISO(endDate))) return "OVERDUE";
  return status;
}

export function getStatusBadgeClass(status: AuditStatus): string {
  const map: Record<AuditStatus, string> = {
    COMPLETED:   "badge-completed",
    IN_PROGRESS: "badge-in-progress",
    NOT_STARTED: "badge-not-started",
    OVERDUE:     "badge-overdue",
  };
  return map[status];
}

export function getStatusLabel(status: AuditStatus): string {
  return AUDIT_STATUS[status]?.label ?? status;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(parseISO(dateStr));
}

export function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

export function calculateCompletionRate(
  activities: Array<{ status: AuditStatus }>
): number {
  if (!activities.length) return 0;
  return Math.round(
    (activities.filter(a => a.status === "COMPLETED").length / activities.length) * 100
  );
}
