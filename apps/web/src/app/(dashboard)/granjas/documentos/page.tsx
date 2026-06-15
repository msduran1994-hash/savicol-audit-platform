"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// Documentos · CRUD conectado al API
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from "react";
import { Header } from "@/components/layout/header";
import {
  useDocumentos, useDocumentosStats,
  useCreateDocumento, useUpdateDocumento, useDeleteDocumento,
  type DocumentoItem, type DocumentoPayload,
} from "@/hooks/useDocumentos";
import { useGranjas } from "@/hooks/useGranjas";
import {
  Files, FileText, FileSpreadsheet, Image as ImageIcon,
  Plus, Filter, Edit2, Trash2, X, AlertCircle, Loader2, ExternalLink, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AUDITORS } from "@/lib/constants";

// ── Metadata de auditoría embebida en ocrTexto ───────────────────────────────
// Como el modelo Documento no tiene columnas para auditor/fechas, se guardan
// dentro de ocrTexto con un bloque estructurado [META]...[/META] que los
// filtros leen. El texto OCR real del usuario se conserva debajo del bloque.
interface DocMeta { auditor: string; fechaVisita: string; fechaInforme: string; }

function leerMeta(ocr?: string): DocMeta {
  const vacio = { auditor:"", fechaVisita:"", fechaInforme:"" };
  if (!ocr) return vacio;
  const m = ocr.match(/\[META\]([\s\S]*?)\[\/META\]/);
  if (!m) {
    // Compatibilidad: intentar extraer fecha de visita de texto libre (dd/mm/yyyy)
    const f = ocr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    const fechaVisita = f ? `${f[3]}-${f[2].padStart(2,"0")}-${f[1].padStart(2,"0")}` : "";
    return { ...vacio, fechaVisita };
  }
  const meta = { ...vacio };
  m[1].split(";").forEach(par => {
    const [k, v] = par.split("=");
    const key = (k||"").trim(); const val = (v||"").trim();
    if (key === "auditor")      meta.auditor = val;
    if (key === "fechaVisita")  meta.fechaVisita = val;
    if (key === "fechaInforme") meta.fechaInforme = val;
  });
  return meta;
}

// Devuelve el texto OCR "limpio" (sin el bloque [META])
function ocrLimpio(ocr?: string): string {
  if (!ocr) return "";
  return ocr.replace(/\[META\][\s\S]*?\[\/META\]\n?/, "").trim();
}

// Combina metadata + texto OCR limpio en el string que se guarda
function escribirOcr(meta: DocMeta, textoLibre: string): string {
  const tieneMetadata = meta.auditor || meta.fechaVisita || meta.fechaInforme;
  const bloque = tieneMetadata
    ? `[META]auditor=${meta.auditor};fechaVisita=${meta.fechaVisita};fechaInforme=${meta.fechaInforme}[/META]`
    : "";
  return [bloque, textoLibre.trim()].filter(Boolean).join("\n");
}

const TIPOS = ["PDF", "Excel", "CSV", "Word", "PowerPoint", "Imagen", "Otro"];
const CATEGORIAS = ["Cumplimiento", "Sanidad", "Operativo", "Bioseguridad", "Inventario", "Veterinario", "Otro"];

const ICONO_TIPO: Record<string, any> = {
  PDF: FileText, Excel: FileSpreadsheet, CSV: FileSpreadsheet,
  Word: FileText, PowerPoint: FileText, Imagen: ImageIcon, Otro: Files,
};
const COLOR_TIPO: Record<string, string> = {
  PDF: "#EF4444", Excel: "#10B981", CSV: "#06B6D4",
  Word: "#3B82F6", PowerPoint: "#F97316", Imagen: "#A855F7", Otro: "#94A3B8",
};

export default function DocumentosPage() {
  const granjasQ = useGranjas();
  const granjas  = granjasQ.data ?? [];

  const [filterGranja, setFilterGranja] = useState("");
  const [filterTipo, setFilterTipo]     = useState("");
  const [filterCat, setFilterCat]       = useState("");
  const [search, setSearch]             = useState("");
  // Nuevos filtros: Auditor, Fecha de visita a granja, Fecha de generación de informe
  const [filterAuditor, setFilterAuditor]       = useState("");
  const [filterFechaVisita, setFilterFechaVisita] = useState("");
  const [filterFechaInforme, setFilterFechaInforme] = useState("");

  const docsQ  = useDocumentos({ granjaId: filterGranja, tipo: filterTipo, categoria: filterCat, search });
  const statsQ = useDocumentosStats(filterGranja || undefined);

  const createDoc = useCreateDocumento();
  const updateDoc = useUpdateDocumento();
  const removeDoc = useDeleteDocumento();

  const docsRaw = docsQ.data ?? [];

  // Filtros adicionales aplicados en frontend (el modelo no tiene estos campos
  // estructurados): Auditor (uploadedBy), Fecha visita (de OCR), Fecha informe (uploadedAt).
  const docs = docsRaw.filter(d => {
    const meta = leerMeta(d.ocrTexto);
    if (filterAuditor) {
      const aud = AUDITORS.find(a => a.id === filterAuditor);
      const nombre = aud?.name ?? filterAuditor;
      // Coincide por la metadata embebida o por quién lo cargó
      const coincide = meta.auditor === nombre || d.uploadedBy === filterAuditor || d.uploadedBy === nombre;
      if (!coincide) return false;
    }
    if (filterFechaVisita) {
      if (!meta.fechaVisita || !meta.fechaVisita.startsWith(filterFechaVisita)) return false;
    }
    if (filterFechaInforme) {
      // Usa la fecha de informe de la metadata; si no hay, cae a uploadedAt
      const fi = meta.fechaInforme || (d.uploadedAt ?? "").slice(0, 10);
      if (!fi.startsWith(filterFechaInforme)) return false;
    }
    return true;
  });

  const hayFiltrosExtra = !!(filterAuditor || filterFechaVisita || filterFechaInforme);

  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<DocumentoItem | null>(null);
  const [saveError, setSaveError]   = useState<string | null>(null);

  const formatSize = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Documentos · Gestión documental"
        subtitle={`${docs.length} documentos · ${statsQ.data ? formatSize(statsQ.data.sizeTotalBytes) : "0 B"} totales · Acceso abierto a todo el equipo`}
      />

      <div className="flex-1 p-6 space-y-6">
        <div className="card-base p-3 flex items-center gap-3 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-[#94A3B8]"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar documento..."
            className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white placeholder:text-[#475569] focus:outline-none focus:border-amber-500/40 flex-1 min-w-[180px]"
          />
          <select value={filterGranja} onChange={e => setFilterGranja(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todas las granjas</option>
            {granjas.map((g: any) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todos los tipos</option>
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filterAuditor} onChange={e => setFilterAuditor(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white" title="Auditor que cargó el documento">
            <option value="">Todos los auditores</option>
            {AUDITORS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <label className="flex flex-col">
            <span className="text-[9px] text-[#64748B] px-1 leading-none mb-0.5">Fecha visita granja</span>
            <input type="month" value={filterFechaVisita} onChange={e => setFilterFechaVisita(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white" title="Fecha de visita a la granja (del texto del documento)"/>
          </label>
          <label className="flex flex-col">
            <span className="text-[9px] text-[#64748B] px-1 leading-none mb-0.5">Fecha generación informe</span>
            <input type="month" value={filterFechaInforme} onChange={e => setFilterFechaInforme(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white" title="Fecha en que se cargó/generó el documento"/>
          </label>
          {hayFiltrosExtra && (
            <button onClick={() => { setFilterAuditor(""); setFilterFechaVisita(""); setFilterFechaInforme(""); }}
              className="p-1.5 rounded bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8] hover:text-white" title="Limpiar filtros adicionales">
              <X className="w-3.5 h-3.5"/>
            </button>
          )}
          <button onClick={() => docsQ.refetch()} className="p-1.5 rounded bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8] hover:text-white" title="Refrescar">
            <RefreshCw className={cn("w-3.5 h-3.5", docsQ.isFetching && "animate-spin")}/>
          </button>
          <button
            onClick={() => { setEditing(null); setSaveError(null); setModalOpen(true); }}
            className="btn-primary text-xs ml-auto bg-amber-500 hover:bg-amber-600 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5"/> Cargar Documento
          </button>
        </div>

        {statsQ.data && statsQ.data.porTipo.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {statsQ.data.porTipo.map(t => {
              const Icon = ICONO_TIPO[t.tipo] ?? Files;
              const color = COLOR_TIPO[t.tipo] ?? "#94A3B8";
              return (
                <div key={t.tipo} className="card-base text-center p-3" style={{ borderColor: `${color}30` }}>
                  <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }}/>
                  <p className="font-display text-xl font-bold text-white">{t.count}</p>
                  <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{t.tipo}</p>
                </div>
              );
            })}
          </div>
        )}

        {docsQ.isLoading ? (
          <div className="card-base p-12 flex items-center justify-center text-[#475569]">
            <Loader2 className="w-6 h-6 animate-spin"/>
            <span className="ml-3 text-sm">Cargando documentos...</span>
          </div>
        ) : docs.length === 0 ? (
          <div className="card-base flex flex-col items-center justify-center py-16 text-center">
            <Files className="w-10 h-10 text-[#1E2D4A] mb-4"/>
            <p className="text-white font-semibold mb-2">Sin documentos registrados</p>
            <p className="text-[#475569] text-sm max-w-md">
              Click en "Cargar Documento" para registrar un archivo. Soporta PDF · Excel · Word · CSV · Imágenes.
              <br/>
              <span className="text-[10px] text-[#475569] block mt-2">
                Tip: por ahora se registra la URL del archivo (Drive, OneDrive, SharePoint, etc).
              </span>
            </p>
          </div>
        ) : (
          <div className="card-base p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[#475569] border-b border-[#1E2D4A]">
                    <th className="text-left p-2 pl-4">Documento</th>
                    <th className="text-left p-2">Granja</th>
                    <th className="text-left p-2">Tipo</th>
                    <th className="text-left p-2">Categoría</th>
                    <th className="text-left p-2">Auditor</th>
                    <th className="text-left p-2">Fecha Visita</th>
                    <th className="text-right p-2">Tamaño</th>
                    <th className="text-left p-2">Informe</th>
                    <th className="text-center p-2 w-28">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map(d => {
                    const Icon = ICONO_TIPO[d.tipo] ?? Files;
                    const color = COLOR_TIPO[d.tipo] ?? "#94A3B8";
                    const meta = leerMeta(d.ocrTexto);
                    const fmtFv = meta.fechaVisita ? new Date(meta.fechaVisita+"T00:00:00").toLocaleDateString("es-CO") : "—";
                    const fmtFi = meta.fechaInforme ? new Date(meta.fechaInforme+"T00:00:00").toLocaleDateString("es-CO") : new Date(d.uploadedAt).toLocaleDateString("es-CO");
                    return (
                      <tr key={d.id} className="border-b border-[#1E2D4A]/30 hover:bg-[#0D1526]/50">
                        <td className="p-2 pl-4">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 shrink-0" style={{ color }}/>
                            <span className="text-white text-xs truncate max-w-xs">{d.nombre}</span>
                          </div>
                        </td>
                        <td className="p-2 text-[#94A3B8] text-xs">{d.granja?.nombre ?? "—"}</td>
                        <td className="p-2">
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold"
                            style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
                            {d.tipo}
                          </span>
                        </td>
                        <td className="p-2 text-[#94A3B8] text-xs">{d.categoria}</td>
                        <td className="p-2 text-[#94A3B8] text-xs">{meta.auditor || d.uploadedBy || "—"}</td>
                        <td className="p-2 text-[#94A3B8] text-xs">{fmtFv}</td>
                        <td className="p-2 text-right text-[#94A3B8] font-mono text-xs">{formatSize(d.size)}</td>
                        <td className="p-2 text-[#94A3B8] text-xs">{fmtFi}</td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <a href={d.url} target="_blank" rel="noopener noreferrer"
                              className="p-1 rounded hover:bg-cyan-500/10 text-[#94A3B8] hover:text-cyan-400"
                              title="Abrir/Descargar">
                              <ExternalLink className="w-3 h-3"/>
                            </a>
                            <button onClick={() => { setEditing(d); setSaveError(null); setModalOpen(true); }}
                              className="p-1 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-white" title="Editar">
                              <Edit2 className="w-3 h-3"/>
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm(`¿Eliminar registro de "${d.nombre}"?\n(No borra el archivo en su ubicación original)`)) return;
                                try { await removeDoc.mutateAsync(d.id); }
                                catch (e: any) { alert("Error: " + (e?.response?.data?.message ?? e?.message)); }
                              }}
                              className="p-1 rounded hover:bg-red-500/10 text-[#94A3B8] hover:text-red-400"
                              title="Eliminar registro">
                              <Trash2 className="w-3 h-3"/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <DocumentoModal
          item={editing}
          granjas={granjas}
          error={saveError}
          onClose={() => { setModalOpen(false); setSaveError(null); }}
          onSave={async (dto) => {
            setSaveError(null);
            try {
              if (editing) await updateDoc.mutateAsync({ id: editing.id, patch: dto });
              else         await createDoc.mutateAsync(dto);
              setModalOpen(false);
            } catch (e: any) {
              const raw = e?.response?.data;
              let msg = "Error al guardar";
              if (raw?.message) msg = Array.isArray(raw.message) ? raw.message.join(" · ") : String(raw.message);
              else if (e?.message) msg = e.message;
              if (e?.response?.status) msg = `HTTP ${e.response.status} · ${msg}`;
              setSaveError(msg);
              console.error("[Documentos] error:", e);
            }
          }}
        />
      )}
    </div>
  );
}

function DocumentoModal({ item, granjas, error, onClose, onSave }: {
  item: DocumentoItem | null;
  granjas: any[];
  error: string | null;
  onClose: () => void;
  onSave: (dto: DocumentoPayload) => Promise<void>;
}) {
  const metaInicial = leerMeta(item?.ocrTexto);
  const [form, setForm] = useState<DocumentoPayload>({
    granjaId:  item?.granjaId ?? granjas[0]?.id ?? "",
    nombre:    item?.nombre ?? "",
    tipo:      item?.tipo ?? "PDF",
    categoria: item?.categoria ?? "Cumplimiento",
    size:      item?.size ?? 0,
    url:       item?.url ?? "",
    ocrTexto:  ocrLimpio(item?.ocrTexto),  // solo el texto libre, sin el bloque [META]
  });
  // Campos de auditoría (se guardan embebidos en ocrTexto)
  const [auditor, setAuditor]           = useState(metaInicial.auditor);
  const [fechaVisita, setFechaVisita]   = useState(metaInicial.fechaVisita);
  const [fechaInforme, setFechaInforme] = useState(metaInicial.fechaInforme);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!form.granjaId)       { setValidationError("Selecciona una granja"); return; }
    if (!form.nombre?.trim()) { setValidationError("Nombre del documento es obligatorio"); return; }
    if (!form.url?.trim())    { setValidationError("URL del documento es obligatoria (Drive, OneDrive, SharePoint, etc)"); return; }

    // Combinar metadata de auditoría + texto OCR libre en el campo ocrTexto
    const ocrFinal = escribirOcr({ auditor, fechaVisita, fechaInforme }, form.ocrTexto ?? "");

    const payload: DocumentoPayload = {
      ...form,
      nombre:   form.nombre.trim(),
      url:      form.url.trim(),
      ocrTexto: ocrFinal || undefined,
      size:     Math.max(0, form.size ?? 0),
    };

    setSubmitting(true);
    try { await onSave(payload); }
    catch { /* error mostrado */ }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-xl overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg">{item ? "Editar Documento" : "Cargar Documento"}</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Pega el enlace del archivo desde Drive · OneDrive · SharePoint u otro repositorio
            </p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>
        <form onSubmit={submit} className="px-6 py-4 space-y-3">
          <F label="Granja *">
            <select value={form.granjaId} onChange={e => setForm({ ...form, granjaId: e.target.value })} className="input-base">
              {granjas.length === 0 && <option value="">(sin granjas)</option>}
              {granjas.map((g: any) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </F>
          <F label="Nombre del documento *">
            <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Certificación ICA 2026" className="input-base"/>
          </F>
          <F label="URL del archivo *">
            <input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://drive.google.com/..." className="input-base"/>
          </F>
          <div className="grid grid-cols-3 gap-3">
            <F label="Tipo">
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="input-base">
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </F>
            <F label="Categoría">
              <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className="input-base">
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </F>
            <F label="Tamaño (bytes)">
              <input type="number" value={form.size} onChange={e => setForm({ ...form, size: parseInt(e.target.value, 10) || 0 })} placeholder="0" className="input-base"/>
            </F>
          </div>

          {/* Datos de auditoría — alimentan los filtros del listado */}
          <div className="rounded-lg border border-[#4A7AFF]/25 bg-[#4A7AFF]/5 p-3 space-y-3">
            <p className="text-[10px] font-semibold text-[#4A7AFF] uppercase tracking-wider">Datos de Auditoría</p>
            <F label="Auditor">
              <select value={auditor} onChange={e => setAuditor(e.target.value)} className="input-base">
                <option value="">— Selecciona auditor —</option>
                {AUDITORS.map((a: any) => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Fecha de visita a granja">
                <input type="date" value={fechaVisita} onChange={e => setFechaVisita(e.target.value)} className="input-base"/>
              </F>
              <F label="Fecha de generación de informe">
                <input type="date" value={fechaInforme} onChange={e => setFechaInforme(e.target.value)} className="input-base"/>
              </F>
            </div>
          </div>

          <F label="Texto OCR (opcional)">
            <textarea value={form.ocrTexto ?? ""} onChange={e => setForm({ ...form, ocrTexto: e.target.value })} rows={2} placeholder="Pega aquí texto extraído del documento (búsqueda full-text)" className="input-base resize-none"/>
          </F>

          {(validationError || error) && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5"/>
              <span>{validationError ?? error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost text-xs" disabled={submitting}>Cancelar</button>
            <button type="submit" disabled={submitting}
              className="btn-primary text-xs bg-amber-500 hover:bg-amber-600 flex items-center gap-2 disabled:opacity-50">
              {submitting && <Loader2 className="w-3 h-3 animate-spin"/>}
              {submitting ? "Guardando..." : (item ? "Guardar" : "Cargar")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-[#94A3B8] font-medium mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
