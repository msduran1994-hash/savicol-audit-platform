// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO GRANJAS · Trazabilidad de Descartes — catálogos parametrizables
// ═══════════════════════════════════════════════════════════════════════════════
// Valores de dominio (no datos reales de la operación). Los datos reales (granja,
// lote, veterinario, planta, etc.) se capturan/seleccionan en el formulario.

export const TIPO_DESCARTE = [
  "Sanitario", "Productivo", "Bienestar animal", "Fin de ciclo", "Mortalidad", "Otro",
] as const;

export const MOTIVO_DESCARTE = [
  "Baja productividad", "Enfermedad", "Lesión / trauma", "Bajo peso",
  "Problema locomotor", "Prolapso", "Deshidratación", "Fin de ciclo productivo",
  "Orden sanitaria", "Decomiso", "Otro",
] as const;

export const CLASIFICACION_SANITARIA = [
  "Apto", "No apto", "Sospechoso", "En observación", "Decomiso",
] as const;

export const NIVEL_RIESGO_DESCARTE = ["Bajo", "Medio", "Alto", "Crítico"] as const;

export const ESTADO_DESCARTE = [
  "Registrado", "En tránsito", "Recibido en planta", "Cerrado", "Rechazado",
] as const;

export const DESTINO_DESCARTE = [
  "Planta de beneficio", "Incineración", "Compostaje",
  "Fosa / enterramiento", "Rendering (harina)", "Otro",
] as const;

// Colores por nivel de riesgo (consistentes con el resto de la plataforma)
export const RIESGO_COLOR: Record<string, string> = {
  Bajo: "#10B981", Medio: "#F59E0B", Alto: "#F97316", Crítico: "#EF4444",
};

// Colores por estado del proceso
export const ESTADO_DESCARTE_COLOR: Record<string, string> = {
  Registrado: "#94A3B8", "En tránsito": "#3B82F6", "Recibido en planta": "#06B6D4",
  Cerrado: "#10B981", Rechazado: "#EF4444",
};

// Objetivo logístico (minutos) para semáforo de cumplimiento del tiempo total.
export const TIEMPO_OBJETIVO_MIN = 180;

// ─── Auditoría (Fase 7): etiquetas legibles de los campos para el diff ─────────
export const CAMPO_LABELS: Record<string, string> = {
  fechaHoraDescarte: "Fecha/hora del descarte", granjaId: "Granja (id)", granjaNombre: "Granja",
  empresa: "Empresa", integracion: "Integración", galpon: "Galpón", lote: "Lote",
  lineaGenetica: "Línea genética", loteEdadDias: "Edad del lote (días)", tipoDescarte: "Tipo de descarte",
  motivo: "Motivo", clasificacionSanitaria: "Clasificación sanitaria", nivelRiesgo: "Nivel de riesgo", estado: "Estado",
  cantidadAves: "Cantidad de aves", pesoPromedioKg: "Peso promedio (kg)", pesoTotalKg: "Peso total (kg)",
  mortalidadTraslado: "Mortalidad en traslado", destino: "Destino", plantaDestino: "Planta de destino",
  transportadora: "Transportadora", vehiculoPlaca: "Vehículo / placa", conductor: "Conductor",
  responsableDespacho: "Responsable de despacho", responsableRecepcion: "Responsable de recepción",
  medicoVeterinario: "Médico veterinario", horaInicioCargue: "Inicio de cargue", horaFinCargue: "Fin de cargue",
  horaSalidaGranja: "Salida de granja", horaLlegadaPlanta: "Llegada a planta", horaInicioDescarga: "Inicio de descarga",
  horaFinDescarga: "Fin de descarga", gpsSalidaLat: "GPS salida (lat)", gpsSalidaLng: "GPS salida (lng)",
  gpsLlegadaLat: "GPS llegada (lat)", gpsLlegadaLng: "GPS llegada (lng)", distanciaKm: "Distancia (km)",
  ruta: "Ruta", observaciones: "Observaciones",
};

// ─── Evidencias ──────────────────────────────────────────────────────────────
export const EVIDENCIA_TIPOS = ["Foto", "PDF", "Excel", "Video", "Otro"] as const;
export const EVIDENCIA_CATEGORIAS = [
  "Acta de descarte", "Remisión", "Guía sanitaria", "Certificado",
  "Foto del producto", "Foto del vehículo", "Pesaje", "Documento", "Otro",
] as const;

// ─── Checklist de trazabilidad (parametrizable) ──────────────────────────────
// Plantilla de categorías/preguntas. Las respuestas se guardan por descarte en
// checklistJSON: { [itemId]: { estado, obs, criticidad } }.
export const CHECKLIST_ESTADOS = ["Cumple", "No cumple", "No aplica"] as const;

export const CHECKLIST_DESCARTE: { categoria: string; items: { id: string; pregunta: string }[] }[] = [
  { categoria: "Bioseguridad", items: [
    { id: "bio1", pregunta: "El personal cumple el protocolo de ingreso y usa EPP" },
    { id: "bio2", pregunta: "Se aplicó desinfección (vado/arco) al vehículo" },
    { id: "bio3", pregunta: "Sin contacto cruzado con otros lotes/galpones" },
  ] },
  { categoria: "Bienestar animal", items: [
    { id: "ba1", pregunta: "Captura y manejo de aves sin maltrato" },
    { id: "ba2", pregunta: "Densidad de guacales/jaulas dentro de lo permitido" },
    { id: "ba3", pregunta: "Ventilación y condiciones adecuadas en el traslado" },
  ] },
  { categoria: "Condiciones del vehículo", items: [
    { id: "veh1", pregunta: "Vehículo en condiciones mecánicas adecuadas" },
    { id: "veh2", pregunta: "Guacales/jaulas en buen estado y limpios" },
    { id: "veh3", pregunta: "Documentación del vehículo vigente" },
  ] },
  { categoria: "Limpieza y desinfección", items: [
    { id: "ld1", pregunta: "Vehículo lavado y desinfectado antes del cargue" },
    { id: "ld2", pregunta: "Soporte/registro de L&D disponible" },
  ] },
  { categoria: "Documentación", items: [
    { id: "doc1", pregunta: "Acta de descarte diligenciada" },
    { id: "doc2", pregunta: "Remisión / guía de transporte presente" },
    { id: "doc3", pregunta: "Guía sanitaria / certificados requeridos" },
  ] },
  { categoria: "Transporte", items: [
    { id: "tr1", pregunta: "Ruta y tiempos dentro de lo planificado" },
    { id: "tr2", pregunta: "Conductor autorizado y capacitado" },
  ] },
  { categoria: "Recepción en planta", items: [
    { id: "rp1", pregunta: "Recepción conforme (cantidad y estado)" },
    { id: "rp2", pregunta: "Verificación de peso en planta" },
    { id: "rp3", pregunta: "Registro de novedades de recepción" },
  ] },
  { categoria: "Cumplimiento normativo", items: [
    { id: "cn1", pregunta: "Cumple normativa sanitaria vigente (ICA/Invima)" },
    { id: "cn2", pregunta: "Trazabilidad completa del lote" },
  ] },
];

// Nº total de ítems del checklist (denominador de avance).
export const CHECKLIST_TOTAL_ITEMS = CHECKLIST_DESCARTE.reduce((s, c) => s + c.items.length, 0);

export type ChecklistEstado = "" | "Cumple" | "No cumple" | "No aplica";
export interface ChecklistRespuesta { estado: ChecklistEstado; obs?: string; criticidad?: string; }
export type ChecklistRespuestas = Record<string, ChecklistRespuesta>;

// Estadísticas del checklist a partir del JSON guardado.
export function checklistStats(json?: string | null): {
  respondidos: number; total: number; cumple: number; noCumple: number; noAplica: number;
  pendientes: number; pct: number; noCumpleSinObs: number;
} {
  let ans: ChecklistRespuestas = {};
  try { if (json) ans = JSON.parse(json); } catch { ans = {}; }
  let cumple = 0, noCumple = 0, noAplica = 0, respondidos = 0, noCumpleSinObs = 0;
  for (const cat of CHECKLIST_DESCARTE) for (const it of cat.items) {
    const r = ans[it.id];
    if (!r || !r.estado) continue;
    respondidos++;
    if (r.estado === "Cumple") cumple++;
    else if (r.estado === "No cumple") { noCumple++; if (!r.obs || !r.obs.trim()) noCumpleSinObs++; }
    else if (r.estado === "No aplica") noAplica++;
  }
  const base = cumple + noCumple; // "No aplica" no cuenta para el %
  const pct = base > 0 ? Math.round((cumple / base) * 100) : 0;
  return { respondidos, total: CHECKLIST_TOTAL_ITEMS, cumple, noCumple, noAplica, pendientes: CHECKLIST_TOTAL_ITEMS - respondidos, pct, noCumpleSinObs };
}

// % de cumplimiento de una categoría del checklist (para índices como el documental).
// Devuelve null si esa categoría no tiene ítems respondidos (excluye "No aplica").
export function checklistCategoriaPct(json: string | null | undefined, categoria: string): number | null {
  let ans: ChecklistRespuestas = {};
  try { if (json) ans = JSON.parse(json); } catch { ans = {}; }
  const cat = CHECKLIST_DESCARTE.find(c => c.categoria === categoria);
  if (!cat) return null;
  let cumple = 0, base = 0;
  for (const it of cat.items) {
    const r = ans[it.id];
    if (!r || !r.estado || r.estado === "No aplica") continue;
    base++;
    if (r.estado === "Cumple") cumple++;
  }
  return base > 0 ? Math.round((cumple / base) * 100) : null;
}
