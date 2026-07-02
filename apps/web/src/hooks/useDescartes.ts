// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Trazabilidad de Descartes (Granjas)
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { DescarteAve, DescartePayload, DescartesFilters } from "@/lib/descartes.types";

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
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["descartes"] }),
  });
}

export function useUpdateDescarte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: DescartePayload }) =>
      apiPatch<DescarteAve>(`/descartes/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["descartes"] }),
  });
}

export function useDeleteDescarte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/descartes/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["descartes"] }),
  });
}
