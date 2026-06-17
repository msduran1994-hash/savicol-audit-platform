"use client";
import { useState, useRef, useMemo } from "react";
import { Header } from "@/components/layout/header";
import {
  useDocumentos, useCreateDocumento, useUpdateDocumento, useDeleteDocumento,
  type DocumentoItem, type DocumentoPayload,
} from "@/hooks/useDocumentos";
import { useGranjas } from "@/hooks/useGranjas";
import { useAuthStore } from "@/store/auth.store";
import {
  FileText, FileSpreadsheet, Plus, Search, Trash2, X, Download, Eye,
  Loader2, UploadCloud, AlertCircle, FolderOpen, Pencil, Maximize2, FileType2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Formatos Auditoría: reutiliza el endpoint /documentos (mismo almacenamiento
//     que Granjas → Documentos). Se distinguen con el marcador [FA] en ocrTexto.
//     La "actividad" se guarda dentro de [FA] (la categoría del backend va como "Otro").

const ACTIVIDADES = [
  "Producción",
  "Auditoría CEDIS",
  "Acompañamiento a Rutas",
  "Inventario Producto",
  "Inventario Tinas",
  "Descarte Producto",
  "Descarte Reciclaje",
  "Otros Documentos de Auditoría",
];

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const TIPOS_PERMITIDOS: Record<string, "PDF" | "Excel" | "Word"> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
  "application/vnd.ms-excel": "Excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/msword": "Word",
};

const ICONO_TIPO: Record<string, any> = { PDF: FileText, Excel: FileSpreadsheet, Word: FileType2 };
const COLOR_TIPO: Record<string, string> = { PDF: "#EF4444", Excel: "#22C55E", Word: "#3B82F6" };

const fmtSize = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(0)} KB` : `${(b/1048576).toFixed(2)} MB`;
const fmtFecha = (d?: string) => d ? new Date(d).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" }) : "—";

// ── Marcador [FA] en ocrTexto: guarda actividad, descripción, usuario ──
interface FaMeta { actividad: string; desc: string; cargadoPor: string; }
function leerFa(ocr?: string): FaMeta {
  const m = (ocr ?? "").match(/\[FA\]([\s\S]*?)\[\/FA\]/);
  const out: FaMeta = { actividad: "Otros Documentos de Auditoría", desc: "", cargadoPor: "" };
  if (m) m[1].split(";").forEach(par => {
    const i = par.indexOf("=");
    if (i > 0) {
      const k = par.slice(0, i).trim(), v = par.slice(i+1).trim();
      if (k === "actividad") out.actividad = v;
      else if (k === "desc") out.desc = v;
      else if (k === "cargadoPor") out.cargadoPor = v;
    }
  });
  return out;
}
function escribirFa(m: FaMeta): string {
  return `[FA]actividad=${m.actividad};desc=${m.desc};cargadoPor=${m.cargadoPor}[/FA]`;
}
const esFormatoAuditoria = (d: DocumentoItem) => (d.ocrTexto ?? "").includes("[FA]");

function leerArchivoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("No se pudo leer el archivo"));
    r.readAsDataURL(file);
  });
}

// ── Vista previa: PDF (pdf.js) y Excel (SheetJS) vía CDN ──
async function cargarPdfJs(): Promise<any> {
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
  await new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = () => res(); s.onerror = () => rej(new Error("pdf.js"));
    document.head.appendChild(s);
  });
  const lib = (window as any).pdfjsLib;
  if (lib) lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  return lib;
}
async function cargarXlsx(): Promise<any> {
  if ((window as any).XLSX) return (window as any).XLSX;
  await new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => res(); s.onerror = () => rej(new Error("SheetJS"));
    document.head.appendChild(s);
  });
  return (window as any).XLSX;
}
async function renderPDF(dataUrl: string, canvas: HTMLCanvasElement, pageNum: number): Promise<number> {
  const pdfjsLib = await cargarPdfJs();
  const base64 = dataUrl.split(",")[1];
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const page = await pdf.getPage(Math.min(pageNum, pdf.numPages));
  const viewport = page.getViewport({ scale: 1.3 });
  canvas.width = viewport.width; canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (ctx) await page.render({ canvasContext: ctx, viewport }).promise;
  return pdf.numPages;
}
async function leerXLSX(dataUrl: string): Promise<{ hojas: string[]; filas: any[][] }> {
  const XLSX = await cargarXlsx();
  const base64 = dataUrl.split(",")[1];
  const wb = XLSX.read(base64, { type: "base64" });
  const hojas: string[] = wb.SheetNames;
  const filas: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[hojas[0]], { header: 1 }).slice(0, 30);
  return { hojas, filas };
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function FormatosAuditoriaPage() {
  const docsQ = useDocumentos({});                 // todos; filtramos [FA] en cliente
  const granjasQ = useGranjas();
  const usuario = useAuthStore((s) => s.user?.name ?? "Auditor");
  const createDoc = useCreateDocumento();
  const updateDoc = useUpdateDocumento();
  const removeDoc = useDeleteDocumento();

  // granja ancla (transparente para el usuario): primera granja disponible
  const granjaAncla: string = (granjasQ.data?.[0]?.id) ?? "";

  const [filterActividad, setFilterActividad] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentoItem | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<DocumentoItem | null>(null);

  // Solo formatos de auditoría (marcador [FA])
  const formatos = useMemo(() => {
    const all = (docsQ.data ?? []).filter(esFormatoAuditoria);
    return all.filter(d => {
      const fa = leerFa(d.ocrTexto);
      if (filterActividad && fa.actividad !== filterActividad) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!d.nombre.toLowerCase().includes(q) && !fa.desc.toLowerCase().includes(q) && !fa.actividad.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [docsQ.data, filterActividad, search]);

  async function handleSave(payload: DocumentoPayload, id?: string) {
    setSaveError(null);
    try {
      if (id) await updateDoc.mutateAsync({ id, patch: payload });
      else await createDoc.mutateAsync(payload);
      setModalOpen(false); setEditing(null);
    } catch (e: any) {
      setSaveError(e?.message ?? "Error al guardar el formato");
      throw e;
    }
  }
  async function handleDelete(d: DocumentoItem) {
    if (!confirm(`¿Eliminar el formato "${d.nombre.replace(/\s*\[FA\][\s\S]*$/, "")}"?`)) return;
    await removeDoc.mutateAsync(d.id);
    if (seleccionado?.id === d.id) setSeleccionado(null);
  }
  const nombreLimpio = (n: string) => n.replace(/\s*\[FA\][\s\S]*$/, "").replace(/^\[FA\]\s*/, "").trim();

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Formatos Auditoría"
        subtitle={`${formatos.length} formato(s) · gestión documental centralizada · PDF · Excel · Word`}
      />
      <div className="flex-1 p-6">
        {/* Barra de acciones */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar formato…"
              className="w-full bg-[#0A111F] border border-[#1E2D4A] rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"/>
          </div>
          <select value={filterActividad} onChange={e => setFilterActividad(e.target.value)}
            className="bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50">
            <option value="">Todas las actividades</option>
            {ACTIVIDADES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={() => { setEditing(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A111F] text-sm font-bold whitespace-nowrap">
            <Plus className="w-4 h-4"/> Nuevo Formato
          </button>
        </div>

        {/* Distribución de 2 paneles */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-5">
          {/* Panel izquierdo: lista */}
          <div className="space-y-2">
            {docsQ.isLoading && <div className="flex items-center gap-2 text-[#94A3B8] text-sm p-4"><Loader2 className="w-4 h-4 animate-spin"/> Cargando…</div>}
            {!docsQ.isLoading && formatos.length === 0 && (
              <div className="text-center py-12 text-[#64748B]">
                <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-40"/>
                <p className="text-sm">No hay formatos. Clic en "Nuevo Formato" para cargar uno.</p>
                <p className="text-[11px] mt-1">Soporta PDF · Excel · Word</p>
              </div>
            )}
            {formatos.map(d => {
              const fa = leerFa(d.ocrTexto);
              const Icon = ICONO_TIPO[d.tipo] ?? FileText;
              const activo = seleccionado?.id === d.id;
              return (
                <div key={d.id} onClick={() => setSeleccionado(d)}
                  className={cn("p-3 rounded-xl border cursor-pointer transition-colors",
                    activo ? "bg-emerald-500/10 border-emerald-500/40" : "bg-[#0D1526] border-[#1E2D4A] hover:border-[#2A3F6A]")}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${COLOR_TIPO[d.tipo] ?? "#94A3B8"}22` }}>
                      <Icon className="w-4.5 h-4.5" style={{ color: COLOR_TIPO[d.tipo] ?? "#94A3B8" }}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{nombreLimpio(d.nombre)}</p>
                      <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-[#1A2540] text-emerald-300 mt-1">{fa.actividad}</span>
                      {fa.desc && <p className="text-[11px] text-[#94A3B8] mt-1 line-clamp-2">{fa.desc}</p>}
                      <p className="text-[10px] text-[#475569] mt-1">{fmtFecha(d.uploadedAt)} · {fa.cargadoPor || d.uploadedBy} · {fmtSize(d.size)}</p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); setEditing(d); setModalOpen(true); }} title="Editar" className="p-1 text-[#64748B] hover:text-emerald-400"><Pencil className="w-3.5 h-3.5"/></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(d); }} title="Eliminar" className="p-1 text-[#64748B] hover:text-red-400"><Trash2 className="w-3.5 h-3.5"/></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Panel derecho: vista previa */}
          <div className="lg:sticky lg:top-4 h-fit">
            {seleccionado
              ? <PanelPreview doc={seleccionado} fa={leerFa(seleccionado.ocrTexto)} nombreLimpio={nombreLimpio}/>
              : <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl p-12 text-center text-[#64748B]">
                  <Eye className="w-10 h-10 mx-auto mb-3 opacity-40"/>
                  <p className="text-sm">Selecciona un formato de la lista para ver su vista previa, información y opciones de descarga.</p>
                </div>}
          </div>
        </div>
      </div>

      {modalOpen && (
        <FormatoModal
          item={editing} granjaAncla={granjaAncla} usuario={usuario} error={saveError}
          onClose={() => { setModalOpen(false); setEditing(null); setSaveError(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ─── Panel derecho: vista previa + info + descarga ──────────────────────────
function PanelPreview({ doc, fa, nombreLimpio }: { doc: DocumentoItem; fa: FaMeta; nombreLimpio: (n: string) => string }) {
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfPages, setPdfPages] = useState(0);
  const [xlsx, setXlsx] = useState<{ hojas: string[]; filas: any[][] } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errorPrev, setErrorPrev] = useState<string | null>(null);
  const [ampliado, setAmpliado] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Render PDF al cambiar de doc/página
  useMemo(() => { setPdfPage(1); setPdfPages(0); setXlsx(null); setErrorPrev(null); }, [doc.id]);

  async function cargarPreview(pagina = pdfPage) {
    setErrorPrev(null);
    if (!doc.url) { setErrorPrev("Sin archivo"); return; }
    setCargando(true);
    try {
      if (doc.tipo === "PDF" && canvasRef.current) {
        const n = await renderPDF(doc.url, canvasRef.current, pagina);
        setPdfPages(n);
      } else if (doc.tipo === "Excel") {
        setXlsx(await leerXLSX(doc.url));
      }
    } catch (e: any) {
      setErrorPrev("No se pudo generar la vista previa. Usa descargar para abrir el archivo.");
    } finally {
      setCargando(false);
    }
  }
  // disparar carga al seleccionar
  useMemo(() => {
    if (doc.tipo === "PDF" || doc.tipo === "Excel") {
      setTimeout(() => cargarPreview(1), 60);
    }
  }, [doc.id]);

  function descargar() {
    const a = document.createElement("a");
    a.href = doc.url; a.download = nombreLimpio(doc.nombre) || "documento";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
  async function cambiarPagina(delta: number) {
    const next = Math.min(Math.max(1, pdfPage + delta), pdfPages || 1);
    setPdfPage(next);
    await cargarPreview(next);
  }

  const Icon = ICONO_TIPO[doc.tipo] ?? FileText;
  return (
    <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl overflow-hidden">
      {/* Cabecera info */}
      <div className="p-4 border-b border-[#1E2D4A]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${COLOR_TIPO[doc.tipo] ?? "#94A3B8"}22` }}>
              <Icon className="w-4.5 h-4.5" style={{ color: COLOR_TIPO[doc.tipo] ?? "#94A3B8" }}/>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{nombreLimpio(doc.nombre)}</p>
              <p className="text-[11px] text-[#94A3B8]">{doc.tipo} · {fmtSize(doc.size)} · {fmtFecha(doc.uploadedAt)}</p>
            </div>
          </div>
          <button onClick={descargar} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shrink-0 hover:bg-emerald-500/25">
            <Download className="w-3.5 h-3.5"/> Descargar
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-[11px]">
          <div className="text-[#64748B]">Actividad: <span className="text-emerald-300">{fa.actividad}</span></div>
          <div className="text-[#64748B]">Cargado por: <span className="text-[#94A3B8]">{fa.cargadoPor || doc.uploadedBy}</span></div>
          {fa.desc && <div className="text-[#64748B] col-span-2">Descripción: <span className="text-[#94A3B8]">{fa.desc}</span></div>}
        </div>
      </div>

      {/* Cuerpo de vista previa */}
      <div className="p-4 bg-[#0A111F] min-h-[360px]">
        {cargando && <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm py-16"><Loader2 className="w-4 h-4 animate-spin"/> Generando vista previa…</div>}
        {errorPrev && !cargando && <div className="flex items-center gap-2 text-amber-300 text-xs py-8 px-3 bg-amber-500/10 rounded-lg"><AlertCircle className="w-4 h-4 shrink-0"/> {errorPrev}</div>}

        {!cargando && !errorPrev && doc.tipo === "PDF" && (
          <div>
            <div className="flex items-center justify-center gap-3 mb-3">
              <button onClick={() => cambiarPagina(-1)} disabled={pdfPage<=1} className="px-2 py-1 rounded bg-[#1A2540] text-white text-xs disabled:opacity-40">‹ Anterior</button>
              <span className="text-xs text-[#94A3B8]">Página {pdfPage} de {pdfPages || "…"}</span>
              <button onClick={() => cambiarPagina(1)} disabled={pdfPages>0 && pdfPage>=pdfPages} className="px-2 py-1 rounded bg-[#1A2540] text-white text-xs disabled:opacity-40">Siguiente ›</button>
              <button onClick={() => setAmpliado(true)} title="Ampliar" className="px-2 py-1 rounded bg-[#1A2540] text-white text-xs flex items-center gap-1"><Maximize2 className="w-3 h-3"/></button>
            </div>
            <div className="overflow-auto max-h-[460px] flex justify-center bg-white rounded-lg">
              <canvas ref={canvasRef} className="max-w-full"/>
            </div>
          </div>
        )}

        {!cargando && !errorPrev && doc.tipo === "Excel" && xlsx && (
          <div>
            <p className="text-[11px] text-[#94A3B8] mb-2">{xlsx.hojas.length} hoja(s): {xlsx.hojas.join(", ")}</p>
            <div className="overflow-auto max-h-[460px] border border-[#1E2D4A] rounded-lg">
              <table className="text-[11px] text-[#cbd5e1] border-collapse w-full">
                <tbody>
                  {xlsx.filas.map((fila, fi) => (
                    <tr key={fi} className={fi===0 ? "bg-[#1A2540] font-semibold" : ""}>
                      {(fila.length ? fila : [""]).map((c: any, ci) => <td key={ci} className="border border-[#1E2D4A] px-2 py-1 whitespace-nowrap">{String(c ?? "")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!cargando && !errorPrev && doc.tipo === "Word" && (
          <div className="text-center py-12">
            <FileType2 className="w-12 h-12 mx-auto mb-3 text-blue-400"/>
            <p className="text-sm text-white font-semibold">{nombreLimpio(doc.nombre)}</p>
            <p className="text-[11px] text-[#94A3B8] mt-1 mb-4 max-w-xs mx-auto">La vista previa integrada de Word no está disponible para archivos almacenados. Descarga el documento para abrirlo en Word.</p>
            <button onClick={descargar} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold hover:bg-blue-500/25">
              <Download className="w-3.5 h-3.5"/> Descargar documento Word
            </button>
          </div>
        )}
      </div>

      {/* Modal ampliado del PDF */}
      {ampliado && doc.tipo === "PDF" && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setAmpliado(false)}>
          <div className="bg-white rounded-lg overflow-auto max-h-[92vh] max-w-[92vw]" onClick={e => e.stopPropagation()}>
            <PdfAmpliado url={doc.url}/>
          </div>
          <button onClick={() => setAmpliado(false)} className="absolute top-4 right-4 text-white"><X className="w-6 h-6"/></button>
        </div>
      )}
    </div>
  );
}

function PdfAmpliado({ url }: { url: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [pg, setPg] = useState(1);
  const [tot, setTot] = useState(0);
  useMemo(() => { setTimeout(async () => { if (ref.current) setTot(await renderPDF(url, ref.current, pg)); }, 60); }, [pg]);
  return (
    <div className="p-2">
      <div className="flex items-center justify-center gap-3 mb-2">
        <button onClick={() => setPg(p => Math.max(1, p-1))} disabled={pg<=1} className="px-2 py-1 rounded bg-gray-200 text-xs disabled:opacity-40">‹</button>
        <span className="text-xs text-gray-600">Página {pg} de {tot || "…"}</span>
        <button onClick={() => setPg(p => Math.min(tot||1, p+1))} disabled={tot>0 && pg>=tot} className="px-2 py-1 rounded bg-gray-200 text-xs disabled:opacity-40">›</button>
      </div>
      <canvas ref={ref}/>
    </div>
  );
}

// ─── Modal: crear / editar formato ──────────────────────────────────────────
function FormatoModal({ item, granjaAncla, usuario, error, onClose, onSave }: {
  item: DocumentoItem | null;
  granjaAncla: string;
  usuario: string;
  error: string | null;
  onClose: () => void;
  onSave: (payload: DocumentoPayload, id?: string) => Promise<void>;
}) {
  const faInicial = item ? leerFa(item.ocrTexto) : { actividad: "Producción", desc: "", cargadoPor: usuario };
  const nombreInicial = item ? item.nombre.replace(/\s*\[FA\][\s\S]*$/, "").replace(/^\[FA\]\s*/, "").trim() : "";

  const [actividad, setActividad] = useState(faInicial.actividad);
  const [nombre, setNombre] = useState(nombreInicial);
  const [desc, setDesc] = useState(faInicial.desc);
  const [archivo, setArchivo] = useState<{ file: File; tipo: string; dataUrl: string; size: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vError, setVError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const esEdicion = !!item;

  async function procesar(file: File) {
    setVError(null);
    const tipo = TIPOS_PERMITIDOS[file.type]
      || (file.name.toLowerCase().endsWith(".pdf") ? "PDF"
        : file.name.toLowerCase().match(/\.xlsx?$/) ? "Excel"
        : file.name.toLowerCase().match(/\.docx?$/) ? "Word" : null);
    if (!tipo) { setVError("Formato no permitido. Solo PDF, Excel (.xlsx) y Word (.docx)."); return; }
    if (file.size > MAX_BYTES) { setVError(`El archivo supera 4 MB (${fmtSize(file.size)}).`); return; }
    setProcesando(true);
    try {
      const dataUrl = await leerArchivoBase64(file);
      setArchivo({ file, tipo, dataUrl, size: file.size });
      if (!nombre) setNombre(file.name.replace(/\.[^.]+$/, ""));
    } catch { setVError("No se pudo leer el archivo"); }
    finally { setProcesando(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setVError(null);
    if (!nombre.trim()) { setVError("El nombre del documento es obligatorio"); return; }
    if (!esEdicion && !archivo) { setVError("Adjunta un archivo PDF, Excel o Word"); return; }
    if (!granjaAncla) { setVError("No hay datos de referencia cargados. Recarga la página e intenta de nuevo."); return; }
    setSubmitting(true);
    try {
      const fa = escribirFa({ actividad, desc: desc.trim(), cargadoPor: usuario });
      const payload: DocumentoPayload = {
        granjaId: granjaAncla,
        nombre: `${nombre.trim()} ${fa}`,
        tipo: archivo?.tipo ?? item!.tipo,
        categoria: "Otro",
        size: archivo?.size ?? item!.size,
        url: archivo?.dataUrl ?? item!.url,
        ocrTexto: fa,
      };
      await onSave(payload, item?.id);
    } catch { /* error manejado arriba */ }
    finally { setSubmitting(false); }
  }

  const IN = "w-full bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50";
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <header className="flex items-center justify-between px-5 py-4 border-b border-[#1E2D4A] sticky top-0 bg-[#0D1526]">
          <h2 className="font-display font-bold text-white">{esEdicion ? "Editar Formato" : "Nuevo Formato de Auditoría"}</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-[#94A3B8] mb-1.5 block">Actividad</label>
            <select value={actividad} onChange={e => setActividad(e.target.value)} className={IN}>
              {ACTIVIDADES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] mb-1.5 block">Nombre del Documento *</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Formato de control de producción" className={IN}/>
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] mb-1.5 block">Descripción del Formato</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Describe el propósito y uso de este formato…" className={cn(IN, "resize-none")}/>
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] mb-1.5 block">Archivo Adjunto {esEdicion && <span className="text-[#475569]">(opcional al editar)</span>}</label>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) procesar(f); }}
              onClick={() => inputRef.current?.click()}
              className={cn("rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-colors",
                dragOver ? "border-emerald-500 bg-emerald-500/10" : "border-[#1E2D4A] hover:border-emerald-500/40 bg-[#0A111F]")}>
              <input ref={inputRef} type="file" accept=".pdf,.xlsx,.xls,.doc,.docx,application/pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) procesar(f); e.target.value = ""; }}/>
              {procesando
                ? <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs"><Loader2 className="w-4 h-4 animate-spin"/> Procesando…</div>
                : archivo
                  ? <div className="text-sm text-white">{archivo.file.name} <span className="text-[#94A3B8]">({archivo.tipo} · {fmtSize(archivo.size)})</span></div>
                  : <div><UploadCloud className="w-7 h-7 mx-auto text-emerald-400 mb-1.5"/><p className="text-sm text-white">Arrastra o haz clic para adjuntar</p><p className="text-[10px] text-[#64748B] mt-0.5">PDF · Excel · Word · máx 4 MB</p></div>}
            </div>
            {esEdicion && !archivo && <p className="text-[10px] text-[#475569] mt-1">Si no adjuntas un nuevo archivo, se conserva el actual.</p>}
          </div>

          {(vError || error) && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5"/> <span>{vError ?? error}</span>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-[#1E2D4A]">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-[#94A3B8] hover:text-white" disabled={submitting}>Cancelar</button>
            <button type="submit" disabled={submitting || procesando}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A111F] text-xs font-bold flex items-center gap-2 disabled:opacity-50">
              {submitting && <Loader2 className="w-3 h-3 animate-spin"/>}
              {esEdicion ? "Guardar cambios" : "Crear Formato"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
