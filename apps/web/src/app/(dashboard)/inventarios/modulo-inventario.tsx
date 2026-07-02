"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// HOJA INVENTARIOS · Vista genérica de módulo (motor reutilizado por los 6 módulos)
// Fase 3 = formulario dinámico + tabla + filtros básicos (editable, trazable).
// Kardex de movimientos, evidencias, auditoría y dashboard llegan en fases próximas.
// ═══════════════════════════════════════════════════════════════════════════════
import { useMemo, useRef, useState } from "react";
import { Header } from "@/components/layout/header";
import {
  moduloByKey, type ModuloInventario,
  ESTADO_INVENTARIO, ESTADO_INVENTARIO_COLOR, UNIDADES_MEDIDA,
  MOVIMIENTO_TIPOS, MOVIMIENTO_COLOR,
  EVIDENCIA_TIPOS, EVIDENCIA_CATEGORIAS, INVENTARIO_CAMPO_LABELS,
} from "@/lib/inventarios.constants";
import {
  useInventarios, useCreateInventario, useUpdateInventario, useDeleteInventario,
  useMovimientos, useCreateMovimiento, useDeleteMovimiento,
  useEvidenciasInventario, useCreateEvidenciaInventario, useDeleteEvidenciaInventario,
  useAuditoriaInventario,
} from "@/hooks/useInventarios";
import { useGranjas } from "@/hooks/useGranjas";
import { useCedis } from "@/hooks/useCedis";
import { AUDITORS } from "@/lib/constants";
import { useInventariosFiltros, filtrarInventario } from "@/store/inventarios-filtros.store";
import { InventariosFiltros } from "./filtros-inventario";
import { FormularioEvaluativo } from "./evaluacion-producto";
import { exportarInventarioXLSX, exportarInventarioEjecutivoPDF, exportarInventarioTecnicoPDF, describirFiltrosInventario } from "@/lib/inventarios-reportes";
import { procesarArchivo, imgSrc, esImagen, fmtSize } from "@/lib/evidencias-upload";
import type {
  InventarioAuditado, InventarioPayload, MovimientoInventario,
  EvidenciaInventario, AuditoriaInventario, CambioCampoInv,
} from "@/lib/inventarios.types";
import {
  Boxes, Hash, Loader2, Plus, X, Edit2, Trash2, Search, Filter,
  Save, AlertTriangle, DollarSign, ArrowLeftRight, Wallet,
  Camera, History, UploadCloud, Link2, Download, ExternalLink, Maximize2, FileText,
  PlusCircle, PencilLine, ArrowRightLeft, FileSpreadsheet, BarChart3,
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
  const [kardexFor, setKardexFor] = useState<InventarioAuditado | null>(null);
  const [evidenciasFor, setEvidenciasFor] = useState<InventarioAuditado | null>(null);
  const [historialFor, setHistorialFor] = useState<InventarioAuditado | null>(null);
  const [search, setSearch] = useState("");
  const { filtros, reset: resetFiltros } = useInventariosFiltros();
  const cediList = (useCedis().data ?? []) as any[];
  const granjaList = (useGranjas().data ?? []) as any[];
  const [exp, setExp] = useState<"" | "xlsx" | "pdf" | "tec">("");

  const catOpts = useMemo(() => Array.from(new Set(rows.map(r => (r.categoria || "").trim()).filter(Boolean))).sort() as string[], [rows]);
  const respOpts = useMemo(() => Array.from(new Set(rows.map(r => (r.responsable || "").trim()).filter(Boolean))).sort() as string[], [rows]);

  // Filtros globales (store, sincronizados con el dashboard) + búsqueda local.
  const filtered = useMemo(() => {
    const base = filtrarInventario(rows, filtros, { ignoreModulo: true });
    if (!search) return base;
    const s = search.toLowerCase();
    return base.filter(r => [r.consecutivo, r.nombre, r.categoria, r.ubicacion, r.responsable, r.cediNombre, r.granjaNombre]
      .some(v => (v || "").toLowerCase().includes(s)));
  }, [rows, filtros, search]);

  const kpis = useMemo(() => {
    const conDif = filtered.filter(r => r.diferencia != null && r.diferencia !== 0).length;
    const valor = filtered.reduce((s, r) => s + (r.valorTotal || 0), 0);
    const auditados = filtered.filter(r => ["Auditado", "Conciliado", "Cerrado"].includes(r.estado)).length;
    return { total: filtered.length, conDif, valor, auditados };
  }, [filtered]);

  const runExport = async (kind: "xlsx" | "pdf" | "tec") => {
    if (exp || filtered.length === 0) return;
    setExp(kind);
    try {
      const scope = def?.label ?? "Inventario";
      const ftxt = describirFiltrosInventario(filtros, cediList, granjaList);
      if (kind === "xlsx") await exportarInventarioXLSX(filtered, scope);
      else if (kind === "pdf") await exportarInventarioEjecutivoPDF(filtered, scope, ftxt);
      else await exportarInventarioTecnicoPDF(filtered, scope, ftxt);
    } catch (e: any) { alert("No se pudo generar el reporte: " + (e?.message ?? e)); }
    finally { setExp(""); }
  };

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

        {/* Filtros globales sincronizados (dashboard + módulos) + Formulario Evaluativo (solo Producto) */}
        <InventariosFiltros categorias={catOpts} responsables={respOpts} rightSlot={modulo === "PRODUCTO" ? <FormularioEvaluativo /> : undefined} />

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#475569]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…"
                   className="pl-8 pr-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white w-52" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#0D1526] border border-[#1E2D4A] rounded-lg p-0.5" title={filtered.length ? `Exportar ${filtered.length} registro(s)` : "Sin registros"}>
              <button onClick={() => runExport("xlsx")} disabled={!!exp || !filtered.length} className="px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 text-[#94A3B8] hover:text-emerald-400 hover:bg-[#1A2540] disabled:opacity-40 disabled:cursor-not-allowed">
                {exp === "xlsx" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}Excel
              </button>
              <button onClick={() => runExport("pdf")} disabled={!!exp || !filtered.length} className="px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 text-[#94A3B8] hover:text-violet-400 hover:bg-[#1A2540] disabled:opacity-40 disabled:cursor-not-allowed">
                {exp === "pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}Ejecutivo
              </button>
              <button onClick={() => runExport("tec")} disabled={!!exp || !filtered.length} className="px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 text-[#94A3B8] hover:text-amber-400 hover:bg-[#1A2540] disabled:opacity-40 disabled:cursor-not-allowed">
                {exp === "tec" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}Técnico
              </button>
            </div>
            <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary text-xs flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />Nuevo registro
            </button>
          </div>
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
              <button onClick={() => { setSearch(""); resetFiltros(); }} className="btn-primary text-xs mt-2">Limpiar filtros</button>
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
                    <th className="text-right p-2.5">Saldo</th>
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
                        <td className="p-2.5 text-right font-mono text-xs font-semibold text-violet-300">{r.saldo != null ? nfmt(r.saldo, 2) : "—"}</td>
                        <td className="p-2.5 text-right font-mono text-xs text-[#94A3B8]">{r.cantidadContada != null ? nfmt(r.cantidadContada, 2) : "—"}</td>
                        <td className="p-2.5 text-right font-mono text-xs font-bold" style={{ color: dif != null && dif !== 0 ? "#EF4444" : "#475569" }}>{dif != null ? nfmt(dif, 2) : "—"}</td>
                        <td className="p-2.5 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${ec}18`, color: ec, border: `1px solid ${ec}30` }}>{r.estado}</span>
                        </td>
                        <td className="p-2.5 text-[#94A3B8] text-xs">{r.responsable || "—"}</td>
                        <td className="p-2.5 text-[#94A3B8] text-xs whitespace-nowrap">{fmtFecha(r.fecha)}</td>
                        <td className="p-2.5">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => setKardexFor(r)} className="p-1 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-violet-400" title="Kardex de movimientos"><ArrowLeftRight className="w-3 h-3" /></button>
                            <button onClick={() => setEvidenciasFor(r)} className="p-1 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-cyan-400" title="Evidencias"><Camera className="w-3 h-3" /></button>
                            <button onClick={() => setHistorialFor(r)} className="p-1 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-violet-400" title="Historial de cambios"><History className="w-3 h-3" /></button>
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

      {kardexFor && (
        <KardexModal item={kardexFor} onClose={() => setKardexFor(null)} />
      )}

      {evidenciasFor && (
        <EvidenciasModal item={evidenciasFor} onClose={() => setEvidenciasFor(null)} />
      )}

      {historialFor && (
        <HistorialModal item={historialFor} onClose={() => setHistorialFor(null)} />
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

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL · Kardex de movimientos (entradas/salidas/ajustes/conteo + saldo)
// ═══════════════════════════════════════════════════════════════════════════════
const proyectarSaldo = (tipo: string, base: number, cant: number): number => {
  let r = base;
  if (tipo === "Entrada") r = base + cant;
  else if (tipo === "Salida") r = base - cant;
  else if (tipo === "Ajuste") r = base + cant;
  else if (tipo === "Conteo") r = cant;
  return Math.round(r * 100) / 100;
};
const fmtFechaHora = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso); return isNaN(d.getTime()) ? "—" : d.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
};

function KardexModal({ item, onClose }: { item: InventarioAuditado; onClose: () => void }) {
  const q = useMovimientos(item.id);
  const movs = q.data ?? [];
  const create = useCreateMovimiento();
  const remove = useDeleteMovimiento();

  const [f, setF] = useState({
    tipo: "Entrada", cantidad: "", motivo: "", referencia: "", responsable: "",
    fecha: isoToLocalInput(new Date().toISOString()), observaciones: "",
  });
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  // Saldo actual = saldoResultante del último movimiento, o el saldo/cantidad del ítem.
  const saldoActual = movs.length ? (movs[0].saldoResultante ?? 0) : (item.saldo ?? item.cantidad ?? 0);
  const proyectado = f.cantidad !== "" ? proyectarSaldo(f.tipo, saldoActual, num(f.cantidad)) : saldoActual;

  const registrar = async () => {
    if (f.cantidad === "" || isNaN(parseFloat(f.cantidad))) { setError("Ingresa la cantidad del movimiento."); return; }
    if (f.tipo !== "Ajuste" && num(f.cantidad) < 0) { setError("La cantidad no puede ser negativa (usa 'Ajuste' para restar)."); return; }
    setError("");
    try {
      await create.mutateAsync({
        itemId: item.id, tipo: f.tipo, cantidad: num(f.cantidad),
        motivo: f.motivo || undefined, referencia: f.referencia || undefined,
        responsable: f.responsable || undefined, observaciones: f.observaciones || undefined,
        fecha: f.fecha || undefined,
      });
      setF(p => ({ ...p, cantidad: "", motivo: "", referencia: "", observaciones: "" }));
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "No se pudo registrar el movimiento.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg flex items-center gap-2"><ArrowLeftRight className="w-5 h-5 text-violet-400" />Kardex de movimientos</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">{item.nombre} · {item.consecutivo}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider flex items-center gap-1 justify-end"><Wallet className="w-3 h-3" />Saldo actual</p>
              <p className="font-display text-xl font-bold text-violet-300 leading-tight">{nfmt(saldoActual, 2)}<span className="text-[10px] text-[#475569]"> {item.unidadMedida || ""}</span></p>
            </div>
            <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Registrar movimiento */}
          <div className="rounded-xl border border-[#1E2D4A] bg-[#0A111F] p-3 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Sel label="Tipo" value={f.tipo} onChange={v => set("tipo", v)} options={MOVIMIENTO_TIPOS as unknown as string[]} />
              <F label={f.tipo === "Conteo" ? "Cantidad contada" : "Cantidad"} value={f.cantidad} onChange={v => set("cantidad", v)} type="number" placeholder="0" />
              <F label="Fecha" value={f.fecha} onChange={v => set("fecha", v)} type="datetime-local" />
              <Calc label="Saldo proyectado" value={nfmt(proyectado, 2)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <F label="Motivo" value={f.motivo} onChange={v => set("motivo", v)} placeholder="Ej. Compra / consumo / conteo físico" />
              <F label="Referencia" value={f.referencia} onChange={v => set("referencia", v)} placeholder="Remisión / orden / doc." />
              <div>
                <label className="text-[10px] text-[#94A3B8] mb-1 block">Responsable</label>
                <input list="inv-auditors" value={f.responsable} onChange={e => set("responsable", e.target.value)} placeholder="Nombre" className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white" />
              </div>
            </div>
            {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{error}</p>}
            <div className="flex justify-end">
              <button onClick={registrar} disabled={create.isPending} className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50">
                {create.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Registrar movimiento
              </button>
            </div>
          </div>

          {/* Historial */}
          {q.isLoading ? (
            <div className="py-10 flex items-center justify-center text-[#475569]"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : movs.length === 0 ? (
            <div className="py-10 text-center text-[#475569] text-sm">Sin movimientos registrados. El saldo inicial es la cantidad del ítem.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#1E2D4A]">
              <table className="w-full text-sm">
                <thead className="bg-[#0D1526]">
                  <tr className="text-[10px] uppercase tracking-wider text-[#475569] border-b border-[#1E2D4A]">
                    <th className="text-left p-2.5">Fecha</th>
                    <th className="text-left p-2.5">Tipo</th>
                    <th className="text-right p-2.5">Cantidad</th>
                    <th className="text-right p-2.5">Saldo</th>
                    <th className="text-left p-2.5">Motivo · Ref.</th>
                    <th className="text-left p-2.5">Responsable</th>
                    <th className="text-center p-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {movs.map(m => {
                    const mc = MOVIMIENTO_COLOR[m.tipo] ?? "#94A3B8";
                    const signo = m.tipo === "Salida" ? "−" : m.tipo === "Entrada" ? "+" : "";
                    return (
                      <tr key={m.id} className="border-b border-[#1E2D4A]/50">
                        <td className="p-2.5 text-[#94A3B8] text-xs whitespace-nowrap">{fmtFechaHora(m.fecha)}</td>
                        <td className="p-2.5"><span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${mc}18`, color: mc, border: `1px solid ${mc}30` }}>{m.tipo}</span></td>
                        <td className="p-2.5 text-right font-mono text-xs" style={{ color: mc }}>{signo}{nfmt(m.cantidad, 2)}</td>
                        <td className="p-2.5 text-right font-mono text-xs text-[#94A3B8]">{nfmt(m.saldoAnterior ?? 0, 2)} → <span className="text-violet-300 font-semibold">{nfmt(m.saldoResultante ?? 0, 2)}</span></td>
                        <td className="p-2.5 text-[#94A3B8] text-xs">{m.motivo || "—"}{m.referencia ? <span className="text-[#475569]"> · {m.referencia}</span> : ""}</td>
                        <td className="p-2.5 text-[#94A3B8] text-xs">{m.responsable || "—"}</td>
                        <td className="p-2.5 text-center">
                          <button onClick={async () => { if (confirm("¿Eliminar este movimiento? El saldo se recalculará.")) { try { await remove.mutateAsync(m.id); } catch (e: any) { alert("Error: " + (e?.response?.data?.message ?? e?.message)); } } }} className="p-1 rounded hover:bg-red-950/30 text-[#94A3B8] hover:text-red-400" title="Eliminar movimiento"><Trash2 className="w-3 h-3" /></button>
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL · Evidencias (fotos/PDF/Excel/enlaces) — reutiliza evidencias-upload
// ═══════════════════════════════════════════════════════════════════════════════
function EvidenciasModal({ item, onClose }: { item: InventarioAuditado; onClose: () => void }) {
  const q = useEvidenciasInventario(item.id);
  const evid = q.data ?? [];
  const create = useCreateEvidenciaInventario();
  const remove = useDeleteEvidenciaInventario();
  const fileRef = useRef<HTMLInputElement>(null);
  const [modo, setModo] = useState<"subir" | "enlace">("subir");
  const [procesando, setProcesando] = useState(false);
  const [preview, setPreview] = useState("");
  const [form, setForm] = useState({ tipo: "Foto", nombre: "", categoria: EVIDENCIA_CATEGORIAS[0] as string, url: "", size: 0, dataUrl: "" });
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [error, setError] = useState("");
  const setF = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const onPick = async (file?: File) => {
    if (!file) return;
    setError(""); setProcesando(true);
    try {
      const { dataUrl, size, tipo } = await procesarArchivo(file);
      setForm(p => ({ ...p, dataUrl, size, tipo, nombre: p.nombre || file.name, url: "" }));
      setPreview(tipo === "Foto" ? dataUrl : "");
    } catch (e: any) { setError(e?.message ?? "No se pudo procesar el archivo."); }
    finally { setProcesando(false); }
  };

  const guardar = async () => {
    const url = modo === "subir" ? form.dataUrl : form.url.trim();
    if (!url) { setError(modo === "subir" ? "Selecciona un archivo." : "Pega un enlace válido."); return; }
    if (!form.nombre.trim()) { setError("Indica un nombre para la evidencia."); return; }
    setError("");
    try {
      await create.mutateAsync({ itemId: item.id, tipo: form.tipo, nombre: form.nombre.trim(), url, size: form.size || 0, categoria: form.categoria });
      setForm({ tipo: "Foto", nombre: "", categoria: EVIDENCIA_CATEGORIAS[0] as string, url: "", size: 0, dataUrl: "" });
      setPreview(""); if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) { setError(e?.response?.data?.message ?? e?.message ?? "No se pudo guardar."); }
  };

  const TAB = (id: "subir" | "enlace", label: string, Icon: any) => (
    <button onClick={() => setModo(id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${modo === id ? "bg-[#1A2540] text-white" : "text-[#94A3B8]"}`}><Icon className="w-3.5 h-3.5" />{label}</button>
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg flex items-center gap-2"><Camera className="w-5 h-5 text-cyan-400" />Evidencias</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">{item.nombre} · {item.consecutivo} · {evid.length} archivo(s)</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5" /></button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Cargar */}
          <div className="rounded-xl border border-[#1E2D4A] bg-[#0A111F] p-3 space-y-3">
            <div className="flex gap-2">{TAB("subir", "Subir archivo", UploadCloud)}{TAB("enlace", "Pegar enlace", Link2)}</div>
            {modo === "subir" ? (
              <div>
                <input ref={fileRef} type="file" accept="image/*,application/pdf,.xlsx,.xls,.csv,video/*" className="hidden" onChange={e => onPick(e.target.files?.[0])} />
                {preview ? (
                  <img src={preview} alt="Vista previa" className="w-full max-h-56 object-contain rounded-lg border border-[#1E2D4A] bg-[#0A111F]" />
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={procesando} className="w-full border-2 border-dashed border-[#1E2D4A] hover:border-cyan-500/50 rounded-lg py-6 flex flex-col items-center gap-2 text-[#94A3B8] hover:text-cyan-300">
                    {procesando ? <Loader2 className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
                    <span className="text-sm font-medium">{procesando ? "Procesando…" : "Haz clic para seleccionar un archivo"}</span>
                    <span className="text-[10px]">Imágenes (se optimizan), PDF, Excel · máx. 10 MB</span>
                  </button>
                )}
                {form.dataUrl && !preview && <p className="text-[11px] text-emerald-400 mt-2">Archivo listo ({form.tipo} · {fmtSize(form.size)})</p>}
              </div>
            ) : (
              <input value={form.url} onChange={e => setF("url", e.target.value)} placeholder="https://…" className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white" />
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <F label="Nombre" value={form.nombre} onChange={v => setF("nombre", v)} placeholder="Nombre de la evidencia" />
              <Sel label="Tipo" value={form.tipo} onChange={v => setF("tipo", v)} options={EVIDENCIA_TIPOS as unknown as string[]} />
              <Sel label="Categoría" value={form.categoria} onChange={v => setF("categoria", v)} options={EVIDENCIA_CATEGORIAS as unknown as string[]} />
            </div>
            {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{error}</p>}
            <div className="flex justify-end">
              <button onClick={guardar} disabled={create.isPending} className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50">
                {create.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Agregar evidencia
              </button>
            </div>
          </div>

          {/* Galería */}
          {q.isLoading ? (
            <div className="py-10 flex items-center justify-center text-[#475569]"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : evid.length === 0 ? (
            <div className="py-10 text-center text-[#475569] text-sm">Sin evidencias. Agrega la primera arriba.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {evid.map(e => {
                const img = esImagen({ tipo: e.tipo, url: e.url });
                return (
                  <div key={e.id} className="rounded-xl border border-[#1E2D4A] bg-[#0A111F] overflow-hidden">
                    {img ? (
                      <button onClick={() => setLightbox(imgSrc(e.url))} className="block w-full relative group">
                        <img src={imgSrc(e.url)} alt={e.nombre} className="w-full h-40 object-cover" />
                        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100"><Maximize2 className="w-5 h-5 text-white" /></span>
                      </button>
                    ) : (
                      <div className="w-full h-40 flex items-center justify-center bg-[#0D1526]"><FileText className="w-10 h-10 text-[#475569]" /></div>
                    )}
                    <div className="p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-white truncate">{e.nombre}</p>
                        <p className="text-[10px] text-[#94A3B8]">{e.categoria || e.tipo}{e.size ? ` · ${fmtSize(e.size)}` : ""}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <a href={imgSrc(e.url)} target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-cyan-400" title="Abrir"><ExternalLink className="w-3.5 h-3.5" /></a>
                        <a href={imgSrc(e.url)} download={e.nombre} className="p-1 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-white" title="Descargar"><Download className="w-3.5 h-3.5" /></a>
                        <button onClick={async () => { if (confirm(`¿Eliminar "${e.nombre}"?`)) { try { await remove.mutateAsync(e.id); } catch (er: any) { alert("Error: " + (er?.message)); } } }} className="p-1 rounded hover:bg-red-950/30 text-[#94A3B8] hover:text-red-400" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[60] flex items-center justify-center p-6" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Evidencia" className="max-w-full max-h-full object-contain rounded-lg" />
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightbox(null)}><X className="w-6 h-6" /></button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL · Historial de cambios (auditoría)
// ═══════════════════════════════════════════════════════════════════════════════
const ACCION_META_INV: Record<string, { color: string; icon: any }> = {
  "Creación":            { color: "#22C55E", icon: PlusCircle },
  "Edición":             { color: "#3B82F6", icon: PencilLine },
  "Cambio de estado":    { color: "#F59E0B", icon: ArrowRightLeft },
  "Movimiento":          { color: "#8B5CF6", icon: ArrowLeftRight },
  "Evidencia agregada":  { color: "#06B6D4", icon: Camera },
  "Evidencia eliminada": { color: "#EF4444", icon: Trash2 },
};

function HistorialModal({ item, onClose }: { item: InventarioAuditado; onClose: () => void }) {
  const q = useAuditoriaInventario(item.id);
  const eventos = q.data ?? [];
  const fmt = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? "—" : d.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }); };
  const parse = (json?: string | null): CambioCampoInv[] => { try { return json ? JSON.parse(json) : []; } catch { return []; } };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg flex items-center gap-2"><History className="w-5 h-5 text-violet-400" />Historial de cambios</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">{item.nombre} · {item.consecutivo} · {eventos.length} evento(s)</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5" /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {q.isLoading ? (
            <div className="py-16 flex items-center justify-center text-[#475569]"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : eventos.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <History className="w-10 h-10 text-[#1E2D4A] mb-3" />
              <p className="text-white font-semibold mb-1">Sin eventos registrados</p>
              <p className="text-[#475569] text-sm">Los cambios sobre este ítem se irán registrando aquí.</p>
            </div>
          ) : (
            <ol className="relative border-l border-[#1E2D4A] ml-2 space-y-4">
              {eventos.map(ev => {
                const meta = ACCION_META_INV[ev.accion] ?? { color: "#94A3B8", icon: History };
                const Icon = meta.icon;
                const cambios = parse(ev.cambiosJSON);
                return (
                  <li key={ev.id} className="ml-5">
                    <span className="absolute -left-[9px] flex items-center justify-center w-[18px] h-[18px] rounded-full" style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}` }}>
                      <Icon className="w-2.5 h-2.5" style={{ color: meta.color }} />
                    </span>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: meta.color }}>{ev.accion}</span>
                      <span className="text-[10px] text-[#64748B] font-mono">{fmt(ev.createdAt)}</span>
                    </div>
                    {ev.detalle && <p className="text-xs text-[#94A3B8] mt-0.5">{ev.detalle}</p>}
                    {ev.usuario && <p className="text-[10px] text-[#475569] mt-0.5">por {ev.usuario}</p>}
                    {cambios.length > 0 && (
                      <div className="mt-2 rounded-lg border border-[#1E2D4A] bg-[#0A111F] divide-y divide-[#1E2D4A]/60">
                        {cambios.map((c, i) => (
                          <div key={i} className="px-3 py-1.5 text-[11px] flex items-center gap-2 flex-wrap">
                            <span className="text-[#94A3B8] min-w-[120px]">{INVENTARIO_CAMPO_LABELS[c.campo] ?? c.campo}</span>
                            <span className="text-red-300/80 line-through break-all">{c.antes}</span>
                            <ArrowRightLeft className="w-3 h-3 text-[#475569] shrink-0" />
                            <span className="text-emerald-300 break-all">{c.despues}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
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
