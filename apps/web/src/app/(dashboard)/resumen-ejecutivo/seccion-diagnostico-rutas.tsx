"use client";
import type { ReactNode } from "react";
import { useRutasExecutive } from "@/hooks/useRutasExecutive";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell, Legend,
} from "recharts";
import {
  Route, Loader2, Users2, AlertTriangle, CheckCircle2,
  Truck, MapPin, Info, Building2, ShieldAlert, ClipboardList,
} from "lucide-react";

// ─── Sección · Diagnóstico Ejecutivo de Rutas (Resumen Ejecutivo · FASE 1) ─────
// Consume el endpoint REAL /rutas/executive vía useRutasExecutive. Sin datos
// ficticios. Mismo lenguaje visual del Resumen Ejecutivo (tarjetas #0D1526).

const C = "#06B6D4"; // acento corporativo Rutas (cian)
const COLORS = ["#06B6D4", "#4A7AFF", "#F59E0B", "#EF4444", "#22C55E", "#A78BFA", "#F472B6", "#34D399"];

function fNum(n: number | undefined) {
  return new Intl.NumberFormat("es-CO").format(Math.round(n ?? 0));
}
function fCOP(n: number | undefined) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n ?? 0);
}
function semColor(p: number) { return p >= 90 ? "#22C55E" : p >= 70 ? "#F59E0B" : "#EF4444"; }

const tooltipStyle = { background: "#0B1322", border: "1px solid #1E2D4A", borderRadius: 12, color: "#E2E8F0", fontSize: 12 };

function Kpi({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl p-4">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ background: `${color}1A`, color }}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-[11px] text-[#94A3B8] mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[#64748B] mt-0.5">{sub}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl p-4">
      <h3 className="text-xs font-bold text-white mb-3">{title}</h3>
      {children}
    </div>
  );
}

export function SeccionDiagnosticoRutas() {
  // Sin filtros: refleja el consolidado total de Rutas (los filtros globales del
  // Resumen son de Granjas/CEDIS y no aplican 1:1 a Rutas).
  const { data, isLoading } = useRutasExecutive({});

  const k = data?.kpis;
  const charts = data?.charts;
  const tendencia = charts?.tendenciaMes ?? [];
  const motivos = (charts?.paretoMotivos ?? []).slice(0, 8);
  const auditores = (charts?.auditores ?? []).slice(0, 6);
  const clientes = (charts?.clientesRanking ?? []).slice(0, 5);
  const score = data?.calidadDatos?.score ?? 0;

  return (
    <section>
      {/* Encabezado de bloque */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${C}1A`, color: C }}>
          <Route className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Rutas · Diagnóstico Ejecutivo</h2>
          <p className="text-[11px] text-[#64748B]">Acompañamientos, hallazgos, cumplimiento y resultados consolidados de la hoja Rutas</p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl p-10 flex items-center justify-center gap-2 text-[#94A3B8] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando diagnóstico de Rutas…
        </div>
      ) : !data ? (
        <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl p-8 text-center text-[#64748B] text-sm">
          <Info className="w-4 h-4 inline mr-1" /> No hay datos de Rutas disponibles por ahora.
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <Kpi label="Acompañamientos" value={fNum(k?.totalAcompanamientos)} sub={`${fNum(k?.completados)} completados`} icon={Truck} color="#06B6D4" />
            <Kpi label="Cumplimiento general" value={`${k?.tasaResolucion ?? 0}%`} sub={`${fNum(k?.cerrados)} hallazgos cerrados`} icon={CheckCircle2} color={semColor(k?.tasaResolucion ?? 0)} />
            <Kpi label="Hallazgos" value={fNum(k?.totalAcompanamientos)} sub={`${fNum(k?.criticos)} críticos · ${fNum(k?.altos)} altos`} icon={AlertTriangle} color="#F59E0B" />
            <Kpi label="Índice criticidad" value={fNum(k?.indiceCriticidad)} sub="Ponderado por severidad" icon={ShieldAlert} color="#EF4444" />
            <Kpi label="Clientes visitados" value={fNum(k?.clientesUnicos)} sub={`${fNum(k?.rutasUnicas)} rutas únicas`} icon={MapPin} color="#4A7AFF" />
            <Kpi label="Auditores activos" value={fNum(k?.auditoresActivos)} icon={Users2} color="#A78BFA" />
            <Kpi label="Planes de acción" value={fNum(k?.accionesGeneradas)} sub={`${k?.tasaCierreAcciones ?? 0}% cerrados`} icon={ClipboardList} color="#22C55E" />
            <Kpi label="Valor devuelto" value={fCOP(k?.totalValorDevueltoCOP)} sub={`${fNum(k?.totalKgDevueltos)} kg`} icon={Building2} color="#F472B6" />
          </div>

          {/* Visualizaciones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
            <Card title="Tendencia mensual">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tendencia} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
                    <XAxis dataKey="mes" tick={{ fill: "#64748B", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#64748B", fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Acompañamientos" stroke="#06B6D4" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Criticos" name="Críticos" stroke="#EF4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Motivos más frecuentes (Pareto)">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={motivos} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
                    <XAxis dataKey="motivo" tick={{ fill: "#64748B", fontSize: 9 }} interval={0} angle={-18} textAnchor="end" height={52} />
                    <YAxis tick={{ fill: "#64748B", fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Hallazgos" radius={[4, 4, 0, 0]}>
                      {motivos.map((m, i) => <Cell key={m.motivo ?? i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Participación por auditor">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={auditores} layout="vertical" margin={{ top: 6, right: 16, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#64748B", fontSize: 10 }} />
                    <YAxis type="category" dataKey="auditorNombre" tick={{ fill: "#94A3B8", fontSize: 10 }} width={110} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="total" name="Acompañamientos" radius={[0, 4, 4, 0]}>
                      {auditores.map((a, i) => <Cell key={a.auditorId ?? i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Clientes con mayor recurrencia">
              {clientes.length === 0 ? (
                <p className="text-[#64748B] text-xs py-8 text-center">Sin datos de clientes.</p>
              ) : (
                <div className="space-y-2">
                  {clientes.map((c, i) => (
                    <div key={c.clienteId ?? i} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0"
                            style={{ background: `${COLORS[i % COLORS.length]}26`, color: COLORS[i % COLORS.length] }}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">{c.nombre}</p>
                        <p className="text-[10px] text-[#64748B] truncate">{c.ciudad}{c.tipo ? ` · ${c.tipo}` : ""}</p>
                      </div>
                      <span className="text-xs font-bold text-white">{fNum(c.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Calidad de datos / nota */}
          <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl p-3 flex items-start gap-2 text-[11px] text-[#94A3B8]">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: C }} />
            <span>
              Calidad de datos de Rutas:{" "}
              <span className="font-bold" style={{ color: semColor(score) }}>{score}%</span>.{" "}
              Este bloque refleja el consolidado total de Rutas; los filtros globales del Resumen aplican a Granjas/CEDIS y no a Rutas.
            </span>
          </div>
        </>
      )}
    </section>
  );
}
