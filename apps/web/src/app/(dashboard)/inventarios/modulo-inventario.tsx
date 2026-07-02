"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// HOJA INVENTARIOS · Vista genérica de módulo (motor reutilizado por los 6 módulos)
// Fase 3 = formulario dinámico + tabla + filtros básicos (editable, trazable).
// Kardex de movimientos, evidencias, auditoría y dashboard llegan en fases próximas.
// ═══════════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import {
  moduloByKey, type ModuloInventario,
  ESTADO_INVENTARIO, ESTADO_INVENTARIO_COLOR, UNIDADES_MEDIDA,
} from "@/lib/inventarios.constants";
import { useInventarios, useCreateInventario, useUpdateInventario, useDeleteInventario } from "@/hooks/useInventarios";
import { useGranjas } from "@/hooks/useGranjas";
import { useCedis } from "@/hooks/useCedis";
import { AUDITORS } from "@/lib/constants";
import type { InventarioAuditado, InventarioPayload } from "@/lib/inventarios.types";
import {
  Boxes, Hash, Loader2, Plus, X, Edit2, Trash2, Search, Filter,
  Save, AlertTriangle, DollarSign,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const isoToLocalInput = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso); if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fmtFecha = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-CO", { dateStyle: "medium" });
};
const num = (v: any): number => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const nfmt = (n: number, dec = 0) => (n ?? 0).toLocaleString("es-CO", { maximumFractionDigits: dec });

export function ModuloInventarioView({ modulo }: { modulo: ModuloInventario }) {
  const def = moduloByKey(modulo);
  const q = useInventarios({ modulo });
  const rows = q.data ?? [];
  const removeItem = useDeleteInventario();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventarioAuditado | null>(null);
  const [search, setSearch] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [fCategoria, setFCategoria] = useState("");

  const categorias = useMemo(
    () => Array.from(new Set(rows.map(r => (r.categoria || "").trim()).filter(Boolean))).sort(),
    [rows],
  );

  const filtered = useMemo(() => rows.filter(r => {
    if (fEstado && r.estado !== fEstado) return false;
    if (fCategoria && (r.categoria || "") !== fCategoria) return false;
    if (search) {
      const s = search.toLowerCase();
      const hay = [r.consecutivo, r.nombre, r.categoria, r.ubicacion, r.responsable, r.cediNombre, r.granjaNombre]
        .some(v => (v || "").toLowerCase().includes(s));
      if (!hay) return false;
    }
    return true;
  }), [rows, search, fEstado, fCategoria]);

  const kpis = useMemo(() => {
    const conDif = filtered.filter(r => r.diferencia != null && r.diferencia !== 0).length;
    const valor = filtered.reduce((s, r) => s + (r.valorTotal || 0), 0);
    const auditados = filtered.filter(r => ["Auditado", "Conciliado", "Cerrado"].includes(r.estado)).length;
    return { total: filtered.length, conDif, valor, auditados };
  }, [filtered]);

  if (!def) return null;
  const year = new Date().getFullYear();

  return (
    <div>
      <Header title={def.label} subtitle={`Hoja Inventarios · ${def.descripcion}`} />

      <div className="flex-1 p-6 space-y-6">
        {/* Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniCard icon={<Boxes className="w-4 h-4" />}         label="Registros"     value={q.isLoading ? "…" : nfmt(kpis.total)} color="#8B5CF6" />
          <MiniCard icon={<AlertTriangle className="w-4 h-4" />} label="Con diferencia" value={nfmt(kpis.conDif)}                    color="#EF4444" />
          <MiniCard icon={<DollarSign className="w-4 h-4" />}    label="Valor total"    value={`$ ${nfmt(kpis.valor)}`}              color="#06B6D4" />
          <MiniCard icon={<Hash className="w-4 h-4" />}          label="Auditados"      value={nfmt(kpis.auditados)}                 color="#10B981" />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#475569]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…"
                   className="pl-8 pr-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white w-52" />
          </div>
          <span className="text-xs text-[#94A3B8] flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /></span>
          <select value={fEstado} onChange={e => setFEstado(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todos los estados</option>
            {ESTADO_INVENTARIO.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={fCategoria} onChange={e => setFCategoria(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Toda categoría</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary text-xs ml-auto flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />Nuevo registro
          </button>
        </div>

        {/* Tabla */}
        <div className="card-base p-0 overflow-hidden">
          {q.isLoading ? (
            <div className="py-16 flex items-center justify-center text-[#475569]"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Boxes className="w-10 h-10 text-[#1E2D4A] mb-4" />
              <p className="text-white font-semibold mb-1">Sin registros en {def.label}</p>
              <p className="text-[#475569] text-sm mb-4">Registra el primer ítem con "Nuevo registro" (folio INV-{def.prefijo}-{year}-0001).</p>
              <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary text-xs flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />Nuevo registro</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Filter className="w-10 h-10 text-[#1E2D4A] mb-4" />
              <p className="text-white font-semibold mb-1">Sin resultados con los filtros</p>
              <button onClick={() => { setSearch(""); setFEstado(""); setFCategoria(""); }} className="btn-primary text-xs mt-2">Limpiar filtros</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0D1526]">
                  <tr className="text-[10px] uppercase tracking-wider text-[#475569] border-b border-[#1E2D4A]">
                    <th className="text-left p-2.5">Consecutivo</th>
                    <th className="text-left p-2.5">Ítem · Categoría</th>
                    <th className="text-left p-2.5">Ubicación</th>
                    <th className="text-right p-2.5">Cantidad</th>
                    <th className="text-right p-2.5">Contada</th>
                    <th className="text-right p-2.5">Dif.</th>
                    <th className="text-center p-2.5">Estado</th>
                    <th className="text-left p-2.5">Responsable</th>
                    <th className="text-left p-2.5">Fecha</th>
                    <th className="text-center p-2.5 w-16">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const ec = ESTADO_INVENTARIO_COLOR[r.estado] ?? "#94A3B8";
                    const dif = r.diferencia;
                    return (
                      <tr key={r.id} className="border-b border-[#1E2D4A]/50 table-row-hover">
                        <td className="p-2.5 font-mono text-[11px] text-violet-300 whitespace-nowrap">{r.consecutivo}</td>
                        <td className="p-2.5">
                          <p className="text-white">{r.nombre}</p>
                          {r.categoria && <p className="text-[10px] text-[#94A3B8] mt-0.5">{r.categoria}</p>}
                        </td>
                        <td className="p-2.5 text-[#94A3B8] text-xs">{r.ubicacion || r.cediNombre || r.granjaNombre || "—"}</td>
                        <td className="p-2.5 text-right font-mono text-xs text-white">{r.cantidad != null ? nfmt(r.cantidad, 2) : "—"}<span className="text-[9px] text-[#475569]"> {r.unidadMedida || ""}</span></td>
                        <td className="p-2.5 text-right font-mono text-xs text-[#94A3B8]">{r.cantidadContada != null ? nfmt(r.cantidadContada, 2) : "—"}</td>
                        <td className="p-2.5 text-right font-mono text-xs font-bold" style={{ color: dif != null && dif !== 0 ? "#EF4444" : "#475569" }}>{dif != null ? nfmt(dif, 2) : "—"}</td>
                        <td className="p-2.5 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${ec}18`, color: ec, border: `1px solid ${ec}30` }}>{r.estado}</span>
                        </td>
                        <td className="p-2.5 text-[#94A3B8] text-xs">{r.responsable || "—"}</td>
                        <td className="p-2.5 text-[#94A3B8] text-xs whitespace-nowrap">{fmtFecha(r.fecha)}</td>
                        <td className="p-2.5">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => { setEditing(r); setModalOpen(true); }} className="p-1 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-white" title="Editar"><Edit2 className="w-3 h-3" /></button>
                            <button onClick={async () => { if (confirm(`¿Eliminar "${r.nombre}" (${r.consecutivo})?`)) { try { await removeItem.mutateAsync(r.id); } catch (e: any) { alert("Error: " + (e?.response?.data?.message ?? e?.message)); } } }} className="p-1 rounded hover:bg-red-950/30 text-[#94A3B8] hover:text-red-400" title="Eliminar"><Trash2 className="w-3 h-3" /></button>
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
      </div>

      {modalOpen && (
        <InventarioModal modulo={modulo} item={editing} onClose={() => setModalOpen(false)} onSaved={() => setModalOpen(false)} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL · Formulario del ítem de inventario
// ═══════════════════════════════════════════════════════════════════════════════
function InventarioModal({ modulo, item, onClose, onSaved }: {
  modulo: ModuloInventario; item: InventarioAuditado | null; onClose: () => void; onSaved: () => void;
}) {
  const def = moduloByKey(modulo)!;
  const create = useCreateInventario();
  const update = useUpdateInventario();
  const granjasQ = useGranjas();
  const cedisQ = useCedis();
  const granjas = (granjasQ.data ?? []) as any[];
  const cedis = (cedisQ.data ?? []) as any[];

  const [f, setF] = useState({
    nombre: item?.nombre ?? "",
    descripcion: item?.descripcion ?? "",
    categoria: item?.categoria ?? "",
    unidadMedida: item?.unidadMedida ?? "",
    ubicacion: item?.ubicacion ?? "",
    cediId: item?.cediId ?? "",
    granjaId: item?.granjaId ?? "",
    cantidad: item?.cantidad != null ? String(item.cantidad) : "",
    cantidadContada: item?.cantidadContada != null ? String(item.cantidadContada) : "",
    costoUnitario: item?.costoUnitario != null ? String(item.costoUnitario) : "",
    estado: item?.estado ?? "Registrado",
    responsable: item?.responsable ?? "",
    auditor: item?.auditor ?? "",
    fecha: isoToLocalInput(item?.fecha) || isoToLocalInput(new Date().toISOString()),
    observaciones: item?.observaciones ?? "",
  });
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  // Cálculos automáticos en vivo
  const difCalc = f.cantidad !== "" && f.cantidadContada !== "" ? num(f.cantidad) - num(f.cantidadContada) : null;
  const valorCalc = f.cantidad !== "" && f.costoUnitario !== "" ? num(f.cantidad) * num(f.costoUnitario) : null;
  const saving = create.isPending || update.isPending;

  const guardar = async () => {
    if (!f.nombre.trim()) { setError("El nombre del ítem es obligatorio."); return; }
    if (f.cantidad !== "" && num(f.cantidad) < 0) { setError("La cantidad no puede ser negativa."); return; }
    setError("");
    const cedi = cedis.find(c => c.id === f.cediId);
    const granja = granjas.find(g => g.id === f.granjaId);
    const payload: InventarioPayload = {
      modulo,
      nombre: f.nombre.trim(),
      descripcion: f.descripcion || undefined,
      categoria: f.categoria || undefined,
      unidadMedida: f.unidadMedida || undefined,
      ubicacion: f.ubicacion || undefined,
      cediId: f.cediId || undefined,
      cediNombre: cedi?.nombre || undefined,
      granjaId: f.granjaId || undefined,
      granjaNombre: granja?.nombre || undefined,
      cantidad: f.cantidad !== "" ? num(f.cantidad) : undefined,
      cantidadContada: f.cantidadContada !== "" ? num(f.cantidadContada) : undefined,
      costoUnitario: f.costoUnitario !== "" ? num(f.costoUnitario) : undefined,
      valorTotal: valorCalc ?? undefined,
      estado: f.estado,
      responsable: f.responsable || undefined,
      auditor: f.auditor || undefined,
      fecha: f.fecha || undefined,
      observaciones: f.observaciones || undefined,
    };
    try {
      if (item) await update.mutateAsync({ id: item.id, patch: payload });
      else await create.mutateAsync(payload);
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "No se pudo guardar.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg">{item ? "Editar registro" : "Nuevo registro"}</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">{def.label}{item ? ` · ${item.consecutivo}` : ` · folio automático`}</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5" /></button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <Section title="Información general">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <F label="Nombre del ítem *" value={f.nombre} onChange={v => set("nombre", v)} placeholder="Ej. Canastilla plástica" />
              <F label="Categoría" value={f.categoria} onChange={v => set("categoria", v)} placeholder="Ej. Empaque" />
              <F label="Descripción" value={f.descripcion} onChange={v => set("descripcion", v)} placeholder="Detalle / referencia" full />
              <Sel label="Unidad de medida" value={f.unidadMedida} onChange={v => set("unidadMedida", v)} options={UNIDADES_MEDIDA as unknown as string[]} placeholder="Seleccionar…" />
            </div>
          </Section>

          <Section title="Ubicación (independiente · CEDI/Granja opcionales)">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <F label="Ubicación / bodega" value={f.ubicacion} onChange={v => set("ubicacion", v)} placeholder="Ej. Bodega principal" />
              <div>
                <label className="text-[10px] text-[#94A3B8] mb-1 block">CEDI (opcional)</label>
                <select value={f.cediId} onChange={e => set("cediId", e.target.value)} className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white">
                  <option value="">—</option>
                  {cedis.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[#94A3B8] mb-1 block">Granja (opcional)</label>
                <select value={f.granjaId} onChange={e => set("granjaId", e.target.value)} className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white">
                  <option value="">—</option>
                  {granjas.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                </select>
              </div>
            </div>
          </Section>

          <Section title="Cantidades y valoración">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <F label="Cantidad (teórica)" value={f.cantidad} onChange={v => set("cantidad", v)} type="number" placeholder="0" />
              <F label="Cantidad contada" value={f.cantidadContada} onChange={v => set("cantidadContada", v)} type="number" placeholder="0" />
              <Calc label="Diferencia" value={difCalc != null ? nfmt(difCalc, 2) : "—"} alert={difCalc != null && difCalc !== 0} />
              <F label="Costo unitario" value={f.costoUnitario} onChange={v => set("costoUnitario", v)} type="number" placeholder="0" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <Calc label="Valor total" value={valorCalc != null ? `$ ${nfmt(valorCalc)}` : "—"} />
            </div>
          </Section>

          <Section title="Auditoría">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Sel label="Estado" value={f.estado} onChange={v => set("estado", v)} options={ESTADO_INVENTARIO as unknown as string[]} />
              <F label="Fecha" value={f.fecha} onChange={v => set("fecha", v)} type="datetime-local" />
              <div>
                <label className="text-[10px] text-[#94A3B8] mb-1 block">Responsable</label>
                <input list="inv-auditors" value={f.responsable} onChange={e => set("responsable", e.target.value)} placeholder="Nombre" className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="text-[10px] text-[#94A3B8] mb-1 block">Auditor</label>
                <input list="inv-auditors" value={f.auditor} onChange={e => set("auditor", e.target.value)} placeholder="Nombre" className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white" />
              </div>
              <datalist id="inv-auditors">{AUDITORS.map(a => <option key={a.id} value={a.name} />)}</datalist>
              <div className="md:col-span-2">
                <label className="text-[10px] text-[#94A3B8] mb-1 block">Observaciones</label>
                <textarea value={f.observaciones} onChange={e => set("observaciones", e.target.value)} rows={2} className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white resize-none" />
              </div>
            </div>
          </Section>

          {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{error}</p>}
        </div>

        <footer className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1E2D4A]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-[#94A3B8] hover:text-white">Cancelar</button>
          <button onClick={guardar} disabled={saving} className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}{item ? "Guardar cambios" : "Crear registro"}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────
function MiniCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="card-base flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="min-w-0">
        <p className="font-display text-base font-bold text-white leading-tight truncate">{value}</p>
        <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-violet-300/80 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function F({ label, value, onChange, type = "text", placeholder, full }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; full?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="text-[10px] text-[#94A3B8] mb-1 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
             className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white" />
    </div>
  );
}

function Sel({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] text-[#94A3B8] mb-1 block">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Calc({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div>
      <label className="text-[10px] text-[#94A3B8] mb-1 block">{label}</label>
      <div className="w-full bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs font-mono font-bold"
           style={{ color: alert ? "#EF4444" : "#67E8F9" }}>{value}</div>
    </div>
  );
}
