"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useCedisStore, selectFilteredAuditorias } from "@/store/cedis.store";
import { useShallow } from "zustand/react/shallow";
import {
  TIPO_RIESGO_CEDI, CRITICIDAD_CEDI, ESTADO_HALLAZGO_CEDI,
  SUBITEMS_POR_CATEGORIA, CATEGORIA_CEDI,
} from "@/lib/cedis.constants";
import { AUDITORS } from "@/lib/constants";
import type { AuditoriaCedi } from "@/lib/cedis.types";
import {
  Plus, Search, Filter, RefreshCw, Download,
  Warehouse, Edit2, Trash2, X, ChevronDown, ChevronUp,
} from "lucide-react";

export default function ConsolidadoCedisPage() {
  const cedis        = useCedisStore(useShallow((s) => s.cedis));
  const auditorias   = useCedisStore(useShallow((s) => s.auditorias));
  const filtered     = useCedisStore(useShallow(selectFilteredAuditorias));
  const filters      = useCedisStore(useShallow((s) => s.filters));
  const setFilters   = useCedisStore((s) => s.setFilters);
  const resetFilters = useCedisStore((s) => s.resetFilters);
  const addAuditoria = useCedisStore((s) => s.addAuditoria);
  const updateAud    = useCedisStore((s) => s.updateAuditoria);
  const removeAud    = useCedisStore((s) => s.removeAuditoria);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AuditoriaCedi | null>(null);

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Consolidado de Auditorías CEDIS"
        subtitle={`${filtered.length} de ${auditorias.length} registros · ${cedis.length} CEDIS disponibles`}
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Toolbar */}
        <div className="card-base p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]"/>
              <input value={filters.search} onChange={(e) => setFilters({ search: e.target.value })}
                placeholder="Buscar CEDI, auditor, observación..."
                className="w-full pl-10 pr-3 py-2 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-emerald-500/40"/>
            </div>
            <Sel value={filters.cediId}     onChange={(v) => setFilters({ cediId: v })}     placeholder="CEDI"      options={cedis.map(c => ({ value: c.id, label: c.nombre }))} />
            <Sel value={filters.auditorId}  onChange={(v) => setFilters({ auditorId: v })}  placeholder="Auditor"   options={AUDITORS.map(a => ({ value: a.id, label: a.name }))} />
            <Sel value={filters.tipoRiesgo} onChange={(v) => setFilters({ tipoRiesgo: v })} placeholder="Tipo Riesgo" options={TIPO_RIESGO_CEDI.map(r => ({ value: r, label: r }))} />
            <Sel value={filters.criticidad} onChange={(v) => setFilters({ criticidad: v })} placeholder="Criticidad" options={CRITICIDAD_CEDI.map(c => ({ value: c, label: c }))} />
            <Sel value={filters.estado}     onChange={(v) => setFilters({ estado: v })}     placeholder="Estado"    options={ESTADO_HALLAZGO_CEDI.map(e => ({ value: e, label: e }))} />

            <button onClick={resetFilters} className="btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5"/>Limpiar</button>
            <button disabled className="btn-secondary text-xs opacity-60 cursor-not-allowed"><Download className="w-3.5 h-3.5"/>Exportar</button>
            <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary text-xs ml-auto bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-3.5 h-3.5"/>Nueva Auditoría
            </button>
          </div>
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="card-base flex flex-col items-center justify-center py-16 text-center">
            <Warehouse className="w-10 h-10 text-[#1E2D4A] mb-4"/>
            <p className="text-white font-semibold mb-2">
              {auditorias.length === 0 ? "Sin auditorías registradas" : "Sin resultados con los filtros actuales"}
            </p>
            <p className="text-[#475569] text-sm">
              {auditorias.length === 0 ? 'Click en "Nueva Auditoría" para crear la primera' : "Ajusta los filtros o limpia para ver todas"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(a => {
              const critColor =
                a.criticidad === "Crítica" ? "#EF4444" :
                a.criticidad === "Alta"    ? "#F59E0B" :
                a.criticidad === "Media"   ? "#3B82F6" : "#94A3B8";
              return (
                <div key={a.id} className="card-base">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                              style={{ background: `${critColor}18`, color: critColor, border: `1px solid ${critColor}30` }}>
                          {a.criticidad}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {a.estado}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
                          {a.tipoRiesgo}
                        </span>
                        <span className="text-[10px] text-[#94A3B8]">{a.fechaVisita}</span>
                      </div>
                      <h3 className="font-display font-bold text-white">
                        {a.cediNombre} · {a.administrador}
                      </h3>
                      <p className="text-xs text-[#94A3B8] mt-0.5">Auditor: {a.auditorNombre}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(a); setModalOpen(true); }} className="p-1.5 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-white" title="Editar">
                        <Edit2 className="w-3.5 h-3.5"/>
                      </button>
                      <button onClick={() => { if (confirm(`¿Eliminar auditoría de ${a.cediNombre}?`)) removeAud(a.id); }}
                              className="p-1.5 rounded hover:bg-red-950/30 text-[#94A3B8] hover:text-red-400" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-[#94A3B8] mb-3 leading-relaxed">{a.observacionRiesgo}</p>

                  {/* Observaciones por categoría */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[
                      ["Inventario",      a.observacionInventario],
                      ["Caja",            a.observacionCaja],
                      ["Cartera",         a.observacionCartera],
                      ["Logística",       a.observacionLogistica],
                      ["Bioseguridad",    a.observacionBioseguridad],
                      ["Infraestructura", a.observacionInfraestructura],
                    ].filter(([_, v]) => v).map(([label, value]) => (
                      <div key={label} className="bg-[#1A2540] border border-[#2A3F6A] rounded-lg p-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-1">{label}</p>
                        <p className="text-xs text-[#94A3B8] leading-snug">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info funcionalidades */}
        <div className="card-base bg-emerald-500/5 border-emerald-500/20">
          <p className="text-xs text-[#94A3B8]">
            <strong className="text-emerald-300">Funcionalidades preparadas:</strong>
            {" "}Filtros inteligentes ✓ · Buscador dinámico ✓ · Edición con 7 secciones expandibles ✓ · Trazabilidad de auditoría ✓ · Exportación Excel/PDF (próximamente) · Seguimiento de hallazgos en módulo Cumplimiento.
          </p>
        </div>
      </div>

      {modalOpen && (
        <AuditoriaCediModal
          item={editing}
          cedis={cedis}
          onClose={() => setModalOpen(false)}
          onSave={(a) => {
            if (editing) updateAud(editing.id, a);
            else         addAuditoria(a as any);
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Sel({ value, onChange, placeholder, options }: {
  value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500/40 min-w-[110px]">
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── MODAL CON 7 SECCIONES EXPANDIBLES ───────────────────────────────────────
function AuditoriaCediModal({ item, cedis, onClose, onSave }: {
  item: AuditoriaCedi | null;
  cedis: any[];
  onClose: () => void;
  onSave: (a: Partial<AuditoriaCedi>) => void;
}) {
  const [form, setForm] = useState<Partial<AuditoriaCedi>>(item ?? {
    fechaVisita: new Date().toISOString().slice(0, 10),
    auditorId:   AUDITORS[0].id,
    auditorNombre: AUDITORS[0].name,
    cediId:      cedis[0]?.id ?? "",
    administrador: cedis[0]?.administrador ?? "",
    tipoRiesgo: "Operativo",
    observacionRiesgo: "",
    criticidad: "Media",
    estado: "Abierto",
  });

  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["Inventario"]));
  const toggle = (s: string) => setOpenSections(prev => {
    const next = new Set(prev);
    next.has(s) ? next.delete(s) : next.add(s);
    return next;
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cediId) return;
    onSave(form);
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg">{item ? "Editar Auditoría CEDI" : "Nueva Auditoría CEDI"}</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">7 secciones expandibles · 50+ sub-items disponibles</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Información general */}
          <Section title="Información general" emerald>
            <div className="grid grid-cols-2 gap-3">
              <F label="Fecha visita">
                <input type="date" value={form.fechaVisita} onChange={(e) => setForm({ ...form, fechaVisita: e.target.value })} className="input-base"/>
              </F>
              <F label="CEDI">
                <select value={form.cediId} onChange={(e) => {
                  const c = cedis.find(x => x.id === e.target.value);
                  setForm({ ...form, cediId: e.target.value, administrador: c?.administrador ?? "" });
                }} className="input-base">
                  {cedis.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </F>
              <F label="Administrador">
                <input value={form.administrador} onChange={(e) => setForm({ ...form, administrador: e.target.value })} className="input-base"/>
              </F>
              <F label="Auditor">
                <select value={form.auditorId} onChange={(e) => {
                  const a = AUDITORS.find(x => x.id === e.target.value)!;
                  setForm({ ...form, auditorId: e.target.value, auditorNombre: a.name });
                }} className="input-base">
                  {AUDITORS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </F>
              <F label="Tipo Riesgo">
                <select value={form.tipoRiesgo} onChange={(e) => setForm({ ...form, tipoRiesgo: e.target.value as any })} className="input-base">
                  {TIPO_RIESGO_CEDI.map(r => <option key={r}>{r}</option>)}
                </select>
              </F>
              <F label="Criticidad">
                <select value={form.criticidad} onChange={(e) => setForm({ ...form, criticidad: e.target.value as any })} className="input-base">
                  {CRITICIDAD_CEDI.map(c => <option key={c}>{c}</option>)}
                </select>
              </F>
            </div>
            <F label="Observación general del riesgo">
              <textarea value={form.observacionRiesgo} onChange={(e) => setForm({ ...form, observacionRiesgo: e.target.value })} rows={2} className="input-base resize-none"/>
            </F>
          </Section>

          {/* 7 categorías colapsables */}
          {CATEGORIA_CEDI.map(cat => {
            const fieldKey = ("observacion" + cat.replace(/[ó]/g,"o").replace(/[í]/g,"i").replace(" ","")) as keyof AuditoriaCedi;
            const isOpen = openSections.has(cat);
            const subitems = SUBITEMS_POR_CATEGORIA[cat];
            return (
              <div key={cat} className="border border-[#1E2D4A] rounded-xl overflow-hidden">
                <button type="button" onClick={() => toggle(cat)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#0D1526] hover:bg-[#1A2540] transition-colors">
                  <span className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                    {cat}
                    <span className="text-[10px] text-[#475569] font-normal">{subitems.length} sub-items</span>
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-[#94A3B8]"/> : <ChevronDown className="w-4 h-4 text-[#94A3B8]"/>}
                </button>
                {isOpen && (
                  <div className="p-4 bg-[#070B14] space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {subitems.map(item => (
                        <span key={item} className="text-[10px] px-2 py-1 rounded-full bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8]">
                          {item}
                        </span>
                      ))}
                    </div>
                    <F label={`Observación ${cat.toLowerCase()}`}>
                      <textarea
                        value={(form as any)[fieldKey] ?? ""}
                        onChange={(e) => setForm({ ...form, [fieldKey]: e.target.value })}
                        rows={3} className="input-base resize-none"
                        placeholder={`Anota hallazgos, observaciones y evidencias del área ${cat.toLowerCase()}...`}
                      />
                    </F>
                  </div>
                )}
              </div>
            );
          })}
        </form>

        <footer className="flex items-center justify-between px-6 py-3 border-t border-[#1E2D4A]">
          <p className="text-xs text-[#475569]">{item ? `ID: ${item.id}` : "Nuevo registro"}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost text-xs">Cancelar</button>
            <button type="submit" onClick={submit} className="btn-primary text-xs bg-emerald-500 hover:bg-emerald-600">{item ? "Guardar" : "Crear auditoría"}</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children, emerald }: { title: string; children: React.ReactNode; emerald?: boolean }) {
  return (
    <fieldset className="space-y-3">
      <legend className={`text-xs uppercase tracking-wider font-semibold mb-2 ${emerald ? "text-emerald-400" : "text-blue-400"}`}>{title}</legend>
      {children}
    </fieldset>
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
