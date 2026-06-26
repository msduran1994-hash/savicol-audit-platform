"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// Evidencias · Acompañamientos Rutas · conectado al API
// Subida directa de archivos a la plataforma (base64) con vista previa.
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useRef } from "react";
import { Header } from "@/components/layout/header";
import { useAcompanamientos } from "@/hooks/useRutas";
import {
  useEvidenciasRuta, useCreateEvidenciaRuta, useDeleteEvidenciaRuta,
  type EvidenciaRutaPayload,
} from "@/hooks/useEvidencias";
import {
  Camera, FileText, FileSpreadsheet, Image as ImageIcon, Video, FolderOpen,
  Plus, ExternalLink, Trash2, X, AlertCircle, Loader2, Search, UploadCloud, Download, Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TIPOS = ["Foto", "PDF", "Excel", "Video", "Otro"];
const CATEGORIAS = [
  "Acta de devolución", "Foto del producto", "Temperatura cadena de frío",
  "Empaque dañado", "Pesaje", "Factura", "Termógrafo",
  "Carta cliente", "Foto vehículo", "Otros",
];
const ICONO_TIPO: Record<string, any> = {
  Foto: ImageIcon, PDF: FileText, Excel: FileSpreadsheet, Video: Video, Otro: FolderOpen,
};
const COLOR_TIPO: Record<string, string> = {
  Foto: "#3B82F6", PDF: "#EF4444", Excel: "#10B981", Video: "#8B5CF6", Otro: "#94A3B8",
};

const esImagen = (e: { tipo: string; url: string }) =>
  e.tipo === "Foto" || /^data:image\//i.test(e.url) || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(e.url);
const fmtSize = (b: number) => b > 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : b > 1024 ? `${Math.round(b / 1024)} KB` : `${b} B`;

// Fuente de imagen: las subidas (data URL) se muestran directo; los enlaces
// externos pasan por el proxy server-side (renderiza públicos, evita CORS).
const imgSrc = (url: string) => /^data:/i.test(url) ? url : `/api/evidencia-img?raw=1&url=${encodeURIComponent(url)}`;

// Miniatura con degradación elegante si la imagen no carga (enlace privado/roto).
function EvidThumb({ url, alt, className }: { url: string; alt: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (err) return <div className={cn("flex items-center justify-center bg-[#0D1526] border border-[#2A3F6A]", className)}><ImageIcon className="w-5 h-5 text-[#475569]"/></div>;
  return <img src={imgSrc(url)} alt={alt} className={className} loading="lazy" onError={() => setErr(true)}/>;
}

// ── Procesamiento de archivos en el navegador ──────────────────────────────────
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("No se pudo leer el archivo"));
    r.readAsDataURL(file);
  });
}
function resizeImage(file: File, maxDim = 1280, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const r = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * r); height = Math.round(height * r);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas no disponible"));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Imagen inválida"));
    readAsDataURL(file).then(d => { img.src = d; }).catch(reject);
  });
}
const estimarBytes = (dataUrl: string) => Math.round((dataUrl.length - (dataUrl.indexOf(",") + 1)) * 0.75);

async function procesarArchivo(file: File): Promise<{ dataUrl: string; size: number; tipo: string }> {
  if (file.type.startsWith("image/")) {
    const dataUrl = await resizeImage(file);
    return { dataUrl, size: estimarBytes(dataUrl), tipo: "Foto" };
  }
  if (file.size > 10 * 1024 * 1024) throw new Error("El archivo supera 10 MB. Usa 'Pegar enlace' para archivos grandes (videos, etc.).");
  const dataUrl = await readAsDataURL(file);
  const tipo = file.type.includes("pdf") ? "PDF"
    : /sheet|excel|csv|spreadsheet/.test(file.type) ? "Excel"
    : file.type.startsWith("video/") ? "Video" : "Otro";
  return { dataUrl, size: file.size, tipo };
}

export default function EvidenciasRutasPage() {
  const acompQ = useAcompanamientos();
  const acomp  = acompQ.data ?? [];
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const evidQ = useEvidenciasRuta(selectedId);
  const evid  = evidQ.data ?? [];

  const createEv = useCreateEvidenciaRuta();
  const removeEv = useDeleteEvidenciaRuta();

  const [modalOpen, setModalOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const filteredAcomp = acomp.filter((a: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (a.cliente?.nombre ?? "").toLowerCase().includes(q)
        || (a.ruta?.nombre ?? "").toLowerCase().includes(q)
        || a.auditorNombre.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Evidencias · Acompañamientos"
        subtitle={selectedId
          ? `${evid.length} evidencias registradas para el acompañamiento seleccionado`
          : "Selecciona un acompañamiento para ver/cargar evidencias"}
      />

      <div className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Panel izquierdo: lista acompañamientos */}
          <div className="card-base p-0 overflow-hidden">
            <div className="p-3 border-b border-[#1E2D4A] flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#94A3B8]"/>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar cliente, ruta, auditor..."
                className="flex-1 bg-transparent text-xs text-white placeholder:text-[#475569] focus:outline-none"
              />
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "600px" }}>
              {acompQ.isLoading ? (
                <div className="p-8 flex items-center justify-center text-[#475569]">
                  <Loader2 className="w-5 h-5 animate-spin"/>
                </div>
              ) : filteredAcomp.length === 0 ? (
                <p className="p-8 text-center text-xs text-[#475569]">Sin acompañamientos</p>
              ) : (
                filteredAcomp.map((a: any) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 border-b border-[#1E2D4A]/30 hover:bg-[#1A2540] transition-colors",
                      selectedId === a.id && "bg-cyan-500/10"
                    )}
                  >
                    <p className="text-sm text-white truncate">{a.cliente?.nombre ?? "—"}</p>
                    <p className="text-[10px] text-[#94A3B8] mt-0.5 flex items-center gap-1.5">
                      <span>{a.ruta?.nombre ?? "—"}</span>
                      <span>·</span>
                      <span>{new Date(a.fecha).toLocaleDateString("es-CO")}</span>
                      <span>·</span>
                      <span className="text-cyan-300">{a.auditorNombre?.split(" ")[0]}</span>
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Panel derecho: evidencias del seleccionado */}
          <div className="lg:col-span-2 card-base">
            {!selectedId ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Camera className="w-10 h-10 text-[#1E2D4A] mb-4"/>
                <p className="text-white font-semibold mb-2">Selecciona un acompañamiento</p>
                <p className="text-[#475569] text-sm">Las evidencias se asocian a cada acompañamiento del consolidado de rutas.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold text-white text-sm">Evidencias del acompañamiento</h3>
                  <button
                    onClick={() => { setSaveError(null); setModalOpen(true); }}
                    className="btn-primary text-xs bg-cyan-500 hover:bg-cyan-600 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5"/> Cargar Evidencia
                  </button>
                </div>

                {evidQ.isLoading ? (
                  <div className="py-8 flex items-center justify-center text-[#475569]">
                    <Loader2 className="w-5 h-5 animate-spin"/>
                  </div>
                ) : evid.length === 0 ? (
                  <div className="py-12 text-center">
                    <FolderOpen className="w-10 h-10 text-[#1E2D4A] mx-auto mb-4"/>
                    <p className="text-white text-sm font-semibold mb-2">Sin evidencias registradas</p>
                    <p className="text-[#475569] text-xs">Click en "Cargar Evidencia" para subir una foto o archivo</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {evid.map(e => {
                      const Icon = ICONO_TIPO[e.tipo] ?? FolderOpen;
                      const color = COLOR_TIPO[e.tipo] ?? "#94A3B8";
                      const img = esImagen(e);
                      return (
                        <div key={e.id} className="bg-[#1A2540] border border-[#2A3F6A] rounded-lg p-2.5 flex items-center gap-3">
                          {img ? (
                            <button onClick={() => setLightbox(e.url)} className="shrink-0" title="Ver imagen">
                              <EvidThumb url={e.url} alt={e.nombre} className="w-12 h-12 object-cover rounded-md border border-[#2A3F6A]"/>
                            </button>
                          ) : (
                            <div className="w-12 h-12 rounded-md bg-[#0D1526] border border-[#2A3F6A] flex items-center justify-center shrink-0">
                              <Icon className="w-5 h-5" style={{ color }}/>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{e.nombre}</p>
                            <p className="text-[10px] text-[#94A3B8] mt-0.5 truncate">
                              {e.tipo} · {e.categoria ?? "—"} · {new Date(e.uploadedAt).toLocaleDateString("es-CO")}
                            </p>
                          </div>
                          {img ? (
                            <button onClick={() => setLightbox(e.url)}
                              className="p-1.5 rounded hover:bg-cyan-500/10 text-[#94A3B8] hover:text-cyan-400 shrink-0" title="Ver">
                              <ImageIcon className="w-3.5 h-3.5"/>
                            </button>
                          ) : /^data:/i.test(e.url) ? (
                            <a href={e.url} download={e.nombre}
                              className="p-1.5 rounded hover:bg-cyan-500/10 text-[#94A3B8] hover:text-cyan-400 shrink-0" title="Descargar">
                              <Download className="w-3.5 h-3.5"/>
                            </a>
                          ) : (
                            <a href={e.url} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 rounded hover:bg-cyan-500/10 text-[#94A3B8] hover:text-cyan-400 shrink-0" title="Abrir">
                              <ExternalLink className="w-3.5 h-3.5"/>
                            </a>
                          )}
                          <button
                            onClick={async () => {
                              if (!confirm(`¿Eliminar evidencia "${e.nombre}"?`)) return;
                              try { await removeEv.mutateAsync(e.id); }
                              catch (err: any) { alert("Error: " + (err?.response?.data?.message ?? err?.message)); }
                            }}
                            className="p-1.5 rounded hover:bg-red-500/10 text-[#94A3B8] hover:text-red-400 shrink-0"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {modalOpen && selectedId && (
        <EvidenciaModal
          acompanamientoId={selectedId}
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
              console.error("[Evidencias Rutas] error:", e);
            }
          }}
        />
      )}

      {/* Lightbox / vista previa ampliada */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[60] flex items-center justify-center p-6" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightbox(null)}>
            <X className="w-7 h-7"/>
          </button>
          <img src={imgSrc(lightbox)} alt="Evidencia" className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" onClick={e => e.stopPropagation()}/>
        </div>
      )}
    </div>
  );
}

function EvidenciaModal({ acompanamientoId, error, onClose, onSave }: {
  acompanamientoId: string;
  error: string | null;
  onClose: () => void;
  onSave: (dto: EvidenciaRutaPayload) => Promise<void>;
}) {
  const [modo, setModo] = useState<"subir" | "enlace">("subir");
  const [form, setForm] = useState<EvidenciaRutaPayload>({
    acompanamientoId,
    tipo:      "Foto",
    nombre:    "",
    url:       "",
    size:      0,
    categoria: "Foto del producto",
  });
  const [preview, setPreview] = useState<string | null>(null); // dataURL de imagen para vista previa
  const [procesando, setProcesando] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(file?: File) {
    if (!file) return;
    setValidationError(null);
    setProcesando(true);
    try {
      const { dataUrl, size, tipo } = await procesarArchivo(file);
      setForm(f => ({ ...f, url: dataUrl, size, tipo, nombre: f.nombre || file.name }));
      setPreview(dataUrl.startsWith("data:image/") ? dataUrl : null);
    } catch (e: any) {
      setValidationError(e?.message ?? "No se pudo procesar el archivo");
      setPreview(null);
      setForm(f => ({ ...f, url: "", size: 0 }));
    } finally {
      setProcesando(false);
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!form.nombre?.trim()) { setValidationError("El nombre es obligatorio"); return; }
    if (!form.url?.trim())    { setValidationError(modo === "subir" ? "Selecciona un archivo para subir" : "La URL es obligatoria"); return; }

    setSubmitting(true);
    try { await onSave({ ...form, nombre: form.nombre.trim(), url: form.url.trim() }); }
    catch { /* error externo */ }
    finally { setSubmitting(false); }
  };

  const cambiarModo = (m: "subir" | "enlace") => {
    setModo(m); setValidationError(null); setPreview(null);
    setForm(f => ({ ...f, url: "", size: 0 }));
  };

  const TAB = (m: "subir" | "enlace", label: string, Icon: any) => (
    <button type="button" onClick={() => cambiarModo(m)}
      className={cn("flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors",
        modo === m ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300" : "bg-[#0D1526] border-[#1E2D4A] text-[#94A3B8] hover:text-white")}>
      <Icon className="w-3.5 h-3.5"/> {label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-lg overflow-hidden shadow-card max-h-[92vh] overflow-y-auto">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg">Cargar Evidencia</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">Sube la foto o archivo directamente a la plataforma</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>
        <form onSubmit={submit} className="px-6 py-4 space-y-3">
          <div className="flex gap-2">
            {TAB("subir", "Subir archivo", UploadCloud)}
            {TAB("enlace", "Pegar enlace", Link2)}
          </div>

          {modo === "subir" ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf,.xlsx,.xls,.csv,video/*"
                className="hidden"
                onChange={e => onPick(e.target.files?.[0])}
              />
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Vista previa" className="w-full max-h-56 object-contain rounded-lg border border-[#1E2D4A] bg-[#0A111F]"/>
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="absolute bottom-2 right-2 text-[11px] bg-[#0D1526]/90 border border-[#1E2D4A] rounded-md px-2 py-1 text-cyan-300 hover:text-cyan-200">
                    Cambiar
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={procesando}
                  className="w-full border-2 border-dashed border-[#1E2D4A] hover:border-cyan-500/50 rounded-lg py-8 flex flex-col items-center gap-2 text-[#94A3B8] hover:text-cyan-300 transition-colors">
                  {procesando ? <Loader2 className="w-7 h-7 animate-spin"/> : <UploadCloud className="w-7 h-7"/>}
                  <span className="text-sm font-medium">{procesando ? "Procesando…" : "Haz clic para seleccionar un archivo"}</span>
                  <span className="text-[10px]">Imágenes (se optimizan), PDF, Excel · máx. 10 MB</span>
                </button>
              )}
              {form.url && !procesando && (
                <p className="text-[10px] text-emerald-400 mt-1.5 flex items-center gap-1">
                  Archivo listo · {form.tipo} · {fmtSize(form.size)}
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="text-xs text-[#94A3B8] mb-1.5 block">URL del archivo *</label>
              <input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://drive.google.com/..." className="input-base"/>
              <p className="text-[10px] text-[#475569] mt-1">Para que aparezca como foto en el informe, el enlace debe ser público.</p>
            </div>
          )}

          <div>
            <label className="text-xs text-[#94A3B8] mb-1.5 block">Nombre *</label>
            <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Temperatura cadena de frío" className="input-base"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#94A3B8] mb-1.5 block">Tipo</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="input-base">
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#94A3B8] mb-1.5 block">Categoría</label>
              <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className="input-base">
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {(validationError || error) && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5"/>
              <span>{validationError ?? error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost text-xs" disabled={submitting}>Cancelar</button>
            <button type="submit" disabled={submitting || procesando}
              className="btn-primary text-xs bg-cyan-500 hover:bg-cyan-600 flex items-center gap-2 disabled:opacity-50">
              {submitting && <Loader2 className="w-3 h-3 animate-spin"/>}
              {submitting ? "Guardando..." : "Cargar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
