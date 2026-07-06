"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useGranjasStore } from "@/store/granjas.store";
import { useShallow } from "zustand/react/shallow";
import { CATEGORIA_HALLAZGO, CRITICIDAD, TIPO_RIESGO, TIPO_GRANJA, TIPO_OPERATIVO } from "@/lib/granjas.constants";
import { AUDITORS } from "@/lib/constants";
import type { Hallazgo } from "@/lib/granjas.types";
import { AnexosTecnicosEditor } from "@/components/hallazgos/anexos-tecnicos-editor";
import { parseAnexos, anexosTienenDatos, type AnexosTecnicos } from "@/lib/anexos-tecnicos";
import { AlertTriangle, Filter, Plus, Sparkles, Image, Paperclip, X, Edit2, Trash2, ChevronDown, ClipboardList } from "lucide-react";

export default function HallazgosPage() {
  const hallazgos      = useGranjasStore(useShallow((s) => s.hallazgos));
  const granjas        = useGranjasStore(useShallow((s) => s.granjas));
  const addHallazgo    = useGranjasStore((s) => s.addHallazgo);
  const updateHallazgo = useGranjasStore((s) => s.updateHallazgo);
  const removeHallazgo = useGranjasStore((s) => s.removeHallazgo);

  const [filtroCat, setFiltroCat] = useState("");
  const [filtroCrit, setFiltroCrit] = useState("");
  const [filtroRiesgo, setFiltroRiesgo] = useState("");// Filtros nuevos: Auditor · Estado · Granja · Tipo Operativo
  const [filtroAuditor,       setFiltroAuditor]       = useState("");
  const [filtroEstado,        setFiltroEstado]        = useState("");
  const [filtroGranja,        setFiltroGranja]        = useState("");
  const [filtroTipoOperativo, setFiltroTipoOperativo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Hallazgo | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const filtered = hallazgos.filter(h => {
    if (filtroCat   && h.categoria  !== filtroCat) return false;
    if (filtroCrit  && h.criticidad !== filtroCrit) return false;
    if (filtroRiesgo && !h.tiposRiesgo.includes(filtroRiesgo as any)) return false;if (filtroAuditor       && h.auditorId      !== filtroAuditor)       return false;
    if (filtroEstado        && h.estado         !== filtroEstado)        return false;
    if (filtroGranja        && h.granjaId       !== filtroGranja)        return false;
    if (filtroTipoOperativo && h.tipoOperativo  !== filtroTipoOperativo) return false;
    return true;
  });
  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Hallazgos de Auditoría"
        subtitle={`${hallazgos.length} hallazgos · ${filtered.length} visibles`}
      />

      <div className="flex-1 p-6 space-y-6">
        <div className="card-base p-3 flex items-center gap-3 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-[#94A3B8]"/>
          <select value={filtroCat} onChange={(e)=>setFiltroCat(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todas las categorías</option>
            {CATEGORIA_HALLAZGO.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filtroCrit} onChange={(e)=>setFiltroCrit(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Toda la criticidad</option>
            {CRITICIDAD.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filtroRiesgo} onChange={(e)=>setFiltroRiesgo(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todos los riesgos</option>
            {TIPO_RIESGO.map(t => <option key={t}>{t}</option>)}
          </select><select value={filtroAuditor} onChange={(e)=>setFiltroAuditor(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todos los auditores</option>
            {AUDITORS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={filtroEstado} onChange={(e)=>setFiltroEstado(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todos los estados</option>
            <option value="Abierto">Abierto</option>
            <option value="En Plan">En Plan</option>
            <option value="Cerrado">Cerrado</option>
            <option value="Verificado">Verificado</option>
          </select>
          <select value={filtroGranja} onChange={(e)=>setFiltroGranja(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todas las granjas</option>
            {granjas.map((g: any) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
          <select value={filtroTipoOperativo} onChange={(e)=>setFiltroTipoOperativo(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todos los tipos</option>
            {TIPO_OPERATIVO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary text-xs ml-auto bg-amber-500 hover:bg-amber-600">
            <Plus className="w-3.5 h-3.5"/>Nuevo Hallazgo
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="card-base flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="w-10 h-10 text-[#1E2D4A] mb-4"/>
            <p className="text-white font-semibold mb-2">Sin hallazgos</p>
            <p className="text-[#475569] text-sm">Click en "Nuevo Hallazgo" para crear el primero</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(h => {
              const critColor =
                h.criticidad === "Crítica" ? "#EF4444" :
                h.criticidad === "Alta"    ? "#F59E0B" :
                h.criticidad === "Media"   ? "#3B82F6" : "#94A3B8";
              return (
                <div key={h.id} className="card-base card-hover">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                              style={{ background: `${critColor}18`, color: critColor, border: `1px solid ${critColor}30` }}>
                          {h.criticidad}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1A2540] text-[#94A3B8] border border-[#2A3F6A]">{h.categoria}</span>
                        {/* Badge estado — semaforización dinámica */}
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                              style={
                                h.estado === "ABIERTO"    || h.estado === "Abierto"    ? { background:"rgba(239,68,68,0.15)", color:"#EF4444", border:"1px solid rgba(239,68,68,0.30)" } :
                                h.estado === "EN_PLAN"    || h.estado === "En Plan"    ? { background:"rgba(249,115,22,0.15)", color:"#F97316", border:"1px solid rgba(249,115,22,0.30)" } :
                                h.estado === "CERRADO"    || h.estado === "Cerrado"    ? { background:"rgba(34,197,94,0.15)",  color:"#22C55E", border:"1px solid rgba(34,197,94,0.30)"  } :
                                h.estado === "VERIFICADO" || h.estado === "Verificado" ? { background:"rgba(34,197,94,0.15)",  color:"#22C55E", border:"1px solid rgba(34,197,94,0.30)"  } :
                                { background:"rgba(100,116,139,0.15)", color:"#94A3B8", border:"1px solid rgba(100,116,139,0.30)" }
                              }>
                          {h.estado === "ABIERTO"    || h.estado === "Abierto"    ? "🔴" :
                           h.estado === "EN_PLAN"    || h.estado === "En Plan"    ? "🟠" :
                           h.estado === "CERRADO"    || h.estado === "Cerrado"    ? "🟢" :
                           h.estado === "VERIFICADO" || h.estado === "Verificado" ? "🟢" : "⚪"
                          } {h.estado}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-white text-base">{h.titulo}</h3>
                      <p className="text-xs text-[#94A3B8] mt-1">{h.granjaNombre} · {h.auditorNombre} · {h.fechaVisita}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(h); setModalOpen(true); }} className="p-1.5 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-white" title="Editar">
                        <Edit2 className="w-3.5 h-3.5"/>
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`¿Eliminar hallazgo "${h.titulo}"?\nEsta acción no se puede deshacer.`)) return;
                          try { await removeHallazgo(h.id); }
                          catch (e: any) { alert("Error al eliminar: " + (e?.response?.data?.message ?? e?.message ?? "desconocido")); }
                        }}
                        className="p-1.5 rounded hover:bg-red-500/10 text-[#94A3B8] hover:text-red-400"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-[#94A3B8] mb-3 leading-relaxed">{h.descripcion}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    {h.tiposRiesgo.map(r => (
                      <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">Riesgo {r}</span>
                    ))}
                  </div>
                  {h.recomendacionesIA && (
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 mb-3">
                      <p className="text-xs text-amber-400 font-semibold flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3 h-3"/> Recomendaciones IA
                      </p>
                      <p className="text-xs text-[#94A3B8] leading-relaxed">{h.recomendacionesIA}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <HallazgoModal
          hallazgo={editing}
          granjas={granjas}
          error={saveError}
          onClose={() => { setModalOpen(false); setSaveError(null); }}
          onSave={async (h) => {
            setSaveError(null);
            try {
              if (editing) await updateHallazgo(editing.id, h);
              else         await addHallazgo(h as any);
              setModalOpen(false);
            } catch (e: any) {
              const raw = e?.response?.data;
              let msg = "Error al guardar";
              if (raw) {
                if (typeof raw === "string") msg = raw;
                else if (raw.message) msg = Array.isArray(raw.message) ? raw.message.join(" · ") : String(raw.message);
                else if (raw.error)   msg = String(raw.error);
              } else if (e?.message) {
                msg = e.message;
              }
              if (e?.response?.status) msg = `HTTP ${e.response.status} · ${msg}`;
              setSaveError(msg);
              console.error("[Hallazgos] error guardando:", e);
            }
          }}
        />
      )}
    </div>
  );
}

function HallazgoModal({ hallazgo, granjas, onClose, onSave, error }: {
  hallazgo: Hallazgo | null;
  granjas: any[];
  onClose: () => void;
  onSave: (h: Partial<Hallazgo>) => Promise<void> | void;
  error?: string | null;
}) {
  // Toma la granja del hallazgo si existe, sino la primera disponible
  const defaultGranja = hallazgo ? granjas.find(g => g.id === hallazgo.granjaId) ?? granjas[0] : granjas[0];

  const [form, setForm] = useState<Partial<Hallazgo>>(hallazgo ?? {
    titulo: "",
    granjaId:     defaultGranja?.id ?? "",
    granjaNombre: defaultGranja?.nombre ?? "",
    auditorId:    AUDITORS[0]?.id ?? "",
    auditorNombre:AUDITORS[0]?.name ?? "",
    tipoGranja:    defaultGranja?.tipoGranja ?? "Propia",
    tipoOperativo: defaultGranja?.tipoOperativo ?? "Engorde",
    fechaVisita:   new Date().toISOString().slice(0,10),
    categoria:     "Bioseguridad",
    tiposRiesgo:   [],
    criticidad:    "Media",
    estado:        "Abierto",
    descripcion:   "",
    recomendacionesIA: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  // Anexos técnicos (5 pestañas opcionales) — se guardan como JSON en el hallazgo.
  const [anexos, setAnexos] = useState<AnexosTecnicos>(() => parseAnexos(hallazgo?.anexosTecnicos));
  const [anexosOpen, setAnexosOpen] = useState(false);

  function toggleRiesgo(r: typeof TIPO_RIESGO[number]) {
    setForm((f) => {
      const list = f.tiposRiesgo ?? [];
      return { ...f, tiposRiesgo: list.includes(r) ? list.filter(x => x !== r) : [...list, r] };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    // Validaciones explícitas con mensajes claros
    if (!form.titulo?.trim()) {
      setValidationError("El título del hallazgo es obligatorio");
      return;
    }
    if (!form.granjaId) {
      setValidationError("Selecciona una granja del listado");
      return;
    }
    if (!form.descripcion?.trim()) {
      setValidationError("La descripción del hallazgo es obligatoria");
      return;
    }
    if (granjas.length === 0) {
      setValidationError("No hay granjas en el sistema. Crea una granja primero en /granjas/registro");
      return;
    }

    const granja  = granjas.find(g => g.id === form.granjaId);
    const auditor = AUDITORS.find(a => a.id === form.auditorId);

    // Sanitizar: trim strings + asegurar tipos correctos derivados de granja
    const payload: Partial<Hallazgo> = {
      ...form,
      titulo:        form.titulo.trim(),
      descripcion:   form.descripcion.trim(),
      recomendacionesIA: form.recomendacionesIA?.trim() || undefined,
      // Anexos técnicos: solo si el auditor diligenció algo (opcionales).
      anexosTecnicos: anexosTienenDatos(anexos) ? JSON.stringify(anexos) : undefined,
      granjaNombre:  granja?.nombre ?? form.granjaNombre,
      auditorNombre: auditor?.name  ?? form.auditorNombre,
      // El tipo de granja debe coincidir con la granja seleccionada (display name del store)
      tipoGranja:    granja?.tipoGranja    ?? form.tipoGranja,
      tipoOperativo: granja?.tipoOperativo ?? form.tipoOperativo,
    };

    setSubmitting(true);
    try {
      await onSave(payload);
    } catch {
      // Error se muestra en el banner desde el padre
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <h2 className="font-display font-bold text-white text-lg">{hallazgo ? "Editar Hallazgo" : "Nuevo Hallazgo"}</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <F label="Título *">
            <input value={form.titulo} onChange={(e)=>setForm({...form, titulo: e.target.value})} required className="input-base"/>
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Granja">
              <select value={form.granjaId} onChange={(e)=>setForm({...form, granjaId: e.target.value})} className="input-base">
                {granjas.map((g:any) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </F>
            <F label="Auditor">
              <select value={form.auditorId} onChange={(e)=>setForm({...form, auditorId: e.target.value})} className="input-base">
                {AUDITORS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </F>
            <F label="Categoría">
              <select value={form.categoria} onChange={(e)=>setForm({...form, categoria: e.target.value as any})} className="input-base">
                {CATEGORIA_HALLAZGO.map(c => <option key={c}>{c}</option>)}
              </select>
            </F>
            <F label="Criticidad">
              <select value={form.criticidad} onChange={(e)=>setForm({...form, criticidad: e.target.value as any})} className="input-base">
                {CRITICIDAD.map(c => <option key={c}>{c}</option>)}
              </select>
            </F>
            <F label="Estado">
              <select value={form.estado} onChange={(e)=>setForm({...form, estado: e.target.value as any})} className="input-base">
                <option>Abierto</option><option>En Plan</option><option>Cerrado</option><option>Verificado</option>
              </select>
            </F>
            <F label="Fecha Visita">
              <input type="date" value={form.fechaVisita} onChange={(e)=>setForm({...form, fechaVisita: e.target.value})} className="input-base"/>
            </F>
          </div>
          <F label="Descripción">
            <textarea value={form.descripcion} onChange={(e)=>setForm({...form, descripcion: e.target.value})} rows={3} className="input-base resize-none"/>
          </F>
          <F label="Tipos de Riesgo (multiselección)">
            <div className="flex flex-wrap gap-2">
              {TIPO_RIESGO.map(r => {
                const active = form.tiposRiesgo?.includes(r) ?? false;
                return (
                  <button key={r} type="button" onClick={()=>toggleRiesgo(r)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active
                      ? "bg-red-500/15 text-red-300 border-red-500/30"
                      : "bg-[#1A2540] text-[#94A3B8] border-[#2A3F6A] hover:text-white"}`}>
                    {r}
                  </button>
                );
              })}
            </div>
          </F>
          <F label="Recomendaciones IA (opcional)">
            <textarea value={form.recomendacionesIA ?? ""} onChange={(e)=>setForm({...form, recomendacionesIA: e.target.value})} rows={2} className="input-base resize-none"/>
          </F>

          {/* Anexos técnicos (opcional) — pestañas ocultas hasta que el auditor las active */}
          <div className="border border-[#1E2D4A] rounded-xl overflow-hidden">
            <button type="button" onClick={()=>setAnexosOpen(o=>!o)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#0A111F] transition-colors">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <ClipboardList className="w-3.5 h-3.5 text-[#4A7AFF]"/>
                Anexos Técnicos <span className="text-[#475569] font-normal">(opcional)</span>
                {anexosTienenDatos(anexos) && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#22C55E]/15 text-[#22C55E]">con datos</span>}
              </span>
              <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform ${anexosOpen?"rotate-180":""}`}/>
            </button>
            {anexosOpen && (
              <div className="px-4 pb-4 border-t border-[#1E2D4A] pt-3">
                <p className="text-[10px] text-[#475569] mb-3">Documenta controles operativos e inventarios relacionados con el hallazgo. Todo es opcional y se guarda junto con el hallazgo.</p>
                <AnexosTecnicosEditor value={anexos} onChange={setAnexos} />
              </div>
            )}
          </div>
        </form>

        {(validationError || error) && (
          <div className="mx-6 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5"/>
            <span>{validationError ?? error}</span>
          </div>
        )}

        <footer className="flex items-center justify-end gap-2 px-6 py-3 border-t border-[#1E2D4A]">
          <button type="button" onClick={onClose} className="btn-ghost text-xs" disabled={submitting}>Cancelar</button>
          <button
            type="submit"
            onClick={submit}
            disabled={submitting}
            className="btn-primary text-xs bg-amber-500 hover:bg-amber-600 flex items-center gap-2 disabled:opacity-50"
          >
            {submitting && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/>}
            {submitting ? "Guardando..." : (hallazgo ? "Guardar" : "Crear hallazgo")}
          </button>
        </footer>
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
