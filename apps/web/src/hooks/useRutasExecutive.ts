// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Rutas Executive Dashboard
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

export interface RutasFilters {
  year?: number;
  auditorId?: string;
  rutaId?: string;
  clienteId?: string;
  ciudad?: string;
  estado?: string;
  motivo?: string;
  criticidad?: string;
  mes?: number;
}

export interface RutasExecutiveResponse {
  timestamp: string;
  filters: RutasFilters;
  kpis: {
    totalAcompanamientos: number;
    programados: number; enCurso: number; completados: number;
    conHallazgos: number; cerrados: number;
    criticos: number; altos: number;
    indiceCriticidad: number;
    totalValorDevueltoCOP: number; totalKgDevueltos: number;
    clientesUnicos: number; rutasUnicas: number; auditoresActivos: number;
    accionesGeneradas: number; accionesCerradas: number;
    tasaCierreAcciones: number; tasaResolucion: number;
  };
  charts: {
    heatmap: Array<{ ruta: string; rutaId: string; mes: number; mesLabel: string; count: number; valor: number }>;
    auditores: Array<{ auditorId: string; auditorNombre: string; total: number; criticos: number; valor: number; participacion: number }>;
    clientesRanking: Array<{ clienteId: string; nombre: string; ciudad: string; tipo: string; total: number; valor: number; kg: number; participacion: number }>;
    paretoMotivos: Array<{ motivo: string; count: number; valor: number; participacion: number; acumulado: number }>;
    motivosPorRuta: Array<Record<string, any>>;
    matrizCriticidad: Array<{ criticidad: string; impactoLabel: string; count: number; valor: number }>;
    tendenciaMes: Array<{ mes: string; mesNum: number; Acompañamientos: number; Criticos: number; ValorCOP: number }>;
    distribucionCiudades: Array<{ ciudad: string; count: number }>;
  };
  alertas: Array<{ severity: string; type: string; title: string; description: string; count?: number }>;
  trazabilidad: Array<any>;
  calidadDatos: { total: number; sinCliente: number; sinRuta: number; sinObservacion: number; sinValor: number; sinKg: number; score: number };
  resumenHeuristico: { resumen: string[]; recomendaciones: string[]; estado: string };
  meta: { actividadesFiltradas: number; rutasConActividad: number };
}

export interface RutasAiResponse {
  mode: "claude" | "heuristic";
  resumen: string[];
  recomendaciones: string[];
  riesgos: string[];
  oportunidades: string[];
  generadoEn: string;
}

export function useRutasExecutive(filters: RutasFilters) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== "") qs.append(k, String(v)); });
  return useQuery({
    queryKey: ["rutas-executive", filters],
    queryFn:  () => apiGet<RutasExecutiveResponse>(`/rutas/executive?${qs}`),
    staleTime: 30_000,
  });
}

export function useRutasAiSummary(filters: RutasFilters, enabled = false) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== "") qs.append(k, String(v)); });
  return useQuery({
    queryKey: ["rutas-ai", filters],
    queryFn:  () => apiGet<RutasAiResponse>(`/rutas/ai-summary?${qs}`),
    enabled,
    staleTime: 5 * 60_000,
  });
}
