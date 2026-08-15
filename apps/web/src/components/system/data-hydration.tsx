"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// DataHydration · Sincroniza datos del API → Zustand stores
// ═══════════════════════════════════════════════════════════════════════════════
// Se monta una sola vez en el (dashboard)/layout.
// Cuando el usuario está autenticado, dispara queries a los endpoints de cada
// módulo y empuja los resultados a los stores locales.
// El UI sigue leyendo de Zustand (sin cambios), pero el origen de los datos
// pasa a ser el backend.
//
// Adaptaciones:
//   - tiposRiesgo / riesgosAsociados: API entrega JSON string → parseamos a array
//   - granjaNombre / clienteNombre / etc: aplanamos relations
// ═══════════════════════════════════════════════════════════════════════════════
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useGranjasStore } from "@/store/granjas.store";
import { useRutasStore } from "@/store/rutas.store";
import { useAuditStore } from "@/store/audit.store";
import {
  useGranjas, useHallazgos, useKPIs, useAuditorias, useActividadGranjas,
} from "@/hooks/useGranjas";
import {
  useAcompanamientos, useAccionesCumplimiento,
} from "@/hooks/useRutas";
import { useCedis, useAuditoriasCedi, useHallazgosCedi } from "@/hooks/useCedis";
import { useCedisStore } from "@/store/cedis.store";
import { useActivities } from "@/hooks/useAuditActivities";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function safeParseArray(s: any): string[] {
  if (Array.isArray(s)) return s;
  if (typeof s !== "string") return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}

// Normaliza fecha ISO a YYYY-MM-DD
function toDateOnly(d: any): string {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  try { return new Date(d).toISOString().slice(0, 10); } catch { return ""; }
}

// Convierte enums UPPER_SNAKE a "Title Case" para display
const enumToLabel = (s: string) =>
  s.toLowerCase().split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

// Tabla de mapeo específica para enums conocidos
const MOTIVO_LABELS: Record<string, string> = {
  PRODUCTO_VENCIDO:        "Producto Vencido",
  EMPAQUE_DANADO:          "Empaque Dañado",
  CADENA_FRIO_ROTA:        "Cadena de Frío Rota",
  PRODUCTO_NO_SOLICITADO:  "Producto No Solicitado",
  DIFERENCIA_PESO:         "Diferencia de Peso",
  CALIDAD_NO_CONFORME:     "Calidad No Conforme",
  CANTIDAD_EQUIVOCADA:     "Cantidad Equivocada",
  ENTREGA_TARDIA:          "Entrega Tardía",
  CLIENTE_AUSENTE:         "Cliente Ausente",
  OTRO:                    "Otro",
};
const CRITICIDAD_RUTA: Record<string, string> = { CRITICO: "Crítico", ALTO: "Alto", MEDIO: "Medio", BAJO: "Bajo" };
const ESTADO_ACOMP:    Record<string, string> = {
  PROGRAMADO: "Programado", EN_CURSO: "En Curso", COMPLETADO: "Completado",
  CON_HALLAZGOS: "Con Hallazgos", CERRADO: "Cerrado",
};
const TIPO_RIESGO_LABEL: Record<string, string> = {
  LEGAL: "Legal", OPERATIVO: "Operativo", REPUTACIONAL: "Reputacional",
  FINANCIERO: "Financiero", CONTAGIO: "Contagio",
};
const TIPO_GRANJA_LABEL:    Record<string, string> = { ARRENDADA: "Arrendada", PROPIA: "Propia", INTEGRADA: "Integrada" };
const TIPO_OPERATIVO_LABEL: Record<string, string> = { ENGORDE: "Engorde", REPRODUCTORA: "Reproductora" };
const NIVEL_RIESGO_LABEL:   Record<string, string> = { BAJO: "Bajo", MEDIO: "Medio", ALTO: "Alto" };
const ESTADO_SANITARIO_LABEL: Record<string, string> = { OPTIMO: "Óptimo", ALERTA: "Alerta", CRITICO: "Crítico" };
const ESTADO_GRANJA_LABEL:  Record<string, string> = { ACTIVA: "Activa", INACTIVA: "Inactiva", CUARENTENA: "Cuarentena" };
const CRITICIDAD_HALLAZGO:  Record<string, string> = { BAJA: "Baja", MEDIA: "Media", ALTA: "Alta", CRITICA: "Crítica" };
const CATEGORIA_HALLAZGO_LABEL: Record<string, string> = {
  AMBIENTAL: "Ambiental", BIOSEGURIDAD: "Bioseguridad", SANITARIO: "Sanitario",
  FINANCIERO: "Financiero", DOCUMENTAL: "Documental", MORTALIDAD: "Mortalidad",
  INVENTARIO_INSUMOS: "Inventario Insumos", INFRAESTRUCTURA: "Infraestructura", OPERATIVO: "Operativo",
};
const ESTADO_HALLAZGO_LABEL: Record<string, string> = {
  ABIERTO: "Abierto", EN_PLAN: "En Plan", CERRADO: "Cerrado", VERIFICADO: "Verificado",
};
const ESTADO_KPI_LABEL: Record<string, string> = {
  NO_INICIADO: "No Iniciado", EN_CURSO: "En Curso", EN_ESPERA: "En Espera", COMPLETADO: "Completado",
};

const labelOf = (v: any, dict: Record<string, string>) =>
  typeof v === "string" && dict[v] ? dict[v] : v;

// ─── HYDRATION HOOK INDIVIDUAL ───────────────────────────────────────────────
function useHydratePlatform() {
  const { data } = useActivities();
  const hydrateActivities = useAuditStore((s) => s.hydrateActivities);

  useEffect(() => {
    if (!data) return;
    hydrateActivities(
      data.map((a: any) => ({
        ...a,
        startDate: typeof a.startDate === "string" ? a.startDate : new Date(a.startDate).toISOString(),
        endDate:   typeof a.endDate   === "string" ? a.endDate   : new Date(a.endDate).toISOString(),
        createdAt: typeof a.createdAt === "string" ? a.createdAt : new Date(a.createdAt).toISOString(),
        updatedAt: typeof a.updatedAt === "string" ? a.updatedAt : new Date(a.updatedAt).toISOString(),
      }))
    );
  }, [data, hydrateActivities]);
}

function useHydrateGranjas() {
  const granjasQ    = useGranjas();
  const hallazgosQ  = useHallazgos();
  const kpisQ       = useKPIs();
  const auditoriasQ = useAuditorias();
  const actividadQ  = useActividadGranjas(80);

  const setGranjas    = useGranjasStore((s) => s.setGranjas);
  const setHallazgos  = useGranjasStore((s) => s.setHallazgos);
  const setKPIs       = useGranjasStore((s) => s.setKPIs);
  const setAuditorias = useGranjasStore((s) => s.setAuditorias);
  const setActividad  = useGranjasStore((s) => s.setActividad);

  useEffect(() => {
    if (!granjasQ.data) return;
    // FIX: limpiar datos _demo antes de cargar datos reales del API
    // Garantiza que granjas demo hardcodeadas no persistan entre sesiones
    setGranjas([]); // reset previo para evitar merge con datos anteriores
    const mapped = granjasQ.data.map((g: any) => ({
      ...g,
      tipoGranja:      labelOf(g.tipoGranja,      TIPO_GRANJA_LABEL),
      tipoOperativo:   labelOf(g.tipoOperativo,   TIPO_OPERATIVO_LABEL),
      nivelRiesgo:     labelOf(g.nivelRiesgo,     NIVEL_RIESGO_LABEL),
      estadoSanitario: labelOf(g.estadoSanitario, ESTADO_SANITARIO_LABEL),
      estado:          labelOf(g.estado,          ESTADO_GRANJA_LABEL),
    }));
    setGranjas(mapped as any);
  }, [granjasQ.data, setGranjas]);

  useEffect(() => {
    if (!hallazgosQ.data) return;
    const mapped = hallazgosQ.data.map((h: any) => ({
      ...h,
      granjaNombre:  h.granja?.nombre ?? h.granjaNombre ?? "—",
      tiposRiesgo:   safeParseArray(h.tiposRiesgo).map(r => labelOf(r, TIPO_RIESGO_LABEL)),
      categoria:     labelOf(h.categoria,     CATEGORIA_HALLAZGO_LABEL),
      criticidad:    labelOf(h.criticidad,    CRITICIDAD_HALLAZGO),
      estado:        labelOf(h.estado,        ESTADO_HALLAZGO_LABEL),
      tipoGranja:    labelOf(h.tipoGranja,    TIPO_GRANJA_LABEL),
      tipoOperativo: labelOf(h.tipoOperativo, TIPO_OPERATIVO_LABEL),
      fechaVisita:   toDateOnly(h.fechaVisita),
    }));
    setHallazgos(mapped);
  }, [hallazgosQ.data, setHallazgos]);

  useEffect(() => {
    if (!kpisQ.data) return;
    const mapped = kpisQ.data.map((k: any) => ({
      ...k,
      estado:             labelOf(k.estado, ESTADO_KPI_LABEL),
      fechaCompromiso:    toDateOnly(k.fechaCompromiso),
      fechaCumplimiento:  k.fechaCumplimiento  ? toDateOnly(k.fechaCumplimiento)  : undefined,
      fechaProximaVisita: k.fechaProximaVisita ? toDateOnly(k.fechaProximaVisita) : undefined,
      fechaSeguimiento:   k.fechaSeguimiento   ? toDateOnly(k.fechaSeguimiento)   : undefined,
    }));
    setKPIs(mapped as any);
  }, [kpisQ.data, setKPIs]);

  useEffect(() => {
    if (!auditoriasQ.data) return;
    const mapped = auditoriasQ.data.map((a: any) => ({
      ...a,
      granjaNombre:    a.granja?.nombre ?? a.granjaNombre ?? "—",
      fechaProgramada: typeof a.fechaProgramada === "string" ? a.fechaProgramada : new Date(a.fechaProgramada).toISOString().slice(0,10),
    }));
    setAuditorias(mapped);
  }, [auditoriasQ.data, setAuditorias]);

  useEffect(() => {
    if (!actividadQ.data) return;
    setActividad(actividadQ.data as any);
  }, [actividadQ.data, setActividad]);
}

function useHydrateRutas() {
  const acompQ  = useAcompanamientos();
  const accionQ = useAccionesCumplimiento();

  const setAcomp        = useRutasStore((s) => s.setAcompanamientos);
  const setCumplimiento = useRutasStore((s) => s.setCumplimiento);

  useEffect(() => {
    if (!acompQ.data) return;
    const mapped = acompQ.data.map((a: any) => ({
      ...a,
      // Aplanar relaciones
      clienteNombre:   a.cliente?.nombre   ?? a.clienteNombre   ?? "—",
      rutaNombre:      a.ruta?.nombre      ?? a.rutaNombre      ?? "—",
      vehiculoPlaca:   a.vehiculo?.placa   ?? a.vehiculoPlaca   ?? "—",
      conductorNombre: a.conductor?.nombre ?? a.conductorNombre ?? "—",
      auxiliarNombre:  a.auxiliar?.nombre,
      // Parsear array JSON + traducir labels
      riesgosAsociados: safeParseArray(a.riesgosAsociados).map(r => labelOf(r, TIPO_RIESGO_LABEL)),
      motivo:           labelOf(a.motivo,     MOTIVO_LABELS),
      criticidad:       labelOf(a.criticidad, CRITICIDAD_RUTA),
      estado:           labelOf(a.estado,     ESTADO_ACOMP),
      fecha:            toDateOnly(a.fecha),
    }));
    setAcomp(mapped);
  }, [acompQ.data, setAcomp]);

  useEffect(() => {
    if (!accionQ.data) return;
    setCumplimiento(accionQ.data as any);
  }, [accionQ.data, setCumplimiento]);
}

// ─── COMPONENTE ─────────────────────────────────────────────────────────────
export function DataHydration() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);

  // No hidratar si no hay sesión (evita 401 antes de login)
  if (!isAuth) return null;

  return <HydrationRunner />;
}

// ─── HIDRATACIÓN CEDIS ───────────────────────────────────────────────────────
const TIPO_RIESGO_CEDI_LABEL: Record<string, string> = {
  REPUTACIONAL: "Reputacional", FINANCIERO: "Financiero", CONTAGIO: "Contagio",
  OPERATIVO: "Operativo", LEGAL: "Legal",
};
const CRITICIDAD_CEDI_LABEL: Record<string, string> = { CRITICA: "Crítica", ALTA: "Alta", MEDIA: "Media", BAJA: "Baja" };
const ESTADO_HALL_CEDI_LABEL: Record<string, string> = {
  ABIERTO: "Abierto", EN_PLAN: "En Plan", EN_VERIFICACION: "En Verificación",
  CERRADO: "Cerrado", REINCIDENTE: "Reincidente",
};
const CATEGORIA_CEDI_LABEL: Record<string, string> = {
  INVENTARIO: "Inventario", CAJA: "Caja", CARTERA: "Cartera", LOGISTICA: "Logística",
  BIOSEGURIDAD: "Bioseguridad", INFRAESTRUCTURA: "Infraestructura", PROCEDIMIENTOS: "Procedimientos",
};

function useHydrateCedis() {
  const cedisQ      = useCedis();
  const auditoriasQ = useAuditoriasCedi();
  const hallazgosQ  = useHallazgosCedi();

  const setCedis      = useCedisStore((s) => s.setCedis);
  const setAuditorias = useCedisStore((s) => s.setAuditorias);
  const setHallazgos  = useCedisStore((s) => s.setHallazgos);

  useEffect(() => {
    if (!cedisQ.data) return;
    setCedis(cedisQ.data as any);
  }, [cedisQ.data, setCedis]);

  useEffect(() => {
    if (!auditoriasQ.data) return;
    const mapped = auditoriasQ.data.map((a: any) => ({
      ...a,
      cediNombre:  a.cedi?.nombre ?? a.cediNombre ?? "—",
      tipoRiesgo:  labelOf(a.tipoRiesgo, TIPO_RIESGO_CEDI_LABEL),
      criticidad:  labelOf(a.criticidad, CRITICIDAD_CEDI_LABEL),
      estado:      labelOf(a.estado,     ESTADO_HALL_CEDI_LABEL),
      fechaVisita: toDateOnly(a.fechaVisita),
    }));
    setAuditorias(mapped);
  }, [auditoriasQ.data, setAuditorias]);

  useEffect(() => {
    if (!hallazgosQ.data) return;
    const mapped = hallazgosQ.data.map((h: any) => ({
      ...h,
      cediNombre:      h.cedi?.nombre ?? h.cediNombre ?? "—",
      tipoRiesgo:      labelOf(h.tipoRiesgo, TIPO_RIESGO_CEDI_LABEL),
      criticidad:      labelOf(h.criticidad, CRITICIDAD_CEDI_LABEL),
      estado:          labelOf(h.estado,     ESTADO_HALL_CEDI_LABEL),
      categoria:       labelOf(h.categoria,  CATEGORIA_CEDI_LABEL),
      fechaCompromiso: h.fechaCompromiso ? toDateOnly(h.fechaCompromiso) : undefined,
      fechaCierre:     h.fechaCierre     ? toDateOnly(h.fechaCierre)     : undefined,
    }));
    setHallazgos(mapped);
  }, [hallazgosQ.data, setHallazgos]);
}

function HydrationRunner() {
  useHydratePlatform();
  useHydrateGranjas();
  useHydrateRutas();
  useHydrateCedis();
  return null;
}
