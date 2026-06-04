// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Módulo CEDIS
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

export interface HallazgoCediDto {
  cediId: string;
  titulo: string;
  categoria: string;
  subtema?: string;
  subItem?: string;
  descripcion: string;
  tipoRiesgo: string;
  criticidad: string;
  estado?: string;
  recomendacionIA?: string;
  responsable?: string;
  fechaCompromiso?: string;
  fechaCierre?: string;
  porcentajeAvance?: number;
  reincidente?: boolean;
}

export interface AuditoriaCediDto {
  cediId: string;
  fechaVisita: string;
  auditorId: string;
  auditorNombre: string;
  administrador: string;
  tipoRiesgo: string;
  subtema?: string;
  observacionRiesgo: string;
  observacionInventario?: string;
  observacionCaja?: string;
  observacionCartera?: string;
  observacionLogistica?: string;
  observacionBioseguridad?: string;
  observacionInfraestructura?: string;
  observacionProcedimientos?: string;
  criticidad: string;
  estado?: string;
}

export function useCedis() {
  return useQuery({
    queryKey: ["cedis"],
    queryFn:  () => apiGet<any[]>(`/cedis`),
    staleTime: 60_000,
  });
}

export function useAuditoriasCedi(filters: { cediId?: string; estado?: string; mes?: string } = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
  return useQuery({
    queryKey: ["cedis-auditorias", filters],
    queryFn:  () => apiGet<any[]>(`/cedis/auditorias/list?${params}`),
    staleTime: 30_000,
  });
}

export function useHallazgosCedi(filters: { cediId?: string; categoria?: string; estado?: string; criticidad?: string } = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
  return useQuery({
    queryKey: ["cedis-hallazgos", filters],
    queryFn:  () => apiGet<any[]>(`/cedis/hallazgos/list?${params}`),
    staleTime: 30_000,
  });
}

export function useCedisDashboard() {
  return useQuery({
    queryKey: ["cedis-dashboard"],
    queryFn:  () => apiGet<{ cedis: any[]; auditorias: any[]; hallazgos: any[] }>(`/cedis/dashboard`),
    staleTime: 30_000,
  });
}

// ─── MUTATIONS: Hallazgos CEDI (Planes de cumplimiento) ──────────────────────
function invalidateCedisQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["cedis-hallazgos"] });
  qc.invalidateQueries({ queryKey: ["cedis-dashboard"] });
  qc.invalidateQueries({ queryKey: ["cedis-executive"] });
  qc.invalidateQueries({ queryKey: ["cedis-ai"] });
}

export function useCreateHallazgoCedi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<HallazgoCediDto>) => apiPost<any>(`/cedis/hallazgos`, dto),
    onSuccess:  () => invalidateCedisQueries(qc),
  });
}

export function useUpdateHallazgoCedi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<HallazgoCediDto> }) =>
      apiPatch<any>(`/cedis/hallazgos/${id}`, patch),
    onSuccess: () => invalidateCedisQueries(qc),
  });
}

export function useDeleteHallazgoCedi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/cedis/hallazgos/${id}`),
    onSuccess: () => invalidateCedisQueries(qc),
  });
}

// ─── MUTATIONS: Auditorias CEDI ──────────────────────────────────────────────
function invalidateAuditoriasQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["cedis-auditorias"] });
  qc.invalidateQueries({ queryKey: ["cedis-dashboard"] });
  qc.invalidateQueries({ queryKey: ["cedis-executive"] });
}

export function useCreateAuditoriaCedi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<AuditoriaCediDto>) => apiPost<any>(`/cedis/auditorias`, dto),
    onSuccess:  () => invalidateAuditoriasQueries(qc),
  });
}

export function useUpdateAuditoriaCedi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AuditoriaCediDto> }) =>
      apiPatch<any>(`/cedis/auditorias/${id}`, patch),
    onSuccess: () => invalidateAuditoriasQueries(qc),
  });
}

export function useDeleteAuditoriaCedi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/cedis/auditorias/${id}`),
    onSuccess: () => invalidateAuditoriasQueries(qc),
  });
}
