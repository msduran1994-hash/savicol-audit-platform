// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO GRANJAS — Zustand Store con datos DEMO
// ═══════════════════════════════════════════════════════════════════════════════
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEMO_MODE, VETERINARIOS_DEMO } from "../lib/granjas.constants";
import type {
  Granja, Auditoria, Hallazgo, KPI, InventarioItem,
  DocumentoGranja, ActividadLog,
} from "../lib/granjas.types";
import { apiPost, apiPatch, apiDelete } from "../lib/api";
import {
  TIPO_GRANJA_TO_DB, TIPO_OPERATIVO_TO_DB, NIVEL_RIESGO_TO_DB,
  ESTADO_SANITARIO_TO_DB, ESTADO_GRANJA_TO_DB, toDB,
} from "../lib/enum-labels";

// Normaliza Display → DB para enviar al API
function granjaToDB(g: Partial<Granja>): any {
  return {
    ...g,
    ...(g.tipoGranja      && { tipoGranja:      toDB(g.tipoGranja,      TIPO_GRANJA_TO_DB) }),
    ...(g.tipoOperativo   && { tipoOperativo:   toDB(g.tipoOperativo,   TIPO_OPERATIVO_TO_DB) }),
    ...(g.nivelRiesgo     && { nivelRiesgo:     toDB(g.nivelRiesgo,     NIVEL_RIESGO_TO_DB) }),
    ...(g.estadoSanitario && { estadoSanitario: toDB(g.estadoSanitario, ESTADO_SANITARIO_TO_DB) }),
    ...(g.estado          && { estado:          toDB(g.estado,          ESTADO_GRANJA_TO_DB) }),
  };
}

// ─── DATOS DEMO (todos marcados con _demo: true) ─────────────────────────────
const GRANJAS_DEMO: Granja[] = !DEMO_MODE ? [] : [
  {
    id: "DEMO_GRJ_001",
    codigo: "SAVICOL-ANT-001",
    nombre: "Granja San José",
    estado: "Activa",
    region: "Antioquia",
    vereda: "El Carmen",
    ubicacionGoogleMaps: "https://maps.google.com/?q=6.2442,-75.5812",
    administrador: "Carlos Restrepo Mejía",
    tecnicoVeterinarioId: "VET-01",
    telefono: "+57 300 123 4567",
    tipoGranja: "Propia",
    tipoOperativo: "Engorde",
    nivelRiesgo: "Bajo",
    capacidadAves: 24000,
    estadoSanitario: "Óptimo",
    notas: "Granja modelo con certificación ICA vigente",
    createdAt: "2026-01-15T08:00:00Z",
    updatedAt: "2026-05-20T12:30:00Z",
    _demo: true,
  },
  {
    id: "DEMO_GRJ_002",
    codigo: "SAVICOL-CUN-002",
    nombre: "Granja La Esperanza",
    estado: "Activa",
    region: "Cundinamarca",
    vereda: "San Francisco",
    administrador: "Marisol Vargas Caicedo",
    tecnicoVeterinarioId: "VET-02",
    telefono: "+57 311 234 5678",
    tipoGranja: "Integrada",
    tipoOperativo: "Reproductora",
    nivelRiesgo: "Medio",
    capacidadAves: 18500,
    estadoSanitario: "Alerta",
    notas: "Lote anterior con incidente sanitario menor",
    createdAt: "2026-02-08T09:15:00Z",
    updatedAt: "2026-05-22T14:00:00Z",
    _demo: true,
  },
  {
    id: "DEMO_GRJ_003",
    codigo: "SAVICOL-SAN-003",
    nombre: "Granja Los Almendros",
    estado: "Activa",
    region: "Santander",
    vereda: "Vereda La Pradera",
    administrador: "Jaime Andrés Quiroga",
    tecnicoVeterinarioId: "VET-03",
    telefono: "+57 322 345 6789",
    tipoGranja: "Arrendada",
    tipoOperativo: "Engorde",
    nivelRiesgo: "Alto",
    capacidadAves: 32000,
    estadoSanitario: "Crítico",
    notas: "Requiere intervención inmediata sanitaria",
    createdAt: "2026-01-20T10:30:00Z",
    updatedAt: "2026-05-25T09:45:00Z",
    _demo: true,
  },
  {
    id: "DEMO_GRJ_004",
    codigo: "SAVICOL-BOY-004",
    nombre: "Granja El Mirador",
    estado: "Activa",
    region: "Boyacá",
    vereda: "Tres Esquinas",
    administrador: "Liliana Patricia Bohórquez",
    tecnicoVeterinarioId: "VET-04",
    telefono: "+57 318 456 7890",
    tipoGranja: "Propia",
    tipoOperativo: "Reproductora",
    nivelRiesgo: "Bajo",
    capacidadAves: 28000,
    estadoSanitario: "Óptimo",
    createdAt: "2026-02-12T11:00:00Z",
    updatedAt: "2026-05-18T15:20:00Z",
    _demo: true,
  },
  {
    id: "DEMO_GRJ_005",
    codigo: "SAVICOL-VAL-005",
    nombre: "Granja Villa María",
    estado: "Cuarentena",
    region: "Valle del Cauca",
    vereda: "El Naranjo",
    administrador: "Roberto Carlos Salinas",
    tecnicoVeterinarioId: "VET-01",
    telefono: "+57 305 567 8901",
    tipoGranja: "Integrada",
    tipoOperativo: "Engorde",
    nivelRiesgo: "Alto",
    capacidadAves: 22000,
    estadoSanitario: "Crítico",
    notas: "Cuarentena preventiva por brote en granjas vecinas",
    createdAt: "2026-03-01T08:45:00Z",
    updatedAt: "2026-05-26T16:00:00Z",
    _demo: true,
  },
  {
    id: "DEMO_GRJ_006",
    codigo: "SAVICOL-TOL-006",
    nombre: "Granja San Pedro",
    estado: "Activa",
    region: "Tolima",
    vereda: "La Florida",
    administrador: "Diego Mauricio Cifuentes",
    tecnicoVeterinarioId: "VET-02",
    telefono: "+57 313 678 9012",
    tipoGranja: "Arrendada",
    tipoOperativo: "Engorde",
    nivelRiesgo: "Medio",
    capacidadAves: 19500,
    estadoSanitario: "Alerta",
    createdAt: "2026-02-25T13:20:00Z",
    updatedAt: "2026-05-15T10:30:00Z",
    _demo: true,
  },
];

const HALLAZGOS_DEMO: Hallazgo[] = !DEMO_MODE ? [] : [
  {
    id: "DEMO_HAL_001",
    titulo: "Pediluvio inoperativo en galpón 3",
    granjaId: "DEMO_GRJ_003",
    granjaNombre: "Granja Los Almendros",
    auditorId: "MD",
    auditorNombre: "Michael Duran",
    tipoGranja: "Arrendada",
    tipoOperativo: "Engorde",
    fechaVisita: "2026-05-10",
    categoria: "Bioseguridad",
    tiposRiesgo: ["Contagio", "Operativo"],
    criticidad: "Crítica",
    estado: "Abierto",
    descripcion: "El pediluvio del galpón 3 se encuentra sin solución desinfectante hace al menos 5 días.",
    recomendacionesIA: "Reponer solución de yodo activo al 2% inmediatamente. Capacitar al personal sobre frecuencia de recambio.",
    createdAt: "2026-05-10T11:30:00Z",
    updatedAt: "2026-05-10T11:30:00Z",
    _demo: true,
  },
  {
    id: "DEMO_HAL_002",
    titulo: "Mortalidad acumulada por encima del 5%",
    granjaId: "DEMO_GRJ_005",
    granjaNombre: "Granja Villa María",
    auditorId: "KH",
    auditorNombre: "Kerling Hernandez",
    tipoGranja: "Integrada",
    tipoOperativo: "Engorde",
    fechaVisita: "2026-05-22",
    categoria: "Mortalidad",
    tiposRiesgo: ["Operativo", "Financiero", "Reputacional"],
    criticidad: "Alta",
    estado: "En Plan",
    descripcion: "Mortalidad acumulada del lote es de 7.2%, supera umbral aceptable.",
    recomendacionesIA: "Realizar necropsia inmediata. Revisar protocolo de vacunación. Aislar aves sospechosas.",
    createdAt: "2026-05-22T15:00:00Z",
    updatedAt: "2026-05-23T09:00:00Z",
    _demo: true,
  },
  {
    id: "DEMO_HAL_003",
    titulo: "Vacunas vencidas en bodega",
    granjaId: "DEMO_GRJ_002",
    granjaNombre: "Granja La Esperanza",
    auditorId: "JG",
    auditorNombre: "Jaider Gonzalez",
    tipoGranja: "Integrada",
    tipoOperativo: "Reproductora",
    fechaVisita: "2026-05-18",
    categoria: "Sanitario",
    tiposRiesgo: ["Legal", "Operativo"],
    criticidad: "Alta",
    estado: "Cerrado",
    descripcion: "Se encontraron 3 frascos de vacuna Newcastle vencidos hace 2 semanas.",
    recomendacionesIA: "Eliminar producto vencido siguiendo protocolo. Reforzar control de inventario.",
    createdAt: "2026-05-18T10:00:00Z",
    updatedAt: "2026-05-21T16:30:00Z",
    _demo: true,
  },
];

const KPIS_DEMO: KPI[] = !DEMO_MODE ? [] : [
  {
    id: "DEMO_KPI_001",
    hallazgoId: "DEMO_HAL_001",
    granjaId: "DEMO_GRJ_003",
    accion: "Reposición y mantenimiento de pediluvios",
    seguimiento: "Inspección semanal del nivel de desinfectante",
    fechaCompromiso: "2026-06-05",
    fechaProximaVisita: "2026-06-12",
    planAccionVeterinario: "Auditar cumplimiento del protocolo de bioseguridad nivel galpón",
    estado: "En Curso",
    responsable: "Jaime Andrés Quiroga",
    porcentajeAvance: 40,
    createdAt: "2026-05-10T12:00:00Z",
    updatedAt: "2026-05-24T14:00:00Z",
    _demo: true,
  },
  {
    id: "DEMO_KPI_002",
    hallazgoId: "DEMO_HAL_002",
    granjaId: "DEMO_GRJ_005",
    accion: "Investigación de mortalidad anómala",
    seguimiento: "Resultados de necropsia y análisis laboratorio",
    fechaCompromiso: "2026-06-01",
    fechaProximaVisita: "2026-06-03",
    planAccionVeterinario: "Diagnóstico diferencial completo + acciones correctivas",
    estado: "En Curso",
    responsable: "Roberto Carlos Salinas",
    porcentajeAvance: 65,
    createdAt: "2026-05-22T16:00:00Z",
    updatedAt: "2026-05-26T10:30:00Z",
    _demo: true,
  },
  {
    id: "DEMO_KPI_003",
    granjaId: "DEMO_GRJ_002",
    accion: "Renovación de inventario sanitario",
    seguimiento: "Compra de vacunas y registro en Kardex",
    fechaCompromiso: "2026-05-25",
    fechaCumplimiento: "2026-05-21",
    planAccionVeterinario: "Plan de auditoría mensual de inventario",
    estado: "Completado",
    responsable: "Marisol Vargas Caicedo",
    porcentajeAvance: 100,
    createdAt: "2026-05-18T11:00:00Z",
    updatedAt: "2026-05-21T17:00:00Z",
    _demo: true,
  },
  {
    id: "DEMO_KPI_004",
    granjaId: "DEMO_GRJ_004",
    accion: "Mejora de sistema de ventilación galpón 2",
    seguimiento: "Instalación de extractores nuevos",
    fechaCompromiso: "2026-06-20",
    planAccionVeterinario: "Verificar calidad del aire post-instalación",
    estado: "No Iniciado",
    responsable: "Liliana Patricia Bohórquez",
    porcentajeAvance: 0,
    createdAt: "2026-05-15T09:00:00Z",
    updatedAt: "2026-05-15T09:00:00Z",
    _demo: true,
  },
];

const AUDITORIAS_DEMO: Auditoria[] = !DEMO_MODE ? [] : [
  {
    id: "DEMO_AUD_001",
    auditorId: "MD", auditorNombre: "Michael Duran",
    granjaId: "DEMO_GRJ_001", granjaNombre: "Granja San José",
    tipoAuditoria: "General",
    fechaProgramada: "2026-06-15",
    estado: "Pendiente",
    createdAt: "2026-05-01T10:00:00Z", updatedAt: "2026-05-01T10:00:00Z",
    _demo: true,
  },
  {
    id: "DEMO_AUD_002",
    auditorId: "KH", auditorNombre: "Kerling Hernandez",
    granjaId: "DEMO_GRJ_005", granjaNombre: "Granja Villa María",
    tipoAuditoria: "Sanidad",
    fechaProgramada: "2026-05-30",
    estado: "En Proceso",
    comentarios: "Auditoría priorizada por cuarentena activa",
    createdAt: "2026-05-23T08:00:00Z", updatedAt: "2026-05-26T14:00:00Z",
    _demo: true,
  },
  {
    id: "DEMO_AUD_003",
    auditorId: "JG", auditorNombre: "Jaider Gonzalez",
    granjaId: "DEMO_GRJ_002", granjaNombre: "Granja La Esperanza",
    tipoAuditoria: "Inventario",
    fechaProgramada: "2026-05-18",
    fechaEjecutada: "2026-05-18",
    estado: "Aprobada",
    comentarios: "Inventario regularizado, no requiere seguimiento",
    createdAt: "2026-05-10T11:00:00Z", updatedAt: "2026-05-21T16:00:00Z",
    _demo: true,
  },
];

const ACTIVIDAD_DEMO: ActividadLog[] = !DEMO_MODE ? [] : [
  { id: "DEMO_ACT_001", tipo: "Hallazgo",  accion: "Creado",     recursoId: "DEMO_HAL_001", recursoNombre: "Pediluvio inoperativo en galpón 3", usuarioId: "MD", usuarioNombre: "Michael Duran", timestamp: "2026-05-10T11:30:00Z", _demo: true },
  { id: "DEMO_ACT_002", tipo: "Auditoría", accion: "Aprobado",   recursoId: "DEMO_AUD_003", recursoNombre: "Auditoría Inventario · Granja La Esperanza", usuarioId: "JG", usuarioNombre: "Jaider Gonzalez", timestamp: "2026-05-21T16:00:00Z", _demo: true },
  { id: "DEMO_ACT_003", tipo: "KPI",       accion: "Actualizado", recursoId: "DEMO_KPI_002", recursoNombre: "Investigación de mortalidad anómala", usuarioId: "KH", usuarioNombre: "Kerling Hernandez", timestamp: "2026-05-26T10:30:00Z", _demo: true },
  { id: "DEMO_ACT_004", tipo: "Granja",    accion: "Actualizado", recursoId: "DEMO_GRJ_005", recursoNombre: "Granja Villa María", usuarioId: "KH", usuarioNombre: "Kerling Hernandez", timestamp: "2026-05-26T16:00:00Z", _demo: true },
  { id: "DEMO_ACT_005", tipo: "Hallazgo",  accion: "Creado",     recursoId: "DEMO_HAL_002", recursoNombre: "Mortalidad acumulada > 5%", usuarioId: "KH", usuarioNombre: "Kerling Hernandez", timestamp: "2026-05-22T15:00:00Z", _demo: true },
];

// ─── ESTADO ──────────────────────────────────────────────────────────────────
interface GranjasFilters {
  search: string;
  region: string;
  tipoGranja: string;
  tipoOperativo: string;
  nivelRiesgo: string;
  estadoSanitario: string;
  tecnicoVeterinarioId: string;
}

// ─── Helpers para mutaciones sub-recursos ────────────────────────────────────
import {
  TIPO_RIESGO_TO_DB, CATEGORIA_HALLAZGO_TO_DB, CRITICIDAD_HALL_TO_DB,
  ESTADO_HALLAZGO_TO_DB, ESTADO_KPI_TO_DB,
} from "../lib/enum-labels";

function hallazgoToDB(h: Partial<Hallazgo>): any {
  return {
    ...h,
    ...(h.categoria   && { categoria:   toDB(h.categoria,   CATEGORIA_HALLAZGO_TO_DB) }),
    ...(h.criticidad  && { criticidad:  toDB(h.criticidad,  CRITICIDAD_HALL_TO_DB) }),
    ...(h.estado      && { estado:      toDB(h.estado,      ESTADO_HALLAZGO_TO_DB) }),
    ...(h.tipoGranja  && { tipoGranja:  toDB(h.tipoGranja,  TIPO_GRANJA_TO_DB) }),
    ...(h.tipoOperativo && { tipoOperativo: toDB(h.tipoOperativo, TIPO_OPERATIVO_TO_DB) }),
    ...(h.tiposRiesgo && { tiposRiesgo: h.tiposRiesgo.map((r) => toDB(r, TIPO_RIESGO_TO_DB)) }),
  };
}
function kpiToDB(k: Partial<KPI>): any {
  return { ...k, ...(k.estado && { estado: toDB(k.estado, ESTADO_KPI_TO_DB) }) };
}

interface GranjasState {
  granjas: Granja[];
  auditorias: Auditoria[];
  hallazgos: Hallazgo[];
  kpis: KPI[];
  inventario: InventarioItem[];
  documentos: DocumentoGranja[];
  actividad: ActividadLog[];

  filters: GranjasFilters;
  selectedGranja: Granja | null;

  // ── Hydration desde API (reemplaza datasets enteros) ──
  setGranjas:    (g: Granja[]) => void;
  setHallazgos:  (h: Hallazgo[]) => void;
  setKPIs:       (k: KPI[]) => void;
  setAuditorias: (a: Auditoria[]) => void;
  setActividad:  (a: ActividadLog[]) => void;

  // Granjas CRUD
  addGranja: (g: Omit<Granja, "id" | "createdAt" | "updatedAt">) => void;
  updateGranja: (id: string, patch: Partial<Granja>) => void;
  removeGranja: (id: string) => void;
  setSelectedGranja: (g: Granja | null) => void;

  // Sub-recursos CRUD
  addHallazgo:    (h: Omit<Hallazgo, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateHallazgo: (id: string, patch: Partial<Hallazgo>) => Promise<void>;
  addAuditoria:   (a: Omit<Auditoria, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  addKPI:         (k: Omit<KPI, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateKPI:      (id: string, patch: Partial<KPI>) => Promise<void>;

  // Filtros
  setFilters: (f: Partial<GranjasFilters>) => void;
  resetFilters: () => void;

  // Demo
  resetDemo: () => void;
  clearDemoData: () => void;     // borra TODO lo que tenga _demo: true
}

const defaultFilters: GranjasFilters = {
  search: "", region: "", tipoGranja: "", tipoOperativo: "",
  nivelRiesgo: "", estadoSanitario: "", tecnicoVeterinarioId: "",
};

export const useGranjasStore = create<GranjasState>()(
  persist(
    (set) => ({
      granjas: GRANJAS_DEMO,
      auditorias: AUDITORIAS_DEMO,
      hallazgos: HALLAZGOS_DEMO,
      kpis: KPIS_DEMO,
      inventario: [],
      documentos: [],
      actividad: ACTIVIDAD_DEMO,

      filters: defaultFilters,
      selectedGranja: null,

      // Hydration: reemplaza datasets enteros desde el API
      setGranjas:    (granjas)    => set({ granjas }),
      setHallazgos:  (hallazgos)  => set({ hallazgos }),
      setKPIs:       (kpis)       => set({ kpis }),
      setAuditorias: (auditorias) => set({ auditorias }),
      setActividad:  (actividad)  => set({ actividad }),

      // ── CRUD con persistencia al API ──
      addGranja: async (g) => {
        const tempId = `tmp_${Date.now()}`;
        const optimistic = { ...g, id: tempId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Granja;
        set((s) => ({ granjas: [...s.granjas, optimistic] }));
        try {
          const real = await apiPost<Granja>("/granjas", granjaToDB(g));
          // Mantiene display labels del form, pero adopta el id+timestamps reales
          set((s) => ({ granjas: s.granjas.map((x) => (x.id === tempId ? { ...optimistic, id: real.id, createdAt: real.createdAt, updatedAt: real.updatedAt } : x)) }));
        } catch (e) {
          set((s) => ({ granjas: s.granjas.filter((x) => x.id !== tempId) }));
          console.error("addGranja failed:", e);
        }
      },
      updateGranja: async (id, patch) => {
        const prev = (set as any).getState ? null : null;
        let snapshot: Granja | undefined;
        set((s) => {
          snapshot = s.granjas.find((g) => g.id === id);
          return {
            granjas: s.granjas.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: new Date().toISOString() } : g)),
          };
        });
        // Skip API si el id es temporal (todavía no llegó la respuesta de create)
        if (id.startsWith("tmp_") || id.startsWith("DEMO_GRJ_")) return;
        try {
          await apiPatch<Granja>(`/granjas/${id}`, granjaToDB(patch));
        } catch (e) {
          // Rollback
          if (snapshot) set((s) => ({ granjas: s.granjas.map((g) => (g.id === id ? snapshot! : g)) }));
          console.error("updateGranja failed:", e);
        }
      },
      removeGranja: async (id) => {
        let snapshot: Granja[] = [];
        set((s) => { snapshot = s.granjas; return { granjas: s.granjas.filter((g) => g.id !== id) }; });
        if (id.startsWith("tmp_") || id.startsWith("DEMO_GRJ_")) return;
        try {
          await apiDelete(`/granjas/${id}`);
        } catch (e) {
          set({ granjas: snapshot });
          console.error("removeGranja failed:", e);
        }
      },
      setSelectedGranja: (g) => set({ selectedGranja: g }),

      // ── Sub-recursos CRUD ──
      addHallazgo: async (h) => {
        const tempId = `tmp_${Date.now()}`;
        const optimistic = { ...h, id: tempId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Hallazgo;
        set((s) => ({ hallazgos: [...s.hallazgos, optimistic] }));
        try {
          const real = await apiPost<Hallazgo>("/granjas/hallazgos", hallazgoToDB(h));
          set((s) => ({ hallazgos: s.hallazgos.map((x) => x.id === tempId ? { ...optimistic, id: real.id } : x) }));
        } catch (e) {
          set((s) => ({ hallazgos: s.hallazgos.filter((x) => x.id !== tempId) }));
          console.error("addHallazgo failed:", e);
        }
      },
      updateHallazgo: async (id, patch) => {
        set((s) => ({ hallazgos: s.hallazgos.map((h) => h.id === id ? { ...h, ...patch, updatedAt: new Date().toISOString() } : h) }));
        if (id.startsWith("tmp_") || id.startsWith("DEMO_HAL_")) return;
        try { await apiPatch(`/granjas/hallazgos/${id}`, hallazgoToDB(patch)); }
        catch (e) { console.error("updateHallazgo failed:", e); }
      },
      addAuditoria: async (a) => {
        const tempId = `tmp_${Date.now()}`;
        const optimistic = { ...a, id: tempId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Auditoria;
        set((s) => ({ auditorias: [...s.auditorias, optimistic] }));
        try {
          const real = await apiPost<Auditoria>("/granjas/auditorias", a);
          set((s) => ({ auditorias: s.auditorias.map((x) => x.id === tempId ? { ...optimistic, id: real.id } : x) }));
        } catch (e) {
          set((s) => ({ auditorias: s.auditorias.filter((x) => x.id !== tempId) }));
          console.error("addAuditoria failed:", e);
        }
      },
      addKPI: async (k) => {
        const tempId = `tmp_${Date.now()}`;
        const optimistic = { ...k, id: tempId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as KPI;
        set((s) => ({ kpis: [...s.kpis, optimistic] }));
        try {
          const real = await apiPost<KPI>("/granjas/kpis", kpiToDB(k));
          set((s) => ({ kpis: s.kpis.map((x) => x.id === tempId ? { ...optimistic, id: real.id } : x) }));
        } catch (e) {
          set((s) => ({ kpis: s.kpis.filter((x) => x.id !== tempId) }));
          console.error("addKPI failed:", e);
        }
      },
      updateKPI: async (id, patch) => {
        set((s) => ({ kpis: s.kpis.map((k) => k.id === id ? { ...k, ...patch, updatedAt: new Date().toISOString() } : k) }));
        if (id.startsWith("tmp_") || id.startsWith("DEMO_KPI_")) return;
        try { await apiPatch(`/granjas/kpis/${id}`, kpiToDB(patch)); }
        catch (e) { console.error("updateKPI failed:", e); }
      },

      setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
      resetFilters: () => set({ filters: defaultFilters }),

      resetDemo: () => set({
        granjas: GRANJAS_DEMO,
        auditorias: AUDITORIAS_DEMO,
        hallazgos: HALLAZGOS_DEMO,
        kpis: KPIS_DEMO,
        actividad: ACTIVIDAD_DEMO,
      }),
      clearDemoData: () => set((s) => ({
        granjas:    s.granjas.filter((g) => !g._demo),
        auditorias: s.auditorias.filter((a) => !a._demo),
        hallazgos:  s.hallazgos.filter((h) => !h._demo),
        kpis:       s.kpis.filter((k) => !k._demo),
        actividad:  s.actividad.filter((a) => !a._demo),
        inventario: s.inventario.filter((i) => !i._demo),
        documentos: s.documentos.filter((d) => !d._demo),
      })),
    }),
    {
      name: "savicol-granjas-store",
      partialize: (s) => ({
        granjas: s.granjas, auditorias: s.auditorias, hallazgos: s.hallazgos,
        kpis: s.kpis, inventario: s.inventario, documentos: s.documentos,
        actividad: s.actividad,
      }),
    }
  )
);

// ─── SELECTORES DERIVADOS ────────────────────────────────────────────────────
export function selectFilteredGranjas(state: GranjasState): Granja[] {
  const { granjas, filters } = state;
  return granjas.filter((g) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!g.nombre.toLowerCase().includes(q) &&
          !g.codigo.toLowerCase().includes(q) &&
          !g.administrador.toLowerCase().includes(q) &&
          !g.vereda.toLowerCase().includes(q)) return false;
    }
    if (filters.region          && g.region          !== filters.region) return false;
    if (filters.tipoGranja      && g.tipoGranja      !== filters.tipoGranja) return false;
    if (filters.tipoOperativo   && g.tipoOperativo   !== filters.tipoOperativo) return false;
    if (filters.nivelRiesgo     && g.nivelRiesgo     !== filters.nivelRiesgo) return false;
    if (filters.estadoSanitario && g.estadoSanitario !== filters.estadoSanitario) return false;
    if (filters.tecnicoVeterinarioId && g.tecnicoVeterinarioId !== filters.tecnicoVeterinarioId) return false;
    return true;
  });
}
