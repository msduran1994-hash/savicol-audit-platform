"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useGranjasStore } from "@/store/granjas.store";
import { useShallow } from "zustand/react/shallow";
import { ESTADO_KPI } from "@/lib/granjas.constants";
import type { KPI } from "@/lib/granjas.types";
import {
  Target, Plus, Bell, Mail, Filter, TrendingUp, X, Trash2,
  Edit2, AlertCircle, Loader2,
} from "lucide-react";

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

export default function KPIPage() {
  const kpis      = useGranjasStore(useShallow((s) => s.kpis));
  const granjas   = useGranjasStore(useShallow((s) => s.granjas));
  const addKPI    = useGranjasStore((s) => s.addKPI);
  const updateKPI = useGranjasStore((s) => s.updateKPI);
  const removeKPI = useGranjasStore((s) => s.removeKPI);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editingKpi, setEditingKpi] = useState<KPI | null>(null);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState("");

  const filtered = filterEstado
    ? kpis.filter(k => k.estado === filterEstado)
    : kpis;

  const total       = kpis.length;
  const completados = kpis.filter(k => k.estado === "Completado").length;
  const enCurso     = kpis.filter(k => k.estado === "En Curso").length;
  const enEspera    = kpis.filter(k => k.estado === "En Espera").length;
  const noIniciado  = kpis.filter(k => k.estado === "No Iniciado").length;
  const cumplimiento = total > 0 ? Math.round((completados / total) * 100) : 0;

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Cumplimiento KPI"
        subtitle={`${total} KPIs · ${cumplimiento}% cumplimiento general`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-[#94A3B8] flex items-center gap-1.5"><Filter className="w-3.5 h-3.5"/>Filtros:</span>
          <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}
            className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todos los estados</option>
            {ESTADO_KPI.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <button className="btn-secondary text-xs"><Mail className="w-3.5 h-3.5"/>Enviar recordatorios</button>
          <button className="btn-secondary text-xs"><Bell className="w-3.5 h-3.5"/>Alertas activas</button>
          <button onClick={() => { setSaveError(null); setEditingKpi(null); setModalOpen(true); }}
            className="btn-primary text-xs ml-auto bg-amber-500 hover:bg-amber-600">
            <Plus className="w-3.5 h-3.5"/>Nuevo KPI
          </button>
        </div>

        {/* Indicadores principales */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi label="Planes Totales" value={total}       color="#3B82F6" />
          <Kpi label="Completados"    value={completados} color="#10B981" />
          <Kpi label="En Curso"       value={enCurso}     color="#F59E0B" />
          <Kpi label="En Espera"      value={enEspera}    color="#06B6D4" />
          <Kpi label="No Iniciados"   value={noIniciado}  color="#94A3B8" />
        </div>

        {/* Barra cumplimiento */}
        <div className="card-base">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400"/> Progreso General
            </h3>
            <span className="text-2xl font-bold font-display text-amber-400">{cumplimiento}%</span>
          </div>
          <div className="h-3 bg-[#1A2540] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
                 style={{ width: `${cumplimiento}%`, background: "linear-gradient(90deg, #10B981, #34D399, #FBBF24)" }} />
          </div>
        </div>

        {/* Lista de KPIs */}
        {filtered.length === 0 ? (
          <div className="card-base flex flex-col items-center justify-center py-16 text-center">
            <Target className="w-10 h-10 text-[#1E2D4A] mb-4"/>
            <p className="text-white font-semibold mb-2">
              {kpis.length === 0 ? "Sin KPIs registrados" : "Sin resultados con el filtro actual"}
            </p>
            <p className="text-[#475569] text-sm">
              {kpis.length === 0 ? 'Click en "Nuevo KPI" para crear el primero' : "Cambia el filtro o quítalo para ver todos"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(k => {
              const estColor =
                k.estado === "Completado"  ? "#10B981" :
                k.estado === "En Curso"    ? "#F59E0B" :
                k.estado === "En Espera"   ? "#06B6D4" : "#94A3B8";
              const granja = granjas.find(g => g.id === k.granjaId);
              return (
                <div key={k.id} className="card-base">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white">{k.accion}</h3>
                      <p className="text-xs text-[#94A3B8] mt-1">{k.seguimiento}</p>
                      {granja && (
                        <p className="text-[10px] text-[#475569] mt-1">📍 {granja.nombre} · {granja.codigo}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: `${estColor}18`, color: estColor, border: `1px solid ${estColor}30` }}>
                        {k.estado}
                      </span>
                      <select
                        value={k.estado}
                        onChange={async (e) => {
                          try { await updateKPI(k.id, { estado: e.target.value as any }); }
                          catch (err: any) { alert("Error al cambiar estado: " + formatErr(err, "desconocido")); }
                        }}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#1A2540] border border-[#2A3F6A] text-white"
                        title="Cambiar estado"
                      >
                        {ESTADO_KPI.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button
                        onClick={() => { setSaveError(null); setEditingKpi(k); setModalOpen(true); }}
                        className="p-1 rounded hover:bg-blue-500/10 text-[#94A3B8] hover:text-blue-400"
                        title="Editar KPI"
                      >
                        <Edit2 className="w-3.5 h-3.5"/>
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`¿Eliminar KPI "${k.accion}"?\nEsta acción no se puede deshacer.`)) return;
                          try { await removeKPI(k.id); }
                          catch (e: any) { alert("Error al eliminar: " + formatErr(e, "desconocido")); }
                        }}
                        className="p-1 rounded hover:bg-red-500/10 text-[#94A3B8] hover:text-red-400"
                        title="Eliminar KPI"
                      >
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </div>

                  {/* Barra de avance */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#94A3B8]">Avance</span>
                      <span className="text-white font-bold">{k.porcentajeAvance}%</span>
                    </div>
                    <div className="h-2 bg-[#1A2540] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                           style={{ width: `${k.porcentajeAvance}%`, background: estColor }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <Field label="Responsable" value={k.responsable} />
                    <Field label="Fecha Compromiso" value={k.fechaCompromiso} />
                    <Field label="Próxima Visita"   value={k.fechaProximaVisita ?? "—"} />
                    <Field label="Plan Veterinario" value={k.planAccionVeterinario} truncate />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Notificaciones */}
        <div className="card-base bg-blue-500/5 border-blue-500/20">
          <h3 className="font-display font-semibold text-blue-400 flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4"/> Automatizaciones Configuradas
          </h3>
          <ul className="text-xs text-[#94A3B8] space-y-1 list-disc list-inside">
            <li>Envío de correo automático a responsables al actualizar KPI</li>
            <li>Alerta 3 días antes del cumplimiento de fecha compromiso</li>
            <li>Recordatorio semanal a técnico veterinario sobre KPIs en curso</li>
            <li>Trazabilidad completa: cada cambio queda registrado en Actividad</li>
          </ul>
        </div>
      </div>

      {modalOpen && (
        <KPIModal
          granjas={granjas}
          editing={editingKpi}
          error={saveError}
          onClose={() => { setModalOpen(false); setEditingKpi(null); setSaveError(null); }}
          onSave={async (k) => {
            setSaveError(null);
            try {
              if (editingKpi) {
                await updateKPI(editingKpi.id, k);
              } else {
                await addKPI(k as any);
              }
              setModalOpen(false);
              setEditingKpi(null);
            } catch (e: any) {
              setSaveError(formatErr(e, editingKpi ? "Error al actualizar el KPI" : "Error al guardar el KPI"));
              console.error("[KPI] error:", e);
            }
          }}
        />
      )}
    </div>
  );
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
function KPIModal({ granjas, editing, error, onClose, onSave }: {
  granjas: any[];
  editing?: KPI | null;
  error: string | null;
  onClose: () => void;
  onSave: (k: Partial<KPI>) => Promise<void> | void;
}) {
  const [form, setForm] = useState<Partial<KPI>>(editing ? {
    granjaId:              editing.granjaId,
    accion:                editing.accion,
    seguimiento:           editing.seguimiento,
    fechaCompromiso:       editing.fechaCompromiso?.slice(0, 10) ?? "",
    fechaProximaVisita:    editing.fechaProximaVisita?.slice(0, 10),
    fechaCumplimiento:     editing.fechaCumplimiento?.slice(0, 10),
    planAccionVeterinario: editing.planAccionVeterinario,
    estado:                editing.estado,
    responsable:           editing.responsable,
    porcentajeAvance:      editing.porcentajeAvance,
    hallazgoId:            editing.hallazgoId,
  } : {
    granjaId:              granjas[0]?.id ?? "",
    accion:                "",
    seguimiento:           "",
    fechaCompromiso:       new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    planAccionVeterinario: "",
    estado:                "No Iniciado",
    responsable:           "",
    porcentajeAvance:      0,
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
    if (!form.granjaId)            { setValidationError("Selecciona una granja"); return; }
    if (!form.accion?.trim())      { setValidationError("La acción es obligatoria"); return; }
    if (!form.responsable?.trim()) { setValidationError("Asigna un responsable"); return; }
    if (!form.fechaCompromiso)     { setValidationError("Fecha compromiso es obligatoria"); return; }

    const payload: Partial<KPI> = {
      ...form,
      accion:                form.accion!.trim(),
      seguimiento:           form.seguimiento?.trim() || "—",
      responsable:           form.responsable!.trim(),
      planAccionVeterinario: form.planAccionVeterinario?.trim() || "—",
      porcentajeAvance:      Math.max(0, Math.min(100, form.porcentajeAvance ?? 0)),
    };

    setSubmitting(true);
    try { await onSave(payload); }
    catch { /* error visible en banner padre */ }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-xl overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg">
              {editing ? "Editar KPI" : "Nuevo KPI"}
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {editing ? "Modifica los campos y guarda los cambios" : "Plan de acción veterinario con seguimiento"}
            </p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>
        <form onSubmit={submit} className="px-6 py-4 space-y-3">
          <FormField label="Acción *">
            <input value={form.accion ?? ""} onChange={(e) => setForm({ ...form, accion: e.target.value })}
              required className="input-base" placeholder="Ej. Implementar plan de bioseguridad"/>
          </FormField>
          <FormField label="Seguimiento">
            <input value={form.seguimiento ?? ""} onChange={(e) => setForm({ ...form, seguimiento: e.target.value })}
              className="input-base" placeholder="Periodicidad / metodología de seguimiento"/>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Granja *">
              <select value={form.granjaId} onChange={(e) => setForm({ ...form, granjaId: e.target.value })} className="input-base">
                {granjas.length === 0
                  ? <option value="">(sin granjas registradas)</option>
                  : granjas.map((g: any) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </FormField>
            <FormField label="Estado">
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as any })} className="input-base">
                {ESTADO_KPI.map(e => <option key={e}>{e}</option>)}
              </select>
            </FormField>
            <FormField label="Responsable *">
              <input value={form.responsable ?? ""} onChange={(e) => setForm({ ...form, responsable: e.target.value })}
                required className="input-base" placeholder="Nombre del responsable"/>
            </FormField>
            <FormField label="% Avance">
              <input type="number" min={0} max={100} value={form.porcentajeAvance ?? 0}
                onChange={(e) => setForm({ ...form, porcentajeAvance: parseInt(e.target.value, 10) || 0 })}
                className="input-base"/>
            </FormField>
            <FormField label="Fecha Compromiso *">
              <input type="date" value={form.fechaCompromiso ?? ""} required
                onChange={(e) => setForm({ ...form, fechaCompromiso: e.target.value })} className="input-base"/>
            </FormField>
            <FormField label="Fecha Próxima Visita">
              <input type="date" value={form.fechaProximaVisita ?? ""}
                onChange={(e) => setForm({ ...form, fechaProximaVisita: e.target.value })} className="input-base"/>
            </FormField>
            {editing && (
              <FormField label="Fecha Cumplimiento">
                <input type="date" value={form.fechaCumplimiento ?? ""}
                  onChange={(e) => setForm({ ...form, fechaCumplimiento: e.target.value })} className="input-base"/>
              </FormField>
            )}
          </div>
          <FormField label="Plan de Acción Veterinario">
            <textarea value={form.planAccionVeterinario ?? ""} onChange={(e) => setForm({ ...form, planAccionVeterinario: e.target.value })}
              rows={2} className="input-base resize-none" placeholder="Detalle del plan correctivo"/>
          </FormField>

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
              {submitting ? "Guardando..." : editing ? "Actualizar" : "Crear KPI"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-[#94A3B8] font-medium mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card-base text-center">
      <p className="font-display text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function Field({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-white ${truncate ? "truncate" : ""}`}>{value}</p>
    </div>
  );
}
