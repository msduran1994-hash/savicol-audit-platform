// ═══════════════════════════════════════════════════════════════════════════════
// INVENTARIOS · Inventario de Producto · Formulario Evaluativo
// Transcripción FIEL del archivo "FORMATO EVALUACIÓN AUDITORIA INVENTARIO
// PRODUCTOS.xlsx" (hoja única). No se altera el contenido ni el orden originales.
// ═══════════════════════════════════════════════════════════════════════════════

export const EVAL_META = {
  titulo: "FORMATO AUDITORIA INVENTARIO DE PRODUCTOS",
  subtitulo: "EVALUACION INVENTARIO DE PRODUCTOS",
  areasResponsables: "GERENCIA DE OPERACIONES - DIRECCION OPERACIONES Y LOGISTICA",
};

// Escala de calificación (por promedio 1–5), tal cual el formato.
export const EVAL_ESCALA = [
  { rango: "de 4 a 5",   min: 4, calificacion: "Bueno",          desempeno: "Significativamente bien, cumple con las actividades propuestas y procedimientos reglamentados para la ejecucion de los inventarios de productos.", accion: "Se debe mantener los controles.", color: "#10B981" },
  { rango: "de 3 a 3,9", min: 3, calificacion: "Aceptable",      desempeno: "Satisfactorio, cumple de manera aceptable con las actividades propuestas y procedimientos reglamentados para la ejecucion de los inventarios de producto.", accion: "Debe haber un compromiso por parte del area de logistica y operaciones", color: "#F59E0B" },
  { rango: "de 0 - 2,9", min: 0, calificacion: "Insatisfactorio", desempeno: "Inaceptable, no cumple con las actividades propuestas y procedimientos reglamentados para la ejecucion de los inventarios de producto.", accion: "Debe desarrollar control inmediato.", color: "#EF4444" },
] as const;

export interface EvalPregunta { item: string; proceso: string; aspecto: string; }

// Las 22 preguntas (7.1–7.22), agrupadas por proceso, en el orden del documento.
export const EVAL_PREGUNTAS: EvalPregunta[] = [
  { item: "7.1",  proceso: "PROCESO SST O SISO", aspecto: "¿Los colaboradores cuentan con los elementos de proteccion personal (EPP)?" },
  { item: "7.2",  proceso: "PROCESO SST O SISO", aspecto: "¿El ambiente laboral se encontro apto para la realizacion del inventario de producto?" },
  { item: "7.3",  proceso: "PROCESO SST O SISO", aspecto: "¿Se definen las acciones para el control de los riesgos, implementación y seguimiento?" },
  { item: "7.4",  proceso: "PROCESO LOGISTICO", aspecto: "¿ Cuentan con cronograma de actividades del inventario a desarrollar?" },
  { item: "7.5",  proceso: "PROCESO LOGISTICO", aspecto: "¿Realizan una inspeccion inicial antes del inicio del inventario de producto?" },
  { item: "7.6",  proceso: "PROCESO LOGISTICO", aspecto: "¿Cuentan con procedimiento publicado para el proceso de inventario?" },
  { item: "7.7",  proceso: "PROCESO LOGISTICO", aspecto: "¿Se da cumplimiento al cronograma de inicio de inventario?" },
  { item: "7.8",  proceso: "PROCESO LOGISTICO", aspecto: "¿Cuentan con organización logistica durante el proceso de inventarios (antes y en el momento del inventario de producto)?" },
  { item: "7.9",  proceso: "PROCESO LOGISTICO", aspecto: "¿Se cuenta con la dispocision completa del personal (Antes y durante la ejecucion del inventario)?" },
  { item: "7.10", proceso: "PROCESO LOGISTICO", aspecto: "¿Se realizo induccion antes del inicio de la actividad del inventario de producto?" },
  { item: "7.11", proceso: "PROCESO LOGISTICO", aspecto: "Se efectuo una inspeccion final del inventario ¿Si hay; se ha corregido?." },
  { item: "7.12", proceso: "PROCESO OPERATIVO", aspecto: "¿Realizan corte de documentos antes del inicio del inventario de producto?" },
  { item: "7.13", proceso: "PROCESO OPERATIVO", aspecto: "¿Cuentan con acta de inicio (procedimiento, firma de responsables, e inicio hora de ejecucion?" },
  { item: "7.14", proceso: "PROCESO OPERATIVO", aspecto: "¿Cuenta con herramientas tecnologicas para inicio actividad inventarios de producto?" },
  { item: "7.15", proceso: "PROCESO OPERATIVO", aspecto: "¿El inventario se completo de forma correcta y sin novedades durante su ejecucion?" },
  { item: "7.16", proceso: "PROCESO OPERATIVO", aspecto: "¿Los resultados de los inventario son validados por algun superior?" },
  { item: "7.17", proceso: "PROCESO OPERATIVO", aspecto: "¿Las novedades presentadas durante los ajustes son atendidas y resueltas?" },
  { item: "7.18", proceso: "PROCESO OPERATIVO", aspecto: "Existe participacion de otras areas durante la ejecucion del inventario.¿Cuales?" },
  { item: "7.19", proceso: "PROCESO MANTENIMIENTO", aspecto: "¿Se efectuo inspeccion fisica calibracion a las Basculas?" },
  { item: "7.20", proceso: "PROCESO MANTENIMIENTO", aspecto: "¿Ha presentado fallas la montacarga o estibadora manual durante la ejecucion de la actividad inventario de producto?" },
  { item: "7.21", proceso: "PROCESO AJUSTE INVENTARIO", aspecto: "¿Se envian informacion completa y a tiempo para la realizacion de los ajustes de inventario?" },
  { item: "7.22", proceso: "PROCESO AJUSTE INVENTARIO", aspecto: "¿Se esta ejecutando la revision post ajuste efectuados por el area de auditoria?" },
];

export const EVAL_TOTAL_PREGUNTAS = EVAL_PREGUNTAS.length; // 22
export const EVAL_PUNTAJE_MAX = EVAL_TOTAL_PREGUNTAS * 5;  // 110
export const EVAL_PUNTAJES = [1, 2, 3, 4, 5] as const;

export const EVAL_ESTADOS = ["En proceso", "Finalizada", "Revisada"] as const;
export const EVAL_ESTADO_COLOR: Record<string, string> = {
  "En proceso": "#F59E0B", "Finalizada": "#10B981", "Revisada": "#06B6D4",
};

export const EVIDENCIA_TIPOS = ["Foto", "PDF", "Excel", "Video", "Otro"] as const;
export const EVIDENCIA_CATEGORIAS = [
  "Acta de inventario", "Evidencia del proceso", "Foto", "Documento soporte", "Otro",
] as const;

// Respuesta por pregunta.
export interface EvalRespuesta { puntaje?: number; evidencia?: string; observacion?: string; }
export type EvalRespuestas = Record<string, EvalRespuesta>;
export interface BitacoraEntry { fecha: string; hora: string; evento: string; }

// Cálculo (calificación por PROMEDIO de contestadas; % = obtenido/110).
export function calcularEvaluacion(json?: string | EvalRespuestas | null) {
  let r: EvalRespuestas = {};
  if (typeof json === "string") { try { r = json ? JSON.parse(json) : {}; } catch { r = {}; } }
  else if (json) r = json;
  let obtenido = 0, contestadas = 0;
  for (const p of EVAL_PREGUNTAS) {
    const v = r[p.item]?.puntaje;
    if (typeof v === "number" && v >= 1 && v <= 5) { obtenido += v; contestadas++; }
  }
  const promedio = contestadas ? Math.round((obtenido / contestadas) * 100) / 100 : 0;
  const porcentaje = Math.round((obtenido / EVAL_PUNTAJE_MAX) * 100);
  const escala = contestadas
    ? (EVAL_ESCALA.find(e => promedio >= e.min) ?? EVAL_ESCALA[EVAL_ESCALA.length - 1])
    : null;
  return {
    obtenido, contestadas, maximo: EVAL_PUNTAJE_MAX, promedio, porcentaje,
    calificacion: escala?.calificacion ?? "—",
    calificacionColor: escala?.color ?? "#94A3B8",
    accion: escala?.accion ?? "",
  };
}
