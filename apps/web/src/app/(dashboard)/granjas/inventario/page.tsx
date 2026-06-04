"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// Inventario · CRUD conectado al API
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from "react";
import { Header } from "@/components/layout/header";
import {
  useInventario, useInventarioAlerts, useInventarioStats,
  useCreateInventario, useUpdateInventario, useDeleteInventario,
  type InventarioItem, type InventarioPayload,
} from "@/hooks/useInventario";
import { useGranjas } from "@/hooks/useGranjas";
import { CATEGORIA_INVENTARIO } from "@/lib/granjas.constants";
import {
  Package, Plus, AlertTriangle, Filter, TrendingDown, Calendar,
  Edit2, Trash2, X, AlertCircle, Loader2, Save, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mapeo display (constants) ↔ backend (UPPER_CASE)
const CATEGORIA_TO_DB: Record<string, string> = {
  "Alimento Concentrado":      "ALIMENTO_CONCENTRADO",
  "Insumos Veterinarios":      "INSUMOS_VETERINARIOS",
  "Medicamentos":              "MEDICAMENTOS",
  "Equipos":                   "EQUIPOS",
  "Bioseguridad":              "BIOSEGURIDAD_INV",
  "Infraestructura":           "INFRAESTRUCTURA_INV",
};
const CATEGORIA_FROM_DB: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORIA_TO_DB).map(([k, v]) => [v, k])
);
const ESTADO_COLOR: Record<string, string> = {
  DISPONIBLE: "#10B981", STOCK_BAJO: "#F59E0B", AGOTADO: "#EF4444",
  VENCIDO: "#EF4444", POR_VENCER: "#06B6D4",
};
const ESTADO_LABEL: Record<string, string> = {
  DISPONIBLE: "Disponible", STOCK_BAJO: "Stock Bajo", AGOTADO: "Agotado",
  VENCIDO: "Vencido", POR_VENCER: "Por Vencer",
};

export default function InventarioPage() {
  const granjasQ = useGranjas();
  const granjas  = granjasQ.data ?? [];

  const [filterGranja, setFilterGranja] = useState("");
  const [filterCat, setFilterCat]       = useState("");
  const [filterEstado, setFilterEstado] = useState("");

  const itemsQ  = useInventario({ granjaId: filterGranja, categoria: filterCat, estado: filterEstado });
  const alertsQ = useInventarioAlerts(filterGranja || undefined);

  const createItem = useCreateInventario();
  const updateItem = useUpdateInventario();
  const removeItem = useDeleteInventario();

  const items  = itemsQ.data ?? [];
  const alerts = alertsQ.data;

  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<InventarioItem | null>(null);
  const [saveError, setSaveError]   = useState<string | null>(null);

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Inventario General"
        subtitle={`${items.length} ítems · alimentos · insumos · medicamentos · equipos · bioseguridad`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Toolbar */}
        <div className="card-base p-3 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-[#94A3B8] flex items-center gap-1.5"><Filter className="w-3.5 h-3.5"/></span>
          <select value={filterGranja} onChange={e => setFilterGranja(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todas las granjas</option>
            {granjas.map((g: any) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todas las categorías</option>
            {Object.entries(CATEGORIA_TO_DB).map(([label, val]) =>
              <option key={val} value={val}>{label}</option>
            )}
          </select>
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_LABEL).map(([val, label]) =>
              <option key={val} value={val}>{label}</option>
            )}
          </select>
          <button onClick={() => itemsQ.refetch()} className="p-1.5 rounded bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8] hover:text-white" title="Refrescar">
            <RefreshCw className={cn("w-3.5 h-3.5", itemsQ.isFetching && "animate-spin")}/>
          </button>
          <button
            onClick={() => { setEditing(null); setSaveError(null); setModalOpen(true); }}
            className="btn-primary text-xs ml-auto bg-amber-500 hover:bg-amber-600 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5"/> Nuevo Ítem
          </button>
        </div>

        {/* Cards por categoría */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(CATEGORIA_TO_DB).map(([label, val]) => {
            const count = items.filter(i => i.categoria === val).length;
            return (
              <div key={val} className="card-base text-center">
                <Package className="w-5 h-5 text-amber-400 mx-auto mb-2"/>
                <p className="font-display text-2xl font-bold text-white">{count}</p>
                <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider mt-1">{label}</p>
              </div>
            );
          })}
        </div>

        {/* Alertas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <AlertCard icon={<TrendingDown className="w-5 h-5"/>} count={alerts?.stockBajo.length ?? 0} label="Stock Bajo"   color="#F59E0B" />
          <AlertCard icon={<AlertTriangle className="w-5 h-5"/>} count={alerts?.agotado.length ?? 0}    label="Agotados"     color="#EF4444" />
          <AlertCard icon={<Calendar className="w-5 h-5"/>}      count={alerts?.porVencer.length ?? 0}  label="Por Vencer"   color="#06B6D4" />
          <AlertCard icon={<AlertTriangle className="w-5 h-5"/>} count={alerts?.vencido.length ?? 0}    label="Vencidos"     color="#EF4444" />
        </div>

        {/* Lista o empty state */}
        {itemsQ.isLoading ? (
          <div className="card-base p-12 flex items-center justify-center text-[#475569]">
            <Loader2 className="w-6 h-6 animate-spin"/>
            <span className="ml-3 text-sm">Cargando inventario...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="card-base flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-10 h-10 text-[#1E2D4A] mb-4"/>
            <p className="text-white font-semibold mb-2">Sin inventario registrado</p>
            <p className="text-[#475569] text-sm max-w-md">
              Click en "Nuevo Ítem" para agregar productos. Los estados (stock bajo, vencido) se calculan automáticamente.
            </p>
          </div>
        ) : (
          <div className="card-base p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[#475569] border-b border-[#1E2D4A]">
                    <th className="text-left p-2 pl-4">Producto</th>
                    <th className="text-left p-2">Granja</th>
                    <th className="text-left p-2">Categoría</th>
                    <th className="text-right p-2">Stock</th>
                    <th className="text-right p-2">Mínimo</th>
                    <th className="text-center p-2">Estado</th>
                    <th className="text-left p-2">Vencimiento</th>
                    <th className="text-center p-2 w-20">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => {
                    const color = ESTADO_COLOR[it.estado] ?? "#94A3B8";
                    return (
                      <tr key={it.id} className="border-b border-[#1E2D4A]/30 hover:bg-[#0D1526]/50">
                        <td className="p-2 pl-4 text-white">{it.producto}</td>
                        <td className="p-2 text-[#94A3B8] text-xs">{it.granja?.nombre ?? "—"}</td>
                        <td className="p-2 text-[#94A3B8] text-xs">{CATEGORIA_FROM_DB[it.categoria] ?? it.categoria}</td>
                        <td className="p-2 text-right text-white font-mono text-xs">{it.stock} {it.unidad}</td>
                        <td className="p-2 text-right text-[#94A3B8] font-mono text-xs">{it.stockMinimo}</td>
                        <td className="p-2 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
                            {ESTADO_LABEL[it.estado] ?? it.estado}
                          </span>
                        </td>
                        <td className="p-2 text-[#94A3B8] text-xs">{it.fechaVencimiento ? it.fechaVencimiento.slice(0, 10) : "—"}</td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => { setEditing(it); setSaveError(null); setModalOpen(true); }} className="p-1 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-white" title="Editar">
                              <Edit2 className="w-3 h-3"/>
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm(`¿Eliminar "${it.producto}" del inventario?`)) return;
                                try { await removeItem.mutateAsync(it.id); }
                                catch (e: any) { alert("Error: " + (e?.response?.data?.message ?? e?.message)); }
                              }}
                              className="p-1 rounded hover:bg-red-500/10 text-[#94A3B8] hover:text-red-400"
                              title="Eliminar"
                            >
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
          </div>
        )}
      </div>

      {modalOpen && (
        <InventarioModal
          item={editing}
          granjas={granjas}
          error={saveError}
          onClose={() => { setModalOpen(false); setSaveError(null); }}
          onSave={async (dto) => {
            setSaveError(null);
            try {
              if (editing) await updateItem.mutateAsync({ id: editing.id, patch: dto });
              else         await createItem.mutateAsync(dto);
              setModalOpen(false);
            } catch (e: any) {
              const raw = e?.response?.data;
              let msg = "Error al guardar";
              if (raw?.message) msg = Array.isArray(raw.message) ? raw.message.join(" · ") : String(raw.message);
              else if (e?.message) msg = e.message;
              if (e?.response?.status) msg = `HTTP ${e.response.status} · ${msg}`;
              setSaveError(msg);
              console.error("[Inventario] error:", e);
            }
          }}
        />
      )}
    </div>
  );
}

function AlertCard({ icon, count, label, color }: { icon: React.ReactNode; count: number; label: string; color: string }) {
  return (
    <div className="card-base flex items-center gap-3" style={{ borderColor: `${color}30` }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div>
        <p className="font-display text-2xl font-bold" style={{ color }}>{count}</p>
        <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

/* ─────────────── Modal */
function InventarioModal({ item, granjas, error, onClose, onSave }: {
  item: InventarioItem | null;
  granjas: any[];
  error: string | null;
  onClose: () => void;
  onSave: (dto: InventarioPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<InventarioPayload>({
    granjaId:         item?.granjaId ?? granjas[0]?.id ?? "",
    categoria:        item?.categoria ?? "ALIMENTO_CONCENTRADO",
    producto:         item?.producto ?? "",
    unidad:           item?.unidad ?? "kg",
    stock:            item?.stock ?? 0,
    stockMinimo:      item?.stockMinimo ?? 0,
    fechaVencimiento: item?.fechaVencimiento?.slice(0, 10) ?? "",
    ubicacion:        item?.ubicacion ?? "",
    notas:            item?.notas ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!form.granjaId) { setValidationError("Selecciona una granja"); return; }
    if (!form.producto?.trim()) { setValidationError("El nombre del producto es obligatorio"); return; }
    if (!form.unidad?.trim())   { setValidationError("La unidad es obligatoria"); return; }

    const payload: InventarioPayload = {
      ...form,
      producto: form.producto.trim(),
      unidad:   form.unidad.trim(),
      ubicacion: form.ubicacion?.trim() || undefined,
      notas:     form.notas?.trim() || undefined,
      fechaVencimiento: form.fechaVencimiento?.trim() || undefined,
    };

    setSubmitting(true);
    try { await onSave(payload); }
    catch { /* error mostrado */ }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-xl overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <h2 className="font-display font-bold text-white text-lg">{item ? "Editar Ítem" : "Nuevo Ítem de Inventario"}</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>
        <form onSubmit={submit} className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <F label="Granja *">
              <select value={form.granjaId} onChange={e => setForm({ ...form, granjaId: e.target.value })} className="input-base">
                {granjas.length === 0 && <option value="">(sin granjas)</option>}
                {granjas.map((g: any) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </F>
            <F label="Categoría *">
              <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className="input-base">
                {Object.entries(CATEGORIA_TO_DB).map(([label, val]) =>
                  <option key={val} value={val}>{label}</option>
                )}
              </select>
            </F>
            <F label="Producto *">
              <input type="text" value={form.producto} onChange={e => setForm({ ...form, producto: e.target.value })} placeholder="Ej. Alimento Iniciador" className="input-base"/>
            </F>
            <F label="Unidad *">
              <input type="text" value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })} placeholder="kg / litros / unidades" className="input-base"/>
            </F>
            <F label="Stock actual">
              <input type="number" step="0.01" value={form.stock} onChange={e => setForm({ ...form, stock: parseFloat(e.target.value) || 0 })} className="input-base"/>
            </F>
            <F label="Stock mínimo (alerta)">
              <input type="number" step="0.01" value={form.stockMinimo} onChange={e => setForm({ ...form, stockMinimo: parseFloat(e.target.value) || 0 })} className="input-base"/>
            </F>
            <F label="Fecha de vencimiento">
              <input type="date" value={form.fechaVencimiento ?? ""} onChange={e => setForm({ ...form, fechaVencimiento: e.target.value })} className="input-base"/>
            </F>
            <F label="Ubicación">
              <input type="text" value={form.ubicacion ?? ""} onChange={e => setForm({ ...form, ubicacion: e.target.value })} placeholder="Bodega A / Estante 3" className="input-base"/>
            </F>
          </div>
          <F label="Notas">
            <textarea value={form.notas ?? ""} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} className="input-base resize-none"/>
          </F>

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
              {submitting ? "Guardando..." : (item ? "Guardar" : "Crear ítem")}
            </button>
          </div>
        </form>
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
