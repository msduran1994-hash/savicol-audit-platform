"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useRutasStore, selectFilteredAcompanamientos } from "@/store/rutas.store";
import { useShallow } from "zustand/react/shallow";
import {
  MOTIVOS_DEVOLUCION, CRITICIDAD_OPERACIONAL, ESTADO_ACOMPANAMIENTO,
  TIPO_RIESGO_RUTA, formatCOP, formatKg,
} from "@/lib/rutas.constants";
import { AUDITORS } from "@/lib/constants";
import {
  useClientes, useRutasCat, useVehiculos, useConductores, useAuxiliares,
} from "@/hooks/useRutas";
import type { Acompanamiento } from "@/lib/rutas.types";
import {
  Plus, Search, Filter, RefreshCw, Download, Mail,
  Truck, Edit2, Trash2, X, AlertTriangle, MapPin, Loader2,
} from "lucide-react";

export default function ConsolidadoPage() {
  const items        = useRutasStore(useShallow((s) => s.acompanamientos));
  const filtered     = useRutasStore(useShallow(selectFilteredAcompanamientos));
  const filters      = useRutasStore(useShallow((s) => s.filters));
  const setFilters   = useRutasStore((s) => s.setFilters);
  const resetFilters = useRutasStore((s) => s.resetFilters);
  const addItem      = useRutasStore((s) => s.addAcompanamiento);
  const updateItem   = useRutasStore((s) => s.updateAcompanamiento);
  const removeItem   = useRutasStore((s) => s.removeAcompanamiento);

  // Catálogos desde API (no DEMO arrays · funcionan en producción)
  const clientesQ    = useClientes();
  const rutasCatQ    = useRutasCat();
  const vehiculosQ   = useVehiculos();
  const conductoresQ = useConductores();
  const auxiliaresQ  = useAuxiliares();

  const clientes    = clientesQ.data    ?? [];
  const rutasCat    = rutasCatQ.data    ?? [];
  const vehiculos   = vehiculosQ.data   ?? [];
  const conductores = conductoresQ.data ?? [];
  const auxiliares  = auxiliaresQ.data  ?? [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Acompanamiento | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const totalValor = filtered.reduce((s, a) => s + a.valorDevueltoCOP, 0);
  const totalKg    = filtered.reduce((s, a) => s + a.cantidadKgDevueltos, 0);

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Consolidado de Acompañamientos"
        subtitle={`${filtered.length} de ${items.length} registros · ${formatCOP(totalValor)} · ${formatKg(totalKg)}`}
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Toolbar */}
        <div className="card-base p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]"/>
              <input
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                placeholder="Buscar cliente, ruta, observación, placa..."
                className="w-full pl-10 pr-3 py-2 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-cyan-500/40"
              />
            </div>
            <Sel value={filters.rutaId}      onChange={(v) => setFilters({ rutaId: v })}      placeholder="Ruta"      options={rutasCat.map((r: any) => ({ value: r.id, label: r.nombre }))} />
            <Sel value={filters.vehiculoId}  onChange={(v) => setFilters({ vehiculoId: v })}  placeholder="Vehículo"  options={vehiculos.map((v: any) => ({ value: v.id, label: v.placa }))} />
            <Sel value={filters.clienteId}   onChange={(v) => setFilters({ clienteId: v })}   placeholder="Cliente"   options={clientes.map((c: any) => ({ value: c.id, label: c.nombre }))} />
            <Sel value={filters.auditorId}   onChange={(v) => setFilters({ auditorId: v })}   placeholder="Auditor"   options={AUDITORS.map(a => ({ value: a.id, label: a.name }))} />
            <Sel value={filters.motivo}      onChange={(v) => setFilters({ motivo: v })}      placeholder="Motivo"    options={MOTIVOS_DEVOLUCION.map(m => ({ value: m, label: m }))} />
            <Sel value={filters.criticidad}  onChange={(v) => setFilters({ criticidad: v })}  placeholder="Criticidad" options={CRITICIDAD_OPERACIONAL.map(c => ({ value: c, label: c }))} />

            <button onClick={resetFilters} className="btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5"/>Limpiar</button>
            <button disabled className="btn-secondary text-xs opacity-60 cursor-not-allowed"><Download className="w-3.5 h-3.5"/>Exportar</button>
            <button disabled className="btn-secondary text-xs opacity-60 cursor-not-allowed"><Mail className="w-3.5 h-3.5"/>Notificar</button>
            <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary text-xs ml-auto"><Plus className="w-3.5 h-3.5"/>Nuevo Acompañamiento</button>
          </div>
        </div>

        {/* Table */}
        <div className="card-base p-0 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Truck className="w-10 h-10 text-[#1E2D4A] mb-4"/>
              <p className="text-white font-semibold mb-2">
                {items.length === 0 ? "Sin acompañamientos registrados" : "Sin resultados con los filtros actuales"}
              </p>
              <p className="text-[#475569] text-sm">
                {items.length === 0 ? 'Click en "Nuevo Acompañamiento" para registrar el primero' : "Ajusta los filtros o limpia para ver todos"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0D1526] sticky top-0">
                  <tr className="text-[10px] uppercase tracking-wider text-[#475569] border-b border-[#1E2D4A]">
                    <th className="text-left p-2.5 font-semibold">Fecha</th>
                    <th className="text-left p-2.5 font-semibold">Auditor</th>
                    <th className="text-left p-2.5 font-semibold">Cliente · Ruta</th>
                    <th className="text-left p-2.5 font-semibold">Vehículo · Conductor</th>
                    <th className="text-left p-2.5 font-semibold">Motivo</th>
                    <th className="text-right p-2.5 font-semibold">Valor</th>
                    <th className="text-right p-2.5 font-semibold">Kg</th>
                    <th className="text-center p-2.5 font-semibold">Crit</th>
                    <th className="text-left p-2.5 font-semibold">Estado</th>
                    <th className="text-left p-2.5 font-semibold">Riesgos</th>
                    <th className="text-center p-2.5 font-semibold w-20">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const critColor =
                      a.criticidad === "Crítico" ? "#EF4444" :
                      a.criticidad === "Alto"    ? "#F59E0B" :
                      a.criticidad === "Medio"   ? "#3B82F6" : "#94A3B8";
                    return (
                      <tr key={a.id} className="table-row-hover border-b border-[#1E2D4A]/50">
                        <td className="p-2.5 text-[#94A3B8] font-mono text-xs">{a.fecha}</td>
                        <td className="p-2.5 text-white">{a.auditorNombre.split(" ").slice(0,2).join(" ")}</td>
                        <td className="p-2.5">
                          <p className="text-white">{a.clienteNombre}</p>
                          <p className="text-[10px] text-[#94A3B8] flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3"/>{a.rutaNombre}</p>
                        </td>
                        <td className="p-2.5">
                          <p className="text-white font-mono text-xs">{a.vehiculoPlaca}</p>
                          <p className="text-[10px] text-[#94A3B8] mt-0.5">{a.conductorNombre.split(" ").slice(0,2).join(" ")}</p>
                        </td>
                        <td className="p-2.5 text-[#94A3B8] text-xs">{a.motivo}</td>
                        <td className="p-2.5 text-right font-mono text-xs text-emerald-300">{formatCOP(a.valorDevueltoCOP)}</td>
                        <td className="p-2.5 text-right font-mono text-xs text-cyan-300">{a.cantidadKgDevueltos > 0 ? formatKg(a.cantidadKgDevueltos) : "—"}</td>
                        <td className="p-2.5 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                                style={{ background: `${critColor}18`, color: critColor, border: `1px solid ${critColor}30` }}>
                            {a.criticidad}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {a.estado}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <div className="flex gap-1 flex-wrap">
                            {a.riesgosAsociados.slice(0,3).map(r => (
                              <span key={r} className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">{r}</span>
                            ))}
                            {a.riesgosAsociados.length > 3 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-300">+{a.riesgosAsociados.length-3}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => { setEditing(a); setModalOpen(true); }} className="p-1 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-white" title="Editar">
                              <Edit2 className="w-3 h-3"/>
                            </button>
                            <button onClick={() => { if (confirm(`¿Eliminar acompañamiento de ${a.clienteNombre}?`)) removeItem(a.id); }} className="p-1 rounded hover:bg-red-950/30 text-[#94A3B8] hover:text-red-400" title="Eliminar">
                              <Trash2 className="w-3 h-3"/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="card-base bg-cyan-500/5 border-cyan-500/20">
          <p className="text-xs text-[#94A3B8]">
            <strong className="text-cyan-300">Funcionalidades preparadas:</strong>
            {" "}Envío de correo automático a responsables · Seguimiento de hallazgos en módulo Cumplimiento · Trazabilidad de auditoría en bitácora · Alertas automáticas para criticidad alta · Historial de cambios · Exportación Excel/PDF (próximamente al conectar API).
          </p>
        </div>
      </div>

      {modalOpen && (
        <AcompanamientoModal
          item={editing}
          catalogos={{ clientes, rutas: rutasCat, vehiculos, conductores, auxiliares }}
          onClose={() => { setModalOpen(false); setSaveError(null); }}
          onSave={async (a) => {
            try {
              setSaveError(null);
              if (editing) await updateItem(editing.id, a);
              else         await addItem(a as any);
              setModalOpen(false);
            } catch (e: any) {
              setSaveError(e?.response?.data?.message ?? e?.message ?? "Error al guardar");
            }
          }}
          error={saveError}
        />
      )}
    </div>
  );
}

// ─── COMPONENTES AUX ─────────────────────────────────────────────────────────
function Sel({ value, onChange, placeholder, options }: {
  value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500/40 min-w-[110px]"
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
function AcompanamientoModal({ item, catalogos, onClose, onSave, error }: {
  item: Acompanamiento | null;
  catalogos: {
    clientes: any[]; rutas: any[]; vehiculos: any[];
    conductores: any[]; auxiliares: any[];
  };
  onClose: () => void;
  onSave: (a: Partial<Acompanamiento>) => Promise<void> | void;
  error?: string | null;
}) {
  // Defaults seguros · NO accede a array[0] sin verificar
  const safeDefault = <T,>(arr: T[], picker: (x: T) => any, fallback = ""): string =>
    arr.length > 0 ? String(picker(arr[0]) ?? fallback) : fallback;

  const [form, setForm] = useState<Partial<Acompanamiento>>(item ?? {
    fecha: new Date().toISOString().slice(0, 10),
    auditorId:       AUDITORS[0]?.id   ?? "",
    auditorNombre:   AUDITORS[0]?.name ?? "",
    clienteId:       safeDefault(catalogos.clientes,    (c: any) => c.id),
    clienteNombre:   safeDefault(catalogos.clientes,    (c: any) => c.nombre),
    rutaId:          safeDefault(catalogos.rutas,       (r: any) => r.id),
    rutaNombre:      safeDefault(catalogos.rutas,       (r: any) => r.nombre),
    vehiculoId:      safeDefault(catalogos.vehiculos,   (v: any) => v.id),
    vehiculoPlaca:   safeDefault(catalogos.vehiculos,   (v: any) => v.placa),
    conductorId:     safeDefault(catalogos.conductores, (c: any) => c.id),
    conductorNombre: safeDefault(catalogos.conductores, (c: any) => c.nombre),
    motivo: "Producto Vencido",
    valorDevueltoCOP: 0,
    cantidadKgDevueltos: 0,
    observacionAuditor: "",
    riesgosAsociados: [],
    criticidad: "Medio",
    estado: "Programado",
  });
  const [submitting, setSubmitting] = useState(false);

  function toggleRiesgo(r: typeof TIPO_RIESGO_RUTA[number]) {
    setForm((f) => {
      const list = f.riesgosAsociados ?? [];
      return { ...f, riesgosAsociados: list.includes(r) ? list.filter(x => x !== r) : [...list, r] };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Validación mínima: cliente y ruta (por nombre) + motivo
    if (!(form.clienteNombre?.trim() || form.clienteId)) {
      alert("Cliente es obligatorio");
      return;
    }
    if (!(form.rutaNombre?.trim() || form.rutaId)) {
      alert("Ruta es obligatoria");
      return;
    }
    if (!form.motivo?.trim()) {
      alert("Motivo es obligatorio");
      return;
    }
    const auditor = AUDITORS.find(a => a.id === form.auditorId);
    setSubmitting(true);
    try {
      await onSave({
        ...form,
        auditorNombre: auditor?.name ?? form.auditorNombre,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg">{item ? "Editar Acompañamiento" : "Nuevo Acompañamiento"}</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">Captura de información operativa, devoluciones y riesgos</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <Section title="Información general">
            <Grid>
              <F label="Fecha"><input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="input-base"/></F>
              <F label="Auditor">
                <select value={form.auditorId} onChange={(e) => setForm({ ...form, auditorId: e.target.value })} className="input-base">
                  {AUDITORS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </F>
              <F label="Cliente *">
                <input
                  value={form.clienteNombre ?? ""}
                  onChange={(e) => setForm({ ...form, clienteNombre: e.target.value, clienteId: "" })}
                  placeholder="Escribe el nombre del cliente"
                  list="rutas-clientes"
                  className="input-base"
                  required
                />
                <datalist id="rutas-clientes">
                  {catalogos.clientes.map((c: any) => <option key={c.id} value={c.nombre} />)}
                </datalist>
              </F>
              <F label="Ruta *">
                <input
                  value={form.rutaNombre ?? ""}
                  onChange={(e) => setForm({ ...form, rutaNombre: e.target.value, rutaId: "" })}
                  placeholder="Ej. Medellín Norte"
                  list="rutas-rutas"
                  className="input-base"
                  required
                />
                <datalist id="rutas-rutas">
                  {catalogos.rutas.map((r: any) => <option key={r.id} value={r.nombre} />)}
                </datalist>
              </F>
            </Grid>
          </Section>

          <Section title="Flota y personal">
            <Grid>
              <F label="Vehículo (placa)">
                <input
                  value={form.vehiculoPlaca ?? ""}
                  onChange={(e) => setForm({ ...form, vehiculoPlaca: e.target.value, vehiculoId: "" })}
                  placeholder="ABC-123"
                  list="rutas-vehiculos"
                  className="input-base"
                />
                <datalist id="rutas-vehiculos">
                  {catalogos.vehiculos.map((v: any) => <option key={v.id} value={v.placa} />)}
                </datalist>
              </F>
              <F label="Conductor">
                <input
                  value={form.conductorNombre ?? ""}
                  onChange={(e) => setForm({ ...form, conductorNombre: e.target.value, conductorId: "" })}
                  placeholder="Nombre del conductor"
                  list="rutas-conductores"
                  className="input-base"
                />
                <datalist id="rutas-conductores">
                  {catalogos.conductores.map((c: any) => <option key={c.id} value={c.nombre} />)}
                </datalist>
              </F>
              <F label="Auxiliar (opcional)">
                <input
                  value={form.auxiliarNombre ?? ""}
                  onChange={(e) => setForm({ ...form, auxiliarNombre: e.target.value, auxiliarId: undefined })}
                  placeholder="Nombre del auxiliar"
                  list="rutas-auxiliares"
                  className="input-base"
                />
                <datalist id="rutas-auxiliares">
                  {catalogos.auxiliares.map((a: any) => <option key={a.id} value={a.nombre} />)}
                </datalist>
              </F>
              <F label="Motivo">
                <input
                  value={form.motivo ?? ""}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value as any })}
                  placeholder="Escribe el motivo"
                  list="rutas-motivos"
                  className="input-base"
                />
                <datalist id="rutas-motivos">
                  {MOTIVOS_DEVOLUCION.map(m => <option key={m} value={m} />)}
                </datalist>
              </F>
            </Grid>
          </Section>

          <Section title="Devolución">
            <Grid cols={3}>
              <F label="Valor Devuelto (COP)">
                <input type="number" value={form.valorDevueltoCOP} onChange={(e) => setForm({ ...form, valorDevueltoCOP: parseInt(e.target.value) || 0 })} className="input-base" placeholder="0"/>
              </F>
              <F label="Cantidad (kg)">
                <input type="number" step="0.1" value={form.cantidadKgDevueltos} onChange={(e) => setForm({ ...form, cantidadKgDevueltos: parseFloat(e.target.value) || 0 })} className="input-base" placeholder="0.0"/>
              </F>
              <F label="Estado">
                <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as any })} className="input-base">
                  {ESTADO_ACOMPANAMIENTO.map(s => <option key={s}>{s}</option>)}
                </select>
              </F>
            </Grid>
          </Section>

          <Section title="Riesgos y criticidad">
            <F label="Criticidad operacional">
              <div className="grid grid-cols-4 gap-2">
                {CRITICIDAD_OPERACIONAL.map(c => {
                  const colors = { "Crítico": "#EF4444", "Alto": "#F59E0B", "Medio": "#3B82F6", "Bajo": "#10B981" }[c];
                  const active = form.criticidad === c;
                  return (
                    <button key={c} type="button" onClick={() => setForm({ ...form, criticidad: c })}
                      className="px-3 py-2 rounded-lg text-xs font-semibold border transition-all"
                      style={{
                        background: active ? `${colors}25` : `${colors}08`,
                        color:      active ? colors : "#94A3B8",
                        borderColor: active ? `${colors}60` : `${colors}20`,
                      }}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </F>
            <F label="Riesgos asociados (multiselección)">
              <div className="flex flex-wrap gap-2">
                {TIPO_RIESGO_RUTA.map(r => {
                  const active = form.riesgosAsociados?.includes(r) ?? false;
                  return (
                    <button key={r} type="button" onClick={() => toggleRiesgo(r)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active
                        ? "bg-red-500/15 text-red-300 border-red-500/30"
                        : "bg-[#1A2540] text-[#94A3B8] border-[#2A3F6A] hover:text-white"}`}>
                      {r}
                    </button>
                  );
                })}
              </div>
            </F>
          </Section>

          <Section title="Observaciones">
            <F label="Observación del auditor">
              <textarea value={form.observacionAuditor} onChange={(e) => setForm({ ...form, observacionAuditor: e.target.value })} rows={3} className="input-base resize-none" placeholder="Detalles de la auditoría, evidencia recolectada, contexto..."/>
            </F>
          </Section>
        </form>

        {error && (
          <div className="mx-6 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0"/>
            <span>Error guardando: {error}</span>
          </div>
        )}
        <footer className="flex items-center justify-between px-6 py-3 border-t border-[#1E2D4A]">
          <p className="text-xs text-[#475569]">{item ? `ID: ${item.id}` : "Nuevo registro"}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost text-xs" disabled={submitting}>Cancelar</button>
            <button type="submit" onClick={submit} className="btn-primary text-xs flex items-center gap-2" disabled={submitting}>
              {submitting && <Loader2 className="w-3 h-3 animate-spin"/>}
              {submitting ? "Guardando..." : (item ? "Guardar cambios" : "Crear acompañamiento")}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs uppercase tracking-wider text-cyan-400 font-semibold mb-2">{title}</legend>
      {children}
    </fieldset>
  );
}
function Grid({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 }) {
  return <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-3`}>{children}</div>;
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-[#94A3B8] font-medium mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
