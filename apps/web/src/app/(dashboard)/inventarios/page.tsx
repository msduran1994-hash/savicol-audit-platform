"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// HOJA INVENTARIOS · Dashboard Ejecutivo consolidado (Fase 6)
// Agrega los 6 módulos desde /inventarios (sin backend nuevo). KPIs + alertas +
// gráficas tipo BI con "cantidad · %" (reutiliza recharts + lib/chart-pct).
// Los filtros globales sincronizados llegan en la Fase 7.
// ═══════════════════════════════════════════════════════════════════════════════
import { useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { useInventarios } from "@/hooks/useInventarios";
import { INVENTARIO_MODULOS, ESTADO_INVENTARIO_COLOR, type ModuloInventario } from "@/lib/inventarios.constants";
import { pieValuePct, barLabelPct, sumField } from "@/lib/chart-pct";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
} from "recharts";
import {
  Boxes, DollarSign, CheckCircle2, Clock, Lock, AlertTriangle, Target, Flame,
  BarChart3, ArrowRight,
} from "lucide-react";

const PALETA = ["#8B5CF6", "#06B6D4", "#F59E0B", "#10B981", "#EF4444", "#3B82F6", "#EC4899", "#A3E635"];
const AUDITADO = ["Auditado", "Conciliado", "Cerrado"];
const PENDIENTE = ["Registrado", "En conteo"];
const nfmt = (n: number, dec = 0) => (n ?? 0).toLocaleString("es-CO", { maximumFractionDigits: dec });
const moduloCorto = (k: string) => (INVENTARIO_MODULOS.find(m => m.key === k)?.label ?? k).replace(/^Inventario de |^Almacén de /, "");

export default function DashboardInventariosPage() {
  const q = useInventarios({});
  const rows = q.data ?? [];

  const d = useMemo(() => {
    const total = rows.length;
    const valorTotal = rows.reduce((s, r) => s + (r.valorTotal || 0), 0);
    const auditados = rows.filter(r => AUDITADO.includes(r.estado)).length;
    const pendientes = rows.filter(r => PENDIENTE.includes(r.estado)).length;
    const finalizados = rows.filter(r => r.estado === "Cerrado").length;
    const conDif = rows.filter(r => r.diferencia != null && r.diferencia !== 0).length;
    const sinConteo = rows.filter(r => r.cantidadContada == null).length;
    const cumplimiento = total ? Math.round(auditados / total * 100) : 0;
    const valorRiesgo = rows.filter(r => r.diferencia != null && r.diferencia !== 0)
      .reduce((s, r) => s + Math.abs(r.diferencia || 0) * (r.costoUnitario || 0), 0);

    const porModulo = INVENTARIO_MODULOS.map(m => ({ name: moduloCorto(m.key), value: rows.filter(r => r.modulo === m.key).length }));
    const difPorModulo = INVENTARIO_MODULOS.map(m => ({ name: moduloCorto(m.key), value: rows.filter(r => r.modulo === m.key && r.diferencia != null && r.diferencia !== 0).length })).filter(x => x.value > 0);

    const estadoMap = new Map<string, number>();
    rows.forEach(r => estadoMap.set(r.estado, (estadoMap.get(r.estado) || 0) + 1));
    const porEstado = Array.from(estadoMap.entries()).map(([name, value]) => ({ name, value }));

    const catMap = new Map<string, number>();
    rows.forEach(r => { const c = (r.categoria || "").trim(); if (c) catMap.set(c, (catMap.get(c) || 0) + 1); });
    const porCategoria = Array.from(catMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

    const audMap = new Map<string, number>();
    rows.forEach(r => { const a = (r.auditor || "").trim(); if (a && AUDITADO.includes(r.estado)) audMap.set(a, (audMap.get(a) || 0) + 1); });
    const porAuditor = Array.from(audMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const mesMap = new Map<string, number>();
    rows.forEach(r => { const m = String(r.fecha || "").slice(0, 7); if (m.length === 7) mesMap.set(m, (mesMap.get(m) || 0) + 1); });
    const tendencia = Array.from(mesMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([mes, value]) => ({ mes, value }));

    const alertas: { txt: string; color: string }[] = [];
    if (conDif) alertas.push({ txt: `${conDif} ítem(s) con diferencia de inventario`, color: "#EF4444" });
    if (pendientes) alertas.push({ txt: `${pendientes} ítem(s) pendientes de auditoría`, color: "#F59E0B" });
    if (sinConteo) alertas.push({ txt: `${sinConteo} ítem(s) sin conteo físico registrado`, color: "#3B82F6" });
    if (valorRiesgo > 0) alertas.push({ txt: `$ ${nfmt(valorRiesgo)} en valor con diferencia`, color: "#EC4899" });

    return { total, valorTotal, auditados, pendientes, finalizados, conDif, cumplimiento, valorRiesgo,
      porModulo, difPorModulo, porEstado, porCategoria, porAuditor, tendencia, alertas };
  }, [rows]);

  return (
    <div>
      <Header title="Dashboard Inventarios" subtitle="Hoja Inventarios · Consolidado ejecutivo de los 7 módulos" />

      <div className="flex-1 p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi icon={<Boxes />}        label="Total ítems"     value={nfmt(d.total)}                 color="#8B5CF6" />
          <Kpi icon={<DollarSign />}   label="Valor total"     value={`$ ${nfmt(d.valorTotal)}`}     color="#06B6D4" />
          <Kpi icon={<CheckCircle2 />} label="Auditados"       value={`${nfmt(d.auditados)}`}        sub={`${d.cumplimiento}%`} color="#10B981" />
          <Kpi icon={<Target />}       label="Cumplimiento"    value={`${d.cumplimiento}%`}           color="#22C55E" />
          <Kpi icon={<Clock />}        label="Pendientes"      value={nfmt(d.pendientes)}            color="#F59E0B" />
          <Kpi icon={<Lock />}         label="Finalizados"     value={nfmt(d.finalizados)}           color="#3B82F6" />
          <Kpi icon={<AlertTriangle />}label="Hallazgos (dif.)"value={nfmt(d.conDif)}                color="#EF4444" />
          <Kpi icon={<Flame />}        label="Valor en riesgo" value={`$ ${nfmt(d.valorRiesgo)}`}     color="#EC4899" />
        </div>

        {/* Alertas */}
        {d.alertas.length > 0 && (
          <div className="card-base">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" />Alertas estratégicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {d.alertas.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-[#CBD5E1] bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-3 py-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />{a.txt}
                </div>
              ))}
            </div>
          </div>
        )}

        {q.isLoading ? (
          <div className="card-base py-20 text-center text-[#475569] text-sm">Cargando inventarios…</div>
        ) : d.total === 0 ? (
          <div className="card-base py-16 text-center">
            <Boxes className="w-10 h-10 text-[#1E2D4A] mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">Aún no hay ítems de inventario</p>
            <p className="text-[#475569] text-sm">Registra ítems en los módulos para ver el consolidado ejecutivo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartBox title="Inventarios por módulo">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d.porModulo} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#94A3B8", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#0D1526", border: "1px solid #1E2D4A", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {d.porModulo.map((_, i) => <Cell key={i} fill={PALETA[i % PALETA.length]} />)}
                    <LabelList content={barLabelPct(sumField(d.porModulo, "value"))} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>

            <ChartBox title="Distribución por estado">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={d.porEstado} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={pieValuePct}>
                    {d.porEstado.map((e, i) => <Cell key={i} fill={ESTADO_INVENTARIO_COLOR[e.name] ?? PALETA[i % PALETA.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0D1526", border: "1px solid #1E2D4A", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartBox>

            <ChartBox title="Diferencias (hallazgos) por módulo">
              {d.difPorModulo.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={d.difPorModulo} layout="vertical" margin={{ top: 5, right: 40, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "#94A3B8", fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fill: "#94A3B8", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#0D1526", border: "1px solid #1E2D4A", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]}>
                      <LabelList content={barLabelPct(sumField(d.difPorModulo, "value"), { horizontal: true })} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartBox>

            <ChartBox title="Inventarios por categoría (top 8)">
              {d.porCategoria.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={d.porCategoria} layout="vertical" margin={{ top: 5, right: 40, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "#94A3B8", fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fill: "#94A3B8", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#0D1526", border: "1px solid #1E2D4A", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" fill="#06B6D4" radius={[0, 4, 4, 0]}>
                      <LabelList content={barLabelPct(sumField(d.porCategoria, "value"), { horizontal: true })} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartBox>

            <ChartBox title="Auditados por auditor">
              {d.porAuditor.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={d.porAuditor} layout="vertical" margin={{ top: 5, right: 40, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "#94A3B8", fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fill: "#94A3B8", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#0D1526", border: "1px solid #1E2D4A", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]}>
                      <LabelList content={barLabelPct(sumField(d.porAuditor, "value"), { horizontal: true })} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartBox>

            <ChartBox title="Tendencia mensual de registros">
              {d.tendencia.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={d.tendencia} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fill: "#94A3B8", fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "#94A3B8", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#0D1526", border: "1px solid #1E2D4A", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="value" name="Ítems registrados" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartBox>
          </div>
        )}

        {/* Acceso rápido a módulos */}
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Módulos</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {INVENTARIO_MODULOS.map(m => {
              const n = rows.filter(r => r.modulo === (m.key as ModuloInventario)).length;
              return (
                <Link key={m.key} href={m.href} className="card-base group flex flex-col gap-1 hover:border-violet-500/40 transition-colors py-3">
                  <span className="text-[11px] text-white font-semibold leading-tight flex items-center justify-between">{moduloCorto(m.key)}<ArrowRight className="w-3 h-3 text-[#475569] group-hover:text-violet-400" /></span>
                  <span className="text-lg font-bold text-violet-300 leading-none">{n}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────
function Kpi({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="card-base flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="min-w-0">
        <p className="font-display text-lg font-bold text-white leading-tight truncate">{value}{sub && <span className="text-[11px] text-[#94A3B8] font-normal"> · {sub}</span>}</p>
        <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-base">
      <h3 className="text-sm font-bold text-white mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return <div className="h-[260px] flex items-center justify-center text-[#475569] text-sm">Sin datos para esta gráfica.</div>;
}
