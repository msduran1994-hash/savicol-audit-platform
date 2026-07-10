"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// EDITOR de Anexos Técnicos del hallazgo — 5 pestañas opcionales con tablas
// dinámicas (agregar/editar/eliminar filas) y cálculos automáticos en vivo.
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  AnexosTecnicos, TotalBultosBloque,
  difConteoPicos, totalRecepcion, totalInvBultos, pesoTotalIngreso,
  subtotalBloque, cantidadBloque, totalGeneralBultos,
  totalReporteConteo, totalReporteFisico, faltanteConciliacion,
  pctMortalidad, avesRecibidasTotal, num,
  calcMortalidadDiaria, calcBultosConsumidos,
  resumenMortalidadDiaria, resumenBultosConsumidos, resumenRecepcionAves, resumenIngresoBultos, safeResumen,
} from "@/lib/anexos-tecnicos";
import { ResumenEjecutivoPanel } from "./resumen-ejecutivo-panel";

const TABS = [
  { key: "actaConteoPicos",  label: "Acta Conteo de Picos" },
  { key: "recepcionAves",    label: "Recepción de Aves" },
  { key: "inventarioBultos", label: "Inventario Bultos" },
  { key: "ingresoBultos",    label: "Ingreso de Bultos" },
  { key: "totalBultos",      label: "Total de Bultos" },
  { key: "mortalidadDiaria", label: "Mortalidad Diaria" },
  { key: "bultosConsumidos", label: "Bultos Consumidos" },
] as const;
type TabKey = typeof TABS[number]["key"];
type SimpleKey = "actaConteoPicos" | "recepcionAves" | "inventarioBultos" | "ingresoBultos";

const INP = "w-full px-2 py-1 bg-[#0A111F] border border-[#1E2D4A] rounded text-xs text-white focus:outline-none focus:border-[#4A7AFF]";
// Campo de solo lectura (valor calculado automáticamente).
const RO = "w-full px-2 py-1 bg-[#0D1526] border border-[#1E2D4A] rounded text-xs flex items-center justify-between gap-2";
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

  // Resumen de "Recepción de Aves" (conciliación saldo vs mortalidad)
  const res = value.recepcionAvesResumen;
  const setRes = (patch: Partial<typeof res>) => set({ recepcionAvesResumen: { ...res, ...patch } });

  // ── Pestañas 6 y 7: registros semanales (mortalidad diaria / bultos consumidos) ──
  const md: any = value.registroMortalidadDiaria;
  const setMD = (patch: any) => set({ registroMortalidadDiaria: { ...md, ...patch } });
  const setMDDia = (w: number, d: number, v: string) => setMD({ semanas: md.semanas.map((sem: any[], wi: number) => wi === w ? sem.map((c, di) => di === d ? v : c) : sem) });
  const bc: any = value.registroBultosConsumidos;
  const setBC = (patch: any) => set({ registroBultosConsumidos: { ...bc, ...patch } });
  const setBCDia = (w: number, d: number, v: string) => setBC({ semanas: bc.semanas.map((sem: any[], wi: number) => wi === w ? sem.map((c, di) => di === d ? v : c) : sem) });
  const nuevaSemana = () => ["", "", "", "", "", "", ""];

  // Bloque semanal reutilizable (encabezado + botón eliminar). Se llama como función (foco estable).
  function SemanaCard(key: any, titulo: string, onDel: () => void, children: any) {
    return (
      <div key={key} className="rounded-lg border border-[#1E2D4A] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#4A7AFF]">{titulo}</span>
          <button type="button" onClick={onDel} className="text-[#94A3B8] hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    );
  }

  function MortalidadDiariaTab() {
    const calc = calcMortalidadDiaria(md);
    const recibidas = avesRecibidasTotal(value);
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-[#2A3F6A] bg-[#0A111F] p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-[#94A3B8] shrink-0">Aves iniciales (encasetadas)</span>
            <input type="number" step="any" value={md.avesIniciales || ""} onChange={e => setMD({ avesIniciales: e.target.value })} placeholder={recibidas > 0 ? String(recibidas) : "Ej: 20000"} className={INP + " max-w-[160px]"} />
            {recibidas > 0 && <button type="button" onClick={() => setMD({ avesIniciales: recibidas })} className="px-2 py-1 rounded text-[10px] bg-[#1A2540] text-[#4A7AFF] hover:bg-[#22304d]">Usar aves recibidas ({fmt(recibidas)})</button>}
          </div>
          {num(md.avesIniciales) <= 0 && <p className="text-[10px] text-amber-400 mt-1.5">Ingresa las aves iniciales para calcular % y saldo de aves.</p>}
        </div>
        {md.semanas.length === 0 && <p className="text-[11px] text-[#475569]">Sin semanas. Usa "Agregar semana".</p>}
        {calc.semanas.map(sem => SemanaCard(sem.semana, `Semana ${sem.semana}`,
          () => setMD({ semanas: md.semanas.filter((_: any, wi: number) => wi !== sem.semana - 1) }),
          <div className="overflow-x-auto rounded border border-[#1E2D4A]">
            <table className="w-full text-xs">
              <thead><tr className="bg-[#0A111F] text-[#94A3B8]">
                <th className="px-2 py-1 text-left">Día</th><th className="px-2 py-1 text-left">Mortalidad</th>
                <th className="px-2 py-1 text-left">Acumulado</th><th className="px-2 py-1 text-left">% Acum.</th><th className="px-2 py-1 text-left">Saldo aves</th>
              </tr></thead>
              <tbody>
                {sem.dias.map(d => (
                  <tr key={d.dia} className="border-t border-[#1E2D4A]">
                    <td className="px-2 py-1 text-[#94A3B8]">Día {d.diaGlobal}</td>
                    <td className="px-2 py-1"><input type="number" step="any" value={md.semanas[sem.semana - 1][d.dia - 1] ?? ""} onChange={e => setMDDia(sem.semana - 1, d.dia - 1, e.target.value)} className={INP} /></td>
                    <td className="px-2 py-1 text-[#22C55E] font-semibold">{fmt(d.totalAcumulado)}</td>
                    <td className="px-2 py-1">{d.pctAcumulado === null ? "—" : d.pctAcumulado.toFixed(2) + "%"}</td>
                    <td className="px-2 py-1">{calc.aves > 0 ? fmt(d.saldo) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t border-[#2A3F6A] bg-[#0A111F]">
                <td className="px-2 py-1 text-right font-semibold text-[#94A3B8]">Total semana</td>
                <td className="px-2 py-1 font-bold text-[#22C55E]">{fmt(sem.totalSemanal)}</td>
                <td className="px-2 py-1"></td>
                <td className="px-2 py-1 font-bold" colSpan={2}>% semanal: {sem.pctSemanal === null ? "—" : sem.pctSemanal.toFixed(2) + "%"}</td>
              </tr></tfoot>
            </table>
          </div>
        ))}
        <button type="button" onClick={() => setMD({ semanas: [...md.semanas, nuevaSemana()] })} className="px-3 py-1.5 rounded-lg text-xs bg-[#1A2540] text-white flex items-center gap-1.5 hover:bg-[#22304d]"><Plus className="w-3.5 h-3.5" />Agregar semana</button>
        {calc.semanas.length > 0 && (
          <div className="rounded-lg border border-[#2A3F6A] bg-[#0A111F] p-3 grid grid-cols-3 gap-2 text-center">
            <div><div className="text-[10px] text-[#94A3B8]">Mortalidad total</div><div className="text-sm font-bold text-[#EF4444]">{fmt(calc.totalGeneral)}</div></div>
            <div><div className="text-[10px] text-[#94A3B8]">% acumulado</div><div className="text-sm font-bold text-[#F97316]">{calc.pctAcumuladoFinal === null ? "—" : calc.pctAcumuladoFinal.toFixed(2) + "%"}</div></div>
            <div><div className="text-[10px] text-[#94A3B8]">Saldo final</div><div className="text-sm font-bold text-[#22C55E]">{calc.aves > 0 ? fmt(calc.saldoFinal) : "—"}</div></div>
          </div>
        )}
        <ResumenEjecutivoPanel resumen={safeResumen(() => resumenMortalidadDiaria(md))} />
      </div>
    );
  }

  function BultosConsumidosTab() {
    const calc = calcBultosConsumidos(bc, md, avesRecibidasTotal(value));
    const sinBase = num(md.avesIniciales) <= 0 && avesRecibidasTotal(value) <= 0;
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-[#2A3F6A] bg-[#0A111F] p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-[#94A3B8] shrink-0">Kg por bulto</span>
            <input type="number" step="any" value={bc.kgPorBulto ?? ""} onChange={e => setBC({ kgPorBulto: e.target.value })} placeholder="40" className={INP + " max-w-[120px]"} />
            <span className="text-[10px] text-[#475569]">Consumo/ave = (bultos × kg) ÷ saldo de aves vivas del día</span>
          </div>
          {sinBase && <p className="text-[10px] text-amber-400 mt-1.5">Define las aves iniciales (pestaña Mortalidad Diaria) o registra la recepción de aves para calcular el consumo por ave.</p>}
        </div>
        {bc.semanas.length === 0 && <p className="text-[11px] text-[#475569]">Sin semanas. Usa "Agregar semana".</p>}
        {calc.semanas.map(sem => SemanaCard(sem.semana, `Semana ${sem.semana}`,
          () => setBC({ semanas: bc.semanas.filter((_: any, wi: number) => wi !== sem.semana - 1) }),
          <div className="overflow-x-auto rounded border border-[#1E2D4A]">
            <table className="w-full text-xs">
              <thead><tr className="bg-[#0A111F] text-[#94A3B8]">
                <th className="px-2 py-1 text-left">Día</th><th className="px-2 py-1 text-left">Bultos</th>
                <th className="px-2 py-1 text-left">Acumulado</th><th className="px-2 py-1 text-left">Saldo aves</th><th className="px-2 py-1 text-left">Consumo/ave (kg)</th>
              </tr></thead>
              <tbody>
                {sem.dias.map(d => (
                  <tr key={d.dia} className="border-t border-[#1E2D4A]">
                    <td className="px-2 py-1 text-[#94A3B8]">Día {d.diaGlobal}</td>
                    <td className="px-2 py-1"><input type="number" step="any" value={bc.semanas[sem.semana - 1][d.dia - 1] ?? ""} onChange={e => setBCDia(sem.semana - 1, d.dia - 1, e.target.value)} className={INP} /></td>
                    <td className="px-2 py-1 text-[#22C55E] font-semibold">{fmt(d.totalAcumulado)}</td>
                    <td className="px-2 py-1">{d.saldoVivo > 0 ? fmt(d.saldoVivo) : "—"}</td>
                    <td className="px-2 py-1 text-[#8B5CF6] font-semibold">{d.consumoAveDia === null ? "—" : fmt(d.consumoAveDia)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t border-[#2A3F6A] bg-[#0A111F]">
                <td className="px-2 py-1 text-right font-semibold text-[#94A3B8]">Total semana</td>
                <td className="px-2 py-1 font-bold text-[#22C55E]">{fmt(sem.totalBultos)}</td>
                <td className="px-2 py-1"></td>
                <td className="px-2 py-1 font-bold" colSpan={2}>Sem/ave: {sem.consumoSemanalAve === null ? "—" : fmt(sem.consumoSemanalAve)} kg · Acum/ave: {sem.consumoAcumuladoAve === null ? "—" : fmt(sem.consumoAcumuladoAve)} kg</td>
              </tr></tfoot>
            </table>
          </div>
        ))}
        <button type="button" onClick={() => setBC({ semanas: [...bc.semanas, nuevaSemana()] })} className="px-3 py-1.5 rounded-lg text-xs bg-[#1A2540] text-white flex items-center gap-1.5 hover:bg-[#22304d]"><Plus className="w-3.5 h-3.5" />Agregar semana</button>
        {calc.semanas.length > 0 && (
          <div className="rounded-lg border border-[#2A3F6A] bg-[#0A111F] p-3 grid grid-cols-3 gap-2 text-center">
            <div><div className="text-[10px] text-[#94A3B8]">Total bultos</div><div className="text-sm font-bold text-[#4A7AFF]">{fmt(calc.totalBultos)}</div></div>
            <div><div className="text-[10px] text-[#94A3B8]">Total kg</div><div className="text-sm font-bold text-[#0EA5E9]">{fmt(calc.totalKg)}</div></div>
            <div><div className="text-[10px] text-[#94A3B8]">Consumo/ave (kg)</div><div className="text-sm font-bold text-[#8B5CF6]">{calc.consumoAcumuladoAveFinal === null ? "—" : fmt(calc.consumoAcumuladoAveFinal)}</div></div>
          </div>
        )}
        <ResumenEjecutivoPanel resumen={safeResumen(() => resumenBultosConsumidos(bc, md, avesRecibidasTotal(value)))} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Barra de pestañas */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(t => {
          const activo = tab === t.key;
          const n = t.key === "totalBultos" ? tb.bloques.length
            : t.key === "mortalidadDiaria" ? value.registroMortalidadDiaria.semanas.length
            : t.key === "bultosConsumidos" ? value.registroBultosConsumidos.semanas.length
            : (value[t.key] as any[]).length;
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${activo ? "bg-[#4A7AFF]/15 text-[#4A7AFF] border-[#4A7AFF]/40" : "bg-[#0A111F] text-[#94A3B8] border-[#1E2D4A] hover:text-white"}`}>
              {t.label}{n > 0 ? ` (${n})` : ""}
            </button>
          );
        })}
      </div>

      {tab === "actaConteoPicos" && SimpleTable({
        k: "actaConteoPicos",
        cols: [
          { key: "fechaConteo", label: "Fecha Conteo", type: "date" },
          { key: "reporteConteo", label: "Reporte Conteo", type: "number" },
          { key: "reporteFisico", label: "Reporte Físico", type: "number" },
          { key: "_dif", label: "Diferencia", calc: difConteoPicos },
        ],
        emptyRow: { fechaConteo: "", reporteConteo: "", reporteFisico: "" },
      })}

      {tab === "recepcionAves" && (
        <div className="space-y-3">
          {SimpleTable({
            k: "recepcionAves",
            cols: [
              { key: "fecha", label: "Fecha", type: "date" },
              { key: "machos", label: "Machos", type: "number" },
              { key: "hembras", label: "Hembras", type: "number" },
              { key: "_tot", label: "Total", calc: totalRecepcion },
            ],
            emptyRow: { fecha: "", machos: "", hembras: "" },
            totalCol: { label: "Total aves recibidas", calc: totalRecepcion },
          })}
          {/* Conciliación de saldo de aves — 3 totales automáticos (del Acta Conteo de Picos) + 1 manual */}
          <div className="rounded-lg border border-[#2A3F6A] bg-[#0A111F] p-3 space-y-2">
            <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Conciliación de saldo de aves</div>
            <div className="grid grid-cols-2 gap-2">
              {/* Reporte acta conteo de picos = Σ "Reporte conteo" (automático) */}
              <div>
                <span className="text-[10px] text-[#94A3B8] mb-1 block">Reporte acta conteo de picos</span>
                <div className={RO}><span className="text-[#22C55E] font-semibold">{fmt(totalReporteConteo(value))}</span><span className="text-[9px] text-[#475569]">Σ Reporte conteo</span></div>
              </div>
              {/* Reporte saldo de aves = manual */}
              <div>
                <span className="text-[10px] text-[#94A3B8] mb-1 block">Reporte saldo de aves</span>
                <input type="number" step="any" value={(res.reporteSaldoAves as any) || ""} onChange={e => setRes({ reporteSaldoAves: e.target.value } as any)} className={INP} />
              </div>
              {/* Saldo identificado de aves = Σ "Reporte físico" (automático) */}
              <div>
                <span className="text-[10px] text-[#94A3B8] mb-1 block">Saldo identificado de aves</span>
                <div className={RO}><span className="text-[#22C55E] font-semibold">{fmt(totalReporteFisico(value))}</span><span className="text-[9px] text-[#475569]">Σ Reporte físico</span></div>
              </div>
              {/* Faltante aves al corte = Reporte conteo − Saldo identificado (automático) */}
              <div>
                <span className="text-[10px] text-[#94A3B8] mb-1 block">Faltante aves al corte</span>
                <div className={RO}><span className="font-semibold" style={{ color: faltanteConciliacion(value) !== 0 ? "#F97316" : "#22C55E" }}>{fmt(faltanteConciliacion(value))}</span><span className="text-[9px] text-[#475569]">conteo − identificado</span></div>
              </div>
            </div>
            <div className="flex items-center justify-between px-1 pt-2 border-t border-[#1E2D4A]">
              <span className="text-[11px] text-[#94A3B8]">Diferencia (Reporte conteo − Saldo identificado)</span>
              <span className="text-sm font-bold" style={{ color: faltanteConciliacion(value) !== 0 ? "#EF4444" : "#22C55E" }}>{fmt(faltanteConciliacion(value))}</span>
            </div>
            {/* % Mortalidad (indicador principal) = (aves recibidas − saldo) / aves recibidas */}
            <div className="flex items-center justify-between rounded-lg bg-[#0D1526] border border-[#4A7AFF]/30 px-3 py-2">
              <div>
                <div className="text-[10px] text-[#94A3B8] uppercase tracking-wide">% Mortalidad</div>
                <div className="text-[9px] text-[#475569]">(aves recibidas − reporte saldo) ÷ aves recibidas · {fmt(avesRecibidasTotal(value))} recibidas</div>
              </div>
              {pctMortalidad(value) === null
                ? <span className="text-[11px] text-amber-400">Requiere aves recibidas &gt; 0</span>
                : <span className="text-2xl font-bold" style={{ color: pctMortalidad(value)! >= 8 ? "#EF4444" : pctMortalidad(value)! >= 4 ? "#F97316" : "#22C55E" }}>{pctMortalidad(value)!.toFixed(2)}%</span>}
            </div>
          </div>
          <ResumenEjecutivoPanel resumen={safeResumen(() => resumenRecepcionAves(value))} />
        </div>
      )}

      {tab === "inventarioBultos" && SimpleTable({
        k: "inventarioBultos",
        cols: [
          { key: "galpon", label: "N° Galpón", type: "text" },
          { key: "bultos", label: "Bultos", type: "number" },
          { key: "lonas", label: "Lonas", type: "number" },
          { key: "_tot", label: "Total", calc: totalInvBultos },
        ],
        emptyRow: { galpon: "", bultos: "", lonas: "" },
        totalCol: { label: "Total (bultos + lonas)", calc: totalInvBultos },
      })}

      {tab === "ingresoBultos" && (
        <div className="space-y-3">
          {SimpleTable({
            k: "ingresoBultos",
            cols: [
              { key: "fecha", label: "Fecha", type: "date" },
              { key: "concepto", label: "Concepto", type: "text" },
              { key: "unidades", label: "Unidades", type: "number" },
              { key: "cantidadKg", label: "Cantidad (Kg)", type: "number" },
              { key: "_peso", label: "Peso Total Kg", calc: pesoTotalIngreso },
            ],
            emptyRow: { fecha: "", concepto: "", unidades: "", cantidadKg: "" },
            totalCol: { label: "Peso total (Kg)", calc: pesoTotalIngreso },
          })}
          <ResumenEjecutivoPanel resumen={safeResumen(() => resumenIngresoBultos(value))} />
        </div>
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
              <button type="button" onClick={() => editBloque(bi, { filas: [...b.filas, { concepto: "", cantidad: "", pesoTotalKg: "" } as any] })} className="px-3 py-1 rounded text-[11px] bg-[#1A2540] text-white flex items-center gap-1 hover:bg-[#22304d]"><Plus className="w-3 h-3" />Agregar fila</button>
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
              <input type="number" step="any" value={(tb.diferencias as any) || ""} onChange={e => setTB({ diferencias: e.target.value as any })} className={INP} />
            </div>
            <div>
              <span className="text-[11px] text-[#94A3B8] mb-1 block">Observaciones</span>
              <textarea value={tb.observaciones ?? ""} onChange={e => setTB({ observaciones: e.target.value })} rows={2} className={INP + " resize-none"} />
            </div>
          </div>
        </div>
      )}

      {tab === "mortalidadDiaria" && MortalidadDiariaTab()}
      {tab === "bultosConsumidos" && BultosConsumidosTab()}
    </div>
  );
}
