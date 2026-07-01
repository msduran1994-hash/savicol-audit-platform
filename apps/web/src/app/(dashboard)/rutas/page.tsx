"use client";
import { Header } from "@/components/layout/header";
import { useRutasStore } from "@/store/rutas.store";
import { useShallow } from "zustand/react/shallow";
import { formatCOP, formatKg, MOTIVOS_DEVOLUCION, RUTAS_DEMO, VEHICULOS_DEMO, CLIENTES_DEMO, TIPO_RIESGO_RUTA, CRITICIDAD_OPERACIONAL } from "@/lib/rutas.constants";
import { AUDITORS } from "@/lib/constants";
import {
  Truck, AlertTriangle, DollarSign, Scale, Users, Building2,
  Target, Sparkles, MapPin, TrendingUp,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-lg p-3 text-xs shadow-card">
      {label && <p className="font-semibold text-white mb-1.5">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2 text-[#94A3B8]">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color ?? p.fill }} />
          {p.name}: <span className="text-white font-medium ml-1">{typeof p.value === "number" && p.value > 10000 ? formatCOP(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function RutasDashboardPage() {
  const acompanamientos = useRutasStore(useShallow((s) => s.acompanamientos));

  // ─── KPIs ──────────────────────────────────────────────────────────────────
  const totalRutas = new Set(acompanamientos.map(a => a.rutaId)).size;
  const totalAcomp = acompanamientos.length;
  const totalHallazgos = acompanamientos.filter(a => a.estado === "Con Hallazgos").length;
  const totalVehiculos = new Set(acompanamientos.map(a => a.vehiculoId)).size;
  const criticidadAlta = acompanamientos.filter(a => a.criticidad === "Crítico" || a.criticidad === "Alto").length;
  const clientesImpactados = new Set(acompanamientos.map(a => a.clienteId)).size;
  const valorDevueltoTotal = acompanamientos.reduce((sum, a) => sum + a.valorDevueltoCOP, 0);
  const kgDevueltoTotal    = acompanamientos.reduce((sum, a) => sum + a.cantidadKgDevueltos, 0);

  const motivoCount: Record<string, number> = {};
  acompanamientos.forEach(a => { motivoCount[a.motivo] = (motivoCount[a.motivo] ?? 0) + 1; });
  const motivoDominante = Object.entries(motivoCount).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? "—";
  const totalMotivos = Object.keys(motivoCount).length;

  const riesgoCount: Record<string, number> = {};
  acompanamientos.forEach(a => a.riesgosAsociados.forEach(r => { riesgoCount[r] = (riesgoCount[r] ?? 0) + 1; }));
  const riesgoMayor = Object.entries(riesgoCount).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? "—";

  // ─── DATOS GRÁFICOS ────────────────────────────────────────────────────────

  // Visitas y registros por mes — desde el Consolidado (acompañamientos). El mes/año
  // se lee del texto ISO (YYYY-MM) para evitar desfases de zona horaria (UTC-5).
  // Visitas = eventos de visita distintos (ruta + fecha); Reportes = nº de registros.
  const MESES_WIN = [
    { name: "Dic 25", ym: "2025-12" },
    { name: "Ene",    ym: "2026-01" },
    { name: "Feb",    ym: "2026-02" },
    { name: "Mar",    ym: "2026-03" },
    { name: "Abr",    ym: "2026-04" },
    { name: "May 26", ym: "2026-05" },
  ];
  const dataMensual = MESES_WIN.map(({ name, ym }) => {
    const recs = acompanamientos.filter(a => String(a.fecha ?? "").slice(0, 7) === ym);
    const visitas = new Set(recs.map(a => `${a.rutaId}|${a.fecha}`)).size;
    return { name, visitas, reportes: recs.length };
  });

  // Ranking rutas
  const rutaStats: Record<string, { nombre: string; acomp: number; valor: number; kg: number }> = {};
  acompanamientos.forEach(a => {
    if (!rutaStats[a.rutaId]) rutaStats[a.rutaId] = { nombre: a.rutaNombre, acomp: 0, valor: 0, kg: 0 };
    rutaStats[a.rutaId].acomp += 1;
    rutaStats[a.rutaId].valor += a.valorDevueltoCOP;
    rutaStats[a.rutaId].kg    += a.cantidadKgDevueltos;
  });
  const rankingRutas = Object.values(rutaStats).sort((a,b) => b.valor - a.valor).slice(0,8);

  // Participación por vehículo
  const vehiculoStats: Record<string, number> = {};
  acompanamientos.forEach(a => { vehiculoStats[a.vehiculoPlaca] = (vehiculoStats[a.vehiculoPlaca] ?? 0) + 1; });
  const dataVehiculos = Object.entries(vehiculoStats).map(([placa, count]) => ({ name: placa, value: count }));

  // Clientes impactados
  const clienteStats: Record<string, { nombre: string; valor: number; count: number }> = {};
  acompanamientos.forEach(a => {
    if (!clienteStats[a.clienteId]) clienteStats[a.clienteId] = { nombre: a.clienteNombre, valor: 0, count: 0 };
    clienteStats[a.clienteId].valor += a.valorDevueltoCOP;
    clienteStats[a.clienteId].count += 1;
  });
  const rankingClientes = Object.values(clienteStats).sort((a,b)=>b.valor-a.valor).slice(0,6);

  // Riesgos
  const dataRiesgos = TIPO_RIESGO_RUTA.map(r => ({ name: r, value: riesgoCount[r] ?? 0 })).filter(d => d.value > 0);

  // Auditor
  const auditorStats: Record<string, number> = {};
  acompanamientos.forEach(a => { auditorStats[a.auditorNombre] = (auditorStats[a.auditorNombre] ?? 0) + 1; });
  const dataAuditores = Object.entries(auditorStats).map(([name, value]) => ({ name: name.split(" ").slice(0,2).join(" "), value }));

  // Distribución motivos
  const dataMotivos = Object.entries(motivoCount).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value);

  // Criticidad
  const dataCriticidad = CRITICIDAD_OPERACIONAL.map(c => ({
    name: c,
    value: acompanamientos.filter(a => a.criticidad === c).length,
  })).filter(d => d.value > 0);

  // Ranking de clientes que más reportaron en el Consolidado (por nº de registros)
  const dataClientesReportes = Object.values(clienteStats)
    .map(c => ({ name: c.nombre, value: c.count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Ranking de rutas más visitadas/reportadas en el Consolidado (por nº de registros)
  const dataRutasVisitas = Object.values(rutaStats)
    .map(r => ({ name: r.nombre, value: r.acomp }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Dashboard · Acompañamiento a Rutas"
        subtitle={`${totalAcomp} acompañamientos · ${formatCOP(valorDevueltoTotal)} · ${formatKg(kgDevueltoTotal)} devueltos`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Banner ejecutivo */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#082F36] via-[#0A4A4A] to-[#082F36] border border-cyan-900/40 px-6 py-5">
          <div className="absolute right-0 top-0 bottom-0 w-48 opacity-[0.08]"
               style={{ backgroundImage: "repeating-linear-gradient(45deg, #06B6D4 0, #06B6D4 1px, transparent 0, transparent 50%)", backgroundSize: "10px 10px" }} />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-cyan-400 mb-1">
                Auditoría Logística · Distribución y Devoluciones
              </p>
              <h2 className="font-display text-3xl font-bold text-white">Diagnóstico Ejecutivo de Rutas</h2>
              <p className="text-[#94A3B8] text-sm mt-1">
                {totalRutas > 0
                  ? `${totalRutas} rutas auditadas · ${totalVehiculos} vehículos · ${clientesImpactados} clientes impactados`
                  : "Sin acompañamientos registrados — comience cargando datos"}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-cyan-300">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-medium">Análisis IA · Tiempo real</span>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Kpi icon={<MapPin/>}        label="Rutas Auditadas"     value={totalRutas}                            color="#06B6D4" />
          <Kpi icon={<AlertTriangle/>} label="Hallazgos"            value={totalHallazgos}                         color="#F59E0B" />
          <Kpi icon={<Truck/>}         label="Vehículos Registrados"value={totalVehiculos}                         color="#10B981" />
          <Kpi icon={<Target/>}        label="Motivo Dominante"     value={motivoDominante}                        color="#8B5CF6" small />
          <Kpi icon={<AlertTriangle/>} label="Criticidad Alta"      value={criticidadAlta} alert={criticidadAlta>0} color="#EF4444" />

          <Kpi icon={<AlertTriangle/>} label="Riesgo Mayor Impacto" value={riesgoMayor}                            color="#EF4444" small />
          <Kpi icon={<Sparkles/>}      label="Motivos Registrados"   value={totalMotivos}                          color="#3B82F6" />
          <Kpi icon={<Building2/>}     label="Clientes Impactados"   value={clientesImpactados}                    color="#F59E0B" />
          <Kpi icon={<DollarSign/>}    label="Valor Devuelto"        value={formatCOP(valorDevueltoTotal)}         color="#10B981" small />
          <Kpi icon={<Scale/>}         label="Kg Devueltos"          value={formatKg(kgDevueltoTotal)}             color="#06B6D4" small />
        </div>

        {/* Tendencia mensual + Distribución motivos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Visitas a Rutas por Mes" colSpan="lg:col-span-2">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={dataMensual}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
                <XAxis dataKey="name" tick={{ fill:"#94A3B8", fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"#94A3B8", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Line type="monotone" dataKey="visitas"  name="Visitas"                stroke="#06B6D4" strokeWidth={2.5} dot={{ fill:"#06B6D4", r:4 }} />
                <Line type="monotone" dataKey="reportes" name="Reportes (Consolidado)" stroke="#F59E0B" strokeWidth={2.5} dot={{ fill:"#F59E0B", r:4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Distribución Motivos Devolución">
            {dataMotivos.length === 0 ? <Empty/> : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={dataMotivos} dataKey="value" nameKey="name" outerRadius={80} innerRadius={40} label={(d:any)=>`${d.value}`}>
                    {dataMotivos.map((_, i) => <Cell key={i} fill={["#06B6D4","#3B82F6","#8B5CF6","#F59E0B","#10B981","#EC4899","#EF4444","#94A3B8"][i % 8]} />)}
                  </Pie>
                  <Tooltip content={<Tip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Ranking rutas + Riesgos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Ranking de Rutas por Valor Devuelto">
            {rankingRutas.length === 0 ? <Empty/> : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
                {rankingRutas.map((r, i) => (
                  <div key={r.nombre} className="flex items-center gap-3 p-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A]">
                    <span className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{r.nombre}</p>
                      <p className="text-[10px] text-[#94A3B8]">{r.acomp} acomp · {formatKg(r.kg)}</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-cyan-300">{formatCOP(r.valor)}</span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          <ChartCard title="Riesgos Identificados">
            {dataRiesgos.length === 0 ? <Empty/> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dataRiesgos} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false} />
                  <XAxis type="number" tick={{ fill:"#94A3B8", fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fill:"#94A3B8", fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="value" fill="#EF4444" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Vehículos + Auditores + Criticidad */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Participación por Vehículo">
            {dataVehiculos.length === 0 ? <Empty/> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={dataVehiculos} dataKey="value" nameKey="name" outerRadius={70} label={(d:any)=>d.name}>
                    {dataVehiculos.map((_, i) => <Cell key={i} fill={["#06B6D4","#3B82F6","#8B5CF6","#10B981","#F59E0B","#EF4444"][i]} />)}
                  </Pie>
                  <Tooltip content={<Tip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Acompañamientos por Auditor">
            {dataAuditores.length === 0 ? <Empty/> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dataAuditores} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill:"#94A3B8", fontSize:9 }} angle={-25} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:"#94A3B8", fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="value" fill="#06B6D4" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Criticidad Operacional">
            {dataCriticidad.length === 0 ? <Empty/> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={dataCriticidad} dataKey="value" nameKey="name" outerRadius={70} label={(d:any)=>d.name}>
                    {dataCriticidad.map((_, i) => <Cell key={i} fill={["#94A3B8","#3B82F6","#F59E0B","#EF4444"][["Bajo","Medio","Alto","Crítico"].indexOf(dataCriticidad[i].name)]} />)}
                  </Pie>
                  <Tooltip content={<Tip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Ranking clientes + Matriz criticidad vs impacto */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Top Clientes Impactados">
            {rankingClientes.length === 0 ? <Empty/> : (
              <div className="space-y-2">
                {rankingClientes.map((c, i) => (
                  <div key={c.nombre} className="flex items-center gap-3 p-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A]">
                    <span className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center bg-amber-500/20 border border-amber-500/30 text-amber-400">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.nombre}</p>
                      <p className="text-[10px] text-[#94A3B8]">{c.count} acompañamiento(s)</p>
                    </div>
                    <span className="text-xs font-bold text-amber-300 font-mono">{formatCOP(c.valor)}</span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          <ChartCard title="Ranking de Clientes que más Reportaron">
            {dataClientesReportes.length === 0 ? <Empty/> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dataClientesReportes} layout="vertical" barSize={16} margin={{ top: 4, right: 28, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill:"#94A3B8", fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fill:"#94A3B8", fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} cursor={{ fill: "#1E2D4A33" }} />
                  <Bar dataKey="value" name="Reportes" fill="#F59E0B" radius={[0,4,4,0]}>
                    <LabelList dataKey="value" position="right" fill="#E2E8F0" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Ranking de rutas más visitadas/reportadas en el Consolidado */}
        <div className="grid grid-cols-1 gap-4">
          <ChartCard title="Ranking de Rutas más Visitadas (Consolidado)">
            {dataRutasVisitas.length === 0 ? <Empty/> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dataRutasVisitas} layout="vertical" barSize={18} margin={{ top: 4, right: 30, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill:"#94A3B8", fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fill:"#94A3B8", fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} cursor={{ fill: "#1E2D4A33" }} />
                  <Bar dataKey="value" name="Registros" fill="#06B6D4" radius={[0,4,4,0]}>
                    <LabelList dataKey="value" position="right" fill="#E2E8F0" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Interpretación ejecutiva IA */}
        <div className="card-base bg-gradient-to-br from-[#0D1526] to-[#082F36] border-cyan-900/30">
          <h3 className="font-display font-semibold text-cyan-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Interpretación Ejecutiva IA
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#94A3B8] mb-2 font-semibold">Resumen automático</p>
              <p className="text-[#94A3B8] leading-relaxed">
                {totalAcomp === 0
                  ? "Sin datos para analizar. Cargue acompañamientos en el módulo Consolidado."
                  : `Se ejecutaron ${totalAcomp} acompañamientos en ${totalRutas} rutas. El motivo dominante es "${motivoDominante}". El riesgo de mayor impacto es "${riesgoMayor}". Valor total devuelto: ${formatCOP(valorDevueltoTotal)} (${formatKg(kgDevueltoTotal)}).`}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[#94A3B8] mb-2 font-semibold">Recomendaciones automáticas</p>
              <ul className="space-y-1.5 text-[#94A3B8]">
                {criticidadAlta > 0 && <li>• Priorizar atención a {criticidadAlta} acompañamiento(s) con criticidad alta</li>}
                {valorDevueltoTotal > 5_000_000 && <li>• Impacto financiero significativo — escalar a comité de auditoría</li>}
                {motivoDominante === "Cadena de Frío Rota" && <li>• Auditar protocolos de refrigeración en flota completa</li>}
                {motivoDominante === "Producto Vencido"   && <li>• Revisar control FIFO y rotación de inventario</li>}
                {totalAcomp > 0 && <li>• Establecer plan de mejora con responsables de cada ruta</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AUX ─────────────────────────────────────────────────────────────────────
function Kpi({ icon, label, value, color, alert, small }: {
  icon: React.ReactNode; label: string; value: number | string; color: string; alert?: boolean; small?: boolean;
}) {
  return (
    <div className={`card-base relative overflow-hidden ${alert ? "ring-1 ring-red-500/40" : ""}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, color }}>
          {icon}
        </div>
        {alert && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-bold">ALERTA</span>}
      </div>
      <p className={`font-display font-bold text-white ${small ? "text-sm leading-tight" : "text-2xl"}`}>{value}</p>
      <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function ChartCard({ title, children, colSpan }: { title: string; children: React.ReactNode; colSpan?: string }) {
  return (
    <div className={`card-base ${colSpan ?? ""}`}>
      <h3 className="font-display font-semibold text-white mb-3 text-sm">{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return <div className="flex items-center justify-center h-[220px] text-[#475569] text-sm">Sin datos</div>;
}
