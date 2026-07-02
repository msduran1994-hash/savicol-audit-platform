// ═══════════════════════════════════════════════════════════════════════════════
// HOJA INVENTARIOS · Filtros globales sincronizados (Fase 7)
// ═══════════════════════════════════════════════════════════════════════════════
// Store compartido entre el Dashboard y los 6 módulos: al cambiar un filtro, TODAS
// las vistas (dashboard + módulos) reaccionan a la vez. Sin backend nuevo — el
// filtrado se aplica en el cliente sobre los datos ya cargados de /inventarios.
import { create } from "zustand";
import type { InventarioAuditado } from "@/lib/inventarios.types";

export interface InventariosFiltros {
  fechaDesde: string;
  fechaHasta: string;
  modulo: string;       // solo aplica en el Dashboard consolidado
  auditor: string;
  responsable: string;
  cediId: string;
  granjaId: string;
  estado: string;
  categoria: string;
}

export const EMPTY_INV_FILTROS: InventariosFiltros = {
  fechaDesde: "", fechaHasta: "", modulo: "", auditor: "", responsable: "",
  cediId: "", granjaId: "", estado: "", categoria: "",
};

interface State {
  filtros: InventariosFiltros;
  setFiltro: (k: keyof InventariosFiltros, v: string) => void;
  reset: () => void;
}

export const useInventariosFiltros = create<State>((set) => ({
  filtros: { ...EMPTY_INV_FILTROS },
  setFiltro: (k, v) => set((s) => ({ filtros: { ...s.filtros, [k]: v } })),
  reset: () => set({ filtros: { ...EMPTY_INV_FILTROS } }),
}));

// Nº de filtros activos (para el badge). El módulo no cuenta en páginas de módulo.
export const contarFiltrosActivos = (f: InventariosFiltros, ignoreModulo = false): number =>
  (Object.entries(f) as [keyof InventariosFiltros, string][])
    .filter(([k, v]) => !!v && !(ignoreModulo && k === "modulo")).length;

// Filtro puro reutilizado por el Dashboard y los módulos.
// ignoreModulo=true en páginas de módulo (el módulo ya está fijo por la ruta).
export function filtrarInventario(
  rows: InventarioAuditado[],
  f: InventariosFiltros,
  opts?: { ignoreModulo?: boolean },
): InventarioAuditado[] {
  return rows.filter((r) => {
    if (!opts?.ignoreModulo && f.modulo && r.modulo !== f.modulo) return false;
    if (f.estado && r.estado !== f.estado) return false;
    if (f.categoria && (r.categoria || "") !== f.categoria) return false;
    if (f.auditor && (r.auditor || "") !== f.auditor) return false;
    if (f.responsable && (r.responsable || "") !== f.responsable) return false;
    if (f.cediId && r.cediId !== f.cediId) return false;
    if (f.granjaId && r.granjaId !== f.granjaId) return false;
    const fecha = String(r.fecha || "").slice(0, 10);
    if (f.fechaDesde && fecha < f.fechaDesde) return false;
    if (f.fechaHasta && fecha > f.fechaHasta) return false;
    return true;
  });
}
