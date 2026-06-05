// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Notifications (in-app)
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

export type NotificationKind =
  | "USER_CREATED" | "ROLE_CHANGED" | "PASSWORD_RESET" | "INVITATION_SENT"
  | "HALLAZGO_ASSIGNED" | "KPI_ASSIGNED" | "ALERT_CRITICAL"
  | "ACCESS_GRANTED" | "SYSTEM";

export type NotificationSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

export interface NotificationItem {
  id:        string;
  userId:    string;
  kind:      NotificationKind;
  severity:  NotificationSeverity;
  title:     string;
  message:   string;
  metadata?: string;
  readAt?:   string | null;
  emailSent: boolean;
  emailError?: string | null;
  createdAt: string;
}

export function useNotifications(opts: { unread?: boolean; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (opts.unread) qs.append("unread", "true");
  if (opts.limit)  qs.append("limit", String(opts.limit));
  return useQuery({
    queryKey: ["notifications", opts],
    queryFn:  () => apiGet<NotificationItem[]>(`/notifications?${qs}`),
    staleTime: 30_000,
    refetchInterval: 60_000, // poll cada minuto
  });
}

export function useNotificationsCount() {
  return useQuery({
    queryKey: ["notifications", "count"],
    queryFn:  () => apiGet<{ count: number }>(`/notifications/count`),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["notifications"] });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost<NotificationItem>(`/notifications/${id}/read`, {}),
    onSuccess:  () => invalidate(qc),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<{ count: number }>(`/notifications/read-all`, {}),
    onSuccess:  () => invalidate(qc),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/notifications/${id}`),
    onSuccess:  () => invalidate(qc),
  });
}

// ─── PREFERENCES ───
export type NotificationPrefs = Record<string, { inApp?: boolean; email?: boolean }>;

export function useNotificationPrefs() {
  return useQuery({
    queryKey: ["notification-prefs"],
    queryFn:  () => apiGet<{ prefs: NotificationPrefs }>(`/users/me/notification-preferences`),
    staleTime: 60_000,
  });
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: NotificationPrefs) =>
      apiPatch<{ ok: boolean; prefs: NotificationPrefs }>(`/users/me/notification-preferences`, { prefs }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-prefs"] }),
  });
}
