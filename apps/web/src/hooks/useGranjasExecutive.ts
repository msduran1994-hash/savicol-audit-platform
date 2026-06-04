// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Granjas Executive Dashboard + mutations completas (delete)
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiDelete, apiPatch } from "@/lib/api";

export interface GranjasFilters {
  year?: number;
  granjaId?: string;
  auditorId?: string;
  tipoGranja?: string;
  tipoOperativo?: string;
  estado?: string;
  criticidad?: string;
  tipoRiesgo?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  mes?: number;
}

export interface GranjasExecutiveResponse {
  timestamp: string;
  filters: GranjasFilters;
  kpis: {
    totalGranjas: number; granjasActivas: number; granjasCuarentena: number;
    granjasRiesgoAlto: number; granjasSanidadCrit: number;
    granjasPropia: number; granjasArrendada: number; granjasIntegrada: number;
    granjasEngorde: number; granjasReproductora: number; capacidadTotal: number;
    totalAuditorias: number; auditoresActivos: number;
    totalHallazgos: number; hallazgosCriticos: number; hallazgosAltos: number;
    hallazgosAbiertos: number; hallazgosCerrados: number;
    totalKPIs: number; kpisCompletados: number; kpisEnCurso: number;
    cumplimientoKPI: number; avancePromedio: number; tasaResolucion: number;
  };
  charts: {
    hallazgosPorCategoria: Array<{ categoria: string; count: number }>;
    diagnosticoFecha:      Array<{ fecha: string; count: number }>;
    distribucionTipo:      Array<{ tipo: string; count: number; color: string }>;
    lineaProductiva:       Array<{ linea: string; count: number; color: string }>;
    auditores:             Array<{ auditorId: string; auditorNombre: string; visitas: number; hallazgos: number; criticos: number; score: number }>;
    tendenciaMes:          Array<{ mes: string; Visitas: number; Hallazgos: number; Criticos: number }>;
    matrizCriticidad:      Array<{ criticidad: string; count: number }>;
    granjasProduccion:     Array<{ granjaId: string; codigo: string; nombre: string; region: string; capacidad: number; tipoGranja: string; tipoOperativo: string }>;
  };
  alertas: Array<{ severity: string; type: string; title: string; description: string; count?: number }>;
  trazabilidad: Array<any>;
  calidadDatos: { totalRegistros: number; granjasSinVeterinario: number; auditoriasSinFechaEjecutada: number; hallazgosSinResponsable: number; kpisSinResponsable: number; score: number };
  resumenHeuristico: { resumen: string[]; recomendaciones: string[]; estado: string };
  meta: { granjasFiltradas: number; auditoriasFiltradas: number; hallazgosFiltrados: number };
}

export interface GranjasAiResponse {
  mode: "claude" | "heuristic";
  resumen: string[]; recomendaciones: string[]; riesgos: string[]; oportunidades: string[];
  generadoEn: string;
}

export function useGranjasExecutive(filters: GranjasFilters) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== "") qs.append(k, String(v)); });
  return useQuery({
    queryKey: ["granjas-executive", filters],
    queryFn:  () => apiGet<GranjasExecutiveResponse>(`/granjas/executive?${qs}`),
    staleTime: 30_000,
  });
}

export function useGranjasAiSummary(filters: GranjasFilters, enabled = false) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== "") qs.append(k, String(v)); });
  return useQuery({
    queryKey: ["granjas-ai", filters],
    queryFn:  () => apiGet<GranjasAiResponse>(`/granjas/ai-summary?${qs}`),
    enabled,
    staleTime: 5 * 60_000,
  });
}

// ── Mutations · delete + updateAuditoria ──
function invalidateGranjasQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["granjas"] });
  qc.invalidateQueries({ queryKey: ["hallazgos"] });
  qc.invalidateQueries({ queryKey: ["kpis"] });
  qc.invalidateQueries({ queryKey: ["auditorias-granjas"] });
  qc.invalidateQueries({ queryKey: ["granjas-executive"] });
  qc.invalidateQueries({ queryKey: ["granjas-dashboard"] });
  qc.invalidateQueries({ queryKey: ["granjas-ai"] });
}

export function useDeleteHallazgoGranja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/granjas/hallazgos/${id}`),
    onSuccess: () => invalidateGranjasQueries(qc),
  });
}

export function useDeleteKpiGranja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/granjas/kpis/${id}`),
    onSuccess: () => invalidateGranjasQueries(qc),
  });
}

export function useUpdateAuditoriaGranja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => apiPatch<any>(`/granjas/auditorias/${id}`, patch),
    onSuccess: () => invalidateGranjasQueries(qc),
  });
}

export function useDeleteAuditoriaGranja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/granjas/auditorias/${id}`),
    onSuccess: () => invalidateGranjasQueries(qc),
  });
}
