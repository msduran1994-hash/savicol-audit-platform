"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// RESUMEN EJECUTIVO · Bloque "Inventarios" (Fase 9 — integración)
// Consolida la hoja Inventarios en el Resumen Ejecutivo leyendo la MISMA fuente
// (useInventarios), sin duplicar datos ni lógica de negocio.
// ═══════════════════════════════════════════════════════════════════════════════
import { useMemo } from "react";
import { useInventarios } from "@/hooks/useInventarios";
import { INVENTARIO_MODULOS } from "@/lib/inventarios.constants";
import { barLabelPct, sumField } from "@/lib/chart-pct";
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from "recharts";
import { Boxes, BarChart3, AlertTriangle } from "lucide-react";

const AUDITADO = ["Auditado", "Conciliado", "Cerrado"];
const PENDIENTE = ["Registrado", "En conteo"];
const fNum = (n: number) => (n ?? 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });
const moduloCorto = (k: string) => (INVENTARIO_MODULOS.find(m => m.key === k)?.label ?? k).replace(/^Inventario de |^Almacén de /, "");

export function SeccionInventarios() {
  const q = useInventarios({});
  const rows = q.data ?? [];

  const d = useMemo(() => {
    const total = rows.length;
    const valorTotal = rows.reduce((s, r) => s + (r.valorTotal || 0), 0);
    const auditados = rows.filter(r => AUDITADO.includes(r.estado)).length;
    const pendientes = rows.filter(r => PENDIENTE.includes(r.estado)).length;
    const conDif = rows.filter(r => r.diferencia != null && r.diferencia !== 0).length;
    const cumplimiento = total ? Math.round(auditados / total * 100) : 0;
    const valorRiesgo = rows.filter(r => r.diferencia != null && r.diferencia !== 0).reduce((s, r) => s + Math.abs(r.diferencia || 0) * (r.costoUnitario || 0), 0);
    const porModulo = INVENTARIO_MODULOS.map(m => ({ name: moduloCorto(m.key), valor: rows.filter(r => r.modulo === m.key).length })).filter(x => x.valor > 0);
    return { total, valorTotal, auditados, pendientes, conDif, cumplimiento, valorRiesgo, porModulo };
  }, [rows]);

  // Si no hay datos aún, se muestra el bloque con ceros (sin cifras ficticias).
  return (
    <>
      {/* Bloque Inventarios */}
      <section className="bg-[#0A111F] border border-[#1E2D4A] rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#8B5CF61A", color: "#8B5CF6" }}><Boxes className="w-5 h-5" /></div>
          <div>
            <h2 className="text-sm font-bold text-white">Inventarios</h2>
            <p className="text-[11px] text-[#64748B]">Auditoría de inventarios · producto, tinas, insumos, mantenimiento, activos y otros</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div className="space-y-3">
            {/* Barra de cumplimiento (auditados) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[#94A3B8]">Cumplimiento (ítems auditados)</span>
                <span className="text-xs font-bold text-white">{d.cumplimiento}% <span className="text-[#64748B] font-normal">{d.auditados}/{d.total}</span></span>
              </div>
              <div className="h-2 bg-[#0D1526] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${d.cumplimiento}%`, background: "#8B5CF6" }} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="bg-[#0D1526] rounded-lg py-2 text-center"><p className="text-lg font-bold text-white">{fNum(d.total)}</p><p className="text-[9px] text-[#64748B]">Ítems</p></div>
              <div className="bg-[#0D1526] rounded-lg py-2 text-center"><p className="text-lg font-bold text-emerald-400">{fNum(d.auditados)}</p><p className="text-[9px] text-[#64748B]">Auditados</p></div>
              <div className="bg-[#0D1526] rounded-lg py-2 text-center"><p className="text-lg font-bold text-amber-400">{fNum(d.pendientes)}</p><p className="text-[9px] text-[#64748B]">Pendientes</p></div>
            </div>
          </div>
          <div className="flex items-center justify-around">
            <div className="text-center"><p className="text-3xl font-bold text-red-400">{fNum(d.conDif)}</p><p className="text-[10px] text-[#64748B] mt-1">Hallazgos (diferencia)</p></div>
            <div className="text-center"><p className="text-2xl font-bold text-cyan-300">$ {fNum(d.valorTotal)}</p><p className="text-[10px] text-[#64748B] mt-1">Valor total</p></div>
            <div className="text-center"><p className="text-2xl font-bold text-pink-400">$ {fNum(d.valorRiesgo)}</p><p className="text-[10px] text-[#64748B] mt-1">Valor en riesgo</p></div>
          </div>
        </div>
      </section>

      {/* Analítica · Inventarios */}
      <div className="flex items-center gap-2.5 pt-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#8B5CF61A", color: "#8B5CF6" }}><BarChart3 className="w-4.5 h-4.5" /></div>
        <div>
          <h2 className="text-sm font-bold text-white">Analítica · Inventarios</h2>
          <p className="text-[11px] text-[#64748B]">Distribución de ítems por módulo de inventario</p>
        </div>
      </div>
      <div className="bg-[#0A111F] border border-[#1E2D4A] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4"><Boxes className="w-4 h-4 text-[#8B5CF6]" /><h3 className="text-sm font-bold text-white">Inventarios por módulo</h3></div>
        {d.porModulo.length === 0 ? (
          <p className="text-xs text-[#64748B] py-8 text-center">Aún no hay ítems de inventario registrados.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.porModulo} margin={{ top: 20, left: -15, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} />
              <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0D1526", border: "1px solid #1E2D4A", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#fff" }} cursor={{ fill: "#1E2D4A33" }} />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]} fill="#8B5CF6">
                {d.porModulo.map((_, i) => <Cell key={i} fill={["#8B5CF6", "#06B6D4", "#F59E0B", "#10B981", "#EF4444", "#3B82F6"][i % 6]} />)}
                <LabelList content={barLabelPct(sumField(d.porModulo, "valor"))} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}
