"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// Evidencias · CEDIS · conectado al API
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useCedis } from "@/hooks/useCedis";
import {
  useEvidenciasCedi, useCreateEvidenciaCedi, useDeleteEvidenciaCedi,
  type EvidenciaCediPayload,
} from "@/hooks/useEvidencias";
import {
  Upload, FileText, FileSpreadsheet, Image as ImageIcon, Video, FolderOpen,
  Search, Plus, ExternalLink, Trash2, X, AlertCircle, Loader2, Building2,
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
          ? `${evid.length} evidencias del CEDI · cargar desde repositorio externo (Drive · OneDrive · SharePoint)`
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
                        <p className="text-sm text-white truncate" title={e.nombre}>{e.nombre}</p>
                        <p className="text-[10px] text-[#94A3B8] mt-0.5">{e.categoria ?? "Sin categoría"}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#475569] mb-3">
                      {new Date(e.uploadedAt).toLocaleDateString("es-CO")} · {e.uploadedBy}
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

function EvidenciaCediModal({ cediId, cediNombre, error, onClose, onSave }: {
  cediId: string;
  cediNombre: string;
  error: string | null;
  onClose: () => void;
  onSave: (dto: EvidenciaCediPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<EvidenciaCediPayload>({
    cediId,
    tipo:      "Foto",
    nombre:    "",
    url:       "",
    size:      0,
    categoria: "Acta visita",
  });
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!form.nombre?.trim()) { setValidationError("Nombre del archivo es obligatorio"); return; }
    if (!form.url?.trim())    { setValidationError("URL del archivo es obligatoria"); return; }

    setSubmitting(true);
    try { await onSave({ ...form, nombre: form.nombre.trim(), url: form.url.trim() }); }
    catch { /* error externo */ }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-lg overflow-hidden shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg">Cargar Evidencia · CEDI</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5 flex items-center gap-1.5">
              <Building2 className="w-3 h-3"/>{cediNombre}
            </p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>
        <form onSubmit={submit} className="px-6 py-4 space-y-3">
          <div>
            <label className="text-xs text-[#94A3B8] mb-1.5 block">Nombre del archivo *</label>
            <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Acta visita CEDI Tunja 04-06-26.pdf" className="input-base"/>
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] mb-1.5 block">URL del archivo *</label>
            <input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://drive.google.com/..." className="input-base"/>
            <p className="text-[10px] text-[#475569] mt-1">Drive · OneDrive · SharePoint · cualquier link público o compartido</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[#94A3B8] mb-1.5 block">Tipo</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="input-base">
                {TIPOS.map(t => <option key={t.tipo}>{t.tipo}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#94A3B8] mb-1.5 block">Categoría</label>
              <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className="input-base">
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#94A3B8] mb-1.5 block">Tamaño (bytes)</label>
              <input type="number" value={form.size} onChange={e => setForm({ ...form, size: parseInt(e.target.value, 10) || 0 })} className="input-base"/>
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
            <button type="submit" disabled={submitting}
              className="btn-primary text-xs bg-emerald-500 hover:bg-emerald-600 flex items-center gap-2 disabled:opacity-50">
              {submitting && <Loader2 className="w-3 h-3 animate-spin"/>}
              {submitting ? "Guardando..." : "Cargar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
