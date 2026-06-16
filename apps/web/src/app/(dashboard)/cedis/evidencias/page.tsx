"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// Evidencias · CEDIS · conectado al API
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useRef } from "react";
import { Header } from "@/components/layout/header";
import { useCedis } from "@/hooks/useCedis";
import {
  useEvidenciasCedi, useCreateEvidenciaCedi, useDeleteEvidenciaCedi,
  type EvidenciaCediPayload,
} from "@/hooks/useEvidencias";
import { useAuthStore } from "@/store/auth.store";
import { AUDITORS } from "@/lib/constants";
import {
  Upload, FileText, FileSpreadsheet, Image as ImageIcon, Video, FolderOpen,
  Search, Plus, ExternalLink, Trash2, X, AlertCircle, Loader2, Building2,
  UploadCloud, Eye, FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TIPOS = [
  { tipo: "Foto",  icon: ImageIcon,       color: "#3B82F6", desc: "Evidencia visual del CEDI auditado" },
  { tipo: "PDF",   icon: FileText,        color: "#EF4444", desc: "Actas, certificaciones, contratos"  },
  { tipo: "Excel", icon: FileSpreadsheet, color: "#10B981", desc: "Inventarios, arqueos, listados"     },
  { tipo: "Video", icon: Video,           color: "#8B5CF6", desc: "Grabación de recorrido auditor"     },
  { tipo: "Otro",  icon: FolderOpen,      color: "#94A3B8", desc: "Otros documentos relacionados"      },
];
const ICONO_TIPO: Record<string, any> = {
  Foto: ImageIcon, PDF: FileText, Excel: FileSpreadsheet, Video: Video, Otro: FolderOpen,
};
const COLOR_TIPO: Record<string, string> = {
  Foto: "#3B82F6", PDF: "#EF4444", Excel: "#10B981", Video: "#8B5CF6", Otro: "#94A3B8",
};

const CATEGORIAS = [
  "Acta visita", "Foto cuarto frío", "Foto cuartos secos", "Pediluvio",
  "Caja arqueo", "Cartera", "Logger temperatura", "Encuesta cliente",
  "Inventario físico", "Documentación legal", "Otros",
];

// ── Carga de archivos reales (PDF · XLSX) ───────────────────────────────────
const MAX_BYTES = 4 * 1024 * 1024;   // 4 MB por archivo
const TIPOS_PERMITIDOS: Record<string, "PDF" | "Excel"> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
  "application/vnd.ms-excel": "Excel",
};

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function leerArchivoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

// Vista previa de la primera página de un PDF como imagen (usa pdf.js desde CDN)
async function previewPDF(dataUrl: string): Promise<string | null> {
  try {
    const pdfjsLib: any = (window as any).pdfjsLib || await cargarPdfJs();
    const base64 = dataUrl.split(",")[1];
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.8 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width; canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch { return null; }
}

async function cargarPdfJs(): Promise<any> {
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar pdf.js"));
    document.head.appendChild(s);
  });
  const lib = (window as any).pdfjsLib;
  if (lib) lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  return lib;
}

// Resumen de un XLSX: nombres de hojas y primeras filas (usa SheetJS desde CDN)
async function previewXLSX(dataUrl: string): Promise<{ hojas: string[]; filas: any[][] } | null> {
  try {
    const XLSX: any = (window as any).XLSX || await cargarXlsx();
    const base64 = dataUrl.split(",")[1];
    const wb = XLSX.read(base64, { type: "base64" });
    const hojas: string[] = wb.SheetNames;
    const primera = wb.Sheets[hojas[0]];
    const filas: any[][] = XLSX.utils.sheet_to_json(primera, { header: 1 }).slice(0, 5);
    return { hojas, filas };
  } catch { return null; }
}

async function cargarXlsx(): Promise<any> {
  if ((window as any).XLSX) return (window as any).XLSX;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar SheetJS"));
    document.head.appendChild(s);
  });
  return (window as any).XLSX;
}

// Quita el bloque [META]...[/META] del nombre para mostrarlo limpio en la lista
function nombreLimpio(nombre: string): string {
  return (nombre ?? "").replace(/\s*\[META\][\s\S]*?\[\/META\]/, "").trim();
}
// Extrae los metadatos embebidos en el nombre
function leerMeta(nombre: string): Record<string, string> {
  const m = (nombre ?? "").match(/\[META\]([\s\S]*?)\[\/META\]/);
  if (!m) return {};
  const out: Record<string, string> = {};
  m[1].split(";").forEach(par => {
    const [k, ...v] = par.split("=");
    if (k) out[k.trim()] = v.join("=").trim();
  });
  return out;
}

export default function EvidenciasCedisPage() {
  const cedisQ = useCedis();
  const cedis  = cedisQ.data ?? [];
  const [selectedCedi, setSelectedCedi] = useState<string>("");
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroCat, setFiltroCat]   = useState("");

  const evidQ = useEvidenciasCedi(selectedCedi ? { cediId: selectedCedi } : {});
  const evidAll = evidQ.data ?? [];
  const evid = evidAll.filter(e => {
    if (filtroTipo && e.tipo !== filtroTipo) return false;
    if (filtroCat && e.categoria !== filtroCat) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!e.nombre.toLowerCase().includes(q) && !(e.ocrTexto?.toLowerCase() ?? "").includes(q)) return false;
    }
    return true;
  });

  const createEv = useCreateEvidenciaCedi();
  const removeEv = useDeleteEvidenciaCedi();

  const [modalOpen, setModalOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const countByTipo = (tipo: string) => evidAll.filter(e => e.tipo === tipo).length;

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Evidencias · CEDIS"
        subtitle={selectedCedi
          ? `${evid.length} evidencias del CEDI · carga de archivos PDF y XLSX con vista previa`
          : "Selecciona un CEDI para listar y cargar evidencias"}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Toolbar */}
        <div className="card-base p-3 flex items-center gap-3 flex-wrap">
          <select
            value={selectedCedi}
            onChange={e => setSelectedCedi(e.target.value)}
            className="px-3 py-2 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white min-w-[200px]"
          >
            <option value="">Todos los CEDIS</option>
            {cedis.map((c: any) => <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}
          </select>
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]"/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o contenido OCR..."
              className="w-full pl-10 pr-3 py-2 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-emerald-500/40"
            />
          </div>
          <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}
            className="px-3 py-2 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="px-3 py-2 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todos los tipos</option>
            {TIPOS.map(t => <option key={t.tipo}>{t.tipo}</option>)}
          </select>
          <button
            onClick={() => { setSaveError(null); setModalOpen(true); }}
            disabled={!selectedCedi}
            className="btn-primary text-xs ml-auto bg-emerald-500 hover:bg-emerald-600 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            title={selectedCedi ? "Cargar evidencia" : "Selecciona un CEDI primero"}
          >
            <Upload className="w-3.5 h-3.5"/>Cargar evidencia
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {TIPOS.map(t => (
            <div key={t.tipo} className="card-base text-center">
              <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: `${t.color}18`, color: t.color }}>
                <t.icon className="w-5 h-5"/>
              </div>
              <p className="font-display text-2xl font-bold text-white">{countByTipo(t.tipo)}</p>
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider mt-1">{t.tipo}</p>
              <p className="text-[9px] text-[#475569] mt-1 leading-tight">{t.desc}</p>
            </div>
          ))}
        </div>

        {/* Listado */}
        <div className="card-base">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white text-sm">Evidencias registradas</h3>
            <span className="text-[10px] text-[#94A3B8]">{evid.length} · de {evidAll.length} total</span>
          </div>

          {evidQ.isLoading ? (
            <div className="py-8 flex items-center justify-center text-[#475569]">
              <Loader2 className="w-5 h-5 animate-spin"/>
            </div>
          ) : evid.length === 0 ? (
            <div className="py-12 text-center">
              <FolderOpen className="w-10 h-10 text-[#1E2D4A] mx-auto mb-4"/>
              <p className="text-white text-sm font-semibold mb-2">
                {selectedCedi ? "Sin evidencias para los filtros aplicados" : "Selecciona un CEDI para cargar evidencias"}
              </p>
              <p className="text-[#475569] text-xs">
                {selectedCedi
                  ? "Click en \"Cargar evidencia\" para vincular un archivo desde repositorio externo"
                  : "Las evidencias se asocian a cada CEDI auditado"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {evid.map(e => {
                const Icon = ICONO_TIPO[e.tipo] ?? FolderOpen;
                const color = COLOR_TIPO[e.tipo] ?? "#94A3B8";
                return (
                  <div key={e.id} className="bg-[#1A2540] border border-[#2A3F6A] rounded-lg p-3 flex flex-col">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>
                        <Icon className="w-5 h-5"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate" title={nombreLimpio(e.nombre)}>{nombreLimpio(e.nombre)}</p>
                        <p className="text-[10px] text-[#94A3B8] mt-0.5">{e.categoria ?? "Sin categoría"}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#475569] mb-3">
                      {new Date(e.uploadedAt).toLocaleDateString("es-CO")} · {leerMeta(e.nombre).auditor || e.uploadedBy}
                    </p>
                    <div className="flex items-center gap-2 mt-auto">
                      <a href={e.url} target="_blank" rel="noopener noreferrer"
                        className="flex-1 px-2 py-1 rounded bg-[#0D1526] border border-[#1E2D4A] hover:border-emerald-500/40 text-emerald-300 hover:text-emerald-400 text-[10px] flex items-center justify-center gap-1.5">
                        <ExternalLink className="w-3 h-3"/>Abrir
                      </a>
                      <button
                        onClick={async () => {
                          if (!confirm(`¿Eliminar evidencia "${e.nombre}"?`)) return;
                          try { await removeEv.mutateAsync(e.id); }
                          catch (err: any) { alert("Error: " + (err?.response?.data?.message ?? err?.message)); }
                        }}
                        className="px-2 py-1 rounded bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-300 hover:text-red-400"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3 h-3"/>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {modalOpen && selectedCedi && (
        <EvidenciaCediModal
          cediId={selectedCedi}
          cediNombre={cedis.find((c: any) => c.id === selectedCedi)?.nombre ?? ""}
          error={saveError}
          onClose={() => { setModalOpen(false); setSaveError(null); }}
          onSave={async (dto) => {
            setSaveError(null);
            try {
              await createEv.mutateAsync(dto);
              setModalOpen(false);
            } catch (e: any) {
              const raw = e?.response?.data;
              let msg = "Error al guardar";
              if (raw?.message) msg = Array.isArray(raw.message) ? raw.message.join(" · ") : String(raw.message);
              else if (e?.message) msg = e.message;
              if (e?.response?.status) msg = `HTTP ${e.response.status} · ${msg}`;
              setSaveError(msg);
              console.error("[Evidencias CEDIS] error:", e);
            }
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Modal de carga de evidencias — subida real de PDF/XLSX con metadatos y vista previa
// ═══════════════════════════════════════════════════════════════════════════════
interface ArchivoPreparado {
  file: File;
  tipo: "PDF" | "Excel";
  dataUrl: string;
  size: number;
  previewImg?: string | null;          // miniatura primera página (PDF)
  previewXlsx?: { hojas: string[]; filas: any[][] } | null;
}

function EvidenciaCediModal({ cediId, cediNombre, error, onClose, onSave }: {
  cediId: string;
  cediNombre: string;
  error: string | null;
  onClose: () => void;
  onSave: (dto: EvidenciaCediPayload) => Promise<void>;
}) {
  const usuario = useAuthStore((s) => s.user?.name ?? "Auditor CEDIS");

  // Metadatos del registro (formulario)
  const [auditor, setAuditor]       = useState("");
  const [categoria, setCategoria]   = useState("Acta visita");
  const [fechaVisita, setFechaVisita]     = useState("");
  const [fechaInforme, setFechaInforme]   = useState("");

  const [archivos, setArchivos] = useState<ArchivoPreparado[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function procesarArchivos(files: File[]) {
    setValidationError(null);
    const validos = files.filter(f => {
      const tipo = TIPOS_PERMITIDOS[f.type] || (f.name.toLowerCase().endsWith(".pdf") ? "PDF" : (f.name.toLowerCase().match(/\.xlsx?$/) ? "Excel" : null));
      if (!tipo) { setValidationError(`Formato no permitido: ${f.name}. Solo PDF y XLSX.`); return false; }
      if (f.size > MAX_BYTES) { setValidationError(`${f.name} supera el límite de 4 MB (${fmtSize(f.size)}).`); return false; }
      return true;
    });
    if (!validos.length) return;

    setProcesando(true);
    try {
      const preparados: ArchivoPreparado[] = [];
      for (const file of validos) {
        const tipo: "PDF" | "Excel" = (TIPOS_PERMITIDOS[file.type] || (file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "Excel")) as any;
        const dataUrl = await leerArchivoBase64(file);
        let previewImg: string | null = null;
        let previewXlsx: { hojas: string[]; filas: any[][] } | null = null;
        if (tipo === "PDF") previewImg = await previewPDF(dataUrl);
        else previewXlsx = await previewXLSX(dataUrl);
        preparados.push({ file, tipo, dataUrl, size: file.size, previewImg, previewXlsx });
      }
      setArchivos(prev => [...prev, ...preparados]);
    } catch (e: any) {
      setValidationError(e?.message ?? "Error al procesar los archivos");
    } finally {
      setProcesando(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    procesarArchivos(Array.from(e.dataTransfer.files ?? []));
  }
  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    procesarArchivos(Array.from(e.target.files ?? []));
    e.target.value = "";
  }
  function quitar(idx: number) {
    setArchivos(prev => prev.filter((_, i) => i !== idx));
  }

  // Embeber metadatos en ocrTexto-like via nombre + categoría; subir cada archivo
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    if (archivos.length === 0) { setValidationError("Adjunta al menos un archivo PDF o XLSX"); return; }

    setSubmitting(true);
    try {
      // Metadatos embebidos en el nombre con sufijo [META] para trazabilidad
      const meta = `[META]auditor=${auditor};fechaVisita=${fechaVisita};fechaInforme=${fechaInforme};cargadoPor=${usuario}[/META]`;
      for (const a of archivos) {
        await onSave({
          cediId,
          tipo: a.tipo,
          nombre: `${a.file.name} ${meta}`,
          url: a.dataUrl,
          size: a.size,
          categoria,
        });
      }
      onClose();
    } catch {
      /* error externo manejado por onSave */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A] sticky top-0 bg-[#0D1526] z-10">
          <div>
            <h2 className="font-display font-bold text-white text-lg">Cargar Evidencia · CEDI</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5 flex items-center gap-1.5">
              <Building2 className="w-3 h-3"/>{cediNombre} · PDF y XLSX hasta 4 MB
            </p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>

        <form onSubmit={submit} className="px-6 py-4 space-y-4">
          {/* Zona drag & drop */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
              dragOver ? "border-emerald-500 bg-emerald-500/10" : "border-[#1E2D4A] hover:border-emerald-500/40 bg-[#0A111F]"
            )}
          >
            <input ref={inputRef} type="file" accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple className="hidden" onChange={onSelect}/>
            <UploadCloud className="w-8 h-8 mx-auto text-emerald-400 mb-2"/>
            <p className="text-sm text-white font-medium">Arrastra archivos aquí o haz clic para seleccionar</p>
            <p className="text-[11px] text-[#64748B] mt-1">PDF · XLSX · máximo 4 MB · carga múltiple</p>
            {procesando && <div className="flex items-center justify-center gap-2 mt-2 text-emerald-400 text-xs"><Loader2 className="w-3.5 h-3.5 animate-spin"/> Procesando y generando vista previa…</div>}
          </div>

          {/* Vista previa de archivos preparados */}
          {archivos.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Vista preliminar ({archivos.length})</p>
              {archivos.map((a, idx) => (
                <div key={idx} className="flex gap-3 p-3 rounded-lg bg-[#0A111F] border border-[#1E2D4A]">
                  {/* Miniatura */}
                  <div className="w-16 h-20 rounded bg-[#0D1526] border border-[#1E2D4A] flex items-center justify-center overflow-hidden shrink-0">
                    {a.tipo === "PDF"
                      ? (a.previewImg ? <img src={a.previewImg} alt="preview" className="w-full h-full object-cover"/> : <FileText className="w-6 h-6 text-red-400"/>)
                      : <FileSpreadsheet className="w-6 h-6 text-emerald-400"/>}
                  </div>
                  {/* Datos */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{a.file.name}</p>
                    <p className="text-[10px] text-[#94A3B8] mt-0.5">{a.tipo} · {fmtSize(a.size)}</p>
                    {a.tipo === "Excel" && a.previewXlsx && (
                      <div className="mt-1">
                        <p className="text-[10px] text-[#64748B]">{a.previewXlsx.hojas.length} hoja(s): {a.previewXlsx.hojas.join(", ").slice(0, 50)}</p>
                        {a.previewXlsx.filas.length > 0 && (
                          <div className="mt-1 overflow-x-auto">
                            <table className="text-[9px] text-[#94A3B8] border-collapse">
                              <tbody>
                                {a.previewXlsx.filas.slice(0, 3).map((fila, fi) => (
                                  <tr key={fi}>{fila.slice(0, 4).map((celda: any, ci) => <td key={ci} className="border border-[#1E2D4A] px-1 py-0.5 truncate max-w-[80px]">{String(celda ?? "")}</td>)}</tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                    {a.tipo === "PDF" && <p className="text-[10px] text-[#64748B] mt-0.5 flex items-center gap-1"><Eye className="w-2.5 h-2.5"/> Primera página</p>}
                  </div>
                  <button type="button" onClick={() => quitar(idx)} className="text-red-400 hover:text-red-300 shrink-0"><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
            </div>
          )}

          {/* Metadatos del registro */}
          <div>
            <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2">Metadatos del Registro</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1.5 block">Auditor</label>
                <select value={auditor} onChange={e => setAuditor(e.target.value)} className="input-base">
                  <option value="">Selecciona…</option>
                  {AUDITORS.map((a: any) => <option key={a.id ?? a.name} value={a.name ?? a}>{a.name ?? a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1.5 block">Categoría</label>
                <select value={categoria} onChange={e => setCategoria(e.target.value)} className="input-base">
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1.5 block">Fecha de visita</label>
                <input type="date" value={fechaVisita} onChange={e => setFechaVisita(e.target.value)} className="input-base"/>
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1.5 block">Fecha del informe</label>
                <input type="date" value={fechaInforme} onChange={e => setFechaInforme(e.target.value)} className="input-base"/>
              </div>
            </div>
            <p className="text-[10px] text-[#475569] mt-2 flex items-center gap-1.5"><FileCheck className="w-3 h-3"/> CEDI: <strong className="text-[#94A3B8]">{cediNombre}</strong> · Cargado por: <strong className="text-[#94A3B8]">{usuario}</strong></p>
          </div>

          {(validationError || error) && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5"/>
              <span>{validationError ?? error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1E2D4A]">
            <button type="button" onClick={onClose} className="btn-ghost text-xs" disabled={submitting}>Cancelar</button>
            <button type="submit" disabled={submitting || procesando || archivos.length === 0}
              className="btn-primary text-xs bg-emerald-500 hover:bg-emerald-600 flex items-center gap-2 disabled:opacity-50">
              {submitting && <Loader2 className="w-3 h-3 animate-spin"/>}
              {submitting ? "Cargando…" : `Cargar ${archivos.length || ""} evidencia(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
