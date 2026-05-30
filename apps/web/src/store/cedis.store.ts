// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO CEDIS — Zustand Store
// ═══════════════════════════════════════════════════════════════════════════════
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CEDIS_DEMO } from "../lib/cedis.constants";
import type { Cedi, AuditoriaCedi, HallazgoCedi, EvidenciaCedi } from "../lib/cedis.types";
import { apiPost, apiPatch, apiDelete } from "../lib/api";

// ─── DATOS DEMO ──────────────────────────────────────────────────────────────
const CEDIS_INIT: Cedi[] = CEDIS_DEMO.map(c => ({ ...c, activo: true, _demo: true }));

const AUDITORIAS_DEMO: AuditoriaCedi[] = [
  {
    id: "DEMO_AUC_001", cediId: "DEMO_CED_001", cediNombre: "CEDI Bogotá Norte",
    fechaVisita: "2026-05-10", auditorId: "MD", auditorNombre: "Michael Duran",
    administrador: "Camilo Andrés Rojas",
    tipoRiesgo: "Operativo", observacionRiesgo: "Encontradas inconsistencias en inventario físico vs sistema",
    observacionInventario: "Diferencias de 0.3% en stock de producto. Aceptable pero requiere ajuste.",
    observacionCaja: "Caja General correctamente cuadrada.",
    criticidad: "Media", estado: "En Plan",
    createdAt: "2026-05-10T14:00:00Z", updatedAt: "2026-05-15T10:00:00Z", _demo: true,
  },
  {
    id: "DEMO_AUC_002", cediId: "DEMO_CED_003", cediNombre: "CEDI Cali Sur",
    fechaVisita: "2026-05-18", auditorId: "KH", auditorNombre: "Kerling Hernandez",
    administrador: "Ricardo Alonso Pérez",
    tipoRiesgo: "Contagio", observacionRiesgo: "Pediluvio sin desinfectante adecuado durante 3 días",
    observacionBioseguridad: "Falla crítica en pediluvio. EPP del personal en buen estado.",
    observacionInfraestructura: "Cuartos fríos operando a temperatura correcta.",
    criticidad: "Crítica", estado: "Abierto",
    createdAt: "2026-05-18T09:00:00Z", updatedAt: "2026-05-18T09:00:00Z", _demo: true,
  },
  {
    id: "DEMO_AUC_003", cediId: "DEMO_CED_002", cediNombre: "CEDI Medellín Central",
    fechaVisita: "2026-05-22", auditorId: "JG", auditorNombre: "Jaider Gonzalez",
    administrador: "Patricia Elena Ramos",
    tipoRiesgo: "Financiero", observacionRiesgo: "Cartera con vencidos a más de 60 días por COP 2.3M",
    observacionCartera: "Vencimientos por edades requieren plan de cobranza urgente.",
    observacionCaja: "Caja Vehículos con diferencia de COP 45.000.",
    criticidad: "Alta", estado: "En Verificación",
    createdAt: "2026-05-22T11:00:00Z", updatedAt: "2026-05-25T16:30:00Z", _demo: true,
  },
  {
    id: "DEMO_AUC_004", cediId: "DEMO_CED_004", cediNombre: "CEDI Bucaramanga",
    fechaVisita: "2026-05-25", auditorId: "HB", auditorNombre: "Hilary Basto",
    administrador: "Adriana Lucía Sandoval",
    tipoRiesgo: "Reputacional", observacionRiesgo: "Encuestas cliente ruta muestran baja satisfacción (62%)",
    observacionLogistica: "Tiempos de entrega 22% por encima del estándar. Devoluciones en aumento.",
    criticidad: "Alta", estado: "En Plan",
    createdAt: "2026-05-25T08:30:00Z", updatedAt: "2026-05-26T14:00:00Z", _demo: true,
  },
];

const HALLAZGOS_DEMO: HallazgoCedi[] = [
  { id: "DEMO_HAC_001", auditoriaId: "DEMO_AUC_002", cediId: "DEMO_CED_003", titulo: "Pediluvio inoperante 3 días", categoria: "Bioseguridad", subItem: "Pediluvio", descripcion: "Pediluvio sin solución desinfectante. Riesgo de contagio cruzado.", tipoRiesgo: "Contagio", criticidad: "Crítica", estado: "Abierto", recomendacionIA: "Reabastecer solución de yodo activo al 2% inmediatamente.", responsable: "Ricardo Alonso Pérez", fechaCompromiso: "2026-06-01", porcentajeAvance: 25, reincidente: true, createdAt: "2026-05-18T09:30:00Z", updatedAt: "2026-05-22T11:00:00Z", _demo: true },
  { id: "DEMO_HAC_002", auditoriaId: "DEMO_AUC_003", cediId: "DEMO_CED_002", titulo: "Cartera vencida > 60 días", categoria: "Cartera", subItem: "Vencimiento por edades", descripcion: "COP 2.300.000 en cartera vencida a más de 60 días.", tipoRiesgo: "Financiero", criticidad: "Alta", estado: "En Verificación", recomendacionIA: "Activar plan de cobranza estratégico con 3 niveles de seguimiento.", responsable: "Patricia Elena Ramos", fechaCompromiso: "2026-06-10", porcentajeAvance: 60, reincidente: false, createdAt: "2026-05-22T11:30:00Z", updatedAt: "2026-05-25T17:00:00Z", _demo: true },
  { id: "DEMO_HAC_003", auditoriaId: "DEMO_AUC_004", cediId: "DEMO_CED_004", titulo: "Tiempos de entrega +22%", categoria: "Logística", subItem: "Tiempos Entrega", descripcion: "Promedio de entrega 22% por encima del estándar Savicol.", tipoRiesgo: "Reputacional", criticidad: "Alta", estado: "En Plan", recomendacionIA: "Replanificar rutas. Capacitación a conductores.", responsable: "Adriana Lucía Sandoval", fechaCompromiso: "2026-06-15", porcentajeAvance: 40, reincidente: false, createdAt: "2026-05-25T09:00:00Z", updatedAt: "2026-05-26T14:30:00Z", _demo: true },
  { id: "DEMO_HAC_004", auditoriaId: "DEMO_AUC_001", cediId: "DEMO_CED_001", titulo: "Diferencia inventario 0.3%", categoria: "Inventario", subItem: "Inventario físico producto", descripcion: "Diferencia físico vs sistema dentro del margen aceptable.", tipoRiesgo: "Operativo", criticidad: "Media", estado: "En Plan", recomendacionIA: "Ajuste contable inmediato + análisis de causa raíz.", responsable: "Camilo Andrés Rojas", fechaCompromiso: "2026-06-05", porcentajeAvance: 80, reincidente: false, createdAt: "2026-05-10T14:30:00Z", updatedAt: "2026-05-16T10:00:00Z", _demo: true },
];

// ─── STATE ───────────────────────────────────────────────────────────────────
interface CedisFilters {
  search: string;
  mes: string;
  cediId: string;
  auditorId: string;
  tipoRiesgo: string;
  categoria: string;
  estado: string;
  criticidad: string;
}

interface CedisState {
  cedis: Cedi[];
  auditorias: AuditoriaCedi[];
  hallazgos: HallazgoCedi[];
  evidencias: EvidenciaCedi[];
  filters: CedisFilters;

  // Hydration
  setCedis:       (c: Cedi[]) => void;
  setAuditorias:  (a: AuditoriaCedi[]) => void;
  setHallazgos:   (h: HallazgoCedi[]) => void;

  // CRUD (con persist API)
  addAuditoria:    (a: Omit<AuditoriaCedi, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateAuditoria: (id: string, patch: Partial<AuditoriaCedi>) => Promise<void>;
  removeAuditoria: (id: string) => Promise<void>;

  setFilters:   (f: Partial<CedisFilters>) => void;
  resetFilters: () => void;

  clearDemoData: () => void;
}

const defaultFilters: CedisFilters = {
  search: "", mes: "", cediId: "", auditorId: "",
  tipoRiesgo: "", categoria: "", estado: "", criticidad: "",
};

export const useCedisStore = create<CedisState>()(
  persist(
    (set) => ({
      cedis:      CEDIS_INIT,
      auditorias: AUDITORIAS_DEMO,
      hallazgos:  HALLAZGOS_DEMO,
      evidencias: [],
      filters:    defaultFilters,

      setCedis:      (cedis)      => set({ cedis }),
      setAuditorias: (auditorias) => set({ auditorias }),
      setHallazgos:  (hallazgos)  => set({ hallazgos }),

      addAuditoria: async (a) => {
        const tempId = `tmp_${Date.now()}`;
        const optimistic = { ...a, id: tempId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as AuditoriaCedi;
        set((s) => ({ auditorias: [...s.auditorias, optimistic] }));
        try {
          const real = await apiPost<AuditoriaCedi>("/cedis/auditorias", a);
          set((s) => ({ auditorias: s.auditorias.map((x) => (x.id === tempId ? { ...optimistic, id: real.id, createdAt: real.createdAt, updatedAt: real.updatedAt } : x)) }));
        } catch (e) {
          set((s) => ({ auditorias: s.auditorias.filter((x) => x.id !== tempId) }));
          console.error("addAuditoriaCedi failed:", e);
        }
      },
      updateAuditoria: async (id, patch) => {
        let snapshot: AuditoriaCedi | undefined;
        set((s) => {
          snapshot = s.auditorias.find((a) => a.id === id);
          return {
            auditorias: s.auditorias.map((a) =>
              a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a
            ),
          };
        });
        if (id.startsWith("tmp_") || id.startsWith("DEMO_AUC_")) return;
        try {
          await apiPatch<AuditoriaCedi>(`/cedis/auditorias/${id}`, patch);
        } catch (e) {
          if (snapshot) set((s) => ({ auditorias: s.auditorias.map((a) => (a.id === id ? snapshot! : a)) }));
          console.error("updateAuditoriaCedi failed:", e);
        }
      },
      removeAuditoria: async (id) => {
        let snapshot: AuditoriaCedi[] = [];
        set((s) => { snapshot = s.auditorias; return { auditorias: s.auditorias.filter((a) => a.id !== id) }; });
        if (id.startsWith("tmp_") || id.startsWith("DEMO_AUC_")) return;
        try {
          await apiDelete(`/cedis/auditorias/${id}`);
        } catch (e) {
          set({ auditorias: snapshot });
          console.error("removeAuditoriaCedi failed:", e);
        }
      },

      setFilters:   (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
      resetFilters: ()  => set({ filters: defaultFilters }),

      clearDemoData: () => set((s) => ({
        cedis:      s.cedis.filter((c) => !c._demo),
        auditorias: s.auditorias.filter((a) => !a._demo),
        hallazgos:  s.hallazgos.filter((h) => !h._demo),
        evidencias: s.evidencias.filter((e) => !e._demo),
      })),
    }),
    {
      name: "savicol-cedis-store",
      partialize: (s) => ({
        cedis: s.cedis, auditorias: s.auditorias,
        hallazgos: s.hallazgos, evidencias: s.evidencias,
      }),
    }
  )
);

// ─── SELECTORES ──────────────────────────────────────────────────────────────
export function selectFilteredAuditorias(state: CedisState): AuditoriaCedi[] {
  const { auditorias, filters } = state;
  return auditorias.filter((a) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!(a.cediNombre ?? "").toLowerCase().includes(q) &&
          !(a.observacionRiesgo ?? "").toLowerCase().includes(q) &&
          !a.auditorNombre.toLowerCase().includes(q)) return false;
    }
    if (filters.mes) {
      const month = new Date(a.fechaVisita).getMonth() + 1;
      if (String(month) !== filters.mes) return false;
    }
    if (filters.cediId      && a.cediId      !== filters.cediId) return false;
    if (filters.auditorId   && a.auditorId   !== filters.auditorId) return false;
    if (filters.tipoRiesgo  && a.tipoRiesgo  !== filters.tipoRiesgo) return false;
    if (filters.estado      && a.estado      !== filters.estado) return false;
    if (filters.criticidad  && a.criticidad  !== filters.criticidad) return false;
    return true;
  });
}
