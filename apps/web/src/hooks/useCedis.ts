// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Módulo CEDIS
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

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
