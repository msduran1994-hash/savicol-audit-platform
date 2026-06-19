// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Desempeño de Auditores (consolidación automática de fuentes reales)
// Lee el desempeño desde las hojas que YA tienen datos por auditor en el backend:
//   - Cronograma 2026 (/cronograma): actividades planificadas y completadas
//   - Rutas (/rutas/dashboard): acompañamientos en ruta
//   - CEDIS (/cedis/auditorias/list): auditorías de centros de distribución
// No usa registro manual; cada fuente se muestra por separado (sin promediar).
// Granjas no expone auditor por hallazgo en el backend, por eso no se atribuye.
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

// ── Catálogo oficial de auditores (los seis del equipo) ──
export const AUDITORES = [
  "Michael Duran",
  "Kerling Hernandez",
  "Hilary Basto",
  "Jaider Gonzalez",
  "Alexander Tellez",
  "Ivan Bonilla",
] as const;

// Normaliza variantes de nombres entre fuentes (acentos, apellidos con s/z)
export function normalizarAuditor(nombre?: string | null): string | null {
  if (!nombre) return null;
  const limpio = nombre.trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const mapa: Record<string, string> = {
    "michael duran": "Michael Duran",
    "kerling hernandez": "Kerling Hernandez",
    "hilary basto": "Hilary Basto",
    "jaider gonzalez": "Jaider Gonzalez",
    "jaider gonzales": "Jaider Gonzalez",
    "alexander tellez": "Alexander Tellez",
    "ivan bonilla": "Ivan Bonilla",
  };
  if (mapa[limpio]) return mapa[limpio];
  for (const a of AUDITORES) {
    const an = a.toLowerCase();
    if (limpio.includes(an) || an.includes(limpio)) return a;
    const [n1, ap1] = an.split(" ");
    if (limpio.includes(n1) && ap1 && limpio.includes(ap1)) return a;
  }
  return null;
}

interface CronogramaItem {
  id: string; area: string; auditorName: string; activity: string;
  activityType: string; status: string; startDate: string; endDate: string;
}
interface Acompanamiento {
  id: string; auditorNombre: string; estado: string; criticidad?: string;
  motivo?: string; fecha: string;
}
interface AuditoriaCedi {
  id: string; auditorNombre?: string; estado?: string; fecha?: string;
}
interface HallazgoGranja {
  id: string; auditorNombre?: string; auditorId?: string; estado?: string;
  criticidad?: string; granjaId?: string;
}
interface KpiGranja {
  id: string; hallazgoId?: string; estado?: string; porcentajeAvance?: number;
}

export interface DesempenoFuente {
  total: number;
  completadas: number;
  enProgreso: number;
  pendientes: number;
  vencidas: number;
  cumplimiento: number;
}
// Granjas tiene métricas propias: hallazgos detectados (volumen) y % cerrados,
// más KPIs de cumplimiento atribuibles vía el hallazgo de origen.
export interface DesempenoGranjas {
  hallazgos: number;        // total de hallazgos detectados por el auditor
  cerrados: number;         // hallazgos cerrados
  criticos: number;         // hallazgos críticos/altos
  pctCerrados: number;      // % cerrados sobre el total
  kpis: number;             // KPIs atribuibles (vía hallazgo)
  kpisCompletados: number;  // KPIs completados
  avanceKpi: number;        // % avance promedio de sus KPIs
}
export interface DesempenoAuditor {
  auditor: string;
  cronograma: DesempenoFuente;
  rutas: DesempenoFuente;
  cedis: DesempenoFuente;
  granjas: DesempenoGranjas;
  totalActividades: number;
}

function fuenteVacia(): DesempenoFuente {
  return { total: 0, completadas: 0, enProgreso: 0, pendientes: 0, vencidas: 0, cumplimiento: 0 };
}
function granjasVacia(): DesempenoGranjas {
  return { hallazgos: 0, cerrados: 0, criticos: 0, pctCerrados: 0, kpis: 0, kpisCompletados: 0, avanceKpi: 0 };
}
function pct(comp: number, total: number) { return total ? Math.round((comp / total) * 100) : 0; }

export function useDesempenoAuditores() {
  const cronogramaQ = useQuery({
    queryKey: ["desempeno-cronograma"],
    queryFn: () => apiGet<CronogramaItem[]>("/cronograma"),
    staleTime: 60_000,
  });
  const rutasQ = useQuery({
    queryKey: ["desempeno-rutas"],
    queryFn: () => apiGet<{ acompanamientos: Acompanamiento[] }>("/rutas/dashboard"),
    staleTime: 60_000,
  });
  const cedisQ = useQuery({
    queryKey: ["desempeno-cedis-aud"],
    queryFn: () => apiGet<AuditoriaCedi[]>("/cedis/auditorias/list"),
    staleTime: 60_000,
  });
  const hallazgosGranjaQ = useQuery({
    queryKey: ["desempeno-granjas-hallazgos"],
    queryFn: () => apiGet<HallazgoGranja[]>("/granjas/hallazgos/list"),
    staleTime: 60_000,
  });
  const kpisGranjaQ = useQuery({
    queryKey: ["desempeno-granjas-kpis"],
    queryFn: () => apiGet<KpiGranja[]>("/granjas/kpis/list"),
    staleTime: 60_000,
  });

  const isLoading = cronogramaQ.isLoading || rutasQ.isLoading || cedisQ.isLoading
    || hallazgosGranjaQ.isLoading || kpisGranjaQ.isLoading;
  const cronograma = cronogramaQ.data ?? [];
  const acompanamientos = rutasQ.data?.acompanamientos ?? [];
  const auditoriasCedi = cedisQ.data ?? [];
  const hallazgosGranja = hallazgosGranjaQ.data ?? [];
  const kpisGranja = kpisGranjaQ.data ?? [];

  const porAuditor: Record<string, DesempenoAuditor> = {};
  for (const a of AUDITORES) {
    porAuditor[a] = {
      auditor: a, cronograma: fuenteVacia(), rutas: fuenteVacia(), cedis: fuenteVacia(),
      granjas: granjasVacia(),
      totalActividades: 0,
    };
  }

  // 1) Cronograma 2026
  for (const c of cronograma) {
    const a = normalizarAuditor(c.auditorName);
    if (!a || !porAuditor[a]) continue;
    const f = porAuditor[a].cronograma;
    f.total += 1;
    const st = (c.status ?? "").toUpperCase();
    if (st === "COMPLETED") f.completadas += 1;
    else if (st === "IN_PROGRESS") f.enProgreso += 1;
    else if (st === "OVERDUE") f.vencidas += 1;
    else f.pendientes += 1;
  }

  // 2) Rutas
  for (const ac of acompanamientos) {
    const a = normalizarAuditor(ac.auditorNombre);
    if (!a || !porAuditor[a]) continue;
    const f = porAuditor[a].rutas;
    f.total += 1;
    const st = (ac.estado ?? "").toUpperCase();
    if (st === "COMPLETADO" || st === "COMPLETED" || st === "CERRADO") f.completadas += 1;
    else if (st === "EN_PROGRESO" || st === "IN_PROGRESS") f.enProgreso += 1;
    else f.pendientes += 1;
  }

  // 3) CEDIS
  for (const au of auditoriasCedi) {
    const nombre = au.auditorNombre ?? "";
    const asignados = AUDITORES.filter(a => {
      const an = a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const nm = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const [n1, ap1] = an.split(" ");
      return nm.includes(an) || (nm.includes(n1) && !!ap1 && nm.includes(ap1));
    });
    for (const a of asignados) {
      const f = porAuditor[a].cedis;
      f.total += 1;
      const st = (au.estado ?? "").toUpperCase();
      if (st === "COMPLETADA" || st === "COMPLETED" || st === "CERRADA" || st === "") f.completadas += 1;
      else f.pendientes += 1;
    }
  }

  // 4) Granjas: hallazgos detectados por auditor (volumen + % cerrados)
  const hallazgoAuditor: Record<string, string> = {}; // hallazgoId -> auditor (para vincular KPIs)
  for (const h of hallazgosGranja) {
    const a = normalizarAuditor(h.auditorNombre);
    if (h.id && a) hallazgoAuditor[h.id] = a;
    if (!a || !porAuditor[a]) continue;
    const g = porAuditor[a].granjas;
    g.hallazgos += 1;
    const st = (h.estado ?? "").toUpperCase();
    if (st === "CERRADO" || st === "CERRADA" || st === "RESUELTO") g.cerrados += 1;
    const cr = (h.criticidad ?? "").toUpperCase();
    if (cr === "CRITICA" || cr === "ALTA") g.criticos += 1;
  }

  // 5) KPIs de granjas: atribuibles al auditor vía el hallazgo de origen
  const avanceAcum: Record<string, number> = {};
  for (const k of kpisGranja) {
    const a = k.hallazgoId ? hallazgoAuditor[k.hallazgoId] : undefined;
    if (!a || !porAuditor[a]) continue; // 87 de 100 quedan sin atribuir (no contaminan)
    const g = porAuditor[a].granjas;
    g.kpis += 1;
    const av = Number(k.porcentajeAvance) || 0;
    avanceAcum[a] = (avanceAcum[a] ?? 0) + av;
    const st = (k.estado ?? "").toUpperCase();
    if (st === "COMPLETADO" || st === "CUMPLIDO" || st === "CERRADO" || av >= 100) g.kpisCompletados += 1;
  }

  const desempeno: DesempenoAuditor[] = Object.values(porAuditor).map(d => {
    d.cronograma.cumplimiento = pct(d.cronograma.completadas, d.cronograma.total);
    d.rutas.cumplimiento = pct(d.rutas.completadas, d.rutas.total);
    d.cedis.cumplimiento = pct(d.cedis.completadas, d.cedis.total);
    d.granjas.pctCerrados = pct(d.granjas.cerrados, d.granjas.hallazgos);
    d.granjas.avanceKpi = d.granjas.kpis ? Math.round((avanceAcum[d.auditor] ?? 0) / d.granjas.kpis) : 0;
    d.totalActividades = d.cronograma.total + d.rutas.total + d.cedis.total + d.granjas.hallazgos;
    return d;
  });

  // KPIs no atribuibles a ningún auditor (no se inventan: se reportan aparte)
  const kpisAtribuidos = Object.values(porAuditor).reduce((a, d) => a + d.granjas.kpis, 0);

  const totales = {
    cronograma: cronograma.length,
    rutas: acompanamientos.length,
    cedis: auditoriasCedi.length,
    hallazgosGranja: hallazgosGranja.length,
    kpisGranja: kpisGranja.length,
    kpisAtribuidos,
    kpisSinAtribuir: kpisGranja.length - kpisAtribuidos,
    cumplimientoCronograma: pct(
      cronograma.filter(c => (c.status ?? "").toUpperCase() === "COMPLETED").length,
      cronograma.length
    ),
  };

  return { desempeno, totales, isLoading };
}
