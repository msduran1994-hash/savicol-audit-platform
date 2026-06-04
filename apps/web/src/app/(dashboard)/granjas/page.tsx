"use client";
import { Header } from "@/components/layout/header";
import { useGranjasStore } from "@/store/granjas.store";
import { useShallow } from "zustand/react/shallow";
import { VETERINARIOS_DEMO, TIPO_GRANJA, TIPO_OPERATIVO, CATEGORIA_HALLAZGO, CRITICIDAD, ESTADO_KPI } from "@/lib/granjas.constants";
import {
  Tractor, AlertTriangle, Activity, Target, TrendingUp,
  Building2, Users, Skull, Award, Sparkles,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899"];

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-lg p-3 text-xs shadow-card">
      <p className="font-semibold text-white mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2 text-[#94A3B8]">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color ?? p.fill }} />
          {p.name}: <span className="text-white font-medium ml-1">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function GranjasDashboardPage() {
  const granjas    = useGranjasStore(useShallow((s) => s.granjas));
  const hallazgos  = useGranjasStore(useShallow((s) => s.hallazgos));
  const kpis       = useGranjasStore(useShallow((s) => s.kpis));
  const auditorias = useGranjasStore(useShallow((s) => s.auditorias));

  // ─── KPIs principales ──────────────────────────────────────────────────────
  const totalHallazgos    = hallazgos.length;
  const riesgosCriticos   = hallazgos.filter(h => h.criticidad === "Crítica").length;
  const granjasConHall    = new Set(hallazgos.map(h => h.granjaId)).size;
  const totalGranjas      = granjas.length;
  const totalKPIs         = kpis.length;
  const kpiCompletados    = kpis.filter(k => k.estado === "Completado").length;
  const kpiEnCurso        = kpis.filter(k => k.estado === "En Curso").length;
  const kpiEspera         = kpis.filter(k => k.estado === "En Espera").length;
  const kpiNoIniciados    = kpis.filter(k => k.estado === "No Iniciado").length;
  const cumplimientoKPI   = totalKPIs > 0 ? Math.round((kpiCompletados / totalKPIs) * 100) : 0;
  const riesgosMitigados  = hallazgos.filter(h => h.estado === "Cerrado" || h.estado === "Verificado").length;

  // Riesgo dominante (suma de pesos por tipo de riesgo)
  const tiposRiesgoCount: Record<string, number> = {};
  hallazgos.forEach(h => h.tiposRiesgo.forEach(r => { tiposRiesgoCount[r] = (tiposRiesgoCount[r] ?? 0) + 1; }));
  const riesgoDominante = Object.entries(tiposRiesgoCount).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? "—";

  // Granja con mayor criticidad
  const critPorGranja: Record<string, number> = {};
  hallazgos.forEach(h => {
    const peso = h.criticidad === "Crítica" ? 4 : h.criticidad === "Alta" ? 3 : h.criticidad === "Media" ? 2 : 1;
    critPorGranja[h.granjaNombre] = (critPorGranja[h.granjaNombre] ?? 0) + peso;
  });
  const granjaMayorCrit = Object.entries(critPorGranja).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? "—";

  const totalRiesgos = hallazgos.reduce((sum, h) => sum + h.tiposRiesgo.length, 0);
  const planesAccion = kpis.filter(k => k.planAccionVeterinario).length;

  // ─── Datos para gráficos ───────────────────────────────────────────────────

  // Hallazgos por categoría
  const dataCategorias = CATEGORIA_HALLAZGO.map(cat => ({
    name: cat.length > 14 ? cat.slice(0,12) + "…" : cat,
    cantidad: hallazgos.filter(h => h.categoria === cat).length,
  })).filter(d => d.cantidad > 0);

  // Distribución por criticidad
  const dataCriticidad = CRITICIDAD.map(c => ({
    name: c,
    value: hallazgos.filter(h => h.criticidad === c).length,
  })).filter(d => d.value > 0);

  // Tipos de riesgo
  const dataRiesgos = Object.entries(tiposRiesgoCount).map(([name, value]) => ({ name, value }));

  // Estados KPI
  const dataEstadosKPI = ESTADO_KPI.map(e => ({
    name: e,
    cantidad: kpis.filter(k => k.estado === e).length,
  }));

  // Tipo de granja
  const dataTipoGranja = TIPO_GRANJA.map(t => ({
    name: t,
    cantidad: granjas.filter(g => g.tipoGranja === t).length,
  }));

  // Tipo operativo
  const dataTipoOperativo = TIPO_OPERATIVO.map(t => ({
    name: t,
    cantidad: granjas.filter(g => g.tipoOperativo === t).length,
  }));

  // Tendencia mensual hallazgos (últimos 6 meses)
  const meses = ["Dic 2025", "Ene", "Feb", "Mar", "Abr", "May 2026"];
  const dataTendencia = meses.map((m, i) => {
    // distribución sintética determinística sobre los hallazgos demo
    const monthIdx = (new Date(2025, 11 + i).getMonth());
    return {
      name: m,
      hallazgos: hallazgos.filter(h => new Date(h.fechaVisita).getMonth() === monthIdx).length,
    };
  });

  // Top 10 granjas por hallazgos
  const topGranjas = Object.entries(critPorGranja).sort((a,b)=>b[1]-a[1]).slice(0,10);

  // Radar de riesgo por categoría
  const dataRadar = CATEGORIA_HALLAZGO.map(cat => ({
    subject: cat.length > 12 ? cat.slice(0,10) + "…" : cat,
    value: hallazgos.filter(h => h.categoria === cat).length,
  }));

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Dashboard Ejecutivo · Granjas"
        subtitle={`${totalGranjas} granjas · ${totalHallazgos} hallazgos · ${cumplimientoKPI}% cumplimiento KPI`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Banner · Dashboard Ejecutivo Avanzado Granjas */}
        <a
          href="/granjas/ejecutivo"
          className="card-base p-4 flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-amber-500/5 to-transparent border-amber-500/30 hover:border-amber-500/40 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/30 to-amber-500/30 border border-amber-500/40 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400"/>
            </div>
            <div>
              <p className="font-display font-bold text-white text-sm">Dashboard Ejecutivo Avanzado · Granjas</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                14 KPIs · 8 charts · Heatmap criticidad · Trazabilidad auditorías · Análisis IA · Filtros globales
              </p>
            </div>
          </div>
          <span className="text-amber-400 text-sm font-semibold group-hover:translate-x-1 transition-transform">Ver dashboard →</span>
        </a>

        {/* Banner ejecutivo */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#1A1208] via-[#2A1810] to-[#1A1208] border border-amber-900/40 px-6 py-5">
          <div className="absolute right-0 top-0 bottom-0 w-48 opacity-[0.08]"
               style={{ backgroundImage: "repeating-linear-gradient(45deg, #F59E0B 0, #F59E0B 1px, transparent 0, transparent 50%)", backgroundSize: "10px 10px" }} />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-amber-400 mb-1">
                Módulo Avícola · Auditoría y Control Interno
              </p>
              <h2 className="font-display text-3xl font-bold text-white">
                Diagnóstico Ejecutivo de Granjas
              </h2>
              <p className="text-[#94A3B8] text-sm mt-1">
                {totalGranjas > 0
                  ? `${totalGranjas} granjas monitoreadas · ${planesAccion} planes de acción veterinario`
                  : "Sin granjas registradas — comience cargando datos"}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-medium">Análisis IA — Reglas estáticas</span>
            </div>
          </div>
        </div>

        {/* KPIs principales (4 columnas × 3 filas) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <Kpi icon={<AlertTriangle/>} label="Total Hallazgos"          value={totalHallazgos}        color="#F59E0B" />
          <Kpi icon={<Activity/>}      label="Total Riesgos"             value={totalRiesgos}          color="#EF4444" />
          <Kpi icon={<AlertTriangle/>} label="Riesgos Críticos"          value={riesgosCriticos}       color="#EF4444" alert={riesgosCriticos>0} />
          <Kpi icon={<TrendingUp/>}    label="Riesgo Dominante"           value={riesgoDominante}       color="#8B5CF6" small />
          <Kpi icon={<Tractor/>}       label="Granjas Registradas"        value={totalGranjas}          color="#10B981" />
          <Kpi icon={<Building2/>}     label="Granjas con Hallazgos"      value={granjasConHall}        color="#F59E0B" />
          <Kpi icon={<Target/>}        label="Planes Acción Veterinario"  value={planesAccion}          color="#3B82F6" />
          <Kpi icon={<Skull/>}         label="Granja Mayor Criticidad"    value={granjaMayorCrit}       color="#EF4444" small />
          <Kpi icon={<Users/>}         label="Auditores Registrados"      value={VETERINARIOS_DEMO.length} color="#06B6D4" />
          <Kpi icon={<Target/>}        label="% Cumplimiento KPI"          value={`${cumplimientoKPI}%`} color="#10B981" />
          <Kpi icon={<Award/>}         label="KPI Completados"             value={kpiCompletados}        color="#10B981" />
          <Kpi icon={<Activity/>}      label="Riesgos Mitigados"           value={riesgosMitigados}      color="#10B981" />
        </div>

        {/* Cumplimiento KPI bar + Estados */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card-base lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" /> Barra de Cumplimiento KPI
              </h3>
              <span className="text-2xl font-bold text-amber-400 font-display">{cumplimientoKPI}%</span>
            </div>
            <div className="h-4 bg-[#1A2540] rounded-full overflow-hidden mb-4">
              <div className="h-full rounded-full transition-all duration-700"
                   style={{ width: `${cumplimientoKPI}%`, background: "linear-gradient(90deg, #10B981, #34D399, #FBBF24)" }} />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <MiniStat label="Completado"  value={kpiCompletados} color="#10B981" />
              <MiniStat label="En Curso"    value={kpiEnCurso}     color="#F59E0B" />
              <MiniStat label="En Espera"   value={kpiEspera}      color="#06B6D4" />
              <MiniStat label="No Iniciado" value={kpiNoIniciados} color="#94A3B8" />
            </div>
          </div>

          <div className="card-base">
            <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" /> Alertas Estratégicas
            </h3>
            {hallazgos.length === 0 ? (
              <p className="text-[#475569] text-sm text-center py-6">Sin alertas activas</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {hallazgos.filter(h => h.criticidad === "Crítica" || h.criticidad === "Alta").slice(0,4).map(h => (
                  <li key={h.id} className="flex items-start gap-2 p-2 rounded-lg bg-red-950/20 border border-red-900/30">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-white font-medium">{h.titulo}</p>
                      <p className="text-[#94A3B8] mt-0.5">{h.granjaNombre} · {h.criticidad}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Hallazgos por categoría + Distribución por severidad + Tipos de riesgo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Hallazgos por Categoría">
            {dataCategorias.length === 0
              ? <Empty />
              : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dataCategorias} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill:"#94A3B8", fontSize:9 }} angle={-25} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:"#94A3B8", fontSize:10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="cantidad" fill="#F59E0B" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </ChartCard>

          <ChartCard title="Distribución por Severidad">
            {dataCriticidad.length === 0
              ? <Empty />
              : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={dataCriticidad} dataKey="value" nameKey="name" outerRadius={70} label={(d:any)=>`${d.name}: ${d.value}`}>
                      {dataCriticidad.map((_, i) => <Cell key={i} fill={["#94A3B8","#3B82F6","#F59E0B","#EF4444"][i % 4]} />)}
                    </Pie>
                    <Tooltip content={<Tip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
          </ChartCard>

          <ChartCard title="Tipos de Riesgo Encontrados">
            {dataRiesgos.length === 0
              ? <Empty />
              : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dataRiesgos} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false} />
                    <XAxis type="number" tick={{ fill:"#94A3B8", fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fill:"#94A3B8", fontSize:10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="value" fill="#EF4444" radius={[0,3,3,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </ChartCard>
        </div>

        {/* Estados KPI + Tipo Granja + Tipo Operativo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Estados KPI">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dataEstadosKPI} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
                <XAxis dataKey="name" tick={{ fill:"#94A3B8", fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"#94A3B8", fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="cantidad" radius={[3,3,0,0]}>
                  {dataEstadosKPI.map((_, i) => <Cell key={i} fill={["#94A3B8","#F59E0B","#06B6D4","#10B981"][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Tipo de Granja">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={dataTipoGranja} dataKey="cantidad" nameKey="name" outerRadius={70} label={(d:any)=>d.name}>
                  {dataTipoGranja.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip content={<Tip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Tipo Operativo">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={dataTipoOperativo} dataKey="cantidad" nameKey="name" outerRadius={70} label={(d:any)=>d.name}>
                  {dataTipoOperativo.map((_, i) => <Cell key={i} fill={["#10B981","#3B82F6"][i]} />)}
                </Pie>
                <Tooltip content={<Tip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Tendencia + Top 10 Granjas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Tendencia Mensual de Hallazgos">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dataTendencia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
                <XAxis dataKey="name" tick={{ fill:"#94A3B8", fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"#94A3B8", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Line type="monotone" dataKey="hallazgos" stroke="#F59E0B" strokeWidth={2.5} dot={{ fill:"#F59E0B", r:4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top 10 Granjas por Criticidad">
            {topGranjas.length === 0
              ? <Empty />
              : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                  {topGranjas.map(([nombre, score], i) => (
                    <div key={nombre} className="flex items-center gap-3 p-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A]">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{nombre}</p>
                        <div className="h-1 mt-1 bg-[#0D1526] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-500 to-red-500"
                               style={{ width: `${Math.min(100, score * 12)}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-amber-400 font-bold tabular-nums">{score}</span>
                    </div>
                  ))}
                </div>
              )}
          </ChartCard>
        </div>

        {/* Radar de Riesgo + Auditorías recientes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Radar de Riesgo por Categoría">
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={dataRadar}>
                <PolarGrid stroke="#1E2D4A" />
                <PolarAngleAxis dataKey="subject" tick={{ fill:"#94A3B8", fontSize:9 }} />
                <Radar name="Hallazgos" dataKey="value" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.25} />
                <Tooltip content={<Tip />} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="card-base">
            <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
              <ClipboardIcon /> Auditorías Recientes
            </h3>
            {auditorias.length === 0 ? (
              <Empty />
            ) : (
              <ul className="space-y-2">
                {auditorias.slice(0,5).map(a => (
                  <li key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A]">
                    <div className="w-2 h-2 rounded-full shrink-0"
                         style={{ background:
                           a.estado === "Aprobada"     ? "#10B981" :
                           a.estado === "Completada"   ? "#3B82F6" :
                           a.estado === "En Proceso"   ? "#F59E0B" :
                           a.estado === "No Aprobada"  ? "#EF4444" : "#94A3B8" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{a.granjaNombre}</p>
                      <p className="text-xs text-[#94A3B8]">{a.tipoAuditoria} · {a.fechaProgramada}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0D1526] border border-[#2A3F6A] text-[#94A3B8]">
                      {a.estado}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Diagnóstico ejecutivo */}
        <div className="card-base bg-gradient-to-br from-[#0D1526] to-[#1A1208] border-amber-900/30">
          <h3 className="font-display font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Diagnóstico Ejecutivo Inteligente
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#94A3B8] mb-2 font-semibold">Resumen automático</p>
              <p className="text-[#94A3B8] leading-relaxed">
                {totalGranjas === 0
                  ? "Sin datos para analizar. Cargue granjas y hallazgos en los módulos correspondientes para activar el motor de diagnóstico."
                  : `Se monitorean ${totalGranjas} granjas con un total de ${totalHallazgos} hallazgos. El riesgo dominante es "${riesgoDominante}". Granja con mayor criticidad: ${granjaMayorCrit}. Cumplimiento KPI actual: ${cumplimientoKPI}%.`}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[#94A3B8] mb-2 font-semibold">Recomendaciones automáticas</p>
              <ul className="space-y-1.5 text-[#94A3B8]">
                {riesgosCriticos > 0 && <li>• Priorizar atención de {riesgosCriticos} hallazgo(s) crítico(s)</li>}
                {kpiNoIniciados > 0 && <li>• Activar seguimiento de {kpiNoIniciados} KPI sin iniciar</li>}
                {cumplimientoKPI < 70 && cumplimientoKPI > 0 && <li>• Cumplimiento KPI por debajo del 70% — revisar planes</li>}
                {totalGranjas === 0 && <li>• Registrar granjas y veterinarios para activar el módulo</li>}
                <li>• Programar reuniones de comité con técnicos veterinarios responsables</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTES AUXILIARES ──────────────────────────────────────────────────
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
      <p className={`font-display font-bold text-white ${small ? "text-base leading-tight" : "text-2xl"}`}>{value}</p>
      <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{label}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-base">
      <h3 className="font-display font-semibold text-white mb-3 text-sm">{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return <div className="flex items-center justify-center h-[200px] text-[#475569] text-sm">Sin datos</div>;
}

function ClipboardIcon() {
  return (
    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}
