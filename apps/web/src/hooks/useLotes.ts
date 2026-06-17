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
  const etapas = Object.values(data.avance);
  const hechas = etapas.filter(Boolean).length;
  return Math.round((hechas / etapas.length) * 100);
}
