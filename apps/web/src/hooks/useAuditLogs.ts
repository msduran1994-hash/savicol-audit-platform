// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Audit Logs (admin)
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

export interface AccessLogItem {
  id:        string;
  userId:    string;
  action:    string;
  resource?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: string | null;
  createdAt: string;
  user?: { id: string; email: string; name: string; role: string };
}

export interface AccessLogPage {
  items: AccessLogItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface AccessStats {
  total: number;
  last30d: number;
  byAction: Array<{ action: string; count: number }>;
  topUsers: Array<{ userId: string; count: number; user: { id: string; name: string; email: string; role: string } }>;
}

export interface AuditActivityLogItem {
  id: string;
  activityId: string;
  userId: string;
  action: string;
  oldValues?: string | null;
  newValues?: string | null;
  changedAt: string;
  user?:     { id: string; name: string; email: string; role: string };
  activity?: { id: string; activity: string; area: string; year: number };
}

export interface AuditActivityLogPage {
  items: AuditActivityLogItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminSession {
  id:        string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: string;
  createdAt: string;
  user:      { id: string; email: string; name: string; role: string };
}

export function useAccessLogs(filters: {
  userId?: string; action?: string; search?: string;
  from?: string; to?: string; limit?: number; offset?: number;
} = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== "") qs.append(k, String(v)); });
  return useQuery({
    queryKey: ["audit-logs", "access", filters],
    queryFn:  () => apiGet<AccessLogPage>(`/audit-logs/access?${qs}`),
    staleTime: 30_000,
  });
}

export function useAccessStats() {
  return useQuery({
    queryKey: ["audit-logs", "access", "stats"],
    queryFn:  () => apiGet<AccessStats>(`/audit-logs/access/stats`),
    staleTime: 60_000,
  });
}

export function useActivityLogs(filters: { activityId?: string; userId?: string; limit?: number; offset?: number } = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== "") qs.append(k, String(v)); });
  return useQuery({
    queryKey: ["audit-logs", "activity", filters],
    queryFn:  () => apiGet<AuditActivityLogPage>(`/audit-logs/activity?${qs}`),
    staleTime: 30_000,
  });
}

export function useAdminSessions() {
  return useQuery({
    queryKey: ["audit-logs", "sessions"],
    queryFn:  () => apiGet<AdminSession[]>(`/audit-logs/sessions`),
    staleTime: 30_000,
  });
}
