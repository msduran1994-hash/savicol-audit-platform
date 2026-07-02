// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Hoja Inventarios (motor genérico por módulo)
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { InventarioAuditado, InventarioPayload, InventarioFilters } from "@/lib/inventarios.types";

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
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["inventarios"] }),
  });
}

export function useUpdateInventario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: InventarioPayload }) =>
      apiPatch<InventarioAuditado>(`/inventarios/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventarios"] }),
  });
}

export function useDeleteInventario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/inventarios/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["inventarios"] }),
  });
}
