// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Dashboard Ejecutivo Cronograma
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

export interface CronogramaFilters {
  year?: number;
  auditorId?: string;
  status?: string;
  mes?: number;
  area?: string;
  activityType?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  cumplimientoMin?: number;
  cumplimientoMax?: number;
}

export interface ExecutiveKpis {
  actividadesPlanificadas:        number;
  actividadesCompletadas:         number;
  actividadesEnCurso:             number;
  actividadesNoIniciadas:         number;
  actividadesVencidas:            number;
  actividadesReprogramadas:       number;
  porcentajeCumplimientoGeneral:  number;
  avanceAcumuladoPonderado:       number;
  totalAreasAuditadas:            number;
  totalHallazgos:                 number;
  totalIncidencias:               number;
  indiceCalidadCronograma:        number;
  indiceEjecucionOperativa:       number;
  coberturaAuditoria:             number;
  cumplimientoPromedioAuditor:    number;
}

export interface ExecutiveResponse {
  timestamp: string;
  filters:   CronogramaFilters;
  kpis:      ExecutiveKpis;
  charts: {
    distribucionEstado: Array<{ name: string; value: number; color: string }>;
    cumplimientoMes:   Array<{ mes: string; mesNum: number; Planificadas: number; Completadas: number; Cumplimiento: number }>;
    tendenciaMes:      Array<{ mes: string; AcumPlanificadas: number; AcumEjecutadas: number; Variacion: number }>;
    ranking:           Array<{ auditorId: string; auditorName: string; totalAssigned: number; completed: number; inProgress: number; overdue: number; completionRate: number; score: number }>;
    distribucionAreas: Array<{ area: string; areaFull: string; Actividades: number; Completadas: number; Cumplimiento: number }>;
    matrizRiesgo:      Array<{ id: string; actividad: string; area: string; auditor: string; fechaCompromiso: string; diasVencimiento: number; impacto: string; probabilidad: number; status: string }>;
  };
  alertas: Array<{
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
    type: string; title: string; description: string; count?: number;
  }>;
  trazabilidad: Array<{
    id: string; item: number; actividad: string; area: string;
    responsable: string; tipo: string; fechaInicio: string;
    fechaCompromiso: string; status: string; cumplimiento: number; notas?: string;
  }>;
  calidadDatos: {
    total: number; issuesTotal: number; score: number;
    camposVacios: { sinNotas: number; sinAuditorAsignado: number; sinFechas: number };
    duplicados: number;
    inconsistenciasFechas: number;
    fechasFueraDeAnio: number;
  };
  resumenHeuristico: {
    resumen: string[];
    recomendaciones: string[];
    estado: "EXCELENTE" | "ACEPTABLE" | "REGULAR" | "CRITICO";
  };
  meta: { actividadesFiltradas: number; auditoresFiltrados: number };
}

export interface AiSummaryResponse {
  mode: "claude" | "heuristic";
  resumen: string[];
  recomendaciones: string[];
  riesgos: string[];
  oportunidades: string[];
  generadoEn: string;
}

export function useCronogramaExecutive(filters: CronogramaFilters) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v != null && v !== "") qs.append(k, String(v));
  });
  return useQuery({
    queryKey: ["cronograma-executive", filters],
    queryFn:  () => apiGet<ExecutiveResponse>(`/audit-activities/executive?${qs}`),
    staleTime: 30_000,
  });
}

export function useCronogramaAiSummary(filters: CronogramaFilters, enabled = false) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v != null && v !== "") qs.append(k, String(v));
  });
  return useQuery({
    queryKey: ["cronograma-ai", filters],
    queryFn:  () => apiGet<AiSummaryResponse>(`/audit-activities/ai-summary?${qs}`),
    enabled,
    staleTime: 5 * 60_000,
  });
}
