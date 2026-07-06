// ═══════════════════════════════════════════════════════════════════════════════
// ANEXOS TÉCNICOS DEL HALLAZGO — 5 pestañas opcionales (actas de conteo, recepción
// de aves, inventarios de bultos). Se guardan como JSON en Hallazgo.anexosTecnicos.
// Tipos + cálculos automáticos compartidos entre el formulario (editor) y los
// informes de Cumplimiento KPI (render). No se inventan datos: todo es del usuario.
// ═══════════════════════════════════════════════════════════════════════════════

export interface ActaConteoPicosRow { fechaConteo: string; reporteConteo: number; reporteFisico: number; }
export interface RecepcionAvesRow   { fecha: string; machos: number; hembras: number; }
export interface InventarioBultosRow{ galpon: string; bultos: number; lonas: number; }
export interface IngresoBultosRow   { fecha: string; concepto: string; unidades: number; cantidadKg: number; }
export interface TotalBultosRow     { concepto: string; cantidad: number; pesoTotalKg: number; }
export interface TotalBultosBloque  { titulo: string; filas: TotalBultosRow[]; }
export interface TotalBultos        { bloques: TotalBultosBloque[]; diferencias: number; observaciones: string; }

export interface AnexosTecnicos {
  actaConteoPicos:  ActaConteoPicosRow[];
  recepcionAves:    RecepcionAvesRow[];
  inventarioBultos: InventarioBultosRow[];
  ingresoBultos:    IngresoBultosRow[];
  totalBultos:      TotalBultos;
}

export function emptyAnexos(): AnexosTecnicos {
  return {
    actaConteoPicos: [], recepcionAves: [], inventarioBultos: [], ingresoBultos: [],
    totalBultos: { bloques: [], diferencias: 0, observaciones: "" },
  };
}

// Parsea el JSON almacenado en Hallazgo.anexosTecnicos, tolerante a datos parciales.
export function parseAnexos(json?: string | null): AnexosTecnicos {
  const base = emptyAnexos();
  if (!json) return base;
  try {
    const p = JSON.parse(json) || {};
    return {
      actaConteoPicos:  Array.isArray(p.actaConteoPicos)  ? p.actaConteoPicos  : [],
      recepcionAves:    Array.isArray(p.recepcionAves)    ? p.recepcionAves    : [],
      inventarioBultos: Array.isArray(p.inventarioBultos) ? p.inventarioBultos : [],
      ingresoBultos:    Array.isArray(p.ingresoBultos)    ? p.ingresoBultos    : [],
      totalBultos: {
        bloques:      Array.isArray(p.totalBultos?.bloques) ? p.totalBultos.bloques : [],
        diferencias:  num(p.totalBultos?.diferencias),
        observaciones: typeof p.totalBultos?.observaciones === "string" ? p.totalBultos.observaciones : "",
      },
    };
  } catch { return base; }
}

// ¿El auditor diligenció algo? (para no guardar/render anexos vacíos)
export function anexosTienenDatos(a: AnexosTecnicos): boolean {
  return a.actaConteoPicos.length > 0 || a.recepcionAves.length > 0 ||
    a.inventarioBultos.length > 0 || a.ingresoBultos.length > 0 ||
    a.totalBultos.bloques.some(b => b.filas.length > 0) ||
    !!a.totalBultos.observaciones?.trim();
}

// ─── Cálculos automáticos ──────────────────────────────────────────────────────
export const num = (v: any): number => { const n = typeof v === "number" ? v : parseFloat(v); return isNaN(n) ? 0 : n; };
export const difConteoPicos      = (r: ActaConteoPicosRow)  => num(r.reporteConteo) - num(r.reporteFisico);
export const totalRecepcion      = (r: RecepcionAvesRow)    => num(r.machos) + num(r.hembras);
export const totalInvBultos      = (r: InventarioBultosRow) => num(r.bultos) + num(r.lonas);
export const pesoTotalIngreso    = (r: IngresoBultosRow)    => num(r.unidades) * num(r.cantidadKg);
export const subtotalBloque      = (b: TotalBultosBloque)   => b.filas.reduce((a, f) => a + num(f.pesoTotalKg), 0);
export const cantidadBloque      = (b: TotalBultosBloque)   => b.filas.reduce((a, f) => a + num(f.cantidad), 0);
export const totalGeneralBultos  = (t: TotalBultos)         => t.bloques.reduce((a, b) => a + subtotalBloque(b), 0);
