"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useGranjasStore } from "@/store/granjas.store";
import { useShallow } from "zustand/react/shallow";
import { ESTADO_KPI } from "@/lib/granjas.constants";
import type { KPI } from "@/lib/granjas.types";
import { Target, Plus, Bell, Mail, Filter, TrendingUp, X } from "lucide-react";

export default function KPIPage() {
  const kpis    = useGranjasStore(useShallow((s) => s.kpis));
  const granjas = useGranjasStore(useShallow((s) => s.granjas));
  const addKPI  = useGranjasStore((s) => s.addKPI);
  const [modalOpen, setModalOpen] = useState(false);

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
          <select className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todos los estados</option>
            {ESTADO_KPI.map(e => <option key={e}>{e}</option>)}
          </select>
          <button className="btn-secondary text-xs"><Mail className="w-3.5 h-3.5"/>Enviar recordatorios</button>
          <button className="btn-secondary text-xs"><Bell className="w-3.5 h-3.5"/>Alertas activas</button>
          <button onClick={()=>setModalOpen(true)} className="btn-primary text-xs ml-auto bg-amber-500 hover:bg-amber-600"><Plus className="w-3.5 h-3.5"/>Nuevo KPI</button>
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
        {kpis.length === 0 ? (
          <div className="card-base flex flex-col items-center justify-center py-16 text-center">
            <Target className="w-10 h-10 text-[#1E2D4A] mb-4"/>
            <p className="text-white font-semibold mb-2">Sin KPIs registrados</p>
            <p className="text-[#475569] text-sm">Los KPIs se crean desde el cierre de un hallazgo o manualmente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {kpis.map(k => {
              const estColor =
                k.estado === "Completado"  ? "#10B981" :
                k.estado === "En Curso"    ? "#F59E0B" :
                k.estado === "En Espera"   ? "#06B6D4" : "#94A3B8";
              return (
                <div key={k.id} className="card-base">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white">{k.accion}</h3>
                      <p className="text-xs text-[#94A3B8] mt-1">{k.seguimiento}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: `${estColor}18`, color: estColor, border: `1px solid ${estColor}30` }}>
                      {k.estado}
                    </span>
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
        <KPIModal granjas={granjas} onClose={()=>setModalOpen(false)} onSave={(k)=>{ addKPI(k as any); setModalOpen(false); }}/>
      )}
    </div>
  );
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
function KPIModal({ granjas, onClose, onSave }: { granjas:any[]; onClose:()=>void; onSave:(k:Partial<KPI>)=>void }) {
  const [form, setForm] = useState<Partial<KPI>>({
    granjaId: granjas[0]?.id ?? "",
    accion: "", seguimiento: "",
    fechaCompromiso: new Date(Date.now() + 30*86400000).toISOString().slice(0,10),
    planAccionVeterinario: "",
    estado: "No Iniciado",
    responsable: "",
    porcentajeAvance: 0,
  });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.accion || !form.granjaId) return;
    onSave(form);
  }
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-xl overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <h2 className="font-display font-bold text-white text-lg">Nuevo KPI</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>
        <form onSubmit={submit} className="px-6 py-4 space-y-3">
          <FormField label="Acción *">
            <input value={form.accion} onChange={(e)=>setForm({...form, accion: e.target.value})} required className="input-base"/>
          </FormField>
          <FormField label="Seguimiento">
            <input value={form.seguimiento} onChange={(e)=>setForm({...form, seguimiento: e.target.value})} className="input-base"/>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Granja">
              <select value={form.granjaId} onChange={(e)=>setForm({...form, granjaId: e.target.value})} className="input-base">
                {granjas.map((g:any) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </FormField>
            <FormField label="Estado">
              <select value={form.estado} onChange={(e)=>setForm({...form, estado: e.target.value as any})} className="input-base">
                {ESTADO_KPI.map(e => <option key={e}>{e}</option>)}
              </select>
            </FormField>
            <FormField label="Responsable">
              <input value={form.responsable} onChange={(e)=>setForm({...form, responsable: e.target.value})} className="input-base"/>
            </FormField>
            <FormField label="% Avance">
              <input type="number" min={0} max={100} value={form.porcentajeAvance} onChange={(e)=>setForm({...form, porcentajeAvance: parseInt(e.target.value) || 0})} className="input-base"/>
            </FormField>
            <FormField label="Fecha Compromiso">
              <input type="date" value={form.fechaCompromiso} onChange={(e)=>setForm({...form, fechaCompromiso: e.target.value})} className="input-base"/>
            </FormField>
            <FormField label="Fecha Próxima Visita">
              <input type="date" value={form.fechaProximaVisita ?? ""} onChange={(e)=>setForm({...form, fechaProximaVisita: e.target.value})} className="input-base"/>
            </FormField>
          </div>
          <FormField label="Plan de Acción Veterinario">
            <textarea value={form.planAccionVeterinario} onChange={(e)=>setForm({...form, planAccionVeterinario: e.target.value})} rows={2} className="input-base resize-none"/>
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost text-xs">Cancelar</button>
            <button type="submit" className="btn-primary text-xs bg-amber-500 hover:bg-amber-600">Crear KPI</button>
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
