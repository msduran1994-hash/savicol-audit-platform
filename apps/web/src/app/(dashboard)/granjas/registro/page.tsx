"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useGranjasStore, selectFilteredGranjas } from "@/store/granjas.store";
import { useShallow } from "zustand/react/shallow";
import {
  TIPO_GRANJA, TIPO_OPERATIVO, NIVEL_RIESGO, ESTADO_SANITARIO,
  REGIONES, VETERINARIOS_DEMO,
} from "@/lib/granjas.constants";
import type { Granja } from "@/lib/granjas.types";
import {
  Plus, Search, MapPin, Phone, User, AlertTriangle, X,
  Tractor, Filter, RefreshCw, Edit2, Trash2, ExternalLink,
} from "lucide-react";

export default function RegistroGranjasPage() {
  const granjas      = useGranjasStore(useShallow((s) => s.granjas));
  const filtered     = useGranjasStore(useShallow(selectFilteredGranjas));
  const filters      = useGranjasStore(useShallow((s) => s.filters));
  const setFilters   = useGranjasStore((s) => s.setFilters);
  const resetFilters = useGranjasStore((s) => s.resetFilters);
  const addGranja    = useGranjasStore((s) => s.addGranja);
  const updateGranja = useGranjasStore((s) => s.updateGranja);
  const removeGranja = useGranjasStore((s) => s.removeGranja);

  const [modalOpen,  setModalOpen]  = useState(false);
  const [editing,    setEditing]    = useState<Granja | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState<string | null>(null);

  function openNew()           { setEditing(null); setModalOpen(true); }
  function openEdit(g: Granja) { setEditing(g);    setModalOpen(true); }

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Registro de Granjas"
        subtitle={`${granjas.length} granjas · ${filtered.length} visibles`}
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Toolbar */}
        <div className="card-base p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
              <input
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                placeholder="Buscar por nombre, código, administrador o vereda..."
                className="w-full pl-10 pr-3 py-2 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-amber-500/40"
              />
            </div>
            <Select value={filters.region}          onChange={(v) => setFilters({ region: v })}          placeholder="Región"          options={REGIONES} />
            <Select value={filters.tipoGranja}      onChange={(v) => setFilters({ tipoGranja: v })}      placeholder="Tipo"            options={TIPO_GRANJA} />
            <Select value={filters.tipoOperativo}   onChange={(v) => setFilters({ tipoOperativo: v })}   placeholder="Operativo"       options={TIPO_OPERATIVO} />
            <Select value={filters.nivelRiesgo}     onChange={(v) => setFilters({ nivelRiesgo: v })}     placeholder="Riesgo"          options={NIVEL_RIESGO} />
            <Select value={filters.estadoSanitario} onChange={(v) => setFilters({ estadoSanitario: v })} placeholder="Estado sanitario" options={ESTADO_SANITARIO} />

            <button onClick={resetFilters} className="btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5"/>Limpiar</button>
            <button onClick={openNew}      className="btn-primary text-xs ml-auto"><Plus className="w-3.5 h-3.5"/>Nueva Granja</button>
          </div>
        </div>

        {/* Grid de granjas */}
        {filtered.length === 0 ? (
          <div className="card-base flex flex-col items-center justify-center py-16 text-center">
            <Tractor className="w-10 h-10 text-[#1E2D4A] mb-4"/>
            <p className="text-white font-semibold mb-2">
              {granjas.length === 0 ? "Sin granjas registradas" : "Sin resultados con los filtros actuales"}
            </p>
            <p className="text-[#475569] text-sm max-w-md">
              {granjas.length === 0
                ? 'Click en "Nueva Granja" para registrar la primera. Los datos demo están activos.'
                : "Ajusta los filtros o limpia para ver todas las granjas."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(g => (
              <GranjaCard key={g.id} g={g} onEdit={() => openEdit(g)} onDelete={async () => {
                if (!confirm(`¿Eliminar "${g.nombre}"?\nEsta acción no se puede deshacer.`)) return;
                try { await removeGranja(g.id); }
                catch (e: any) { alert("Error al eliminar: " + (e?.response?.data?.message ?? e?.message ?? "desconocido")); }
              }} />
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <GranjaModal
          granja={editing}
          onClose={() => { setModalOpen(false); setSaveError(null); }}
          onSave={async (g) => {
            setSaveError(null);
            setSaving(true);
            try {
              if (editing) await updateGranja(editing.id, g);
              else         await addGranja(g as any);
              setModalOpen(false);
            } catch (e: any) {
              const raw = e?.response?.data;
              let msg = "Error al guardar la granja";
              if (raw) {
                if (typeof raw === "string") msg = raw;
                else if (raw.message) msg = Array.isArray(raw.message) ? raw.message.join(" · ") : String(raw.message);
              } else if (e?.message) {
                msg = e.message;
              }
              setSaveError(msg);
              console.error("[Granjas] error guardando:", e);
            } finally {
              setSaving(false);
            }
          }}
          saving={saving}
          saveError={saveError}
        />
      )}
    </div>
  );
}

// ─── SUBCOMPONENTES ──────────────────────────────────────────────────────────
function Select({ value, onChange, placeholder, options }: {
  value: string; onChange: (v: string) => void; placeholder: string; options: readonly string[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/40 min-w-[120px]"
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function GranjaCard({ g, onEdit, onDelete }: { g: Granja; onEdit: () => void; onDelete: () => void }) {
  // Prioriza el campo editable nuevo, cae al catálogo legacy para compat
  const vetFromCatalog = VETERINARIOS_DEMO.find(v => v.id === g.tecnicoVeterinarioId);
  const vet = g.tecnicoVeterinarioNombre
    ? { name: g.tecnicoVeterinarioNombre, color: "#10B981" }
    : vetFromCatalog;
  const sanColor =
    g.estadoSanitario === "Óptimo"  ? "#10B981" :
    g.estadoSanitario === "Alerta"  ? "#F59E0B" : "#EF4444";
  const riesgoColor =
    g.nivelRiesgo === "Bajo"  ? "#10B981" :
    g.nivelRiesgo === "Medio" ? "#F59E0B" : "#EF4444";

  return (
    <div className="card-base card-hover relative group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-mono">
              {g.codigo}
            </span>
            {g._demo && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-bold">DEMO</span>}
          </div>
          <h3 className="font-display font-bold text-white truncate">{g.nombre}</h3>
          <p className="text-xs text-[#94A3B8] flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" /> {g.region} · {g.vereda}
          </p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-[#1A2540] text-[#94A3B8] hover:text-white" title="Editar">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-950/30 text-[#94A3B8] hover:text-red-400" title="Eliminar">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <Tag>{g.tipoGranja}</Tag>
        <Tag>{g.tipoOperativo}</Tag>
        <Tag color={riesgoColor}>Riesgo {g.nivelRiesgo}</Tag>
        <Tag color={sanColor}>{g.estadoSanitario}</Tag>
        {g.estado === "Cuarentena" && <Tag color="#EF4444">⚠ Cuarentena</Tag>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="bg-[#1A2540] rounded-lg p-2 border border-[#1E2D4A]">
          <p className="text-[10px] text-[#475569] uppercase tracking-wider">Capacidad</p>
          <p className="text-white font-bold font-display">{g.capacidadAves.toLocaleString()}<span className="text-[10px] text-[#94A3B8] ml-1">aves</span></p>
        </div>
        <div className="bg-[#1A2540] rounded-lg p-2 border border-[#1E2D4A]">
          <p className="text-[10px] text-[#475569] uppercase tracking-wider">Estado</p>
          <p className="text-white font-medium text-xs">{g.estado}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-[#1E2D4A] space-y-1.5 text-xs">
        <p className="flex items-center gap-2 text-[#94A3B8]">
          <User className="w-3 h-3 text-[#475569]" /> <span className="truncate">{g.administrador}</span>
        </p>
        {vet && (
          <p className="flex items-center gap-2 text-[#94A3B8]">
            <span className="w-3 h-3 rounded-full" style={{ background: vet.color }} />
            <span className="truncate">{vet.name}</span>
          </p>
        )}
        <p className="flex items-center gap-2 text-[#94A3B8]">
          <Phone className="w-3 h-3 text-[#475569]" /> {g.telefono}
        </p>
        {g.ubicacionGoogleMaps && (
          <a href={g.ubicacionGoogleMaps} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-[11px] mt-1">
            <ExternalLink className="w-3 h-3"/> Ver en Google Maps
          </a>
        )}
      </div>
    </div>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  if (color) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
        {children}
      </span>
    );
  }
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#1A2540] text-[#94A3B8] border border-[#2A3F6A]">
      {children}
    </span>
  );
}

// ─── MODAL CRUD ──────────────────────────────────────────────────────────────
function GranjaModal({ granja, onClose, onSave, saving = false, saveError = null }: {
  granja: Granja | null;
  onClose: () => void;
  onSave: (g: Partial<Granja>) => void;
  saving?: boolean;
  saveError?: string | null;
}) {
  const [form, setForm] = useState<Partial<Granja>>(granja ?? {
    codigo: "", nombre: "", estado: "Activa", region: "Antioquia", vereda: "",
    administrador: "", responsable: "",
    tecnicoVeterinarioNombre: "", tecnicoVeterinarioEmail: "", tecnicoVeterinarioTelefono: "",
    telefono: "",
    tipoGranja: "Propia", tipoOperativo: "Engorde", nivelRiesgo: "Bajo",
    capacidadAves: 0, estadoSanitario: "Óptimo", notas: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [localError,  setLocalError]  = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.codigo?.trim()) { setLocalError("El código es obligatorio"); return; }
    if (!form.nombre?.trim()) { setLocalError("El nombre es obligatorio"); return; }
    setLocalError(null);
    setSubmitting(true);
    try {
      await (onSave as any)(form);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Error al guardar";
      setLocalError(Array.isArray(msg) ? msg.join(" · ") : String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg">{granja ? "Editar Granja" : "Nueva Granja"}</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">Datos operativos, sanitarios y de contacto</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Código *">
              <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                     placeholder="SAVICOL-XXX-000" required className="input-base" />
            </Field>
            <Field label="Nombre *">
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                     placeholder="Granja San José" required className="input-base" />
            </Field>
            <Field label="Estado">
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as any })} className="input-base">
                <option value="Activa">Activa</option>
                <option value="Inactiva">Inactiva</option>
                <option value="Cuarentena">Cuarentena</option>
              </select>
            </Field>
            <Field label="Región">
              <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value as any })} className="input-base">
                {REGIONES.map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Vereda">
              <input value={form.vereda} onChange={(e) => setForm({ ...form, vereda: e.target.value })} className="input-base" />
            </Field>
            <Field label="Teléfono">
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="input-base" />
            </Field>
            <Field label="Administrador">
              <input value={form.administrador} onChange={(e) => setForm({ ...form, administrador: e.target.value })} className="input-base" />
            </Field>
            <Field label="Responsable">
              <input value={form.responsable ?? ""} onChange={(e) => setForm({ ...form, responsable: e.target.value })} placeholder="Persona responsable de la granja" className="input-base" />
            </Field>
            <Field label="Técnico Veterinario (nombre)">
              <input
                value={form.tecnicoVeterinarioNombre ?? ""}
                onChange={(e) => setForm({ ...form, tecnicoVeterinarioNombre: e.target.value })}
                placeholder="Ej. Dr. Carlos Andrés Restrepo"
                list="vet-suggestions"
                className="input-base"
              />
              {/* Sugerencias de veterinarios ya existentes en el sistema */}
              <datalist id="vet-suggestions">
                {VETERINARIOS_DEMO.map(v => <option key={v.id} value={v.name} />)}
              </datalist>
            </Field>
            <Field label="Correo Técnico Veterinario">
              <input type="email" value={form.tecnicoVeterinarioEmail ?? ""} onChange={(e) => setForm({ ...form, tecnicoVeterinarioEmail: e.target.value })} placeholder="vet@savicol.com" className="input-base" />
            </Field>
            <Field label="Teléfono Técnico Veterinario">
              <input value={form.tecnicoVeterinarioTelefono ?? ""} onChange={(e) => setForm({ ...form, tecnicoVeterinarioTelefono: e.target.value })} placeholder="+57 300 000 0000" className="input-base" />
            </Field>
            <Field label="Tipo Granja">
              <select value={form.tipoGranja} onChange={(e) => setForm({ ...form, tipoGranja: e.target.value as any })} className="input-base">
                {TIPO_GRANJA.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Tipo Operativo">
              <select value={form.tipoOperativo} onChange={(e) => setForm({ ...form, tipoOperativo: e.target.value as any })} className="input-base">
                {TIPO_OPERATIVO.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Nivel de Riesgo">
              <select value={form.nivelRiesgo} onChange={(e) => setForm({ ...form, nivelRiesgo: e.target.value as any })} className="input-base">
                {NIVEL_RIESGO.map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Estado Sanitario">
              <select value={form.estadoSanitario} onChange={(e) => setForm({ ...form, estadoSanitario: e.target.value as any })} className="input-base">
                {ESTADO_SANITARIO.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Capacidad de Aves">
              <input type="number" value={form.capacidadAves} onChange={(e) => setForm({ ...form, capacidadAves: parseInt(e.target.value) || 0 })} className="input-base" />
            </Field>
            <Field label="Ubicación Google Maps (URL)">
              <input value={form.ubicacionGoogleMaps ?? ""} onChange={(e) => setForm({ ...form, ubicacionGoogleMaps: e.target.value })} placeholder="https://maps.google.com/?q=..." className="input-base" />
            </Field>
          </div>

          <Field label="Notas">
            <textarea value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={3} className="input-base resize-none" />
          </Field>
        </form>

        {(localError || saveError) && (
        <div className="mx-6 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
          <span className="shrink-0">⚠</span><span>{localError ?? saveError}</span>
        </div>
      )}
      <footer className="flex items-center justify-end gap-2 px-6 py-3 border-t border-[#1E2D4A]">
          <button type="button" onClick={onClose} className="btn-ghost text-xs">Cancelar</button>
          <button type="submit" onClick={submit} disabled={submitting}
            className={`btn-primary text-xs flex items-center gap-2 ${submitting ? "opacity-70" : ""}`}>
            {submitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
            {granja ? (submitting ? "Guardando..." : "Guardar cambios") : (submitting ? "Creando..." : "Crear granja")}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-[#94A3B8] font-medium mb-1 block">{label}</span>
      {children}
    </label>
  );
}
