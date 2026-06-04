"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// Evidencias · Acompañamientos Rutas · conectado al API
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useAcompanamientos } from "@/hooks/useRutas";
import {
  useEvidenciasRuta, useCreateEvidenciaRuta, useDeleteEvidenciaRuta,
  type EvidenciaRutaPayload,
} from "@/hooks/useEvidencias";
import {
  Camera, FileText, FileSpreadsheet, Image as ImageIcon, Video, FolderOpen,
  Plus, ExternalLink, Trash2, X, AlertCircle, Loader2, Search,
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

export default function EvidenciasRutasPage() {
  const acompQ = useAcompanamientos();
  const acomp  = acompQ.data ?? [];
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");

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
                    <p className="text-[#475569] text-xs">Click en "Cargar Evidencia" para vincular un archivo</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {evid.map(e => {
                      const Icon = ICONO_TIPO[e.tipo] ?? FolderOpen;
                      const color = COLOR_TIPO[e.tipo] ?? "#94A3B8";
                      return (
                        <div key={e.id} className="bg-[#1A2540] border border-[#2A3F6A] rounded-lg p-3 flex items-center gap-3">
                          <Icon className="w-5 h-5 shrink-0" style={{ color }}/>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{e.nombre}</p>
                            <p className="text-[10px] text-[#94A3B8] mt-0.5">
                              {e.tipo} · {e.categoria ?? "—"} · {new Date(e.uploadedAt).toLocaleDateString("es-CO")} · {e.uploadedBy}
                            </p>
                          </div>
                          <a href={e.url} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-cyan-500/10 text-[#94A3B8] hover:text-cyan-400"
                            title="Abrir">
                            <ExternalLink className="w-3.5 h-3.5"/>
                          </a>
                          <button
                            onClick={async () => {
                              if (!confirm(`¿Eliminar evidencia "${e.nombre}"?`)) return;
                              try { await removeEv.mutateAsync(e.id); }
                              catch (err: any) { alert("Error: " + (err?.response?.data?.message ?? err?.message)); }
                            }}
                            className="p-1.5 rounded hover:bg-red-500/10 text-[#94A3B8] hover:text-red-400"
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
    </div>
  );
}

function EvidenciaModal({ acompanamientoId, error, onClose, onSave }: {
  acompanamientoId: string;
  error: string | null;
  onClose: () => void;
  onSave: (dto: EvidenciaRutaPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<EvidenciaRutaPayload>({
    acompanamientoId,
    tipo:      "Foto",
    nombre:    "",
    url:       "",
    size:      0,
    categoria: "Foto del producto",
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
            <h2 className="font-display font-bold text-white text-lg">Cargar Evidencia</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">Pega la URL del archivo (Drive · OneDrive · SharePoint · etc)</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>
        <form onSubmit={submit} className="px-6 py-4 space-y-3">
          <div>
            <label className="text-xs text-[#94A3B8] mb-1.5 block">Nombre *</label>
            <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Foto temperatura.jpg" className="input-base"/>
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] mb-1.5 block">URL del archivo *</label>
            <input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://drive.google.com/..." className="input-base"/>
          </div>
          <div className="grid grid-cols-3 gap-3">
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
