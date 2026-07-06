// ═══════════════════════════════════════════════════════════════════════════════
// ANEXOS TÉCNICOS DEL HALLAZGO — 5 pestañas opcionales (actas de conteo, recepción
// de aves, inventarios de bultos). Se guardan como JSON en Hallazgo.anexosTecnicos.
// Tipos + cálculos automáticos compartidos entre el formulario (editor) y los
// informes de Cumplimiento KPI (render). No se inventan datos: todo es del usuario.
// ═══════════════════════════════════════════════════════════════════════════════

export interface ActaConteoPicosRow { fechaConteo: string; reporteConteo: number; reporteFisico: number; }
export interface RecepcionAvesRow   { fecha: string; machos: number; hembras: number; }
// Resumen al final de la pestaña "Recepción de Aves" (conciliación de saldo vs mortalidad).
export interface RecepcionAvesResumen {
  reporteActaConteoPicos: number;   // mortalidad reportada (acta conteo de picos)
  reporteSaldoAves: number;
  saldoIdentificadoAves: number;
  faltanteAvesCorte: number;
}
export interface InventarioBultosRow{ galpon: string; bultos: number; lonas: number; }
export interface IngresoBultosRow   { fecha: string; concepto: string; unidades: number; cantidadKg: number; }
export interface TotalBultosRow     { concepto: string; cantidad: number; pesoTotalKg: number; }
export interface TotalBultosBloque  { titulo: string; filas: TotalBultosRow[]; }
export interface TotalBultos        { bloques: TotalBultosBloque[]; diferencias: number; observaciones: string; }

export interface AnexosTecnicos {
  actaConteoPicos:  ActaConteoPicosRow[];
  recepcionAves:    RecepcionAvesRow[];
  recepcionAvesResumen: RecepcionAvesResumen;
  inventarioBultos: InventarioBultosRow[];
  ingresoBultos:    IngresoBultosRow[];
  totalBultos:      TotalBultos;
}

export function emptyRecepcionResumen(): RecepcionAvesResumen {
  return { reporteActaConteoPicos: 0, reporteSaldoAves: 0, saldoIdentificadoAves: 0, faltanteAvesCorte: 0 };
}

export function emptyAnexos(): AnexosTecnicos {
  return {
    actaConteoPicos: [], recepcionAves: [], recepcionAvesResumen: emptyRecepcionResumen(),
    inventarioBultos: [], ingresoBultos: [],
    totalBultos: { bloques: [], diferencias: 0, observaciones: "" },
  };
}

// Parsea el JSON almacenado en Hallazgo.anexosTecnicos, tolerante a datos parciales.
export function parseAnexos(json?: string | null): AnexosTecnicos {
  const base = emptyAnexos();
  if (!json) return base;
  try {
    const p = JSON.parse(json) || {};
    const res = p.recepcionAvesResumen || {};
    return {
      actaConteoPicos:  Array.isArray(p.actaConteoPicos)  ? p.actaConteoPicos  : [],
      recepcionAves:    Array.isArray(p.recepcionAves)    ? p.recepcionAves    : [],
      recepcionAvesResumen: {
        reporteActaConteoPicos: num(res.reporteActaConteoPicos),
        reporteSaldoAves:       num(res.reporteSaldoAves),
        saldoIdentificadoAves:  num(res.saldoIdentificadoAves),
        faltanteAvesCorte:      num(res.faltanteAvesCorte),
      },
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
export function recepcionResumenTieneDatos(r?: RecepcionAvesResumen): boolean {
  if (!r) return false;
  return num(r.reporteActaConteoPicos) !== 0 || num(r.reporteSaldoAves) !== 0 ||
    num(r.saldoIdentificadoAves) !== 0 || num(r.faltanteAvesCorte) !== 0;
}

export function anexosTienenDatos(a: AnexosTecnicos): boolean {
  return a.actaConteoPicos.length > 0 || a.recepcionAves.length > 0 ||
    a.inventarioBultos.length > 0 || a.ingresoBultos.length > 0 ||
    a.totalBultos.bloques.some(b => b.filas.length > 0) ||
    !!a.totalBultos.observaciones?.trim() ||
    recepcionResumenTieneDatos(a.recepcionAvesResumen);
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
// Diferencia entre el faltante de aves al corte y la mortalidad reportada (acta conteo de picos).
export const difFaltanteMortalidad = (r: RecepcionAvesResumen) => num(r.faltanteAvesCorte) - num(r.reporteActaConteoPicos);
