// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Inventario (granjas)
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

export interface InventarioItem {
  id: string;
  granjaId: string;
  categoria: string;
  producto: string;
  unidad: string;
  stock: number;
  stockMinimo: number;
  fechaVencimiento?: string;
  estado: string;
  ubicacion?: string;
  notas?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
  granja?: { id: string; codigo: string; nombre: string; region: string };
}

export interface InventarioPayload {
  granjaId: string;
  categoria: string;
  producto: string;
  unidad: string;
  stock: number;
  stockMinimo: number;
  fechaVencimiento?: string;
  ubicacion?: string;
  notas?: string;
}

export interface InventarioAlerts {
  totalItems: number;
  conAlerta: number;
  stockBajo: InventarioItem[];
  agotado: InventarioItem[];
  vencido: InventarioItem[];
  porVencer: InventarioItem[];
}

export interface InventarioStats {
  categoria: string;
  count: number;
  stockTotal: number;
  valor: number;
}

function buildQs(filters: Record<string, any>) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== "") qs.append(k, String(v)); });
  return qs.toString();
}

export function useInventario(filters: { granjaId?: string; categoria?: string; estado?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ["inventario", filters],
    queryFn:  () => apiGet<InventarioItem[]>(`/inventario?${buildQs(filters)}`),
    staleTime: 30_000,
  });
}

export function useInventarioAlerts(granjaId?: string) {
  return useQuery({
    queryKey: ["inventario", "alerts", granjaId],
    queryFn:  () => apiGet<InventarioAlerts>(`/inventario/alerts${granjaId ? `?granjaId=${granjaId}` : ""}`),
    staleTime: 30_000,
  });
}

export function useInventarioStats(granjaId?: string) {
  return useQuery({
    queryKey: ["inventario", "stats", granjaId],
    queryFn:  () => apiGet<InventarioStats[]>(`/inventario/stats${granjaId ? `?granjaId=${granjaId}` : ""}`),
    staleTime: 60_000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["inventario"] });
  qc.invalidateQueries({ queryKey: ["granjas-executive"] });
}

export function useCreateInventario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: InventarioPayload) => apiPost<InventarioItem>("/inventario", dto),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateInventario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<InventarioPayload> }) =>
      apiPatch<InventarioItem>(`/inventario/${id}`, patch),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteInventario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/inventario/${id}`),
    onSuccess: () => invalidate(qc),
  });
}
