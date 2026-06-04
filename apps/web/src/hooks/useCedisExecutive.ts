// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · CEDIS Executive Dashboard
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

export interface CedisFilters {
  year?: number;
  cediId?: string;
  subtema?: string;
  auditorId?: string;
  categoria?: string;
  criticidad?: string;
  estado?: string;
  tipoRiesgo?: string;
  mes?: number;
}

export interface CedisExecResponse {
  timestamp: string;
  filters: CedisFilters;
  kpis: {
    totalAuditorias: number;
    totalHallazgos: number;
    cedisAuditados: number;
    coberturaPercent: number;
    criticos: number; altos: number;
    hallazgosAbiertos: number; hallazgosEnPlan: number;
    hallazgosEnVerificacion: number; hallazgosCerrados: number;
    hallazgosReincidentes: number;
    indiceCriticidad: number; avancePromedio: number;
    tasaResolucion: number; auditoresActivos: number;
  };
  charts: {
    cumplimientoCedi:    Array<{ cediId: string; cediNombre: string; ciudad: string; auditorias: number; hallazgos: number; cerrados: number; criticos: number; cumplimiento: number }>;
    cumplimientoSubtema: Array<{ subtema: string; hallazgos: number; cerrados: number; criticos: number; cumplimiento: number; avance: number }>;
    hallazgosPorCategoria: Array<{ categoria: string; count: number }>;
    heatmap: Array<{ subtema: string; cediId: string; cediNombre: string; count: number; criticos: number }>;
    tendenciaMes: Array<{ mes: string; Auditorias: number; Hallazgos: number; Criticos: number }>;
    hallazgosRecurrentes: Array<{ titulo: string; count: number }>;
    matrizRiesgo: Array<{ tipoRiesgo: string; criticidad: string; count: number }>;
    semaforizacion: Array<{ label: string; value: number; target: number; status: "RED" | "YELLOW" | "GREEN" }>;
  };
  alertas: Array<{ severity: string; type: string; title: string; description: string }>;
  trazabilidad: Array<any>;
  calidadDatos: { totalAuditorias: number; totalHallazgos: number; sinSubtema: number; sinResponsable: number; sinPlanAccion: number; score: number };
  resumenHeuristico: { resumen: string[]; recomendaciones: string[]; estado: string };
  meta: { auditoriasFiltradas: number; hallazgosFiltrados: number };
}

export interface CedisAiResponse {
  mode: "claude" | "heuristic";
  resumen: string[]; recomendaciones: string[]; riesgos: string[]; oportunidades: string[];
  generadoEn: string;
}

export function useCedisExecutive(filters: CedisFilters) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== "") qs.append(k, String(v)); });
  return useQuery({
    queryKey: ["cedis-executive", filters],
    queryFn:  () => apiGet<CedisExecResponse>(`/cedis/executive?${qs}`),
    staleTime: 30_000,
  });
}

export function useCedisAiSummary(filters: CedisFilters, enabled = false) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== "") qs.append(k, String(v)); });
  return useQuery({
    queryKey: ["cedis-ai", filters],
    queryFn:  () => apiGet<CedisAiResponse>(`/cedis/ai-summary?${qs}`),
    enabled,
    staleTime: 5 * 60_000,
  });
}
