import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { useAuditStore, type AuditActivity } from "@/store/audit.store";

const QK = "audit-activities";

export interface ActivityStats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  overdue: number;
  completionRate: number;
  byAuditor: Array<{ auditorId: string; auditorName: string; status: string; _count: { _all: number } }>;
  byArea: Array<{ area: string; status: string; _count: { _all: number } }>;
}

/* ── Query: lista filtrada ────────────────────────────── */
export function useActivities(params?: {
  year?: number;
  auditorId?: string;
  status?: string;
  area?: string;
  search?: string;
}) {
  const setActivities = useAuditStore((s) => s.setActivities);

  return useQuery({
    queryKey: [QK, params],
    queryFn: async () => {
      const data = await apiGet<AuditActivity[]>("/audit-activities", params);
      setActivities(data);          // sincroniza el store local
      return data;
    },
    staleTime: 30_000,
    retry: 1,
  });
}

/* ── Query: stats / KPIs ──────────────────────────────── */
export function useActivityStats(year = 2026) {
  return useQuery({
    queryKey: [QK, "stats", year],
    queryFn: () => apiGet<ActivityStats>("/audit-activities/stats", { year }),
    staleTime: 60_000,
    retry: 1,
  });
}

/* ── Mutation: crear ──────────────────────────────────── */
export function useCreateActivity() {
  const qc = useQueryClient();
  const addActivity = useAuditStore((s) => s.addActivity);

  return useMutation({
    mutationFn: (dto: Omit<AuditActivity, "id" | "item" | "createdAt" | "updatedAt">) =>
      apiPost<AuditActivity>("/audit-activities", dto),
    onSuccess: (activity) => {
      addActivity(activity);
      qc.invalidateQueries({ queryKey: [QK] });
    },
  });
}

/* ── Mutation: actualizar ─────────────────────────────── */
export function useUpdateActivity() {
  const qc = useQueryClient();
  const updateActivity = useAuditStore((s) => s.updateActivity);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AuditActivity> }) =>
      apiPatch<AuditActivity>(`/audit-activities/${id}`, data),
    onSuccess: (activity) => {
      updateActivity(activity.id, activity);
      qc.invalidateQueries({ queryKey: [QK] });
    },
  });
}

/* ── Mutation: eliminar ───────────────────────────────── */
export function useDeleteActivity() {
  const qc = useQueryClient();
  const removeActivity = useAuditStore((s) => s.removeActivity);

  return useMutation({
    mutationFn: (id: string) => apiDelete(`/audit-activities/${id}`),
    onSuccess: (_, id) => {
      removeActivity(id);
      qc.invalidateQueries({ queryKey: [QK] });
    },
  });
}
