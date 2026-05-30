"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useGranjasStore } from "@/store/granjas.store";
import { useShallow } from "zustand/react/shallow";
import { CHECKLIST_PREGUNTAS, CATEGORIA_HALLAZGO, TIPO_AUDITORIA, ESTADO_AUDITORIA } from "@/lib/granjas.constants";
import { AUDITORS } from "@/lib/constants";
import type { Auditoria } from "@/lib/granjas.types";
import { ClipboardCheck, Sparkles, Filter, Plus, CheckCircle2, Clock, AlertCircle, XCircle, X } from "lucide-react";

export default function AuditoriasPage() {
  const auditorias = useGranjasStore(useShallow((s) => s.auditorias));
  const granjas    = useGranjasStore(useShallow((s) => s.granjas));
  const addAuditoria = useGranjasStore((s) => s.addAuditoria);
  const [modalOpen, setModalOpen] = useState(false);

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
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                              style={{
                                background: a.estado === "Aprobada" ? "rgba(16,185,129,0.15)" : a.estado === "Pendiente" ? "rgba(148,163,184,0.15)" : "rgba(245,158,11,0.15)",
                                color: a.estado === "Aprobada" ? "#10B981" : a.estado === "Pendiente" ? "#94A3B8" : "#F59E0B",
                              }}>
                          {a.estado}
                        </span>
                      </td>
                      <td className="p-2 text-[#94A3B8] text-xs max-w-xs truncate">{a.comentarios ?? "—"}</td>
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
          onClose={()=>setModalOpen(false)}
          onSave={(a)=>{ addAuditoria(a as any); setModalOpen(false); }}
        />
      )}
    </div>
  );
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
function AuditoriaModal({ granjas, onClose, onSave }: {
  granjas: any[]; onClose: ()=>void; onSave: (a: Partial<Auditoria>)=>void;
}) {
  const [form, setForm] = useState<Partial<Auditoria>>({
    auditorId: AUDITORS[0].id, auditorNombre: AUDITORS[0].name,
    granjaId: granjas[0]?.id ?? "", granjaNombre: granjas[0]?.nombre ?? "",
    tipoAuditoria: "General", fechaProgramada: new Date().toISOString().slice(0,10),
    estado: "Pendiente", comentarios: "",
  });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.granjaId) return;
    const g = granjas.find(x => x.id === form.granjaId);
    const a = AUDITORS.find(x => x.id === form.auditorId);
    onSave({ ...form, granjaNombre: g?.nombre ?? form.granjaNombre, auditorNombre: a?.name ?? form.auditorNombre });
  }
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-xl overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <h2 className="font-display font-bold text-white text-lg">Nueva Auditoría</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>
        <form onSubmit={submit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Granja">
              <select value={form.granjaId} onChange={(e)=>setForm({...form, granjaId: e.target.value})} className="input-base">
                {granjas.map((g:any)=> <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </Field>
            <Field label="Auditor">
              <select value={form.auditorId} onChange={(e)=>setForm({...form, auditorId: e.target.value})} className="input-base">
                {AUDITORS.map(a=> <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Tipo Auditoría">
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
          </div>
          <Field label="Comentarios">
            <textarea value={form.comentarios ?? ""} onChange={(e)=>setForm({...form, comentarios: e.target.value})} rows={3} className="input-base resize-none"/>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost text-xs">Cancelar</button>
            <button type="submit" className="btn-primary text-xs bg-amber-500 hover:bg-amber-600">Crear auditoría</button>
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
