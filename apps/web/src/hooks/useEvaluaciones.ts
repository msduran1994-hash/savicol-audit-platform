// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Formulario Evaluativo (Inventario de Producto)
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type {
  EvaluacionInventario, EvaluacionPayload,
  EvidenciaEvaluacion, EvidenciaEvaluacionPayload,
} from "@/lib/evaluacion.types";

export function useEvaluaciones(modulo = "PRODUCTO") {
  return useQuery({
    queryKey: ["evaluaciones", modulo],
    queryFn:  () => apiGet<EvaluacionInventario[]>(`/evaluaciones?modulo=${modulo}`),
    staleTime: 30_000,
  });
}

export function useCreateEvaluacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: EvaluacionPayload) => apiPost<EvaluacionInventario>("/evaluaciones", dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["evaluaciones"] }),
  });
}

export function useUpdateEvaluacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EvaluacionPayload }) =>
      apiPatch<EvaluacionInventario>(`/evaluaciones/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluaciones"] }),
  });
}

export function useDeleteEvaluacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/evaluaciones/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["evaluaciones"] }),
  });
}

// ─── Evidencias ──────────────────────────────────────────────────────────────
export function useEvidenciasEvaluacion(evaluacionId: string | null) {
  return useQuery({
    queryKey: ["evaluaciones-evidencias", evaluacionId],
    queryFn:  () => apiGet<EvidenciaEvaluacion[]>(`/evaluaciones/evidencias?evaluacionId=${evaluacionId}`),
    enabled:  !!evaluacionId,
    staleTime: 30_000,
  });
}
export function useCreateEvidenciaEvaluacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: EvidenciaEvaluacionPayload) => apiPost<EvidenciaEvaluacion>("/evaluaciones/evidencias", dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["evaluaciones-evidencias"] }),
  });
}
export function useDeleteEvidenciaEvaluacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/evaluaciones/evidencias/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["evaluaciones-evidencias"] }),
  });
}
