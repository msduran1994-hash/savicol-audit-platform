// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Trazabilidad Avícola (Lotes)
// Persistencia (Opción A): se reutiliza el endpoint /documentos. Cada lote se guarda
// como un JSON dentro de `ocrTexto` envuelto en [LOTE]...[/LOTE], con el marcador
// [LOTE-TRZ] en el nombre para distinguirlo. No toca el backend ni contamina los
// documentos normales (que no llevan ese marcador).
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

// ── Tipos del lote ──
export type EstadoLote = "alistamiento" | "activo" | "finalizado" | "cerrado";

export interface FilaPreliminar { concepto: string; objetivo: string; valor: string; cumple: string; }
export interface FilaRecepcion  { parametro: string; referencia: string; valor: string; }
export interface SeguimientoDia { [indicador: string]: string; }
export interface PreguntaChecklist { seccion: string; pregunta: string; resultado: string; observacion: string; evidencia: string; }
export interface PreguntaAlistamiento { pregunta: string; resultado: string; observacion: string; }

export interface LoteData {
  // Datos generales
  codigo: string;
  tipoProduccion: string;
  raza: string;
  proveedor: string;
  granjaId: string;
  granjaNombre?: string;
  galponPrincipal: string;
  galponesEvaluados?: string;
  avesIngreso: number;
  avesActuales: number;
  fechaIngreso: string;
  horaIngreso: string;
  fechaSalida: string;
  pesoObjetivo: number;
  estado: EstadoLote;
  // Equipo logístico
  veterinario: string;
  administrador: string;
  responsableRecepcion: string;
  edadDias: number;
  origen: string;
  // Logística de transporte
  logistica: { horaDespacho: string; horaLlegada: string; tiempoViaje: string; permanencia: string; tempVehiculo?: string };
  // Secciones (se llenan en fases siguientes)
  preliminares: FilaPreliminar[];
  recepcion: FilaRecepcion[];
  recepcionObs?: string;
  recepcionPlan?: string;
  seguimiento: SeguimientoDia[];          // index 0..6 = día 1..7
  checklist: PreguntaChecklist[];
  checklistAuditor?: string;
  checklistFecha?: string;
  checklistObsGeneral?: string;
  checklistPlan?: string;
  alistamiento: PreguntaAlistamiento[];
  // Avance por etapa
  avance: {
    datosGenerales: boolean;
    preliminares: boolean;
    recepcion: boolean;
    seguimiento: boolean;
    descargue: boolean;
    alistamiento: boolean;
  };
}

export interface LoteItem {
  id: string;            // id del documento subyacente
  data: LoteData;
  uploadedAt: string;
  uploadedBy: string;
}

const MARCADOR_NOMBRE = "[LOTE-TRZ]";

// Documento crudo que devuelve /documentos
interface DocRaw {
  id: string;
  nombre: string;
  ocrTexto?: string;
  uploadedAt: string;
  uploadedBy: string;
}

function parseLote(doc: DocRaw): LoteItem | null {
  const m = (doc.ocrTexto ?? "").match(/\[LOTE\]([\s\S]*?)\[\/LOTE\]/);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]) as LoteData;
    return { id: doc.id, data, uploadedAt: doc.uploadedAt, uploadedBy: doc.uploadedBy };
  } catch {
    return null;
  }
}

function esLoteTrz(doc: DocRaw): boolean {
  return (doc.nombre ?? "").includes(MARCADOR_NOMBRE);
}

// Construye el payload para /documentos a partir de un LoteData
function construirPayload(data: LoteData) {
  const json = JSON.stringify(data);
  const ocr = `[LOTE]${json}[/LOTE]`;
  return {
    granjaId: data.granjaId,
    nombre: `LOTE ${data.codigo || "sin-codigo"} ${MARCADOR_NOMBRE}`,
    tipo: "Otro",
    categoria: "Otro",
    size: ocr.length,
    url: "data:text/plain;base64,TE9URQ==",   // placeholder mínimo (el backend exige url)
    ocrTexto: ocr,
  };
}

// ── Queries / Mutations ──
export function useLotes() {
  return useQuery({
    queryKey: ["lotes-trz"],
    queryFn: async () => {
      const docs = await apiGet<DocRaw[]>(`/documentos`);
      return (docs ?? [])
        .filter(esLoteTrz)
        .map(parseLote)
        .filter((x): x is LoteItem => x !== null)
        .sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
    },
    staleTime: 30_000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["lotes-trz"] });
}

export function useCreateLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LoteData) => apiPost<DocRaw>("/documentos", construirPayload(data)),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LoteData }) =>
      apiPatch<DocRaw>(`/documentos/${id}`, construirPayload(data)),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/documentos/${id}`),
    onSuccess: () => invalidate(qc),
  });
}

// ── Helpers de dominio ──
export const GALPONES = Array.from({ length: 14 }, (_, i) => String(i + 1));
export const DIAS = [1, 2, 3, 4, 5, 6, 7];

// Conceptos predefinidos de la pestaña Preliminares (antes de recibir el pollito)
export const PRELIMINARES_BASE: { concepto: string; objetivo: string }[] = [
  { concepto: "Temperatura de cama (°C)",     objetivo: "32 – 35 °C" },
  { concepto: "Temperatura ambiente (°C)",    objetivo: "28 – 30 °C" },
  { concepto: "Humedad relativa (%)",         objetivo: "60 – 70 %" },
  { concepto: "Funcionamiento ventiladores",  objetivo: "Óptimo" },
  { concepto: "Funcionamiento criadoras",     objetivo: "Óptimo" },
  { concepto: "Bebederos listos",             objetivo: "Sí" },
  { concepto: "Comederos listos",             objetivo: "Sí" },
  { concepto: "Calidad de la cama",           objetivo: "Buena" },
  { concepto: "# Comederos habilitados",      objetivo: "Según densidad" },
  { concepto: "Temperatura vehículo (°C)",    objetivo: "Registro" },
];

// Parámetros predefinidos de la pestaña Recepción del pollito
export const RECEPCION_BASE: { parametro: string; referencia: string }[] = [
  { parametro: "Peso promedio (g)",         referencia: "≥ 40 g" },
  { parametro: "Uniformidad (%)",           referencia: "≥ 90%" },
  { parametro: "Ombligos defectuosos (%)",  referencia: "≤ 1%" },
  { parametro: "Pollitos débiles (%)",      referencia: "≤ 0.5%" },
  { parametro: "Pollitos deshidratados (%)",referencia: "≤ 1%" },
  { parametro: "Deformidades (%)",          referencia: "≤ 0.5%" },
  { parametro: "Total recibido (aves)",     referencia: "—" },
  { parametro: "Rechazados",                referencia: "—" },
];

// Indicadores predefinidos de la pestaña Seguimiento Día 1–7.
// `tipo` define el control: "num" = campo numérico; "select" = lista (bioseguridad/comportamiento)
export const SEGUIMIENTO_INDICADORES: { clave: string; label: string; tipo: "num" | "select" }[] = [
  { clave: "muestra",        label: "Muestra (aves)",          tipo: "num" },
  { clave: "avesVivas",      label: "Aves vivas",              tipo: "num" },
  { clave: "avesMuertas",    label: "Aves muertas",            tipo: "num" },
  { clave: "mortDiaria",     label: "Mortalidad diaria (%)",   tipo: "num" },
  { clave: "mortAcumulada",  label: "Mortalidad acumulada (%)",tipo: "num" },
  { clave: "consumoAgua",    label: "Consumo agua (L)",        tipo: "num" },
  { clave: "consumoAlimento",label: "Consumo alimento (kg)",   tipo: "num" },
  { clave: "peso",           label: "Peso promedio (g)",       tipo: "num" },
  { clave: "tempAmbiente",   label: "Temp. ambiente (°C)",     tipo: "num" },
  { clave: "tempCriadora",   label: "Temp. bajo criadora (°C)",tipo: "num" },
  { clave: "tempCloacal",    label: "Temp. cloacal (°C)",      tipo: "num" },
  { clave: "bioseguridad",   label: "Bioseguridad",            tipo: "select" },
  { clave: "comportamiento", label: "Comportamiento",          tipo: "select" },
];

export const SEG_SELECT_OPCIONES = ["Óptimo", "Aceptable", "Deficiente"];

// ── Checklist de Descargue: 30 preguntas en 5 secciones (6 c/u) ──
export const CHECKLIST_SECCIONES: { seccion: string; preguntas: string[] }[] = [
  {
    seccion: "1. Transporte y Documentación",
    preguntas: [
      "Documentación legal del lote completa y vigente",
      "Certificados sanitarios y de vacunación presentes",
      "Guía de movilización y remisión correctas",
      "Condiciones de transporte adecuadas (temperatura/ventilación)",
      "Tiempo de viaje dentro de los parámetros establecidos",
      "Vehículo limpio y desinfectado antes del cargue",
    ],
  },
  {
    seccion: "2. Preparación y Alistamiento",
    preguntas: [
      "Galpón preparado y precalentado antes del arribo",
      "Equipos de calefacción calibrados y operativos",
      "Disponibilidad de agua limpia y fresca",
      "Disponibilidad de alimento de iniciación",
      "Cama en condiciones óptimas (seca y nivelada)",
      "Densidad de comederos y bebederos según norma",
    ],
  },
  {
    seccion: "3. Bioseguridad y Sanitización",
    preguntas: [
      "Protocolos de bioseguridad implementados y verificados",
      "Control de acceso al galpón restringido",
      "Pediluvios y arcos de desinfección operativos",
      "Desinfección completa de instalaciones realizada",
      "Personal con dotación y elementos de protección",
      "Manejo adecuado de residuos y mortalidad",
    ],
  },
  {
    seccion: "4. Recepción y Descargue",
    preguntas: [
      "Temperatura ambiente adecuada al momento del descargue",
      "Tiempo de descargue dentro del rango óptimo",
      "Manejo cuidadoso del pollito durante el descargue",
      "Distribución uniforme del pollito en el galpón",
      "Acceso inmediato a agua y alimento tras el ingreso",
      "Conteo y registro de aves recibidas y rechazadas",
    ],
  },
  {
    seccion: "5. Evaluación 0–7 Días",
    preguntas: [
      "Mortalidad dentro de los parámetros esperados",
      "Consumo de agua acorde a la edad del lote",
      "Consumo de alimento acorde a la curva esperada",
      "Uniformidad del lote en seguimiento",
      "Bienestar animal y comportamiento normal",
      "Buche lleno verificado en las primeras horas",
    ],
  },
];

// Cinco preguntas críticas de la pestaña Alistamiento (previa a la recepción)
export const ALISTAMIENTO_PREGUNTAS: string[] = [
  "¿El galpón cumple condiciones ambientales para la recepción?",
  "¿Los equipos de ventilación, calefacción y extracción funcionan correctamente?",
  "¿Los protocolos de bioseguridad están implementados y verificados?",
  "¿Agua y alimento están disponibles y validados?",
  "¿La documentación legal y sanitaria del lote está completa?",
];

export const RESULTADO_OPCIONES = ["cumple", "no_cumple", "parcial", "na"] as const;

// Total de preguntas del checklist (para cálculos de cumplimiento)
export const CHECKLIST_TOTAL = CHECKLIST_SECCIONES.reduce((a, s) => a + s.preguntas.length, 0);

// Cumplimiento (%) a partir de una lista de resultados. "cumple"=100, "parcial"=50,
// "no_cumple"=0; "na" y vacío se excluyen del denominador.
export function calcularCumplimiento(resultados: string[]): number {
  const validos = resultados.filter(r => r === "cumple" || r === "no_cumple" || r === "parcial");
  if (validos.length === 0) return 0;
  const suma = validos.reduce((a, r) => a + (r === "cumple" ? 100 : r === "parcial" ? 50 : 0), 0);
  return Math.round(suma / validos.length);
}

// Semáforo según porcentaje
export function semaforo(pct: number): { label: string; color: string } {
  if (pct >= 85) return { label: "Óptimo",   color: "#22C55E" };
  if (pct >= 60) return { label: "Aceptable",color: "#F59E0B" };
  return { label: "Crítico", color: "#EF4444" };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKLISTS PROFESIONALES (Encacetamiento · Trazabilidad 7 Días)
// Cada checklist se guarda como su propio documento en /documentos, con marcador
// [CHK-ENC] o [CHK-TRZ7] en el nombre y el JSON envuelto en [CHK]...[/CHK].
// Semaforización propia 90/70 (distinta del 85/60 del checklist de descargue).
// ═══════════════════════════════════════════════════════════════════════════════

// Estructura de secciones (3 secciones × 5 preguntas = 15) para cada checklist
export const ENCACETAMIENTO_SECCIONES: { seccion: string; preguntas: string[] }[] = [
  {
    seccion: "Alistamiento y Bioseguridad",
    preguntas: [
      "¿La cama se encuentra seca y homogénea para la recepción?",
      "¿La temperatura de cama cumple el estándar establecido?",
      "¿La temperatura ambiente es adecuada para la recepción?",
      "¿Las cortinas están instaladas y operativas?",
      "¿Los protocolos de bioseguridad fueron ejecutados antes del ingreso?",
    ],
  },
  {
    seccion: "Equipos y Preparación",
    preguntas: [
      "¿Los bebederos están instalados y funcionando?",
      "¿Los comederos están disponibles y correctamente distribuidos?",
      "¿Los sistemas de ventilación funcionan correctamente?",
      "¿Las criadoras están operativas?",
      "¿Existe disponibilidad inmediata de agua potable?",
      "¿Los termómetros se encuentran calibrados y operativos?",
      "¿La ubicación y cantidad de termómetros es adecuada para el galpón?",
    ],
  },
  {
    seccion: "Recepción del Pollito",
    preguntas: [
      "¿La documentación sanitaria del lote está completa?",
      "¿El tiempo de transporte se encuentra dentro del rango permitido?",
      "¿La temperatura del vehículo fue adecuada durante el transporte?",
      "¿El descargue se realizó bajo condiciones controladas?",
      "¿El estado general del pollito fue satisfactorio al ingreso?",
      "¿La instalación de gas fue verificada antes de la recepción del pollito?",
      "¿Se cumplió el tiempo establecido de calefacción previo a la recepción?",
    ],
  },
];

export const TRAZABILIDAD7_SECCIONES: { seccion: string; preguntas: string[] }[] = [
  {
    seccion: "Productiva",
    preguntas: [
      "¿La mortalidad diaria se encuentra dentro del estándar?",
      "¿La mortalidad acumulada es aceptable?",
      "¿El peso promedio corresponde al objetivo del lote?",
      "¿La uniformidad es adecuada?",
      "¿El consumo de alimento cumple la meta establecida?",
    ],
  },
  {
    seccion: "Sanitaria",
    preguntas: [
      "¿El estado sanitario del lote es satisfactorio?",
      "¿Existen aves descartadas por condiciones sanitarias?",
      "¿Se registran signos clínicos relevantes?",
      "¿Los protocolos de bioseguridad continúan activos?",
      "¿Se realiza disposición adecuada de mortalidad?",
    ],
  },
  {
    seccion: "Ambiental y Operativa",
    preguntas: [
      "¿La temperatura ambiente es adecuada?",
      "¿La temperatura bajo criadora cumple parámetros?",
      "¿La ventilación es adecuada?",
      "¿El compostaje se realiza correctamente?",
      "¿La logística operativa mantiene las condiciones del lote?",
    ],
  },
];

export type ChecklistTipo = "encacetamiento" | "trazabilidad7";

export interface PreguntaChk {
  seccion: string;
  pregunta: string;
  resultado: string;     // cumple | no_cumple | parcial | na | ""
  observacion: string;
  evidencia: string;     // data URI (foto comprimida) o URL
}

// ─── Muestreos (pesajes de pollitos por galpón) · pesos en kg ────────────────
export interface Muestreo {
  n: number;          // N.º de muestra
  cantidad: number;   // cantidad de pollitos pesados
  pesoTotal: number;  // peso total del muestreo (kg)
  obs?: string;       // observaciones
  galpon?: string;    // galpón al que corresponde el pesaje (útil con "Todos los Galpones")
}
export interface MuestreoInfo {
  genero?: "" | "Macho" | "Hembra";
  capacidad?: number;     // capacidad del galpón (aves)
  avesActuales?: number;  // cantidad actual de aves
  // Encasetamiento (opcionales, informativos) — asociados al lote
  cantidadIngreso?: number;      // cantidad de ingreso de aves
  fechaDespoblamiento?: string;  // fecha del último despoblamiento (para el vacío sanitario)
  reutilizacionCama?: number;    // cantidad de reutilización (usos de la cama)
}

export interface ChecklistData {
  tipo: ChecklistTipo;
  auditor: string;
  fechaVisita: string;
  granjaId: string;
  granjaNombre?: string;
  lote: string;
  galpon: string;
  // Campos específicos
  tecnicoVeterinario?: string;     // encacetamiento
  responsableRecepcion?: string;   // encacetamiento
  diaEvaluado?: string;            // trazabilidad7
  // Preguntas (15)
  preguntas: PreguntaChk[];
  // Cierre
  observacionGeneral?: string;
  planAccion?: string;
  // Muestreos (pestaña nueva) — no rompe checklists existentes (opcional)
  muestreos?: Muestreo[];
  muestreoInfo?: MuestreoInfo;
}

export interface ChecklistItem {
  id: string;
  data: ChecklistData;
  uploadedAt: string;
  uploadedBy: string;
}

const MARCADOR_CHK: Record<ChecklistTipo, string> = {
  encacetamiento: "[CHK-ENC]",
  trazabilidad7:  "[CHK-TRZ7]",
};

export const CHECKLIST_META: Record<ChecklistTipo, { titulo: string; secciones: { seccion: string; preguntas: string[] }[]; objetivo: string; enfoque: string }> = {
  encacetamiento: {
    titulo: "Checklist Encacetamiento",
    secciones: ENCACETAMIENTO_SECCIONES,
    objetivo: "Verificar las condiciones de alistamiento, bioseguridad, equipos y recepción del pollito al momento del encasetamiento del lote, asegurando un inicio óptimo del ciclo productivo.",
    enfoque: "Auditoría de cumplimiento sobre las condiciones previas y durante la recepción del lote, evaluando preparación de instalaciones, funcionamiento de equipos y calidad del pollito recibido.",
  },
  trazabilidad7: {
    titulo: "Checklist Trazabilidad 7 Días",
    secciones: TRAZABILIDAD7_SECCIONES,
    objetivo: "Evaluar el desempeño productivo, sanitario y ambiental del lote durante los primeros siete días, garantizando la trazabilidad del proceso de seguimiento inicial.",
    enfoque: "Auditoría de seguimiento sobre los indicadores productivos, condiciones sanitarias y variables ambientales y operativas del lote en su primera semana de vida.",
  },
};

// Construye un checklist vacío con sus 15 preguntas según el tipo
export function checklistVacio(tipo: ChecklistTipo, granjaId = "", auditor = ""): ChecklistData {
  const secciones = CHECKLIST_META[tipo].secciones;
  const preguntas: PreguntaChk[] = [];
  secciones.forEach(s => s.preguntas.forEach(p => preguntas.push({ seccion: s.seccion, pregunta: p, resultado: "", observacion: "", evidencia: "" })));
  return {
    tipo, auditor, fechaVisita: new Date().toISOString().slice(0, 10),
    granjaId, lote: "", galpon: "",
    tecnicoVeterinario: "", responsableRecepcion: "", diaEvaluado: "",
    preguntas, observacionGeneral: "", planAccion: "",
    muestreos: [], muestreoInfo: { genero: "", capacidad: 0, avesActuales: 0 },
  };
}

// Semáforo propio de estos checklists: Verde ≥90, Naranja 70–89, Rojo <70
export function semaforo90(pct: number): { label: string; color: string } {
  if (pct >= 90) return { label: "Óptimo",    color: "#22C55E" };
  if (pct >= 70) return { label: "Aceptable", color: "#F59E0B" };
  return { label: "Crítico", color: "#EF4444" };
}

function parseChecklist(doc: DocRaw): ChecklistItem | null {
  const m = (doc.ocrTexto ?? "").match(/\[CHK\]([\s\S]*?)\[\/CHK\]/);
  if (!m) return null;
  try {
    return { id: doc.id, data: JSON.parse(m[1]) as ChecklistData, uploadedAt: doc.uploadedAt, uploadedBy: doc.uploadedBy };
  } catch { return null; }
}

function construirPayloadChk(data: ChecklistData) {
  const marcador = MARCADOR_CHK[data.tipo];
  const json = JSON.stringify(data);
  const ocr = `[CHK]${json}[/CHK]`;
  return {
    granjaId: data.granjaId,
    nombre: `CHECKLIST ${data.lote || "sin-lote"} G${data.galpon || "-"} ${marcador}`,
    tipo: "Otro", categoria: "Otro",
    size: ocr.length, url: "data:text/plain;base64,Q0hL", ocrTexto: ocr,
  };
}

export function useChecklists(tipo: ChecklistTipo) {
  const marcador = MARCADOR_CHK[tipo];
  return useQuery({
    queryKey: ["checklists", tipo],
    queryFn: async () => {
      const docs = await apiGet<DocRaw[]>(`/documentos`);
      return (docs ?? [])
        .filter(d => (d.nombre ?? "").includes(marcador))
        .map(parseChecklist)
        .filter((x): x is ChecklistItem => x !== null)
        .sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
    },
    staleTime: 30_000,
  });
}

export function useCreateChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ChecklistData) => apiPost<DocRaw>("/documentos", construirPayloadChk(data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklists"] }),
  });
}

export function useUpdateChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChecklistData }) => apiPatch<DocRaw>(`/documentos/${id}`, construirPayloadChk(data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklists"] }),
  });
}

export function useDeleteChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/documentos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklists"] }),
  });
}

export function loteVacio(granjaId: string, granjaNombre?: string): LoteData {
  return {
    codigo: "", tipoProduccion: "engorde", raza: "", proveedor: "",
    granjaId, granjaNombre, galponPrincipal: "", galponesEvaluados: "",
    avesIngreso: 0, avesActuales: 0, fechaIngreso: "", horaIngreso: "",
    fechaSalida: "", pesoObjetivo: 0, estado: "alistamiento",
    veterinario: "", administrador: "", responsableRecepcion: "", edadDias: 0, origen: "",
    logistica: { horaDespacho: "", horaLlegada: "", tiempoViaje: "", permanencia: "", tempVehiculo: "" },
    preliminares: [], recepcion: [], seguimiento: [], checklist: [], alistamiento: [],
    avance: { datosGenerales: false, preliminares: false, recepcion: false, seguimiento: false, descargue: false, alistamiento: false },
  };
}

// Porcentaje de avance global del lote (cuántas etapas están completas)
export function avanceGlobal(data: LoteData): number {
  // "descargue" se retiró del Registro Técnico → no cuenta para el progreso.
  const etapas = Object.entries(data.avance).filter(([k]) => k !== "descargue").map(([, v]) => v);
  const hechas = etapas.filter(Boolean).length;
  return etapas.length ? Math.round((hechas / etapas.length) * 100) : 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Evidencias fotográficas del lote (Fase 3b)
// Se guardan como documentos tipo "Imagen" con marcador [FOTO-LOTE] en ocrTexto,
// asociando lote/día/galpón. Separadas del JSON del lote para no saturarlo.
// ═══════════════════════════════════════════════════════════════════════════════
export interface FotoLote {
  id: string;
  url: string;          // data URI de la imagen
  nombre: string;
  dia: string;
  galpon: string;
  size: number;
  uploadedAt: string;
}

const MARCADOR_FOTO = "[FOTO-LOTE]";

export function leerMetaFoto(ocr?: string): { loteCodigo: string; dia: string; galpon: string } {
  const m = (ocr ?? "").match(/\[FOTO-LOTE\]([\s\S]*?)\[\/FOTO-LOTE\]/);
  const out = { loteCodigo: "", dia: "", galpon: "" };
  if (m) m[1].split(";").forEach(par => {
    const i = par.indexOf("=");
    if (i > 0) {
      const k = par.slice(0, i).trim(), v = par.slice(i + 1).trim();
      if (k === "loteCodigo") out.loteCodigo = v;
      else if (k === "dia") out.dia = v;
      else if (k === "galpon") out.galpon = v;
    }
  });
  return out;
}

// Lista las fotos de un lote concreto (filtra por código de lote en el marcador)
export function useFotosLote(loteCodigo?: string) {
  return useQuery({
    queryKey: ["fotos-lote", loteCodigo],
    queryFn: async () => {
      const docs = await apiGet<DocRaw[]>(`/documentos`);
      return (docs ?? [])
        .filter(d => (d.nombre ?? "").includes(MARCADOR_FOTO))
        .filter(d => !loteCodigo || leerMetaFoto(d.ocrTexto).loteCodigo === loteCodigo)
        .map(d => {
          const meta = leerMetaFoto(d.ocrTexto);
          return {
            id: d.id, url: (d as any).url ?? "", nombre: d.nombre.replace(/\s*\[FOTO-LOTE\]\s*/, "").trim(),
            dia: meta.dia, galpon: meta.galpon, size: (d as any).size ?? 0, uploadedAt: d.uploadedAt,
          } as FotoLote;
        })
        .sort((a, b) => (a.dia || "").localeCompare(b.dia || ""));
    },
    enabled: !!loteCodigo,
    staleTime: 20_000,
  });
}

export function useCreateFotoLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { granjaId: string; loteCodigo: string; dia: string; galpon: string; nombre: string; url: string; size: number }) =>
      apiPost<DocRaw>("/documentos", {
        granjaId: dto.granjaId,
        nombre: `FOTO ${dto.loteCodigo} D${dto.dia} G${dto.galpon} ${MARCADOR_FOTO}`,
        tipo: "Imagen",
        categoria: "Otro",
        size: dto.size,
        url: dto.url,
        ocrTexto: `${MARCADOR_FOTO}loteCodigo=${dto.loteCodigo};dia=${dto.dia};galpon=${dto.galpon}${MARCADOR_FOTO.replace("[", "[/")}`,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fotos-lote"] }),
  });
}

export function useDeleteFotoLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/documentos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fotos-lote"] }),
  });
}

// Comprime una imagen (File) a JPEG con ancho máximo y calidad dada → data URI
export async function comprimirImagen(file: File, maxAncho = 1280, calidad = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, maxAncho / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("No se pudo procesar la imagen")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", calidad));
      };
      img.onerror = () => reject(new Error("Imagen inválida"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}
