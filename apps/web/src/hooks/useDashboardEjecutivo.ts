// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Dashboard Ejecutivo cross-workspace
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

export interface DashboardEjecutivoData {
  timestamp: string;
  usuarios:  { total: number; activos: number; inactivos: number };
  workspaces: {
    granjas: { total: number; enRiesgo: number };
    rutas:   { total: number; activas: number };
    cedis:   { total: number; activos: number };
  };
  hallazgos: {
    total: number;
    criticos: number;
    altos: number;
    abiertos: number;
    porModulo: { granjas: number; cedis: number };
  };
  auditorias: {
    total: number;
    porModulo: { granjas: number; cedis: number; rutas: number };
    conHallazgos: number;
  };
  kpi: { cumplimiento: number; completados: number; activos: number };
  cronograma: { total: number; completadas: number; progreso: number };
  actividadReciente: { granjas: any[]; cedisEvidencias: any[] };
}

export interface SeguridadData {
  accesosUltima7d: number;
  fallosLogin: number;
  sesionesActivas: number;
  tasaExito: number;
}

export interface TopAuditor {
  id: string;
  name: string;
  email: string;
  role: string;
  actividades: number;
  cambios: number;
  score: number;
}

export function useDashboardEjecutivo() {
  return useQuery({
    queryKey: ["dashboards", "ejecutivo"],
    queryFn:  () => apiGet<DashboardEjecutivoData>("/dashboards/ejecutivo"),
    staleTime: 60_000,
    refetchInterval: 120_000,  // refresh cada 2 min
  });
}

export function useDashboardSeguridad() {
  return useQuery({
    queryKey: ["dashboards", "seguridad"],
    queryFn:  () => apiGet<SeguridadData>("/dashboards/seguridad"),
    staleTime: 60_000,
  });
}

export function useTopAuditores(limit = 10) {
  return useQuery({
    queryKey: ["dashboards", "top-auditores", limit],
    queryFn:  () => apiGet<TopAuditor[]>(`/dashboards/top-auditores?limit=${limit}`),
    staleTime: 120_000,
  });
}
