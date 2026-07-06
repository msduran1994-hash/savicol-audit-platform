"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// EDITOR de Anexos Técnicos del hallazgo — 5 pestañas opcionales con tablas
// dinámicas (agregar/editar/eliminar filas) y cálculos automáticos en vivo.
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  AnexosTecnicos, TotalBultosBloque,
  num, difConteoPicos, totalRecepcion, totalInvBultos, pesoTotalIngreso,
  subtotalBloque, cantidadBloque, totalGeneralBultos,
} from "@/lib/anexos-tecnicos";

const TABS = [
  { key: "actaConteoPicos",  label: "Acta Conteo de Picos" },
  { key: "recepcionAves",    label: "Recepción de Aves" },
  { key: "inventarioBultos", label: "Inventario Bultos" },
  { key: "ingresoBultos",    label: "Ingreso de Bultos" },
  { key: "totalBultos",      label: "Total de Bultos" },
] as const;
type TabKey = typeof TABS[number]["key"];
type SimpleKey = "actaConteoPicos" | "recepcionAves" | "inventarioBultos" | "ingresoBultos";

const INP = "w-full px-2 py-1 bg-[#0A111F] border border-[#1E2D4A] rounded text-xs text-white focus:outline-none focus:border-[#4A7AFF]";
const fmt = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 2 });

type Col = { key: string; label: string; type?: "text" | "number" | "date"; calc?: (r: any) => number };

export function AnexosTecnicosEditor({ value, onChange }: { value: AnexosTecnicos; onChange: (a: AnexosTecnicos) => void }) {
  const [tab, setTab] = useState<TabKey>("actaConteoPicos");
  const set = (patch: Partial<AnexosTecnicos>) => onChange({ ...value, ...patch });

  // ── Tablas simples (4 pestañas) ─────────────────────────────────────────────
  const addRow = (k: SimpleKey, row: any) => set({ [k]: [...(value[k] as any[]), row] } as any);
  const editRow = (k: SimpleKey, i: number, patch: any) => set({ [k]: (value[k] as any[]).map((r, idx) => idx === i ? { ...r, ...patch } : r) } as any);
  const delRow = (k: SimpleKey, i: number) => set({ [k]: (value[k] as any[]).filter((_, idx) => idx !== i) } as any);

  function SimpleTable({ k, cols, emptyRow, totalCol }: { k: SimpleKey; cols: Col[]; emptyRow: any; totalCol?: { label: string; calc: (r: any) => number } }) {
    const rows = value[k] as any[];
    const total = totalCol ? rows.reduce((a, r) => a + totalCol.calc(r), 0) : 0;
    return (
      <div>
        <div className="overflow-x-auto rounded-lg border border-[#1E2D4A]">
          <table className="w-full text-xs">
            <thead><tr className="bg-[#0A111F] text-[#94A3B8]">
              {cols.map(c => <th key={c.key} className="px-2 py-1.5 text-left font-semibold">{c.label}</th>)}
              <th className="w-8"></th>
            </tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={cols.length + 1} className="px-2 py-3 text-center text-[#475569]">Sin registros. Usa "Agregar fila".</td></tr>}
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-[#1E2D4A]">
                  {cols.map(c => (
                    <td key={c.key} className="px-2 py-1">
                      {c.calc
                        ? <span className="text-[#22C55E] font-semibold">{fmt(c.calc(r))}</span>
                        : <input type={c.type || "text"} step="any" value={r[c.key] ?? ""} onChange={e => editRow(k, i, { [c.key]: e.target.value })} className={INP} />}
                    </td>
                  ))}
                  <td className="px-1 text-center">
                    <button type="button" onClick={() => delRow(k, i)} className="text-[#94A3B8] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            {totalCol && rows.length > 0 && (
              <tfoot><tr className="border-t border-[#2A3F6A] bg-[#0A111F]">
                <td colSpan={cols.length - 1} className="px-2 py-1.5 text-right font-semibold text-[#94A3B8]">{totalCol.label}</td>
                <td className="px-2 py-1.5 font-bold text-[#22C55E]">{fmt(total)}</td><td></td>
              </tr></tfoot>
            )}
          </table>
        </div>
        <button type="button" onClick={() => addRow(k, emptyRow)} className="mt-2 px-3 py-1.5 rounded-lg text-xs bg-[#1A2540] text-white flex items-center gap-1.5 hover:bg-[#22304d]">
          <Plus className="w-3.5 h-3.5" />Agregar fila
        </button>
      </div>
    );
  }

  // ── Pestaña 5: Total de Bultos (múltiples bloques) ──────────────────────────
  const tb = value.totalBultos;
  const setTB = (patch: Partial<typeof tb>) => set({ totalBultos: { ...tb, ...patch } });
  const editBloque = (bi: number, patch: Partial<TotalBultosBloque>) => setTB({ bloques: tb.bloques.map((b, i) => i === bi ? { ...b, ...patch } : b) });
  const editFila = (bi: number, fi: number, patch: any) => editBloque(bi, { filas: tb.bloques[bi].filas.map((f, i) => i === fi ? { ...f, ...patch } : f) });

  return (
    <div className="space-y-3">
      {/* Barra de pestañas */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(t => {
          const activo = tab === t.key;
          const n = t.key === "totalBultos" ? tb.bloques.length : (value[t.key] as any[]).length;
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${activo ? "bg-[#4A7AFF]/15 text-[#4A7AFF] border-[#4A7AFF]/40" : "bg-[#0A111F] text-[#94A3B8] border-[#1E2D4A] hover:text-white"}`}>
              {t.label}{n > 0 ? ` (${n})` : ""}
            </button>
          );
        })}
      </div>

      {tab === "actaConteoPicos" && (
        <SimpleTable k="actaConteoPicos"
          cols={[
            { key: "fechaConteo", label: "Fecha Conteo", type: "date" },
            { key: "reporteConteo", label: "Reporte Conteo", type: "number" },
            { key: "reporteFisico", label: "Reporte Físico", type: "number" },
            { key: "_dif", label: "Diferencia", calc: difConteoPicos },
          ]}
          emptyRow={{ fechaConteo: "", reporteConteo: 0, reporteFisico: 0 }} />
      )}

      {tab === "recepcionAves" && (
        <SimpleTable k="recepcionAves"
          cols={[
            { key: "fecha", label: "Fecha", type: "date" },
            { key: "machos", label: "Machos", type: "number" },
            { key: "hembras", label: "Hembras", type: "number" },
            { key: "_tot", label: "Total", calc: totalRecepcion },
          ]}
          emptyRow={{ fecha: "", machos: 0, hembras: 0 }}
          totalCol={{ label: "Total aves recibidas", calc: totalRecepcion }} />
      )}

      {tab === "inventarioBultos" && (
        <SimpleTable k="inventarioBultos"
          cols={[
            { key: "galpon", label: "N° Galpón", type: "text" },
            { key: "bultos", label: "Bultos", type: "number" },
            { key: "lonas", label: "Lonas", type: "number" },
            { key: "_tot", label: "Total", calc: totalInvBultos },
          ]}
          emptyRow={{ galpon: "", bultos: 0, lonas: 0 }}
          totalCol={{ label: "Total (bultos + lonas)", calc: totalInvBultos }} />
      )}

      {tab === "ingresoBultos" && (
        <SimpleTable k="ingresoBultos"
          cols={[
            { key: "fecha", label: "Fecha", type: "date" },
            { key: "concepto", label: "Concepto", type: "text" },
            { key: "unidades", label: "Unidades", type: "number" },
            { key: "cantidadKg", label: "Cantidad (Kg)", type: "number" },
            { key: "_peso", label: "Peso Total Kg", calc: pesoTotalIngreso },
          ]}
          emptyRow={{ fecha: "", concepto: "", unidades: 0, cantidadKg: 0 }}
          totalCol={{ label: "Peso total (Kg)", calc: pesoTotalIngreso }} />
      )}

      {tab === "totalBultos" && (
        <div className="space-y-3">
          {tb.bloques.length === 0 && <p className="text-[11px] text-[#475569]">Sin bloques. Usa "Agregar bloque".</p>}
          {tb.bloques.map((b, bi) => (
            <div key={bi} className="rounded-lg border border-[#1E2D4A] p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input value={b.titulo ?? ""} onChange={e => editBloque(bi, { titulo: e.target.value })} placeholder={`Bloque ${bi + 1} — concepto/título`} className={INP + " flex-1"} />
                <button type="button" onClick={() => setTB({ bloques: tb.bloques.filter((_, i) => i !== bi) })} className="text-[#94A3B8] hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="overflow-x-auto rounded border border-[#1E2D4A]">
                <table className="w-full text-xs">
                  <thead><tr className="bg-[#0A111F] text-[#94A3B8]"><th className="px-2 py-1 text-left">Concepto</th><th className="px-2 py-1 text-left">Cantidad</th><th className="px-2 py-1 text-left">Peso Total Kg</th><th className="w-8"></th></tr></thead>
                  <tbody>
                    {b.filas.map((f, fi) => (
                      <tr key={fi} className="border-t border-[#1E2D4A]">
                        <td className="px-2 py-1"><input value={f.concepto ?? ""} onChange={e => editFila(bi, fi, { concepto: e.target.value })} className={INP} /></td>
                        <td className="px-2 py-1"><input type="number" step="any" value={f.cantidad ?? ""} onChange={e => editFila(bi, fi, { cantidad: e.target.value })} className={INP} /></td>
                        <td className="px-2 py-1"><input type="number" step="any" value={f.pesoTotalKg ?? ""} onChange={e => editFila(bi, fi, { pesoTotalKg: e.target.value })} className={INP} /></td>
                        <td className="px-1 text-center"><button type="button" onClick={() => editBloque(bi, { filas: b.filas.filter((_, i) => i !== fi) })} className="text-[#94A3B8] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="border-t border-[#2A3F6A] bg-[#0A111F]">
                    <td className="px-2 py-1 text-right font-semibold text-[#94A3B8]">Subtotal · {fmt(cantidadBloque(b))} und</td>
                    <td colSpan={2} className="px-2 py-1 font-bold text-[#22C55E]">{fmt(subtotalBloque(b))} Kg</td><td></td>
                  </tr></tfoot>
                </table>
              </div>
              <button type="button" onClick={() => editBloque(bi, { filas: [...b.filas, { concepto: "", cantidad: 0, pesoTotalKg: 0 }] })} className="px-3 py-1 rounded text-[11px] bg-[#1A2540] text-white flex items-center gap-1 hover:bg-[#22304d]"><Plus className="w-3 h-3" />Agregar fila</button>
            </div>
          ))}
          <button type="button" onClick={() => setTB({ bloques: [...tb.bloques, { titulo: "", filas: [] }] })} className="px-3 py-1.5 rounded-lg text-xs bg-[#1A2540] text-white flex items-center gap-1.5 hover:bg-[#22304d]"><Plus className="w-3.5 h-3.5" />Agregar bloque</button>

          {/* Totales de toda la tabla */}
          <div className="rounded-lg border border-[#2A3F6A] bg-[#0A111F] p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94A3B8] font-semibold">Total General</span>
              <span className="text-[#22C55E] font-bold text-sm">{fmt(totalGeneralBultos(tb))} Kg</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#94A3B8] w-24 shrink-0">Diferencias</span>
              <input type="number" step="any" value={tb.diferencias ?? ""} onChange={e => setTB({ diferencias: num(e.target.value) })} className={INP} />
            </div>
            <div>
              <span className="text-[11px] text-[#94A3B8] mb-1 block">Observaciones</span>
              <textarea value={tb.observaciones ?? ""} onChange={e => setTB({ observaciones: e.target.value })} rows={2} className={INP + " resize-none"} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
