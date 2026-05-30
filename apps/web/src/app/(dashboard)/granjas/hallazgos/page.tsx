"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useGranjasStore } from "@/store/granjas.store";
import { useShallow } from "zustand/react/shallow";
import { CATEGORIA_HALLAZGO, CRITICIDAD, TIPO_RIESGO, TIPO_GRANJA, TIPO_OPERATIVO } from "@/lib/granjas.constants";
import { AUDITORS } from "@/lib/constants";
import type { Hallazgo } from "@/lib/granjas.types";
import { AlertTriangle, Filter, Plus, Sparkles, Image, Paperclip, X, Edit2 } from "lucide-react";

export default function HallazgosPage() {
  const hallazgos      = useGranjasStore(useShallow((s) => s.hallazgos));
  const granjas        = useGranjasStore(useShallow((s) => s.granjas));
  const addHallazgo    = useGranjasStore((s) => s.addHallazgo);
  const updateHallazgo = useGranjasStore((s) => s.updateHallazgo);

  const [filtroCat, setFiltroCat] = useState("");
  const [filtroCrit, setFiltroCrit] = useState("");
  const [filtroRiesgo, setFiltroRiesgo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Hallazgo | null>(null);

  const filtered = hallazgos.filter(h => {
    if (filtroCat   && h.categoria  !== filtroCat) return false;
    if (filtroCrit  && h.criticidad !== filtroCrit) return false;
    if (filtroRiesgo && !h.tiposRiesgo.includes(filtroRiesgo as any)) return false;
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
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{h.estado}</span>
                      </div>
                      <h3 className="font-display font-bold text-white text-base">{h.titulo}</h3>
                      <p className="text-xs text-[#94A3B8] mt-1">{h.granjaNombre} · {h.auditorNombre} · {h.fechaVisita}</p>
                    </div>
                    <button onClick={() => { setEditing(h); setModalOpen(true); }} className="p-1.5 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-white">
                      <Edit2 className="w-3.5 h-3.5"/>
                    </button>
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
          onClose={() => setModalOpen(false)}
          onSave={(h) => {
            if (editing) updateHallazgo(editing.id, h);
            else         addHallazgo(h as any);
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function HallazgoModal({ hallazgo, granjas, onClose, onSave }: {
  hallazgo: Hallazgo | null;
  granjas: any[];
  onClose: () => void;
  onSave: (h: Partial<Hallazgo>) => void;
}) {
  const [form, setForm] = useState<Partial<Hallazgo>>(hallazgo ?? {
    titulo: "",
    granjaId: granjas[0]?.id ?? "",
    granjaNombre: granjas[0]?.nombre ?? "",
    auditorId: AUDITORS[0].id,
    auditorNombre: AUDITORS[0].name,
    tipoGranja: "Propia",
    tipoOperativo: "Engorde",
    fechaVisita: new Date().toISOString().slice(0,10),
    categoria: "Bioseguridad",
    tiposRiesgo: [],
    criticidad: "Media",
    estado: "Abierto",
    descripcion: "",
    recomendacionesIA: "",
  });

  function toggleRiesgo(r: typeof TIPO_RIESGO[number]) {
    setForm((f) => {
      const list = f.tiposRiesgo ?? [];
      return { ...f, tiposRiesgo: list.includes(r) ? list.filter(x => x !== r) : [...list, r] };
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo) return;
    const granja  = granjas.find(g => g.id === form.granjaId);
    const auditor = AUDITORS.find(a => a.id === form.auditorId);
    onSave({
      ...form,
      granjaNombre:  granja?.nombre  ?? form.granjaNombre,
      auditorNombre: auditor?.name   ?? form.auditorNombre,
    });
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
        </form>

        <footer className="flex items-center justify-end gap-2 px-6 py-3 border-t border-[#1E2D4A]">
          <button type="button" onClick={onClose} className="btn-ghost text-xs">Cancelar</button>
          <button type="submit" onClick={submit} className="btn-primary text-xs bg-amber-500 hover:bg-amber-600">{hallazgo ? "Guardar" : "Crear hallazgo"}</button>
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
