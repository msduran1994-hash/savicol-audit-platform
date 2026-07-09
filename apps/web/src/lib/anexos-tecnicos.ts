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
// Bitácora de Ingreso a la Granja (sección aparte del hallazgo).
export interface BitacoraIngresoRow { fecha: string; responsable: string; }
// Registro de Colaboradores (sección aparte del hallazgo).
export interface RegistroColaboradorRow { nombre: string; cargo: string; }
// Registro Mortalidad Diaria — bloques semanales de 7 días (mortalidad diaria del lote).
// `semanas`: cada elemento es una semana con hasta 7 valores de mortalidad diaria.
export interface RegistroMortalidadDiaria { avesIniciales: number; semanas: number[][]; }
// Bultos Consumidos por Día — mismos bloques semanales; consumo/ave en kg (kgPorBulto config., def. 40).
export interface RegistroBultosConsumidos { kgPorBulto: number; semanas: number[][]; }

export interface AnexosTecnicos {
  actaConteoPicos:  ActaConteoPicosRow[];
  recepcionAves:    RecepcionAvesRow[];
  recepcionAvesResumen: RecepcionAvesResumen;
  inventarioBultos: InventarioBultosRow[];
  ingresoBultos:    IngresoBultosRow[];
  totalBultos:      TotalBultos;
  bitacoraIngreso:  BitacoraIngresoRow[];
  registroColaboradores: RegistroColaboradorRow[];
  registroMortalidadDiaria: RegistroMortalidadDiaria;
  registroBultosConsumidos: RegistroBultosConsumidos;
}

export function emptyRecepcionResumen(): RecepcionAvesResumen {
  return { reporteActaConteoPicos: 0, reporteSaldoAves: 0, saldoIdentificadoAves: 0, faltanteAvesCorte: 0 };
}

export function emptyAnexos(): AnexosTecnicos {
  return {
    actaConteoPicos: [], recepcionAves: [], recepcionAvesResumen: emptyRecepcionResumen(),
    inventarioBultos: [], ingresoBultos: [],
    totalBultos: { bloques: [], diferencias: 0, observaciones: "" },
    bitacoraIngreso: [],
    registroColaboradores: [],
    registroMortalidadDiaria: { avesIniciales: 0, semanas: [] },
    registroBultosConsumidos: { kgPorBulto: 40, semanas: [] },
  };
}

// Normaliza una matriz de semanas (bloques de días), preservando celdas en blanco.
function parseSemanas(v: any): number[][] {
  return Array.isArray(v) ? v.map((w: any) => (Array.isArray(w) ? w : [])) : [];
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
      bitacoraIngreso: Array.isArray(p.bitacoraIngreso) ? p.bitacoraIngreso : [],
      registroColaboradores: Array.isArray(p.registroColaboradores) ? p.registroColaboradores : [],
      registroMortalidadDiaria: {
        avesIniciales: p.registroMortalidadDiaria?.avesIniciales ?? 0,
        semanas: parseSemanas(p.registroMortalidadDiaria?.semanas),
      },
      registroBultosConsumidos: {
        kgPorBulto: num(p.registroBultosConsumidos?.kgPorBulto) || 40,
        semanas: parseSemanas(p.registroBultosConsumidos?.semanas),
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
    recepcionResumenTieneDatos(a.recepcionAvesResumen) ||
    a.bitacoraIngreso.length > 0 ||
    a.registroColaboradores.length > 0 ||
    registroMortalidadTieneDatos(a.registroMortalidadDiaria) ||
    a.registroBultosConsumidos.semanas.some(w => w.length > 0);
}

// ¿Hay datos en la mortalidad diaria? (aves iniciales o alguna semana con días)
export function registroMortalidadTieneDatos(r?: RegistroMortalidadDiaria): boolean {
  if (!r) return false;
  return num(r.avesIniciales) > 0 || (r.semanas || []).some(w => w.length > 0);
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

// Total de aves recibidas (suma de machos + hembras de la pestaña Recepción de Aves).
export const avesRecibidasTotal = (a: AnexosTecnicos) => a.recepcionAves.reduce((s, r) => s + totalRecepcion(r), 0);

// % Mortalidad = (Aves Recibidas − Reporte Saldo de Aves) / Aves Recibidas × 100.
// Devuelve null si el total de aves recibidas no es > 0 (regla de validación).
export function pctMortalidad(a: AnexosTecnicos): number | null {
  const recibidas = avesRecibidasTotal(a);
  if (recibidas <= 0) return null;
  return ((recibidas - num(a.recepcionAvesResumen.reporteSaldoAves)) / recibidas) * 100;
}

// ─── Registro Mortalidad Diaria (cálculos por día/semana/acumulado) ─────────────
export interface MortDiaCalc    { semana: number; dia: number; diaGlobal: number; mortalidad: number; totalAcumulado: number; saldo: number; pctAcumulado: number | null; }
export interface MortSemanaCalc { semana: number; totalSemanal: number; pctSemanal: number | null; saldoFinal: number; dias: MortDiaCalc[]; }
export interface MortalidadDiariaCalc { aves: number; totalGeneral: number; pctAcumuladoFinal: number | null; saldoFinal: number; semanas: MortSemanaCalc[]; }

// Total semanal, acumulado, % semanal/acumulado y saldo de aves por día.
export function calcMortalidadDiaria(r: RegistroMortalidadDiaria): MortalidadDiariaCalc {
  const aves = num(r?.avesIniciales);
  let acum = 0, g = 0;
  const semanas: MortSemanaCalc[] = (r?.semanas || []).map((w, wi) => {
    const dias: MortDiaCalc[] = (w || []).map((mv, di) => {
      const mortalidad = num(mv); acum += mortalidad; g += 1;
      return { semana: wi + 1, dia: di + 1, diaGlobal: g, mortalidad, totalAcumulado: acum, saldo: aves - acum, pctAcumulado: aves > 0 ? (acum / aves) * 100 : null };
    });
    const totalSemanal = dias.reduce((s, d) => s + d.mortalidad, 0);
    return { semana: wi + 1, totalSemanal, pctSemanal: aves > 0 ? (totalSemanal / aves) * 100 : null, saldoFinal: dias.length ? dias[dias.length - 1].saldo : aves, dias };
  });
  return { aves, totalGeneral: acum, pctAcumuladoFinal: aves > 0 ? (acum / aves) * 100 : null, saldoFinal: aves - acum, semanas };
}

// Saldo de aves vivas por día global (según la mortalidad diaria del lote).
export function saldoVivoPorDia(mort: RegistroMortalidadDiaria): number[] {
  const aves = num(mort?.avesIniciales); const out: number[] = []; let acum = 0;
  (mort?.semanas || []).forEach(w => (w || []).forEach(mv => { acum += num(mv); out.push(aves - acum); }));
  return out;
}

// ─── Bultos Consumidos por Día (consumo/ave en kg sobre el saldo de aves vivas) ─
export interface BultoDiaCalc    { semana: number; dia: number; diaGlobal: number; bultos: number; totalAcumulado: number; saldoVivo: number; consumoAveDia: number | null; }
export interface BultoSemanaCalc { semana: number; totalBultos: number; consumoSemanalAve: number | null; consumoAcumuladoAve: number | null; dias: BultoDiaCalc[]; }
export interface BultosConsumidosCalc { kgPorBulto: number; totalBultos: number; totalKg: number; consumoAcumuladoAveFinal: number | null; semanas: BultoSemanaCalc[]; }

// Consumo por ave (kg) = (bultos × kgPorBulto) ÷ saldo de aves vivas del día.
// La base de aves = saldo vivo (mortalidad diaria); si esa pestaña está vacía usa `avesFallback`.
export function calcBultosConsumidos(r: RegistroBultosConsumidos, mort: RegistroMortalidadDiaria, avesFallback: number): BultosConsumidosCalc {
  const kgPorBulto = num(r?.kgPorBulto) || 40;
  const avesIni = num(mort?.avesIniciales) > 0 ? num(mort.avesIniciales) : num(avesFallback);
  const saldos = saldoVivoPorDia(mort);
  const saldoAt = (idx: number): number => saldos.length > idx ? saldos[idx] : (saldos.length ? saldos[saldos.length - 1] : avesIni);
  let acumBultos = 0, g = 0;
  const semanas: BultoSemanaCalc[] = (r?.semanas || []).map((w, wi) => {
    const dias: BultoDiaCalc[] = (w || []).map((bv, di) => {
      const bultos = num(bv); acumBultos += bultos; const idx = g; g += 1;
      const saldoVivo = saldoAt(idx);
      return { semana: wi + 1, dia: di + 1, diaGlobal: idx + 1, bultos, totalAcumulado: acumBultos, saldoVivo, consumoAveDia: saldoVivo > 0 ? (bultos * kgPorBulto) / saldoVivo : null };
    });
    const totalBultos = dias.reduce((s, d) => s + d.bultos, 0);
    const saldoFin = dias.length ? dias[dias.length - 1].saldoVivo : avesIni;
    return { semana: wi + 1, totalBultos, consumoSemanalAve: saldoFin > 0 ? (totalBultos * kgPorBulto) / saldoFin : null, consumoAcumuladoAve: saldoFin > 0 ? (acumBultos * kgPorBulto) / saldoFin : null, dias };
  });
  const saldoFinal = saldos.length ? saldos[saldos.length - 1] : avesIni;
  return { kgPorBulto, totalBultos: acumBultos, totalKg: acumBultos * kgPorBulto, consumoAcumuladoAveFinal: saldoFinal > 0 ? (acumBultos * kgPorBulto) / saldoFinal : null, semanas };
}
