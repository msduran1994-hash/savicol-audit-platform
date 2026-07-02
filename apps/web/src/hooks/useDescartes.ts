// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Trazabilidad de Descartes (Granjas)
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type {
  DescarteAve, DescartePayload, DescartesFilters,
  EvidenciaDescarte, EvidenciaDescartePayload, AuditoriaDescarte,
} from "@/lib/descartes.types";

export function useDescartes(filters: DescartesFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
  return useQuery({
    queryKey: ["descartes", filters],
    queryFn:  () => apiGet<DescarteAve[]>(`/descartes?${params}`),
    staleTime: 30_000,
  });
}

export function useCreateDescarte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: DescartePayload) => apiPost<DescarteAve>("/descartes", dto),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["descartes"] }); qc.invalidateQueries({ queryKey: ["descartes-auditoria"] }); },
  });
}

export function useUpdateDescarte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: DescartePayload }) =>
      apiPatch<DescarteAve>(`/descartes/${id}`, patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["descartes"] }); qc.invalidateQueries({ queryKey: ["descartes-auditoria"] }); },
  });
}

// ─── Auditoría / historial de cambios (Fase 7) ───────────────────────────────
export function useAuditoriaDescarte(descarteId: string | null) {
  return useQuery({
    queryKey: ["descartes-auditoria", descarteId],
    queryFn:  () => apiGet<AuditoriaDescarte[]>(`/descartes/auditoria?descarteId=${descarteId}`),
    enabled:  !!descarteId,
    staleTime: 15_000,
  });
}

export function useDeleteDescarte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/descartes/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["descartes"] }),
  });
}

// ─── Evidencias ──────────────────────────────────────────────────────────────
export function useEvidenciasDescarte(descarteId: string | null) {
  return useQuery({
    queryKey: ["descartes-evidencias", descarteId],
    queryFn:  () => apiGet<EvidenciaDescarte[]>(`/descartes/evidencias?descarteId=${descarteId}`),
    enabled:  !!descarteId,
    staleTime: 30_000,
  });
}

export function useCreateEvidenciaDescarte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: EvidenciaDescartePayload) => apiPost<EvidenciaDescarte>("/descartes/evidencias", dto),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["descartes-evidencias"] }); qc.invalidateQueries({ queryKey: ["descartes-auditoria"] }); },
  });
}

export function useDeleteEvidenciaDescarte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/descartes/evidencias/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["descartes-evidencias"] }); qc.invalidateQueries({ queryKey: ["descartes-auditoria"] }); },
  });
}
