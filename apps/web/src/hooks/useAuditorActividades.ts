// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Desempeño de Auditores (Opción A)
// Persistencia: se reutiliza el endpoint /documentos. Cada actividad de auditor se
// guarda como JSON dentro de `ocrTexto` envuelto en [AACT]...[/AACT], con el marcador
// [AUDITOR-ACT] en el nombre. No toca el backend ni contamina los documentos normales.
// De estas actividades registradas se calcula el desempeño (cumplimiento) por auditor.
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface DocRaw {
  id: string;
  nombre: string;
  ocrTexto?: string;
  uploadedAt: string;
  uploadedBy: string;
}

// ── Catálogo oficial de auditores (los seis del equipo) ──
export const AUDITORES = [
  "Michael Duran",
  "Kerling Hernandez",
  "Hilary Basto",
  "Jaider Gonzalez",
  "Alexander Tellez",
  "Ivan Bonilla",
] as const;

export const AMBITOS = [
  { id: "granja", label: "Granja" },
  { id: "ruta", label: "Ruta" },
  { id: "cedis", label: "CEDIS" },
  { id: "mensual", label: "Actividad mensual" },
] as const;

export const ESTADOS_ACT = [
  { id: "planificada", label: "Planificada", color: "#64748B" },
  { id: "ejecutada", label: "Ejecutada", color: "#4A7AFF" },
  { id: "cumplida", label: "Cumplida", color: "#22C55E" },
  { id: "incumplida", label: "Incumplida", color: "#EF4444" },
] as const;

export type AmbitoAct = "granja" | "ruta" | "cedis" | "mensual";
export type EstadoAct = "planificada" | "ejecutada" | "cumplida" | "incumplida";

export interface ActividadAuditor {
  auditor: string;
  ambito: AmbitoAct;
  mes: string;            // formato YYYY-MM
  estado: EstadoAct;
  hallazgos: number;      // hallazgos detectados en la actividad
  objetivo: string;       // granja/ruta/CEDIS específico
  fecha: string;          // YYYY-MM-DD
  observacion: string;
}

export interface ActividadItem {
  id: string;
  data: ActividadAuditor;
  uploadedAt: string;
  uploadedBy: string;
}

const MARCADOR = "[AUDITOR-ACT]";

export function actividadVacia(auditor = ""): ActividadAuditor {
  const hoy = new Date();
  return {
    auditor,
    ambito: "granja",
    mes: hoy.toISOString().slice(0, 7),
    estado: "planificada",
    hallazgos: 0,
    objetivo: "",
    fecha: hoy.toISOString().slice(0, 10),
    observacion: "",
  };
}

function parseActividad(doc: DocRaw): ActividadItem | null {
  const m = (doc.ocrTexto ?? "").match(/\[AACT\]([\s\S]*?)\[\/AACT\]/);
  if (!m) return null;
  try {
    return { id: doc.id, data: JSON.parse(m[1]) as ActividadAuditor, uploadedAt: doc.uploadedAt, uploadedBy: doc.uploadedBy };
  } catch { return null; }
}

function construirPayload(data: ActividadAuditor) {
  const json = JSON.stringify(data);
  const ocr = `[AACT]${json}[/AACT]`;
  return {
    nombre: `ACTIVIDAD ${data.auditor} ${data.ambito} ${MARCADOR}`,
    tipo: "Otro", categoria: "Otro",
    size: ocr.length, url: "data:text/plain;base64,QUFDVA==", ocrTexto: ocr,
  };
}

export function useActividadesAuditor() {
  return useQuery({
    queryKey: ["auditor-actividades"],
    queryFn: async () => {
      const docs = await apiGet<DocRaw[]>(`/documentos`);
      return (docs ?? [])
        .filter(d => (d.nombre ?? "").includes(MARCADOR))
        .map(parseActividad)
        .filter((x): x is ActividadItem => x !== null)
        .sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
    },
    staleTime: 30_000,
  });
}

// Las actividades requieren un granjaId válido para el endpoint /documentos.
// Se inyecta desde el componente (se usa cualquier granja como contenedor;
// el dato real del ámbito va en el JSON, no depende de esa granja).
export function useCreateActividad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, granjaId }: { data: ActividadAuditor; granjaId: string }) =>
      apiPost<DocRaw>("/documentos", { granjaId, ...construirPayload(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auditor-actividades"] }),
  });
}

export function useUpdateActividad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, granjaId }: { id: string; data: ActividadAuditor; granjaId: string }) =>
      apiPatch<DocRaw>(`/documentos/${id}`, { granjaId, ...construirPayload(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auditor-actividades"] }),
  });
}

export function useDeleteActividad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/documentos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auditor-actividades"] }),
  });
}

// ── Cálculo de desempeño por auditor ──
export interface DesempenoAuditor {
  auditor: string;
  total: number;
  planificadas: number;
  ejecutadas: number;
  cumplidas: number;
  incumplidas: number;
  hallazgos: number;
  cumplimiento: number;   // % = (cumplidas + ejecutadas) / planificadas-base
  porAmbito: Record<AmbitoAct, number>;
}

// Calcula el desempeño de cada auditor a partir de sus actividades.
// Cumplimiento = (cumplidas + ejecutadas) / total de actividades asignadas * 100.
// Una actividad "incumplida" cuenta en el total pero no como lograda.
export function calcularDesempeno(items: ActividadItem[]): DesempenoAuditor[] {
  const porAuditor: Record<string, DesempenoAuditor> = {};
  for (const a of AUDITORES) {
    porAuditor[a] = {
      auditor: a, total: 0, planificadas: 0, ejecutadas: 0, cumplidas: 0, incumplidas: 0,
      hallazgos: 0, cumplimiento: 0,
      porAmbito: { granja: 0, ruta: 0, cedis: 0, mensual: 0 },
    };
  }
  for (const it of items) {
    const d = it.data;
    if (!porAuditor[d.auditor]) {
      porAuditor[d.auditor] = {
        auditor: d.auditor, total: 0, planificadas: 0, ejecutadas: 0, cumplidas: 0, incumplidas: 0,
        hallazgos: 0, cumplimiento: 0,
        porAmbito: { granja: 0, ruta: 0, cedis: 0, mensual: 0 },
      };
    }
    const reg = porAuditor[d.auditor];
    reg.total += 1;
    reg.hallazgos += Number(d.hallazgos) || 0;
    if (d.estado === "planificada") reg.planificadas += 1;
    else if (d.estado === "ejecutada") reg.ejecutadas += 1;
    else if (d.estado === "cumplida") reg.cumplidas += 1;
    else if (d.estado === "incumplida") reg.incumplidas += 1;
    if (reg.porAmbito[d.ambito] !== undefined) reg.porAmbito[d.ambito] += 1;
  }
  // Cumplimiento: logradas (cumplidas + ejecutadas) sobre total
  Object.values(porAuditor).forEach(r => {
    r.cumplimiento = r.total ? Math.round(((r.cumplidas + r.ejecutadas) / r.total) * 100) : 0;
  });
  return Object.values(porAuditor);
}
