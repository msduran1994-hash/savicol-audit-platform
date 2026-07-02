// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Hoja Inventarios (motor genérico por módulo)
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type {
  InventarioAuditado, InventarioPayload, InventarioFilters,
  MovimientoInventario, MovimientoPayload,
  EvidenciaInventario, EvidenciaInventarioPayload, AuditoriaInventario,
} from "@/lib/inventarios.types";

export function useInventarios(filters: InventarioFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
  return useQuery({
    queryKey: ["inventarios", filters],
    queryFn:  () => apiGet<InventarioAuditado[]>(`/inventarios?${params}`),
    staleTime: 30_000,
  });
}

export function useCreateInventario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: InventarioPayload) => apiPost<InventarioAuditado>("/inventarios", dto),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["inventarios"] }); qc.invalidateQueries({ queryKey: ["inventarios-auditoria"] }); },
  });
}

export function useUpdateInventario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: InventarioPayload }) =>
      apiPatch<InventarioAuditado>(`/inventarios/${id}`, patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventarios"] }); qc.invalidateQueries({ queryKey: ["inventarios-auditoria"] }); },
  });
}

export function useDeleteInventario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/inventarios/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["inventarios"] }),
  });
}

// ─── Kardex de movimientos (Fase 4) ──────────────────────────────────────────
export function useMovimientos(itemId: string | null) {
  return useQuery({
    queryKey: ["inventarios-movimientos", itemId],
    queryFn:  () => apiGet<MovimientoInventario[]>(`/inventarios/movimientos?itemId=${itemId}`),
    enabled:  !!itemId,
    staleTime: 15_000,
  });
}

export function useCreateMovimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: MovimientoPayload) => apiPost<MovimientoInventario>("/inventarios/movimientos", dto),
    // El movimiento cambia el saldo del ítem → refresca kardex, inventario y auditoría.
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["inventarios-movimientos"] }); qc.invalidateQueries({ queryKey: ["inventarios"] }); qc.invalidateQueries({ queryKey: ["inventarios-auditoria"] }); },
  });
}

export function useDeleteMovimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/inventarios/movimientos/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["inventarios-movimientos"] }); qc.invalidateQueries({ queryKey: ["inventarios"] }); },
  });
}

// ─── Evidencias (Fase 5) ─────────────────────────────────────────────────────
export function useEvidenciasInventario(itemId: string | null) {
  return useQuery({
    queryKey: ["inventarios-evidencias", itemId],
    queryFn:  () => apiGet<EvidenciaInventario[]>(`/inventarios/evidencias?itemId=${itemId}`),
    enabled:  !!itemId,
    staleTime: 30_000,
  });
}
export function useCreateEvidenciaInventario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: EvidenciaInventarioPayload) => apiPost<EvidenciaInventario>("/inventarios/evidencias", dto),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["inventarios-evidencias"] }); qc.invalidateQueries({ queryKey: ["inventarios-auditoria"] }); },
  });
}
export function useDeleteEvidenciaInventario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/inventarios/evidencias/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["inventarios-evidencias"] }); qc.invalidateQueries({ queryKey: ["inventarios-auditoria"] }); },
  });
}

// ─── Auditoría / historial (Fase 5) ──────────────────────────────────────────
export function useAuditoriaInventario(itemId: string | null) {
  return useQuery({
    queryKey: ["inventarios-auditoria", itemId],
    queryFn:  () => apiGet<AuditoriaInventario[]>(`/inventarios/auditoria?itemId=${itemId}`),
    enabled:  !!itemId,
    staleTime: 15_000,
  });
}
