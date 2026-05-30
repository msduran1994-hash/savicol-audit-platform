// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Módulo Rutas (Acompañamientos)
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { Acompanamiento, AccionCumplimiento } from "@/lib/rutas.types";

// ─── ACOMPAÑAMIENTOS ─────────────────────────────────────────────────────────
export interface AcompanamientosFilters {
  search?: string;
  mes?: string;
  rutaId?: string;
  vehiculoId?: string;
  clienteId?: string;
  auditorId?: string;
  motivo?: string;
  criticidad?: string;
}

export function useAcompanamientos(filters: AcompanamientosFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
  return useQuery({
    queryKey: ["acompanamientos", filters],
    queryFn:  () => apiGet<Acompanamiento[]>(`/rutas/acompanamientos?${params}`),
    staleTime: 30_000,
  });
}

export function useAcompanamiento(id: string | null) {
  return useQuery({
    queryKey: ["acompanamientos", id],
    queryFn:  () => apiGet<Acompanamiento>(`/rutas/acompanamientos/${id}`),
    enabled:  !!id,
  });
}

export function useCreateAcompanamiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<Acompanamiento>) => apiPost<Acompanamiento>("/rutas/acompanamientos", dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["acompanamientos"] }),
  });
}

export function useUpdateAcompanamiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Acompanamiento> }) =>
      apiPatch<Acompanamiento>(`/rutas/acompanamientos/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["acompanamientos"] }),
  });
}

export function useDeleteAcompanamiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/rutas/acompanamientos/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["acompanamientos"] }),
  });
}

// ─── ACCIONES DE CUMPLIMIENTO ────────────────────────────────────────────────
export function useAccionesCumplimiento(filters: { acompanamientoId?: string; estado?: string } = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
  return useQuery({
    queryKey: ["acciones-cumplimiento", filters],
    queryFn:  () => apiGet<AccionCumplimiento[]>(`/rutas/acciones?${params}`),
    staleTime: 30_000,
  });
}

export function useCreateAccion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<AccionCumplimiento>) => apiPost<AccionCumplimiento>("/rutas/acciones", dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["acciones-cumplimiento"] }),
  });
}

export function useUpdateAccion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AccionCumplimiento> }) =>
      apiPatch<AccionCumplimiento>(`/rutas/acciones/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["acciones-cumplimiento"] }),
  });
}

// ─── CATÁLOGOS MAESTROS ──────────────────────────────────────────────────────
export function useClientes()    { return useQuery({ queryKey: ["catalogos","clientes"],    queryFn: () => apiGet<any[]>(`/rutas/catalogos/clientes`),    staleTime: 5*60_000 }); }
export function useRutasCat()    { return useQuery({ queryKey: ["catalogos","rutas"],       queryFn: () => apiGet<any[]>(`/rutas/catalogos/rutas`),       staleTime: 5*60_000 }); }
export function useVehiculos()   { return useQuery({ queryKey: ["catalogos","vehiculos"],   queryFn: () => apiGet<any[]>(`/rutas/catalogos/vehiculos`),   staleTime: 5*60_000 }); }
export function useConductores() { return useQuery({ queryKey: ["catalogos","conductores"], queryFn: () => apiGet<any[]>(`/rutas/catalogos/conductores`), staleTime: 5*60_000 }); }
export function useAuxiliares()  { return useQuery({ queryKey: ["catalogos","auxiliares"],  queryFn: () => apiGet<any[]>(`/rutas/catalogos/auxiliares`),  staleTime: 5*60_000 }); }

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
export function useRutasDashboard() {
  return useQuery({
    queryKey: ["rutas-dashboard"],
    queryFn:  () => apiGet<{ acompanamientos: any[] }>(`/rutas/dashboard`),
    staleTime: 30_000,
  });
}
