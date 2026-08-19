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
export interface TotalBultosRow     { concepto: string; cantidad: number; pesoTotalKg: number; fecha?: string; }
export interface TotalBultosBloque  { titulo: string; filas: TotalBultosRow[]; }
export interface TotalBultos        { bloques: TotalBultosBloque[]; diferencias: number; observaciones: string; }
// Bitácora de Ingreso a la Granja (sección aparte del hallazgo).
export interface BitacoraIngresoRow { fecha: string; responsable: string; }
// Registro de Colaboradores (sección aparte del hallazgo).
export interface RegistroColaboradorRow { nombre: string; cargo: string; }
// Un galpón dentro del lote: nº de lote (editable manualmente para trazabilidad), aves ingresadas
// (desde el módulo Lotes, editables) + su mortalidad diaria en bloques semanales de 7 días (ilimitadas).
export interface GalponMortalidad { galpon: string; lote?: string; fechaEncasetamiento?: string; avesIngresadas: number; semanas: number[][]; }
// Registro Mortalidad Diaria — trazable por lote/galpón (granja+lote+fecha de encasetamiento).
// `avesIniciales` y `semanas` son el CONSOLIDADO (suma entre galpones) que consumen los informes
// existentes sin cambios; `galpones` es el detalle por galpón (trazabilidad y "Mortalidad por Galpón").
export interface RegistroMortalidadDiaria {
  avesIniciales: number;              // consolidado = Σ galpones.avesIngresadas (compat informes)
  semanas: number[][];                // consolidado = suma por día entre galpones (compat informes)
  granjaId?: string;                  // enlace al módulo Lotes
  loteCodigo?: string;
  fechaEncasetamiento?: string;
  galpones?: GalponMortalidad[];      // detalle por galpón (opcional; ausente en registros antiguos)
}
// Suma la mortalidad de todos los galpones alineando por índice de semana/día, y las aves ingresadas.
// Produce la serie consolidada que consumen los informes existentes (mismo shape que la serie plana).
export function consolidarGalpones(galpones: GalponMortalidad[]): { avesIniciales: number; semanas: number[][] } {
  const avesIniciales = galpones.reduce((s, g) => s + num(g.avesIngresadas), 0);
  const semanas: number[][] = [];
  for (const g of galpones) {
    (g.semanas || []).forEach((w, wi) => {
      if (!semanas[wi]) semanas[wi] = [];
      (w || []).forEach((mv, di) => { semanas[wi][di] = num(semanas[wi][di]) + num(mv); });
    });
  }
  return { avesIniciales, semanas };
}
// Bultos Consumidos por Día — mismos bloques semanales; consumo/ave en kg (kgPorBulto config., def. 40).
// `semanas` es el CONSOLIDADO (Σ entre galpones) que consumen los informes; `galpones` es el detalle
// por galpón (mismos galpones que Mortalidad Diaria) para validar el consumo de bultos POR galpón.
export interface GalponBultos { galpon: string; avesEncasetadas: number; fechaEncasetamiento?: string; semanas: number[][]; }
export interface RegistroBultosConsumidos { kgPorBulto: number; semanas: number[][]; galpones?: GalponBultos[]; }
// Suma los bultos de todos los galpones alineando por índice de semana/día (serie consolidada para informes).
export function consolidarGalponesBultos(galpones: GalponBultos[]): { semanas: number[][] } {
  const semanas: number[][] = [];
  for (const g of galpones) {
    (g.semanas || []).forEach((w, wi) => {
      if (!semanas[wi]) semanas[wi] = [];
      (w || []).forEach((bv, di) => { semanas[wi][di] = num(semanas[wi][di]) + num(bv); });
    });
  }
  return { semanas };
}

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

// Parsea el registro de mortalidad. Si trae `galpones` usa el detalle y RECALCULA el consolidado
// (garantiza consistencia); si no, conserva la serie plana antigua (retrocompatible, sin pérdida).
function parseMortalidad(p: any): RegistroMortalidadDiaria {
  if (!p) return { avesIniciales: 0, semanas: [] };
  const galpones = Array.isArray(p.galpones)
    ? p.galpones.map((g: any) => ({ galpon: String(g?.galpon ?? ""), lote: typeof g?.lote === "string" ? g.lote : undefined, fechaEncasetamiento: typeof g?.fechaEncasetamiento === "string" ? g.fechaEncasetamiento : undefined, avesIngresadas: num(g?.avesIngresadas), semanas: parseSemanas(g?.semanas) }))
    : undefined;
  // El lote y la fecha de encasetamiento se registran por galpón (cada galpón tiene su propio ingreso).
  // Para las leyendas de los informes se derivan del detalle por galpón, con respaldo al valor antiguo
  // a nivel de registro (retrocompatible).
  const galpLotes  = galpones ? [...new Set(galpones.map((g: any) => String(g.lote ?? "").trim()).filter(Boolean))] : [];
  const galpFechas = galpones ? galpones.map((g: any) => g.fechaEncasetamiento).filter(Boolean).sort() : [];
  const meta = { granjaId: typeof p.granjaId === "string" ? p.granjaId : undefined,
                 loteCodigo: galpLotes.length ? galpLotes.join(", ") : (typeof p.loteCodigo === "string" ? p.loteCodigo || undefined : undefined),
                 fechaEncasetamiento: galpFechas.length ? galpFechas[0] : (typeof p.fechaEncasetamiento === "string" ? p.fechaEncasetamiento || undefined : undefined) };
  if (galpones && galpones.length) return { ...consolidarGalpones(galpones), ...meta, galpones };
  return { avesIniciales: num(p.avesIniciales), semanas: parseSemanas(p.semanas), ...meta };
}

// Parsea el registro de bultos consumidos. Si trae `galpones` usa el detalle y RECALCULA el
// consolidado (Σ); si no, conserva la serie plana antigua (retrocompatible, sin pérdida).
function parseBultosConsumidos(p: any): RegistroBultosConsumidos {
  const kgPorBulto = num(p?.kgPorBulto) || 40;
  const galpones = Array.isArray(p?.galpones)
    ? p.galpones.map((g: any) => ({ galpon: String(g?.galpon ?? ""), avesEncasetadas: num(g?.avesEncasetadas), fechaEncasetamiento: typeof g?.fechaEncasetamiento === "string" ? g.fechaEncasetamiento : undefined, semanas: parseSemanas(g?.semanas) }))
    : undefined;
  if (galpones && galpones.length) return { kgPorBulto, ...consolidarGalponesBultos(galpones), galpones };
  return { kgPorBulto, semanas: parseSemanas(p?.semanas) };
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
      registroMortalidadDiaria: parseMortalidad(p.registroMortalidadDiaria),
      registroBultosConsumidos: parseBultosConsumidos(p.registroBultosConsumidos),
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
    registroBultosTieneDatos(a.registroBultosConsumidos);
}

// ¿Hay datos en la mortalidad diaria? (aves iniciales o alguna semana con días)
export function registroMortalidadTieneDatos(r?: RegistroMortalidadDiaria): boolean {
  if (!r) return false;
  if (r.galpones?.some(g => num(g.avesIngresadas) > 0 || (g.semanas || []).some(w => w.length > 0))) return true;
  return num(r.avesIniciales) > 0 || (r.semanas || []).some(w => w.length > 0);
}

// ¿Hay datos en bultos consumidos? (aves encasetadas/fecha por galpón, o alguna semana con bultos)
export function registroBultosTieneDatos(r?: RegistroBultosConsumidos): boolean {
  if (!r) return false;
  if (r.galpones?.some(g => num(g.avesEncasetadas) > 0 || !!g.fechaEncasetamiento || (g.semanas || []).some(w => w.length > 0))) return true;
  return (r.semanas || []).some(w => w.length > 0);
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

// ─── Conciliación de saldo de aves (derivada de la pestaña Acta Conteo de Picos) ──
// Reestructura: 3 de los 4 campos se calculan del acta; solo "Reporte saldo de aves"
// (recepcionAvesResumen.reporteSaldoAves) sigue siendo manual.
//  · Reporte acta conteo de picos = Σ "Reporte conteo"
//  · Saldo identificado de aves    = Σ "Reporte físico"
//  · Faltante aves al corte        = Σ Reporte conteo − Σ Reporte físico
export const totalReporteConteo   = (a: AnexosTecnicos) => a.actaConteoPicos.reduce((s, r) => s + num(r.reporteConteo), 0);
export const totalReporteFisico   = (a: AnexosTecnicos) => a.actaConteoPicos.reduce((s, r) => s + num(r.reporteFisico), 0);
export const faltanteConciliacion = (a: AnexosTecnicos) => totalReporteConteo(a) - totalReporteFisico(a);

// Total de aves recibidas (suma de machos + hembras de la pestaña Recepción de Aves).
export const avesRecibidasTotal = (a: AnexosTecnicos) => a.recepcionAves.reduce((s, r) => s + totalRecepcion(r), 0);

// Total mortalidad de aves = "Mortalidad Total" de la pestaña Mortalidad Diaria (Σ de la
// mortalidad diaria del lote). Es el numerador del % Mortalidad. Distinto de
// faltanteConciliacion (= Reporte conteo − Reporte físico del acta, que en la UI se
// muestra como "Diferencia").
export const totalMortalidadAves = (a: AnexosTecnicos) => calcMortalidadDiaria(a.registroMortalidadDiaria).totalGeneral;

// Diferencia entre el conteo de picos del acta y la mortalidad total registrada
// (Reporte acta conteo de picos − Total mortalidad de aves): descuadre entre el conteo
// físico de picos y lo registrado como mortalidad.
export const difConteoMortalidad = (a: AnexosTecnicos) => totalReporteConteo(a) - totalMortalidadAves(a);

// ─── Conciliación de inventario de bultos (pestaña "Total de Bultos", en unidades) ──
// Los 3 bloques son automáticos: Ingreso (pestaña Ingreso de Bultos), Salida (pestaña
// Bultos Consumidos) y Conteo físico (pestaña Inventario Bultos). Total general = Ingreso
// − Salida − Conteo físico = faltante de bultos, que se valida contra Bultos Consumidos.
export const totalIngresoUnidades  = (a: AnexosTecnicos) => a.ingresoBultos.reduce((s, r) => s + num(r.unidades), 0);
export const totalIngresoKg        = (a: AnexosTecnicos) => a.ingresoBultos.reduce((s, r) => s + pesoTotalIngreso(r), 0);
export const totalInventarioBultos = (a: AnexosTecnicos) => a.inventarioBultos.reduce((s, r) => s + totalInvBultos(r), 0);
// Solo la columna "bultos" (sin lonas) y solo la columna "lonas" del Inventario Bultos.
export const totalInventarioBultosSolo = (a: AnexosTecnicos) => a.inventarioBultos.reduce((s, r) => s + num(r.bultos), 0);
export const totalInventarioLonas      = (a: AnexosTecnicos) => a.inventarioBultos.reduce((s, r) => s + num(r.lonas), 0);
export const totalBultosConsumidos = (a: AnexosTecnicos) => calcBultosConsumidos(a.registroBultosConsumidos, a.registroMortalidadDiaria, avesRecibidasTotal(a)).totalBultos;
export const totalKgConsumidos     = (a: AnexosTecnicos) => calcBultosConsumidos(a.registroBultosConsumidos, a.registroMortalidadDiaria, avesRecibidasTotal(a)).totalKg;
export const conciliacionBultos    = (a: AnexosTecnicos) => totalIngresoUnidades(a) - totalBultosConsumidos(a) - totalInventarioBultos(a);

// % Mortalidad = Total mortalidad de aves (Σ mortalidad diaria) / Aves Recibidas × 100.
// Devuelve null si el total de aves recibidas no es > 0 (regla de validación).
export function pctMortalidad(a: AnexosTecnicos): number | null {
  const recibidas = avesRecibidasTotal(a);
  if (recibidas <= 0) return null;
  return (totalMortalidadAves(a) / recibidas) * 100;
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

// Mortalidad por galpón (para el desglose de informes). Reutiliza calcMortalidadDiaria por galpón.
export interface MortGalponResumen { galpon: string; aves: number; total: number; pct: number | null; saldo: number; dias: number; }
export function mortalidadPorGalpon(r?: RegistroMortalidadDiaria): MortGalponResumen[] {
  if (!r?.galpones?.length) return [];
  return r.galpones.map(g => {
    const c = calcMortalidadDiaria({ avesIniciales: num(g.avesIngresadas), semanas: g.semanas });
    const dias = (g.semanas || []).reduce((s, w) => s + (w || []).filter(v => String(v ?? "").trim() !== "").length, 0);
    return { galpon: g.galpon || "—", aves: c.aves, total: c.totalGeneral, pct: c.pctAcumuladoFinal, saldo: c.saldoFinal, dias };
  });
}

// Saldo de aves vivas por día global (según la mortalidad diaria del lote).
export function saldoVivoPorDia(mort: RegistroMortalidadDiaria): number[] {
  const aves = num(mort?.avesIniciales); const out: number[] = []; let acum = 0;
  (mort?.semanas || []).forEach(w => (w || []).forEach(mv => { acum += num(mv); out.push(aves - acum); }));
  return out;
}

// ─── Bultos Consumidos por Día (consumo/ave en kg sobre el saldo de aves vivas) ─
// consumoAveDia = consumo del día por ave; consumoSemAve = acumulado por ave DENTRO de la semana (corrido);
// consumoAcumAve = acumulado por ave de TODO el lote (corrido).
export interface BultoDiaCalc    { semana: number; dia: number; diaGlobal: number; bultos: number; totalAcumulado: number; saldoVivo: number; consumoAveDia: number | null; consumoSemAve: number | null; consumoAcumAve: number | null; }
export interface BultoSemanaCalc { semana: number; totalBultos: number; consumoDiaAvePromedio: number | null; consumoSemanalAve: number | null; consumoAcumuladoAve: number | null; dias: BultoDiaCalc[]; }
export interface BultosConsumidosCalc { kgPorBulto: number; totalBultos: number; totalKg: number; consumoAcumuladoAveFinal: number | null; semanas: BultoSemanaCalc[]; }

// Consumo por ave (kg) = (bultos × kgPorBulto) ÷ base de aves del día.
// Base de aves: si el registro de bultos trae aves ENCASETADAS por galpón (registro manual e
// INDEPENDIENTE de la mortalidad), se usan como base CONSTANTE (Σ, sin descontar mortalidad); si no,
// cae al saldo vivo de la mortalidad diaria (retrocompatible) y, si esa pestaña está vacía, `avesFallback`.
export function calcBultosConsumidos(r: RegistroBultosConsumidos, mort: RegistroMortalidadDiaria, avesFallback: number): BultosConsumidosCalc {
  const kgPorBulto = num(r?.kgPorBulto) || 40;
  const avesEnc = (r?.galpones || []).reduce((s, g) => s + num(g.avesEncasetadas), 0);
  const usaEnc = avesEnc > 0;                                    // aves encasetadas del propio registro (independiente)
  const avesIni = usaEnc ? avesEnc : (num(mort?.avesIniciales) > 0 ? num(mort.avesIniciales) : num(avesFallback));
  const saldos = usaEnc ? [] : saldoVivoPorDia(mort);            // con aves encasetadas la base es CONSTANTE (sin mortalidad)
  const saldoAt = (idx: number): number => saldos.length > idx ? saldos[idx] : (saldos.length ? saldos[saldos.length - 1] : avesIni);
  let acumBultos = 0, g = 0;
  const semanas: BultoSemanaCalc[] = (r?.semanas || []).map((w, wi) => {
    let acumSemBultos = 0;
    const dias: BultoDiaCalc[] = (w || []).map((bv, di) => {
      const bultos = num(bv); acumBultos += bultos; acumSemBultos += bultos; const idx = g; g += 1;
      const saldoVivo = saldoAt(idx);
      return { semana: wi + 1, dia: di + 1, diaGlobal: idx + 1, bultos, totalAcumulado: acumBultos, saldoVivo,
        consumoAveDia:  saldoVivo > 0 ? (bultos * kgPorBulto) / saldoVivo : null,
        consumoSemAve:  saldoVivo > 0 ? (acumSemBultos * kgPorBulto) / saldoVivo : null,
        consumoAcumAve: saldoVivo > 0 ? (acumBultos * kgPorBulto) / saldoVivo : null };
    });
    const totalBultos = dias.reduce((s, d) => s + d.bultos, 0);
    const saldoFin = dias.length ? dias[dias.length - 1].saldoVivo : avesIni;
    const diasCon = dias.filter(d => d.consumoAveDia !== null);
    const consumoDiaAvePromedio = diasCon.length ? diasCon.reduce((s, d) => s + (d.consumoAveDia || 0), 0) / diasCon.length : null;
    return { semana: wi + 1, totalBultos, consumoDiaAvePromedio, consumoSemanalAve: saldoFin > 0 ? (totalBultos * kgPorBulto) / saldoFin : null, consumoAcumuladoAve: saldoFin > 0 ? (acumBultos * kgPorBulto) / saldoFin : null, dias };
  });
  const saldoFinal = saldos.length ? saldos[saldos.length - 1] : avesIni;
  return { kgPorBulto, totalBultos: acumBultos, totalKg: acumBultos * kgPorBulto, consumoAcumuladoAveFinal: saldoFinal > 0 ? (acumBultos * kgPorBulto) / saldoFinal : null, semanas };
}

// Bultos consumidos por galpón (para validar el consumo POR galpón). Registro INDEPENDIENTE: cada
// galpón lleva sus propias aves encasetadas (base constante del consumo por ave) y su serie de bultos.
export interface BultoGalponResumen { galpon: string; aves: number; totalBultos: number; totalKg: number; consumoAve: number | null; dias: number; }
export function bultosPorGalpon(bc?: RegistroBultosConsumidos): BultoGalponResumen[] {
  if (!bc?.galpones?.length) return [];
  const kgPorBulto = num(bc.kgPorBulto) || 40;
  return bc.galpones.map(g => {
    const aves = num(g.avesEncasetadas);
    const c = calcBultosConsumidos({ kgPorBulto, semanas: g.semanas }, { avesIniciales: 0, semanas: [] }, aves);
    const dias = (g.semanas || []).reduce((s, w) => s + (w || []).filter(v => String(v ?? "").trim() !== "").length, 0);
    return { galpon: g.galpon || "—", aves, totalBultos: c.totalBultos, totalKg: c.totalKg, consumoAve: c.consumoAcumuladoAveFinal, dias };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESÚMENES EJECUTIVOS AUTOMÁTICOS — análisis DETERMINISTA (por reglas) sobre los
// datos registrados. No usa IA ni inventa datos: cada frase se deriva de las cifras.
// Devuelve null cuando no hay datos suficientes. Compartido por el editor y los
// informes de Cumplimiento KPI. Las "hipótesis" son interpretaciones CONDICIONALES
// del patrón observado (posibilidades a verificar), nunca afirmaciones sin respaldo.
// ═══════════════════════════════════════════════════════════════════════════════
export interface ResumenEjecutivo {
  titulo: string;
  metricas: { label: string; valor: string; color?: string }[];
  secciones: { titulo: string; lineas: string[] }[];
}

// Ejecuta un generador de resumen de forma segura: si algo lanza (dato límite), degrada
// a null en vez de romper el render. Usado por el editor y por los informes.
export function safeResumen(fn: () => ResumenEjecutivo | null): ResumenEjecutivo | null {
  try { return fn(); } catch { return null; }
}

const f2 = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 2 });
const nivelMort = (p: number) => p >= 8 ? "crítica" : p >= 4 ? "elevada" : "dentro de parámetros aceptables";
const colorMort = (p: number) => p >= 8 ? "#EF4444" : p >= 4 ? "#F97316" : "#22C55E";

// Tendencia de una serie (primer vs último valor, umbral relativo 10%).
function tendenciaSerie(serie: number[]): { dir: "ascendente" | "descendente" | "estable"; first: number; last: number; suficiente: boolean } {
  const vals = serie.filter(v => typeof v === "number" && !isNaN(v));
  if (vals.length < 2) return { dir: "estable", first: vals[0] ?? 0, last: vals[vals.length - 1] ?? 0, suficiente: false };
  const first = vals[0], last = vals[vals.length - 1], diff = last - first;
  const rel = first !== 0 ? Math.abs(diff) / Math.abs(first) : (last !== 0 ? 1 : 0);
  return { dir: rel < 0.1 ? "estable" : diff > 0 ? "ascendente" : "descendente", first, last, suficiente: true };
}

export function resumenMortalidadDiaria(r: RegistroMortalidadDiaria): ResumenEjecutivo | null {
  if (!registroMortalidadTieneDatos(r)) return null;
  const c = calcMortalidadDiaria(r);
  if (c.semanas.length === 0) return null;
  const semanales = c.semanas.map(s => s.totalSemanal);
  const t = tendenciaSerie(semanales);
  const pico = c.semanas.reduce((mx, s) => s.totalSemanal > mx.totalSemanal ? s : mx, c.semanas[0]);
  const prom = semanales.reduce((a, b) => a + b, 0) / semanales.length;
  const pct = c.pctAcumuladoFinal;

  const hipotesis: string[] = [];
  if (pico.semana <= 2) hipotesis.push("La concentración de bajas en las primeras semanas podría asociarse a calidad del pollito, condiciones de arranque (temperatura, acceso a agua/alimento) o manejo inicial.");
  if (t.dir === "ascendente") hipotesis.push("El incremento sostenido de la mortalidad semanal podría relacionarse con un factor persistente (sanitario, ambiental o de densidad); se sugiere revisar registros clínicos y de manejo del período.");
  if (t.dir === "descendente") hipotesis.push("La reducción progresiva de la mortalidad sugiere estabilización del lote tras el arranque.");
  if (c.semanas.length >= 3 && pico.totalSemanal > prom * 1.75) hipotesis.push(`El pico de la semana ${pico.semana} se desvía marcadamente del promedio (${f2(prom)} aves/semana), lo que podría indicar un evento puntual (estrés térmico, brote sanitario o incidente de manejo) a verificar.`);
  if (hipotesis.length === 0) hipotesis.push("El comportamiento no evidencia desviaciones marcadas frente al promedio del período.");

  const riesgos: string[] = [];
  if (pct !== null && pct >= 8) riesgos.push("Mortalidad acumulada crítica: riesgo alto sobre la rentabilidad del lote y posible incumplimiento de parámetros productivos.");
  else if (pct !== null && pct >= 4) riesgos.push("Mortalidad acumulada elevada: riesgo moderado; requiere seguimiento y plan de acción.");
  if (t.dir === "ascendente") riesgos.push("Tendencia al alza: riesgo de continuidad de las bajas si no se interviene.");
  if (pct === null) riesgos.push("Sin aves iniciales registradas no es posible dimensionar el riesgo en términos porcentuales.");
  if (riesgos.length === 0) riesgos.push("No se identifican riesgos operativos relevantes a partir de los datos registrados.");

  return {
    titulo: "Resumen Ejecutivo · Mortalidad Diaria",
    metricas: [
      { label: "Mortalidad total", valor: f2(c.totalGeneral), color: "#EF4444" },
      { label: "% acumulado", valor: pct === null ? "—" : f2(pct) + "%", color: pct === null ? "#94A3B8" : colorMort(pct) },
      { label: "Saldo final", valor: c.aves > 0 ? f2(c.saldoFinal) : "—", color: "#22C55E" },
      { label: "Semanas", valor: String(c.semanas.length) },
    ],
    secciones: [
      { titulo: "Tendencia y variaciones", lineas: [
        t.suficiente ? `En ${c.semanas.length} semana(s), la mortalidad semanal es ${t.dir} (de ${f2(t.first)} a ${f2(t.last)} aves).` : `Registro de ${c.semanas.length} semana(s); serie insuficiente para una tendencia concluyente.`,
        `La semana con mayor mortalidad es la ${pico.semana} con ${f2(pico.totalSemanal)} aves${pct !== null ? ` (${f2(pico.pctSemanal ?? 0)}% del lote)` : ""}.`,
      ] },
      { titulo: "Hipótesis técnicas", lineas: hipotesis },
      { titulo: "Riesgos operativos", lineas: riesgos },
      { titulo: "Observaciones de auditoría", lineas: [
        `Análisis basado en ${c.semanas.length} semana(s) de registro; promedio de ${f2(prom)} aves/semana.`,
        c.aves > 0 ? `Aves iniciales declaradas: ${f2(c.aves)}.` : "No se registraron aves iniciales; el % y el saldo no pudieron calcularse.",
      ] },
      { titulo: "Conclusión técnica", lineas: [
        pct === null
          ? `Se registró una mortalidad total de ${f2(c.totalGeneral)} aves; complete las aves iniciales para valorar el porcentaje y el saldo.`
          : `La mortalidad acumulada del lote es de ${f2(pct)}% (${nivelMort(pct)}), con un saldo estimado de ${f2(c.saldoFinal)} aves. ${pct >= 4 ? "Se recomienda plan de seguimiento y verificación de causas." : "El comportamiento es aceptable; se recomienda mantener el monitoreo."}`,
      ] },
    ],
  };
}

export function resumenBultosConsumidos(r: RegistroBultosConsumidos, mort: RegistroMortalidadDiaria, avesFallback: number): ResumenEjecutivo | null {
  if (!(r?.semanas || []).some(w => w.length > 0)) return null;
  const c = calcBultosConsumidos(r, mort, avesFallback);
  if (c.semanas.length === 0) return null;
  const avesBase = num(mort?.avesIniciales) > 0 ? num(mort.avesIniciales) : num(avesFallback);
  const consAve = c.consumoAcumuladoAveFinal;
  const t = tendenciaSerie(c.semanas.map(s => s.consumoSemanalAve ?? 0));
  const caidas = c.semanas.filter((s, i) => i > 0 && (s.consumoSemanalAve ?? 0) < (c.semanas[i - 1].consumoSemanalAve ?? 0));

  const viabilidad: string[] = [];
  if (avesBase <= 0) viabilidad.push("Sin aves registradas no es posible evaluar la viabilidad del consumo por ave.");
  else {
    viabilidad.push(t.suficiente
      ? `El consumo semanal por ave es ${t.dir}${t.dir === "ascendente" ? ", coherente con el crecimiento del lote" : t.dir === "descendente" ? "; una caída sostenida podría indicar sub-consumo o error de registro" : ""} (de ${f2(t.first)} a ${f2(t.last)} kg/ave).`
      : "Serie insuficiente para evaluar la evolución del consumo por ave.");
    if (caidas.length) viabilidad.push(`Se detectan ${caidas.length} semana(s) con descenso del consumo por ave respecto a la previa (semana(s) ${caidas.map(s => s.semana).join(", ")}); conviene verificar disponibilidad de alimento y estado del lote.`);
  }

  return {
    titulo: "Resumen Ejecutivo · Bultos Consumidos por Día",
    metricas: [
      { label: "Total bultos", valor: f2(c.totalBultos), color: "#4A7AFF" },
      { label: "Total kg", valor: f2(c.totalKg), color: "#0EA5E9" },
      { label: "Consumo/ave (kg)", valor: consAve === null ? "—" : f2(consAve), color: "#8B5CF6" },
      { label: "Kg/bulto", valor: f2(c.kgPorBulto) },
    ],
    secciones: [
      { titulo: "Consumo", lineas: [
        `Consumo acumulado de ${f2(c.totalKg)} kg (${f2(c.totalBultos)} bultos × ${f2(c.kgPorBulto)} kg) en ${c.semanas.length} semana(s).`,
        consAve === null ? "No fue posible calcular el consumo por ave (sin saldo de aves vivas disponible)." : `Consumo promedio de ${f2(consAve)} kg por ave sobre una base de ${f2(avesBase)} aves.`,
      ] },
      { titulo: "Viabilidad y desviaciones", lineas: viabilidad },
      { titulo: "Observaciones técnicas", lineas: [
        `Análisis basado en ${c.semanas.length} semana(s) de registro de bultos.`,
        `Base de aves utilizada: ${avesBase > 0 ? f2(avesBase) + " (saldo de aves vivas)" : "no disponible"}.`,
      ] },
      { titulo: "Conclusión ejecutiva", lineas: [
        consAve === null
          ? `Se consumieron ${f2(c.totalKg)} kg de alimento; registre las aves para estimar el consumo por ave.`
          : `El lote consumió ${f2(c.totalKg)} kg (${f2(consAve)} kg/ave). ${t.dir === "descendente" ? "El patrón descendente amerita revisión." : "El patrón es consistente con el desarrollo esperado del lote."}`,
      ] },
    ],
  };
}

export function resumenRecepcionAves(a: AnexosTecnicos): ResumenEjecutivo | null {
  const filas = a.recepcionAves || [];
  const res = a.recepcionAvesResumen;
  const conteoTotal = totalReporteConteo(a);    // Reporte acta conteo de picos = Σ Reporte conteo
  const identificado = totalReporteFisico(a);   // Saldo identificado de aves    = Σ Reporte físico
  const diferencia = conteoTotal - identificado; // Diferencia del acta          = conteo − identificado
  const saldoRep = num(res.reporteSaldoAves);   // manual
  if (filas.length === 0 && a.actaConteoPicos.length === 0 && saldoRep === 0) return null;
  const recibidas = avesRecibidasTotal(a);
  const mortalidadTotal = totalMortalidadAves(a); // recibidas − reporte saldo (numerador del % real)
  const machos = filas.reduce((s, r) => s + num(r.machos), 0);
  const hembras = filas.reduce((s, r) => s + num(r.hembras), 0);
  const pct = pctMortalidad(a);

  const consistencia = a.actaConteoPicos.length === 0
    ? "Sin registros en el acta de conteo de picos para validar la conciliación."
    : diferencia === 0
    ? "El conteo de picos coincide con el saldo físicamente identificado: sin diferencia."
    : `El conteo de picos (${f2(conteoTotal)}) supera al saldo identificado (${f2(identificado)}) en ${f2(diferencia)} aves.`;

  const causas = diferencia > 0
    ? "La diferencia (conteo − identificado) puede deberse a mortalidad no reflejada en el conteo físico, errores de conteo o extravío de aves; se recomienda verificar."
    : diferencia < 0
    ? "El saldo identificado supera al conteo de picos: posible doble conteo o error de digitación en el acta."
    : "Conteo e identificación físicos concilian; registro consistente.";

  return {
    titulo: "Resumen Ejecutivo · Recepción de Aves",
    metricas: [
      { label: "Total recibido", valor: f2(recibidas), color: "#4A7AFF" },
      { label: "Machos / Hembras", valor: `${f2(machos)} / ${f2(hembras)}` },
      { label: "Total mortalidad", valor: f2(mortalidadTotal), color: "#EF4444" },
      { label: "% Mortalidad", valor: pct === null ? "—" : f2(pct) + "%", color: pct === null ? "#94A3B8" : colorMort(pct) },
    ],
    secciones: [
      { titulo: "Total y conciliación", lineas: [
        `Se recibieron ${f2(recibidas)} aves${machos + hembras > 0 ? ` (${f2(machos)} machos y ${f2(hembras)} hembras)` : ""} en ${filas.length} registro(s).`,
        a.actaConteoPicos.length ? `Reporte acta conteo de picos: ${f2(conteoTotal)}; saldo identificado (físico): ${f2(identificado)}; diferencia del acta: ${f2(diferencia)}. Reporte saldo de aves: ${f2(saldoRep)}.` : "Sin acta de conteo de picos diligenciada.",
      ] },
      { titulo: "Mortalidad y diferencias", lineas: [
        `Total mortalidad de aves (Σ mortalidad diaria) = ${f2(mortalidadTotal)} aves${recibidas > 0 && pct !== null ? ` (${f2(pct)}% sobre ${f2(recibidas)} aves recibidas)` : ""}.`,
        `Diferencia del acta = Reporte conteo − Saldo identificado = ${f2(conteoTotal)} − ${f2(identificado)} = ${f2(diferencia)} aves.`,
        `Diferencia conteo vs mortalidad = Reporte conteo − Total mortalidad = ${f2(conteoTotal)} − ${f2(mortalidadTotal)} = ${f2(conteoTotal - mortalidadTotal)} aves.`,
      ] },
      { titulo: "Validación de consistencia", lineas: [consistencia] },
      { titulo: "Posibles causas", lineas: [causas] },
      { titulo: "Impacto operativo", lineas: [
        mortalidadTotal !== 0 && recibidas > 0 ? `Una mortalidad de ${f2(mortalidadTotal)} aves${pct !== null ? ` (${f2(pct)}%)` : ""} impacta directamente el inventario y la proyección productiva del lote.` : "Sin mortalidad registrada con impacto sobre el inventario.",
      ] },
      { titulo: "Conclusión técnica", lineas: [
        `Recepción de ${f2(recibidas)} aves con una mortalidad total de ${f2(mortalidadTotal)}${pct !== null ? ` (${f2(pct)}%)` : ""} y una diferencia del acta de ${f2(diferencia)}. ${diferencia !== 0 ? "Se recomienda conciliar el acta de conteo de picos con el saldo físico." : "Los registros del acta concilian adecuadamente."}`,
      ] },
    ],
  };
}

export function resumenIngresoBultos(a: AnexosTecnicos): ResumenEjecutivo | null {
  const filas = a.ingresoBultos || [];
  if (filas.length === 0) return null;
  const unidades = filas.reduce((s, r) => s + num(r.unidades), 0);
  const peso = filas.reduce((s, r) => s + pesoTotalIngreso(r), 0);
  const kgUnidadProm = unidades > 0 ? peso / unidades : 0;
  const outliers = kgUnidadProm > 0
    ? filas.map(r => ({ r, ku: num(r.unidades) > 0 ? pesoTotalIngreso(r) / num(r.unidades) : 0 })).filter(x => x.ku > 0 && Math.abs(x.ku - kgUnidadProm) / kgUnidadProm > 0.25)
    : [];

  return {
    titulo: "Resumen Ejecutivo · Ingreso de Bultos",
    metricas: [
      { label: "Total unidades", valor: f2(unidades), color: "#4A7AFF" },
      { label: "Peso total (kg)", valor: f2(peso), color: "#0EA5E9" },
      { label: "Kg/unidad prom.", valor: f2(kgUnidadProm), color: "#8B5CF6" },
      { label: "Registros", valor: String(filas.length) },
    ],
    secciones: [
      { titulo: "Totales", lineas: [
        `Ingreso de ${f2(unidades)} unidades con un peso total de ${f2(peso)} kg en ${filas.length} registro(s).`,
        `Peso promedio por unidad: ${f2(kgUnidadProm)} kg.`,
      ] },
      { titulo: "Consistencia entre registros", lineas: [
        outliers.length === 0
          ? "Los registros presentan un peso por unidad homogéneo (sin desviaciones mayores al 25% respecto al promedio)."
          : `Se detectan ${outliers.length} registro(s) con peso por unidad atípico (>25% de desviación): ${outliers.map(o => o.r.concepto || o.r.fecha || "s/d").slice(0, 4).join(", ")}. Conviene verificar cantidades o pesos.`,
      ] },
      { titulo: "Observaciones relevantes", lineas: [
        `Análisis de ${filas.length} ingreso(s) de bultos.`,
        outliers.length ? "Las desviaciones podrían deberse a diferencias reales de presentación o a errores de digitación." : "No se observan diferencias relevantes entre registros.",
      ] },
      { titulo: "Conclusión ejecutiva", lineas: [
        `Ingreso total de ${f2(peso)} kg (${f2(unidades)} unidades). ${outliers.length ? "Se recomienda revisar los registros atípicos señalados." : "Los registros son consistentes."}`,
      ] },
    ],
  };
}
