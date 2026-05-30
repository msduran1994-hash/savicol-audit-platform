// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Módulo Granjas
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { Granja, Hallazgo, KPI, Auditoria } from "@/lib/granjas.types";

// ─── GRANJAS ─────────────────────────────────────────────────────────────────
export interface GranjasFilters {
  search?: string;
  region?: string;
  tipoGranja?: string;
  tipoOperativo?: string;
  nivelRiesgo?: string;
  estadoSanitario?: string;
  tecnicoVeterinarioId?: string;
}

export function useGranjas(filters: GranjasFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
  return useQuery({
    queryKey: ["granjas", filters],
    queryFn:  () => apiGet<Granja[]>(`/granjas?${params}`),
    staleTime: 30_000,
  });
}

export function useGranja(id: string | null) {
  return useQuery({
    queryKey: ["granjas", id],
    queryFn:  () => apiGet<Granja>(`/granjas/${id}`),
    enabled:  !!id,
  });
}

export function useCreateGranja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<Granja>) => apiPost<Granja>("/granjas", dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["granjas"] }),
  });
}

export function useUpdateGranja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Granja> }) =>
      apiPatch<Granja>(`/granjas/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["granjas"] }),
  });
}

export function useDeleteGranja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/granjas/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["granjas"] }),
  });
}

// ─── HALLAZGOS ───────────────────────────────────────────────────────────────
export function useHallazgos(filters: { granjaId?: string; categoria?: string; criticidad?: string; estado?: string } = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
  return useQuery({
    queryKey: ["hallazgos", filters],
    queryFn:  () => apiGet<Hallazgo[]>(`/granjas/hallazgos/list?${params}`),
    staleTime: 30_000,
  });
}

export function useCreateHallazgo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<Hallazgo>) => apiPost<Hallazgo>("/granjas/hallazgos", dto),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["hallazgos"] });
      qc.invalidateQueries({ queryKey: ["granjas-dashboard"] });
    },
  });
}

// ─── KPIs ────────────────────────────────────────────────────────────────────
export function useKPIs(filters: { granjaId?: string; estado?: string } = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
  return useQuery({
    queryKey: ["kpis", filters],
    queryFn:  () => apiGet<KPI[]>(`/granjas/kpis/list?${params}`),
    staleTime: 30_000,
  });
}

export function useCreateKPI() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<KPI>) => apiPost<KPI>("/granjas/kpis", dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["kpis"] }),
  });
}

export function useUpdateKPI() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<KPI> }) =>
      apiPatch<KPI>(`/granjas/kpis/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kpis"] }),
  });
}

// ─── AUDITORÍAS ──────────────────────────────────────────────────────────────
export function useAuditorias(filters: { granjaId?: string; estado?: string } = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
  return useQuery({
    queryKey: ["auditorias-granjas", filters],
    queryFn:  () => apiGet<Auditoria[]>(`/granjas/auditorias/list?${params}`),
    staleTime: 30_000,
  });
}

export function useCreateAuditoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<Auditoria>) => apiPost<Auditoria>("/granjas/auditorias", dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["auditorias-granjas"] }),
  });
}

// ─── ACTIVIDAD LOG ───────────────────────────────────────────────────────────
export function useActividadGranjas(limit = 50) {
  return useQuery({
    queryKey: ["actividad-granjas", limit],
    queryFn:  () => apiGet<any[]>(`/granjas/actividad/list?limit=${limit}`),
    staleTime: 15_000,
  });
}

// ─── DASHBOARD (data agregada) ───────────────────────────────────────────────
export function useGranjasDashboard() {
  return useQuery({
    queryKey: ["granjas-dashboard"],
    queryFn:  () => apiGet<{ granjas: any[]; hallazgos: any[]; kpis: any[] }>(`/granjas/dashboard`),
    staleTime: 30_000,
  });
}
