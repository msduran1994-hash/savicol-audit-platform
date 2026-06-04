"use client";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { useGranjasStore } from "@/store/granjas.store";
import { useShallow } from "zustand/react/shallow";
import { CHECKLIST_PREGUNTAS, CATEGORIA_HALLAZGO, TIPO_AUDITORIA, ESTADO_AUDITORIA } from "@/lib/granjas.constants";
import { AUDITORS } from "@/lib/constants";
import type { Auditoria } from "@/lib/granjas.types";
import { ClipboardCheck, Sparkles, Filter, Plus, CheckCircle2, Clock, AlertCircle, XCircle, X, Trash2, Edit2 } from "lucide-react";

export default function AuditoriasPage() {
  const auditorias    = useGranjasStore(useShallow((s) => s.auditorias));
  const granjas       = useGranjasStore(useShallow((s) => s.granjas));
  const addAuditoria  = useGranjasStore((s) => s.addAuditoria);
  const updateAud     = useGranjasStore((s) => s.updateAuditoria);
  const removeAud     = useGranjasStore((s) => s.removeAuditoria);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAud, setEditingAud] = useState<Auditoria | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [checklistFor, setChecklistFor] = useState<any | null>(null);

  const stats = {
    pendiente:    auditorias.filter(a => a.estado === "Pendiente").length,
    enProceso:    auditorias.filter(a => a.estado === "En Proceso").length,
    completada:   auditorias.filter(a => a.estado === "Completada").length,
    aprobada:     auditorias.filter(a => a.estado === "Aprobada").length,
    noAprobada:   auditorias.filter(a => a.estado === "No Aprobada").length,
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Auditorías de Granjas"
        subtitle={`${auditorias.length} auditorías · ${stats.aprobada} aprobadas · checklist con 180 preguntas IA`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#94A3B8] flex items-center gap-1.5"><Filter className="w-3.5 h-3.5"/>Filtros:</span>
            <select className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
              <option value="">Todos los estados</option>
              {ESTADO_AUDITORIA.map(e => <option key={e}>{e}</option>)}
            </select>
            <select className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
              <option value="">Todos los tipos</option>
              {TIPO_AUDITORIA.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={()=>setModalOpen(true)} className="btn-primary text-xs bg-amber-500 hover:bg-amber-600"><Plus className="w-3.5 h-3.5"/>Nueva Auditoría</button>
        </div>

        {/* KPI estados */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi label="Pendientes"   value={stats.pendiente}  color="#94A3B8" icon={<Clock/>} />
          <Kpi label="En Proceso"   value={stats.enProceso}  color="#F59E0B" icon={<AlertCircle/>} />
          <Kpi label="Completadas"  value={stats.completada} color="#3B82F6" icon={<CheckCircle2/>} />
          <Kpi label="Aprobadas"    value={stats.aprobada}   color="#10B981" icon={<CheckCircle2/>} />
          <Kpi label="No Aprobadas" value={stats.noAprobada} color="#EF4444" icon={<XCircle/>} />
        </div>

        {/* Lista de auditorías */}
        <div className="card-base">
          <h3 className="font-display font-semibold text-white mb-4">Auditorías Registradas</h3>
          {auditorias.length === 0 ? (
            <div className="text-center py-16">
              <ClipboardCheck className="w-10 h-10 text-[#1E2D4A] mx-auto mb-4"/>
              <p className="text-white font-semibold mb-2">Sin auditorías registradas</p>
              <p className="text-[#475569] text-sm">Click en "Nueva Auditoría" para programar la primera</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[#475569] border-b border-[#1E2D4A]">
                    <th className="text-left p-2">Auditor</th>
                    <th className="text-left p-2">Granja</th>
                    <th className="text-left p-2">Tipo</th>
                    <th className="text-left p-2">Fecha</th>
                    <th className="text-left p-2">Estado</th>
                    <th className="text-left p-2">Comentarios</th>
                    <th className="text-center p-2 w-20">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {auditorias.map(a => (
                    <tr key={a.id} className="table-row-hover border-b border-[#1E2D4A]/50">
                      <td className="p-2 text-white">{a.auditorNombre}</td>
                      <td className="p-2 text-white">{a.granjaNombre}</td>
                      <td className="p-2 text-[#94A3B8]">{a.tipoAuditoria}</td>
                      <td className="p-2 text-[#94A3B8] font-mono text-xs">{a.fechaProgramada}</td>
                      <td className="p-2">
                        <select
                          value={a.estado}
                          onChange={(e) => updateAud(a.id, { estado: e.target.value as any })}
                          className="text-[10px] px-2 py-0.5 rounded font-semibold border bg-transparent"
                          style={{
                            background: a.estado === "Aprobada" ? "rgba(16,185,129,0.15)" : a.estado === "Pendiente" ? "rgba(148,163,184,0.15)" : "rgba(245,158,11,0.15)",
                            color: a.estado === "Aprobada" ? "#10B981" : a.estado === "Pendiente" ? "#94A3B8" : "#F59E0B",
                            borderColor: a.estado === "Aprobada" ? "#10B98140" : a.estado === "Pendiente" ? "#94A3B840" : "#F59E0B40",
                          }}
                        >
                          {ESTADO_AUDITORIA.map(s => <option key={s} value={s} className="bg-[#0D1526] text-white">{s}</option>)}
                        </select>
                      </td>
                      <td className="p-2 text-[#94A3B8] text-xs max-w-xs truncate">{a.comentarios ?? "—"}</td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setChecklistFor(a)}
                            className="p-1 rounded hover:bg-amber-500/10 text-[#94A3B8] hover:text-amber-400"
                            title="Aplicar Checklist IA"
                          >
                            <Sparkles className="w-3.5 h-3.5"/>
                          </button>
                          <button
                            onClick={() => { setEditingAud(a); setSaveError(null); }}
                            className="p-1 rounded hover:bg-blue-500/10 text-[#94A3B8] hover:text-blue-400"
                            title="Editar auditoría"
                          >
                            <Edit2 className="w-3.5 h-3.5"/>
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`¿Eliminar auditoría de ${a.granjaNombre}?`)) return;
                              try { await removeAud(a.id); }
                              catch (e: any) { alert("Error al eliminar: " + (e?.response?.data?.message ?? e?.message ?? "desconocido")); }
                            }}
                            className="p-1 rounded hover:bg-red-500/10 text-[#94A3B8] hover:text-red-400"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Checklist IA */}
        <div className="card-base bg-gradient-to-br from-[#0D1526] to-[#1A1208] border-amber-900/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-amber-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Biblioteca de Checklist IA — 180 preguntas curadas
            </h3>
            <span className="text-xs text-[#94A3B8]">Distribución determinística por categoría</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {CATEGORIA_HALLAZGO.map(cat => {
              const count = CHECKLIST_PREGUNTAS.filter(p => p.categoria === cat).length;
              return (
                <div key={cat} className="bg-[#1A2540] border border-[#2A3F6A] rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-amber-400 font-display">{count}</p>
                  <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider mt-1">{cat}</p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-[#475569] mt-3">
            Las preguntas se aplican automáticamente según el tipo de auditoría, criticidad e historial.
            Cada pregunta tiene un peso (1=informativa, 2=importante, 3=crítica) que alimenta el score IA del Ranking.
          </p>
        </div>
      </div>

      {modalOpen && (
        <AuditoriaModal
          granjas={granjas}
          error={saveError}
          onClose={()=>{ setModalOpen(false); setSaveError(null); }}
          onSave={async (a) => {
            setSaveError(null);
            try {
              await addAuditoria(a as any);
              setModalOpen(false);
            } catch (e: any) {
              setSaveError(formatErr(e, "Error al guardar la auditoría"));
              console.error("[Auditorias] error guardando:", e);
            }
          }}
        />
      )}

      {editingAud && (
        <AuditoriaModal
          granjas={granjas}
          error={saveError}
          editing={editingAud}
          onClose={() => { setEditingAud(null); setSaveError(null); }}
          onSave={async (patch) => {
            setSaveError(null);
            try {
              await updateAud(editingAud.id, patch as any);
              setEditingAud(null);
            } catch (e: any) {
              setSaveError(formatErr(e, "Error al actualizar la auditoría"));
              console.error("[Auditorias] error editando:", e);
            }
          }}
        />
      )}

      {checklistFor && (
        <ChecklistIAModal
          auditoria={checklistFor}
          onClose={() => setChecklistFor(null)}
        />
      )}
    </div>
  );
}

// ─── HELPER · format error ──
function formatErr(e: any, fallback: string): string {
  const raw = e?.response?.data;
  let msg = fallback;
  if (raw) {
    if (typeof raw === "string") msg = raw;
    else if (raw.message) msg = Array.isArray(raw.message) ? raw.message.join(" · ") : String(raw.message);
    else if (raw.error)   msg = String(raw.error);
  } else if (e?.message) msg = e.message;
  if (e?.response?.status) msg = `HTTP ${e.response.status} · ${msg}`;
  return msg;
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
function AuditoriaModal({ granjas, onClose, onSave, error, editing }: {
  granjas: any[];
  onClose: () => void;
  onSave: (a: Partial<Auditoria>) => Promise<void> | void;
  error?: string | null;
  editing?: Auditoria;
}) {
  const [form, setForm] = useState<Partial<Auditoria>>(editing ? {
    auditorId:       editing.auditorId,
    auditorNombre:   editing.auditorNombre,
    granjaId:        editing.granjaId,
    granjaNombre:    editing.granjaNombre,
    tipoAuditoria:   editing.tipoAuditoria,
    fechaProgramada: editing.fechaProgramada?.slice(0, 10) ?? new Date().toISOString().slice(0,10),
    fechaEjecutada:  editing.fechaEjecutada?.slice(0, 10),
    estado:          editing.estado,
    comentarios:     editing.comentarios ?? "",
  } : {
    auditorId:       AUDITORS[0]?.id ?? "",
    auditorNombre:   AUDITORS[0]?.name ?? "",
    granjaId:        granjas[0]?.id ?? "",
    granjaNombre:    granjas[0]?.nombre ?? "",
    tipoAuditoria:   "General",
    fechaProgramada: new Date().toISOString().slice(0,10),
    estado:          "Pendiente",
    comentarios:     "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (granjas.length === 0) {
      setValidationError("No hay granjas registradas. Crea una en /granjas/registro primero.");
      return;
    }
    if (!form.granjaId) {
      setValidationError("Selecciona una granja del listado");
      return;
    }
    if (!form.auditorId) {
      setValidationError("Selecciona un auditor");
      return;
    }
    if (!form.tipoAuditoria) {
      setValidationError("Selecciona el tipo de auditoría");
      return;
    }

    const g = granjas.find(x => x.id === form.granjaId);
    const a = AUDITORS.find(x => x.id === form.auditorId);
    const payload: Partial<Auditoria> = {
      ...form,
      granjaNombre:  g?.nombre ?? form.granjaNombre,
      auditorNombre: a?.name   ?? form.auditorNombre,
      comentarios:   form.comentarios?.trim() || undefined,
    };

    setSubmitting(true);
    try {
      await onSave(payload);
    } catch {
      // error visible en banner del padre
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-xl overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg">
              {editing ? "Editar Auditoría" : "Nueva Auditoría"}
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {editing
                ? "Modifica los campos y guarda los cambios"
                : "Aplica el checklist IA después de crearla"}
            </p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>
        <form onSubmit={submit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Granja *">
              <select value={form.granjaId} onChange={(e)=>setForm({...form, granjaId: e.target.value})} className="input-base">
                {granjas.length === 0
                  ? <option value="">(sin granjas registradas)</option>
                  : granjas.map((g:any)=> <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </Field>
            <Field label="Auditor *">
              <select value={form.auditorId} onChange={(e)=>setForm({...form, auditorId: e.target.value})} className="input-base">
                {AUDITORS.map(a=> <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Tipo Auditoría *">
              <select value={form.tipoAuditoria} onChange={(e)=>setForm({...form, tipoAuditoria: e.target.value as any})} className="input-base">
                {TIPO_AUDITORIA.map(t=> <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Estado">
              <select value={form.estado} onChange={(e)=>setForm({...form, estado: e.target.value as any})} className="input-base">
                {ESTADO_AUDITORIA.map(s=> <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Fecha Programada">
              <input type="date" value={form.fechaProgramada} onChange={(e)=>setForm({...form, fechaProgramada: e.target.value})} className="input-base"/>
            </Field>
            {editing && (
              <Field label="Fecha Ejecutada">
                <input type="date" value={form.fechaEjecutada ?? ""} onChange={(e)=>setForm({...form, fechaEjecutada: e.target.value})} className="input-base"/>
              </Field>
            )}
          </div>
          <Field label="Comentarios">
            <textarea value={form.comentarios ?? ""} onChange={(e)=>setForm({...form, comentarios: e.target.value})} rows={3} className="input-base resize-none"/>
          </Field>

          {(validationError || error) && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5"/>
              <span>{validationError ?? error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost text-xs" disabled={submitting}>Cancelar</button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs bg-amber-500 hover:bg-amber-600 flex items-center gap-2 disabled:opacity-50"
            >
              {submitting && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/>}
              {submitting ? "Guardando..." : editing ? "Actualizar" : "Crear auditoría"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-[#94A3B8] font-medium mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Kpi({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="card-base flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div>
        <p className="font-display text-xl font-bold text-white leading-tight">{value}</p>
        <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   CHECKLIST IA MODAL · 180 preguntas curadas
   ════════════════════════════════════════════════════════════════════════════ */
import { apiGet, apiPost } from "@/lib/api";

type Respuesta = "Cumple" | "No Cumple" | "No Aplica";

interface ChecklistRespuestaState {
  [preguntaId: string]: { respuesta: Respuesta; observacion?: string };
}

function ChecklistIAModal({ auditoria, onClose }: {
  auditoria: any;
  onClose: () => void;
}) {
  const [respuestas, setRespuestas] = useState<ChecklistRespuestaState>({});
  const [filterCat, setFilterCat]   = useState<string>("");
  const [filterRes, setFilterRes]   = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);

  // Hidratar respuestas previas
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const prev = await apiGet<any[]>(`/granjas/auditorias/${auditoria.id}/checklist`);
        if (cancel) return;
        const map: ChecklistRespuestaState = {};
        for (const r of prev) {
          map[r.preguntaId] = { respuesta: r.respuesta as Respuesta, observacion: r.observacion };
        }
        setRespuestas(map);
      } catch {}
    })();
    return () => { cancel = true; };
  }, [auditoria.id]);

  // Filtrar preguntas según selección
  const visiblePreguntas = CHECKLIST_PREGUNTAS.filter(p => {
    if (filterCat && p.categoria !== filterCat) return false;
    if (filterRes) {
      const r = respuestas[p.id]?.respuesta;
      if (filterRes === "Sin responder" && r) return false;
      if (filterRes !== "Sin responder" && r !== filterRes) return false;
    }
    return true;
  });

  // Cálculos en vivo
  const responded   = Object.keys(respuestas).length;
  const total       = CHECKLIST_PREGUNTAS.length;
  const cumple      = Object.values(respuestas).filter(r => r.respuesta === "Cumple").length;
  const noCumple    = Object.values(respuestas).filter(r => r.respuesta === "No Cumple").length;
  const noAplica    = Object.values(respuestas).filter(r => r.respuesta === "No Aplica").length;
  const evaluadas   = cumple + noCumple;
  const cumplimiento = evaluadas > 0 ? Math.round((cumple / evaluadas) * 100) : 0;

  // Pesos
  const pesoTotalCumple = Object.entries(respuestas).reduce((s, [pid, r]) => {
    if (r.respuesta !== "Cumple") return s;
    const p = CHECKLIST_PREGUNTAS.find(x => x.id === pid);
    return s + (p?.peso ?? 1);
  }, 0);
  const pesoTotalEvaluado = Object.entries(respuestas).reduce((s, [pid, r]) => {
    if (r.respuesta === "No Aplica") return s;
    const p = CHECKLIST_PREGUNTAS.find(x => x.id === pid);
    return s + (p?.peso ?? 1);
  }, 0);
  const scorePonderado = pesoTotalEvaluado > 0
    ? Math.round((pesoTotalCumple / pesoTotalEvaluado) * 100)
    : 0;

  const setResp = (preguntaId: string, respuesta: Respuesta) => {
    setRespuestas(prev => ({ ...prev, [preguntaId]: { ...prev[preguntaId], respuesta } }));
  };
  const setObs = (preguntaId: string, observacion: string) => {
    setRespuestas(prev => ({
      ...prev,
      [preguntaId]: { ...prev[preguntaId], respuesta: prev[preguntaId]?.respuesta ?? "Cumple", observacion },
    }));
  };

  const saveRespuestas = async () => {
    setError(null); setSuccess(null);
    setSaving(true);
    try {
      const list = Object.entries(respuestas).map(([preguntaId, r]) => ({
        preguntaId, respuesta: r.respuesta, observacion: r.observacion,
      }));
      const result: any = await apiPost(`/granjas/auditorias/${auditoria.id}/checklist`, { respuestas: list });
      setSuccess(`✓ ${result.count} respuestas guardadas · cumplimiento ${result.score}%`);
    } catch (e: any) {
      setError(`Error al guardar: ${e?.response?.data?.message ?? e?.message ?? "desconocido"}`);
    } finally {
      setSaving(false);
    }
  };

  const generateHallazgos = async () => {
    setError(null); setSuccess(null);
    const items = Object.entries(respuestas)
      .filter(([_, r]) => r.respuesta === "No Cumple")
      .map(([preguntaId, r]) => {
        const p = CHECKLIST_PREGUNTAS.find(x => x.id === preguntaId);
        return p ? {
          preguntaId,
          categoria: toBackendCategoria(p.categoria),
          pregunta:  p.pregunta,
          peso:      p.peso,
          observacion: r.observacion,
        } : null;
      })
      .filter(Boolean) as any[];

    if (items.length === 0) {
      setError("No hay respuestas 'No Cumple' · nada para generar");
      return;
    }
    if (!confirm(`Se generarán ${items.length} hallazgos automáticamente a partir de las respuestas "No Cumple". ¿Continuar?`)) return;

    setGenerating(true);
    try {
      // Primero guardar las respuestas
      const list = Object.entries(respuestas).map(([preguntaId, r]) => ({
        preguntaId, respuesta: r.respuesta, observacion: r.observacion,
      }));
      await apiPost(`/granjas/auditorias/${auditoria.id}/checklist`, { respuestas: list });

      // Luego generar
      const r: any = await apiPost(`/granjas/auditorias/${auditoria.id}/checklist/generate-hallazgos`, { items });
      setSuccess(`✓ ${r.generados} hallazgos generados automáticamente. Vé a /granjas/hallazgos para revisarlos.`);
    } catch (e: any) {
      setError(`Error al generar hallazgos: ${e?.response?.data?.message ?? e?.message ?? "desconocido"}`);
    } finally {
      setGenerating(false);
    }
  };

  // Agrupar visibles por categoría
  const grouped = CATEGORIA_HALLAZGO.map(cat => ({
    categoria: cat,
    preguntas: visiblePreguntas.filter(p => p.categoria === cat),
  })).filter(g => g.preguntas.length > 0);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-amber-500/30 rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A] bg-gradient-to-r from-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400"/>
            </div>
            <div>
              <h2 className="font-display font-bold text-white text-lg">Aplicar Checklist IA · {total} preguntas</h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Granja: <span className="text-emerald-300">{auditoria.granjaNombre}</span> · Auditor: <span className="text-cyan-300">{auditoria.auditorNombre}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>

        {/* Resumen + filtros */}
        <div className="px-6 py-3 border-b border-[#1E2D4A] bg-[#0A111F]">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
            <ChecklistKpi label="Respondidas" value={`${responded}/${total}`} color="#3B82F6"/>
            <ChecklistKpi label="Cumple"      value={cumple}              color="#10B981"/>
            <ChecklistKpi label="No Cumple"   value={noCumple}            color="#EF4444"/>
            <ChecklistKpi label="No Aplica"   value={noAplica}            color="#94A3B8"/>
            <ChecklistKpi label="Cumplimiento" value={`${cumplimiento}%`} color="#F59E0B"/>
            <ChecklistKpi label="Score ponderado" value={`${scorePonderado}%`} color="#8B5CF6"/>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
              className="px-2 py-1 bg-[#0D1526] border border-[#1E2D4A] rounded text-xs text-white">
              <option value="">Todas las categorías ({total})</option>
              {CATEGORIA_HALLAZGO.map(c => {
                const count = CHECKLIST_PREGUNTAS.filter(p => p.categoria === c).length;
                return <option key={c} value={c}>{c} ({count})</option>;
              })}
            </select>
            <select value={filterRes} onChange={(e) => setFilterRes(e.target.value)}
              className="px-2 py-1 bg-[#0D1526] border border-[#1E2D4A] rounded text-xs text-white">
              <option value="">Todas las respuestas</option>
              <option value="Sin responder">Sin responder</option>
              <option value="Cumple">Cumple</option>
              <option value="No Cumple">No Cumple</option>
              <option value="No Aplica">No Aplica</option>
            </select>
            <span className="text-xs text-[#94A3B8] ml-auto">
              Mostrando {visiblePreguntas.length} de {total}
            </span>
          </div>
        </div>

        {/* Lista de preguntas */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {grouped.length === 0 && (
            <p className="text-center text-xs text-[#475569] py-12">No hay preguntas con los filtros actuales</p>
          )}
          {grouped.map(g => (
            <div key={g.categoria}>
              <h3 className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-2 flex items-center gap-2">
                <ClipboardCheck className="w-3 h-3"/> {g.categoria} ({g.preguntas.length})
              </h3>
              <div className="space-y-2">
                {g.preguntas.map(p => {
                  const r = respuestas[p.id];
                  return (
                    <div key={p.id} className="bg-[#1A2540] border border-[#2A3F6A] rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <code className="text-[10px] text-amber-400 font-mono">{p.id}</code>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0D1526] border border-[#2A3F6A] text-[#94A3B8]">
                              peso {p.peso}
                            </span>
                          </div>
                          <p className="text-sm text-white">{p.pregunta}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(["Cumple", "No Cumple", "No Aplica"] as Respuesta[]).map(opt => {
                          const active = r?.respuesta === opt;
                          const color  = opt === "Cumple" ? "#10B981" : opt === "No Cumple" ? "#EF4444" : "#94A3B8";
                          return (
                            <button key={opt} onClick={() => setResp(p.id, opt)}
                              className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
                              style={{
                                background: active ? `${color}25` : `${color}08`,
                                color:      active ? color : "#94A3B8",
                                borderColor: active ? `${color}60` : `${color}20`,
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                        <input
                          type="text"
                          value={r?.observacion ?? ""}
                          onChange={(e) => setObs(p.id, e.target.value)}
                          placeholder="Observación (opcional)"
                          className="flex-1 min-w-[200px] px-2 py-1 bg-[#0D1526] border border-[#2A3F6A] rounded text-xs text-white placeholder:text-[#475569]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {(error || success) && (
          <div className={`mx-6 mb-2 px-3 py-2 rounded-lg border text-xs flex items-start gap-2 ${
            error
              ? "bg-red-500/10 border-red-500/30 text-red-300"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          }`}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5"/>
            <span>{error ?? success}</span>
          </div>
        )}

        <footer className="flex items-center justify-between gap-2 px-6 py-3 border-t border-[#1E2D4A]">
          <p className="text-xs text-[#475569]">
            {responded === 0 ? "Sin responder aún" : `${responded} respondidas · ${noCumple} requieren acción`}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost text-xs" disabled={saving || generating}>Cerrar</button>
            <button
              onClick={saveRespuestas}
              disabled={saving || generating || responded === 0}
              className="px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {saving && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/>}
              {saving ? "Guardando..." : "Guardar respuestas"}
            </button>
            <button
              onClick={generateHallazgos}
              disabled={saving || generating || noCumple === 0}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-[#0A111F] text-xs font-bold flex items-center gap-2 disabled:opacity-50"
              title={noCumple === 0 ? "Marca preguntas como 'No Cumple' para generar hallazgos" : `Generar ${noCumple} hallazgos auto`}
            >
              {generating && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/>}
              <Sparkles className="w-3 h-3"/>
              {generating ? "Generando..." : `Generar ${noCumple} hallazgo${noCumple !== 1 ? "s" : ""}`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ChecklistKpi({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[#1A2540] border border-[#2A3F6A] rounded-lg p-2 text-center">
      <p className="font-display text-lg font-bold" style={{ color }}>{value}</p>
      <p className="text-[9px] text-[#94A3B8] uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

// Mapeo display → backend para categoría
function toBackendCategoria(c: string): string {
  const map: Record<string, string> = {
    "Ambiental": "AMBIENTAL", "Bioseguridad": "BIOSEGURIDAD", "Sanitario": "SANITARIO",
    "Financiero": "FINANCIERO", "Documental": "DOCUMENTAL", "Mortalidad": "MORTALIDAD",
    "Inventario Insumos": "INVENTARIO_INSUMOS", "Infraestructura": "INFRAESTRUCTURA",
    "Operativo": "OPERATIVO",
  };
  return map[c] ?? c.toUpperCase();
}
