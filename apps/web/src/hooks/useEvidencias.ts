// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Evidencias (hallazgo · ruta · cedi)
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

export interface EvidenciaItem {
  id: string;
  tipo: string;
  nombre: string;
  url: string;
  size: number;
  categoria?: string;
  uploadedAt: string;
  uploadedBy: string;
  ocrTexto?: string;
  ocrCompletado?: boolean;
}

export interface EvidenciaHallazgoPayload {
  hallazgoId: string;
  tipo: string;
  nombre: string;
  url: string;
  size: number;
}
export interface EvidenciaRutaPayload {
  acompanamientoId: string;
  tipo: string;
  nombre: string;
  url: string;
  size: number;
  categoria?: string;
}
export interface EvidenciaCediPayload {
  cediId: string;
  auditoriaId?: string;
  hallazgoId?: string;
  tipo: string;
  nombre: string;
  url: string;
  size: number;
  categoria?: string;
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["evidencias"] });
}

// ── HALLAZGOS (Granjas) ──
export function useEvidenciasHallazgo(hallazgoId?: string) {
  return useQuery({
    queryKey: ["evidencias", "hallazgo", hallazgoId],
    queryFn:  () => apiGet<EvidenciaItem[]>(`/evidencias/hallazgo${hallazgoId ? `?hallazgoId=${hallazgoId}` : ""}`),
    staleTime: 30_000,
  });
}

export function useCreateEvidenciaHallazgo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: EvidenciaHallazgoPayload) => apiPost<EvidenciaItem>("/evidencias/hallazgo", dto),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteEvidenciaHallazgo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/evidencias/hallazgo/${id}`),
    onSuccess: () => invalidate(qc),
  });
}

// ── RUTAS (Acompañamientos) ──
export function useEvidenciasRuta(acompanamientoId?: string) {
  return useQuery({
    queryKey: ["evidencias", "ruta", acompanamientoId],
    queryFn:  () => apiGet<EvidenciaItem[]>(`/evidencias/ruta${acompanamientoId ? `?acompanamientoId=${acompanamientoId}` : ""}`),
    staleTime: 30_000,
  });
}

export function useCreateEvidenciaRuta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: EvidenciaRutaPayload) => apiPost<EvidenciaItem>("/evidencias/ruta", dto),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteEvidenciaRuta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/evidencias/ruta/${id}`),
    onSuccess: () => invalidate(qc),
  });
}

// ── CEDIS ──
export function useEvidenciasCedi(filters: { cediId?: string; auditoriaId?: string; hallazgoId?: string } = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.append(k, String(v)); });
  return useQuery({
    queryKey: ["evidencias", "cedi", filters],
    queryFn:  () => apiGet<EvidenciaItem[]>(`/evidencias/cedi?${qs}`),
    staleTime: 30_000,
  });
}

export function useCreateEvidenciaCedi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: EvidenciaCediPayload) => apiPost<EvidenciaItem>("/evidencias/cedi", dto),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteEvidenciaCedi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/evidencias/cedi/${id}`),
    onSuccess: () => invalidate(qc),
  });
}

export function useEvidenciasStats() {
  return useQuery({
    queryKey: ["evidencias", "stats"],
    queryFn:  () => apiGet<{ total: number; porModulo: { hallazgosGranjas: number; acompanamientosRutas: number; auditoriasCedis: number } }>(`/evidencias/stats`),
    staleTime: 60_000,
  });
}
