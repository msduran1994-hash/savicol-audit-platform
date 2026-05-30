// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO ACOMPAÑAMIENTO A RUTAS — Zustand Store con datos DEMO
// ═══════════════════════════════════════════════════════════════════════════════
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEMO_MODE } from "../lib/granjas.constants";
import type { Acompanamiento, EvidenciaRuta, AccionCumplimiento } from "../lib/rutas.types";
import { apiPost, apiPatch, apiDelete } from "../lib/api";
import {
  MOTIVO_TO_DB, CRITICIDAD_RUTA_TO_DB, ESTADO_ACOMP_TO_DB,
  TIPO_RIESGO_TO_DB, toDB,
} from "../lib/enum-labels";

function acompToDB(a: Partial<Acompanamiento>): any {
  return {
    ...a,
    ...(a.motivo     && { motivo:     toDB(a.motivo,     MOTIVO_TO_DB) }),
    ...(a.criticidad && { criticidad: toDB(a.criticidad, CRITICIDAD_RUTA_TO_DB) }),
    ...(a.estado     && { estado:     toDB(a.estado,     ESTADO_ACOMP_TO_DB) }),
    ...(a.riesgosAsociados && { riesgosAsociados: a.riesgosAsociados.map((r) => toDB(r, TIPO_RIESGO_TO_DB)) }),
  };
}

// ─── DATOS DEMO ──────────────────────────────────────────────────────────────
const ACOMPANAMIENTOS_DEMO: Acompanamiento[] = !DEMO_MODE ? [] : [
  {
    id: "DEMO_AC_001",
    fecha: "2026-05-12",
    auditorId: "MD", auditorNombre: "Michael Duran",
    clienteId: "CL-001", clienteNombre: "Supermercados La Vaquita",
    rutaId: "RT-001",  rutaNombre: "Medellín Norte",
    vehiculoId: "VH-001", vehiculoPlaca: "ABC-123",
    conductorId: "CN-001", conductorNombre: "Pedro Antonio Ramírez",
    auxiliarId: "AX-001",  auxiliarNombre: "Wilson David Pérez",
    motivo: "Producto Vencido",
    valorDevueltoCOP: 1_245_000,
    cantidadKgDevueltos: 87.5,
    observacionAuditor: "Se identificó lote vencido en estante de pollo crudo. Cliente reportó hace 2 días.",
    riesgosAsociados: ["Legal", "Reputacional", "Contagio"],
    criticidad: "Crítico",
    estado: "Con Hallazgos",
    createdAt: "2026-05-12T14:30:00Z", updatedAt: "2026-05-12T14:30:00Z",
    _demo: true,
  },
  {
    id: "DEMO_AC_002",
    fecha: "2026-05-15",
    auditorId: "KH", auditorNombre: "Kerling Hernandez",
    clienteId: "CL-002", clienteNombre: "Distribuidora El Trébol",
    rutaId: "RT-003",  rutaNombre: "Bogotá Norte",
    vehiculoId: "VH-004", vehiculoPlaca: "JKL-012",
    conductorId: "CN-004", conductorNombre: "Andrés Felipe Ortiz",
    motivo: "Cadena de Frío Rota",
    valorDevueltoCOP: 3_800_000,
    cantidadKgDevueltos: 215,
    observacionAuditor: "Termógrafo del camión reportó temperatura > 4°C durante 3 horas. Cliente rechazó pedido completo.",
    riesgosAsociados: ["Legal", "Operativo", "Financiero", "Contagio"],
    criticidad: "Crítico",
    estado: "Con Hallazgos",
    createdAt: "2026-05-15T09:00:00Z", updatedAt: "2026-05-16T10:30:00Z",
    _demo: true,
  },
  {
    id: "DEMO_AC_003",
    fecha: "2026-05-18",
    auditorId: "JG", auditorNombre: "Jaider Gonzalez",
    clienteId: "CL-004", clienteNombre: "Mercado Central Bogotá",
    rutaId: "RT-004",  rutaNombre: "Bogotá Occidente",
    vehiculoId: "VH-002", vehiculoPlaca: "DEF-456",
    conductorId: "CN-002", conductorNombre: "Luis Eduardo Castaño",
    auxiliarId: "AX-002",  auxiliarNombre: "Brayan Esteban Gómez",
    motivo: "Empaque Dañado",
    valorDevueltoCOP: 380_000,
    cantidadKgDevueltos: 22,
    observacionAuditor: "Empaque al vacío con perforaciones detectadas durante recepción. Solo 4 unidades afectadas.",
    riesgosAsociados: ["Reputacional", "Operativo"],
    criticidad: "Medio",
    estado: "Completado",
    createdAt: "2026-05-18T11:15:00Z", updatedAt: "2026-05-19T08:00:00Z",
    _demo: true,
  },
  {
    id: "DEMO_AC_004",
    fecha: "2026-05-20",
    auditorId: "HB", auditorNombre: "Hilary Basto",
    clienteId: "CL-005", clienteNombre: "Restaurante La Brasa",
    rutaId: "RT-002",  rutaNombre: "Medellín Sur",
    vehiculoId: "VH-003", vehiculoPlaca: "GHI-789",
    conductorId: "CN-003", conductorNombre: "José Manuel Salazar",
    motivo: "Diferencia de Peso",
    valorDevueltoCOP: 215_000,
    cantidadKgDevueltos: 12.5,
    observacionAuditor: "Diferencia 0.5 kg en pedido de 13 kg. Recepción del cliente con balanza certificada.",
    riesgosAsociados: ["Financiero", "Reputacional"],
    criticidad: "Bajo",
    estado: "Cerrado",
    createdAt: "2026-05-20T13:45:00Z", updatedAt: "2026-05-22T16:30:00Z",
    _demo: true,
  },
  {
    id: "DEMO_AC_005",
    fecha: "2026-05-22",
    auditorId: "AT", auditorNombre: "Alexander Tellez",
    clienteId: "CL-006", clienteNombre: "Tiendas D1 Norte",
    rutaId: "RT-005",  rutaNombre: "Bucaramanga Sabana",
    vehiculoId: "VH-005", vehiculoPlaca: "MNO-345",
    conductorId: "CN-005", conductorNombre: "Carlos Mario Henao",
    auxiliarId: "AX-003",  auxiliarNombre: "Daniel Felipe Morales",
    motivo: "Entrega Tardía",
    valorDevueltoCOP: 0,
    cantidadKgDevueltos: 0,
    observacionAuditor: "Entrega 3h después del horario pactado por congestión vehicular. No hubo devolución, sólo nota negativa.",
    riesgosAsociados: ["Reputacional"],
    criticidad: "Medio",
    estado: "Cerrado",
    createdAt: "2026-05-22T18:00:00Z", updatedAt: "2026-05-23T09:00:00Z",
    _demo: true,
  },
  {
    id: "DEMO_AC_006",
    fecha: "2026-05-24",
    auditorId: "IB", auditorNombre: "Ivan Bonilla",
    clienteId: "CL-008", clienteNombre: "Distribuidora El Pollo Feliz",
    rutaId: "RT-007",  rutaNombre: "Pereira Eje",
    vehiculoId: "VH-006", vehiculoPlaca: "PQR-678",
    conductorId: "CN-001", conductorNombre: "Pedro Antonio Ramírez",
    motivo: "Calidad No Conforme",
    valorDevueltoCOP: 920_000,
    cantidadKgDevueltos: 58,
    observacionAuditor: "Coloración irregular en pechugas, posible problema en aturdimiento. Lote completo rechazado.",
    riesgosAsociados: ["Legal", "Reputacional", "Operativo"],
    criticidad: "Alto",
    estado: "Con Hallazgos",
    createdAt: "2026-05-24T10:30:00Z", updatedAt: "2026-05-25T14:00:00Z",
    _demo: true,
  },
];

const CUMPLIMIENTO_DEMO: AccionCumplimiento[] = !DEMO_MODE ? [] : [
  {
    id: "DEMO_AK_001",
    acompanamientoId: "DEMO_AC_001",
    planAccion: "Implementar control FIFO con etiquetado de color por fecha de vencimiento",
    responsable: "Coordinador de Despacho · Medellín",
    estado: "En Proceso",
    porcentajeAvance: 60,
    fechaCompromiso: "2026-06-05",
    reincidencia: false,
    createdAt: "2026-05-13T08:00:00Z", updatedAt: "2026-05-25T15:00:00Z",
    _demo: true,
  },
  {
    id: "DEMO_AK_002",
    acompanamientoId: "DEMO_AC_002",
    planAccion: "Mantenimiento mensual de equipo de refrigeración + alerta automática SMS al conductor",
    responsable: "Jefe de Flota",
    estado: "Verificación",
    porcentajeAvance: 85,
    fechaCompromiso: "2026-05-30",
    evidenciaCorreccion: "Reporte de mantenimiento adjunto",
    reincidencia: true,
    createdAt: "2026-05-16T11:00:00Z", updatedAt: "2026-05-26T09:00:00Z",
    _demo: true,
  },
  {
    id: "DEMO_AK_003",
    acompanamientoId: "DEMO_AC_003",
    planAccion: "Auditoría a proveedor de empaques + reemplazo de proveedor reincidente",
    responsable: "Coordinador de Compras",
    estado: "Cerrado",
    porcentajeAvance: 100,
    fechaCompromiso: "2026-05-25",
    fechaCumplimiento: "2026-05-23",
    evidenciaCorreccion: "Contrato firmado con nuevo proveedor",
    validadoPor: "Jaider Gonzalez",
    reincidencia: false,
    createdAt: "2026-05-19T10:00:00Z", updatedAt: "2026-05-24T16:00:00Z",
    _demo: true,
  },
  {
    id: "DEMO_AK_004",
    acompanamientoId: "DEMO_AC_006",
    planAccion: "Revisión del procedimiento de aturdimiento en planta + capacitación operarios",
    responsable: "Jefe de Planta",
    estado: "Pendiente",
    porcentajeAvance: 0,
    fechaCompromiso: "2026-06-15",
    reincidencia: false,
    createdAt: "2026-05-25T08:00:00Z", updatedAt: "2026-05-25T08:00:00Z",
    _demo: true,
  },
];

// ─── ESTADO ──────────────────────────────────────────────────────────────────
interface RutasFilters {
  search: string;
  mes: string;
  rutaId: string;
  vehiculoId: string;
  clienteId: string;
  auditorId: string;
  motivo: string;
  criticidad: string;
}

interface RutasState {
  acompanamientos: Acompanamiento[];
  evidencias:      EvidenciaRuta[];
  cumplimiento:    AccionCumplimiento[];
  filters:         RutasFilters;

  // Hydration desde API
  setAcompanamientos: (a: Acompanamiento[]) => void;
  setCumplimiento:    (c: AccionCumplimiento[]) => void;

  addAcompanamiento:    (a: Omit<Acompanamiento, "id" | "createdAt" | "updatedAt">) => void;
  updateAcompanamiento: (id: string, patch: Partial<Acompanamiento>) => void;
  removeAcompanamiento: (id: string) => void;

  setFilters: (f: Partial<RutasFilters>) => void;
  resetFilters: () => void;

  resetDemo: () => void;
  clearDemoData: () => void;
}

const defaultFilters: RutasFilters = {
  search: "", mes: "", rutaId: "", vehiculoId: "",
  clienteId: "", auditorId: "", motivo: "", criticidad: "",
};

export const useRutasStore = create<RutasState>()(
  persist(
    (set) => ({
      acompanamientos: ACOMPANAMIENTOS_DEMO,
      evidencias:      [],
      cumplimiento:    CUMPLIMIENTO_DEMO,
      filters:         defaultFilters,

      // Hydration desde API
      setAcompanamientos: (acompanamientos) => set({ acompanamientos }),
      setCumplimiento:    (cumplimiento)    => set({ cumplimiento }),

      // ── CRUD con persistencia al API ──
      addAcompanamiento: async (a) => {
        const tempId = `tmp_${Date.now()}`;
        const optimistic = { ...a, id: tempId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Acompanamiento;
        set((s) => ({ acompanamientos: [...s.acompanamientos, optimistic] }));
        try {
          const real = await apiPost<Acompanamiento>("/rutas/acompanamientos", acompToDB(a));
          set((s) => ({
            acompanamientos: s.acompanamientos.map((x) =>
              x.id === tempId ? { ...optimistic, id: real.id, createdAt: real.createdAt, updatedAt: real.updatedAt } : x
            ),
          }));
        } catch (e) {
          set((s) => ({ acompanamientos: s.acompanamientos.filter((x) => x.id !== tempId) }));
          console.error("addAcompanamiento failed:", e);
        }
      },
      updateAcompanamiento: async (id, patch) => {
        let snapshot: Acompanamiento | undefined;
        set((s) => {
          snapshot = s.acompanamientos.find((a) => a.id === id);
          return {
            acompanamientos: s.acompanamientos.map((a) =>
              a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a
            ),
          };
        });
        if (id.startsWith("tmp_") || id.startsWith("DEMO_AC_")) return;
        try {
          await apiPatch<Acompanamiento>(`/rutas/acompanamientos/${id}`, acompToDB(patch));
        } catch (e) {
          if (snapshot) set((s) => ({ acompanamientos: s.acompanamientos.map((a) => (a.id === id ? snapshot! : a)) }));
          console.error("updateAcompanamiento failed:", e);
        }
      },
      removeAcompanamiento: async (id) => {
        let snapshot: Acompanamiento[] = [];
        set((s) => { snapshot = s.acompanamientos; return { acompanamientos: s.acompanamientos.filter((a) => a.id !== id) }; });
        if (id.startsWith("tmp_") || id.startsWith("DEMO_AC_")) return;
        try {
          await apiDelete(`/rutas/acompanamientos/${id}`);
        } catch (e) {
          set({ acompanamientos: snapshot });
          console.error("removeAcompanamiento failed:", e);
        }
      },

      setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
      resetFilters: () => set({ filters: defaultFilters }),

      resetDemo: () => set({
        acompanamientos: ACOMPANAMIENTOS_DEMO,
        cumplimiento:    CUMPLIMIENTO_DEMO,
      }),
      clearDemoData: () => set((s) => ({
        acompanamientos: s.acompanamientos.filter((a) => !a._demo),
        evidencias:      s.evidencias.filter((e) => !e._demo),
        cumplimiento:    s.cumplimiento.filter((c) => !c._demo),
      })),
    }),
    {
      name: "savicol-rutas-store",
      partialize: (s) => ({
        acompanamientos: s.acompanamientos,
        evidencias:      s.evidencias,
        cumplimiento:    s.cumplimiento,
      }),
    }
  )
);

// ─── SELECTORES DERIVADOS ────────────────────────────────────────────────────
export function selectFilteredAcompanamientos(state: RutasState): Acompanamiento[] {
  const { acompanamientos, filters } = state;
  return acompanamientos.filter((a) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!a.clienteNombre.toLowerCase().includes(q) &&
          !a.rutaNombre.toLowerCase().includes(q) &&
          !a.observacionAuditor.toLowerCase().includes(q) &&
          !a.vehiculoPlaca.toLowerCase().includes(q)) return false;
    }
    if (filters.mes) {
      const month = new Date(a.fecha).getMonth() + 1;
      if (String(month) !== filters.mes) return false;
    }
    if (filters.rutaId        && a.rutaId        !== filters.rutaId) return false;
    if (filters.vehiculoId    && a.vehiculoId    !== filters.vehiculoId) return false;
    if (filters.clienteId     && a.clienteId     !== filters.clienteId) return false;
    if (filters.auditorId     && a.auditorId     !== filters.auditorId) return false;
    if (filters.motivo        && a.motivo        !== filters.motivo) return false;
    if (filters.criticidad    && a.criticidad    !== filters.criticidad) return false;
    return true;
  });
}
