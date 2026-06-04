"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// Informe Ejecutivo Gerencial · cross-módulo · vista C-level
// ═══════════════════════════════════════════════════════════════════════════════
// Agrega: Cronograma · Granjas · Rutas · CEDIS + KPIs ejecutivos unificados
// ═══════════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { useDashboardEjecutivo } from "@/hooks/useDashboardEjecutivo";
import { useCronogramaExecutive } from "@/hooks/useCronogramaExecutive";
import { useRutasExecutive } from "@/hooks/useRutasExecutive";
import { useCedisExecutive, useCedisAiSummary } from "@/hooks/useCedisExecutive";
import { useAuthStore } from "@/store/auth.store";
import {
  ResponsiveContainer, BarChart, Bar, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PolarAngleAxis,
} from "recharts";
import {
  Tractor, Truck, Warehouse, Calendar, AlertTriangle, ShieldCheck, Target,
  Sparkles, Activity, DollarSign, Package, Users, Gauge, AlertOctagon,
  FileSpreadsheet, FileText, RefreshCw, Loader2, Award, TrendingUp,
  ArrowRight, ChevronUp, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function InformeGerencialPage() {
  const [aiOpen, setAiOpen]       = useState(true);
  const [aiTrigger, setAiTrigger] = useState(true);

  const dashQ      = useDashboardEjecutivo();
  const cronoQ     = useCronogramaExecutive({ year: 2026 });
  const rutasQ     = useRutasExecutive({ year: 2026 });
  const cedisQ     = useCedisExecutive({ year: 2026 });
  const cedisAiQ   = useCedisAiSummary({ year: 2026 }, aiTrigger);

  const dash  = dashQ.data;
  const crono = cronoQ.data;
  const rutas = rutasQ.data;
  const cedis = cedisQ.data;

  const isLoading = dashQ.isLoading || cronoQ.isLoading || rutasQ.isLoading || cedisQ.isLoading;

  // ── KPIs Top-Level Unificados ──
  const topKpis = useMemo(() => {
    if (!dash || !crono || !rutas || !cedis) return [];

    const totalHallazgos        = dash.hallazgos.total;
    const totalHallazgosCriticos= dash.hallazgos.criticos;
    const cumplimientoCronograma= crono.kpis.porcentajeCumplimientoGeneral;
    const cumplimientoKPI       = dash.kpi.cumplimiento;
    const coberturaCedis        = cedis.kpis.coberturaPercent;
    const valorDevueltoRutas    = rutas.kpis.totalValorDevueltoCOP;
    const tasaResolucionCedis   = cedis.kpis.tasaResolucion;
    const indiceCriticidadCedis = cedis.kpis.indiceCriticidad;

    return [
      {
        label: "Cronograma cumplim.", value: `${cumplimientoCronograma}%`,
        icon: <Calendar/>, color: "#3B82F6",
        link: "/indicadores/ejecutivo",
        sub: `${crono.kpis.actividadesCompletadas}/${crono.kpis.actividadesPlanificadas}`,
      },
      {
        label: "Hallazgos totales", value: totalHallazgos,
        icon: <AlertTriangle/>, color: "#F97316",
        link: "/granjas/hallazgos",
        sub: `${totalHallazgosCriticos} críticos`,
      },
      {
        label: "Cobertura CEDIS", value: `${coberturaCedis}%`,
        icon: <Warehouse/>, color: "#8B5CF6",
        link: "/cedis/ejecutivo",
        sub: `${cedis.kpis.cedisAuditados} CEDIS auditados`,
      },
      {
        label: "Cumplim. KPI Granjas", value: `${cumplimientoKPI}%`,
        icon: <Tractor/>, color: "#10B981",
        link: "/granjas/kpi",
        sub: `${dash.kpi.completados} completados`,
      },
      {
        label: "Valor devuelto Rutas", value: `$${(valorDevueltoRutas / 1_000_000).toFixed(1)}M`,
        icon: <Truck/>, color: "#F59E0B",
        link: "/rutas/ejecutivo",
        sub: `${rutas.kpis.totalKgDevueltos} kg`,
      },
      {
        label: "Tasa resolución CEDIS", value: `${tasaResolucionCedis}%`,
        icon: <ShieldCheck/>, color: "#06B6D4",
        link: "/cedis/ejecutivo",
        sub: `${cedis.kpis.hallazgosCerrados} cerrados`,
      },
      {
        label: "Índice crit. CEDIS", value: `${indiceCriticidadCedis}/100`,
        icon: <AlertOctagon/>, color: indiceCriticidadCedis >= 50 ? "#EF4444" : indiceCriticidadCedis >= 30 ? "#F59E0B" : "#10B981",
        link: "/cedis/ejecutivo",
        sub: `${cedis.kpis.criticos} críticos`,
      },
      {
        label: "Usuarios activos", value: dash.usuarios.activos,
        icon: <Users/>, color: "#EC4899",
        link: "/configuracion",
        sub: `${dash.usuarios.total} totales`,
      },
    ];
  }, [dash, crono, rutas, cedis]);

  // ── Datos para radial (estado global por workspace) ──
  const radialData = useMemo(() => {
    if (!crono || !rutas || !cedis) return [];
    return [
      { name: "Cronograma", value: crono.kpis.porcentajeCumplimientoGeneral, fill: "#3B82F6" },
      { name: "Granjas",    value: dash?.kpi.cumplimiento ?? 0,             fill: "#10B981" },
      { name: "Rutas",      value: rutas.kpis.tasaResolucion ?? 0,           fill: "#F59E0B" },
      { name: "CEDIS",      value: cedis.kpis.tasaResolucion,                fill: "#8B5CF6" },
    ];
  }, [crono, rutas, cedis, dash]);

  // ── Comparativo workspaces ──
  const compData = useMemo(() => {
    if (!crono || !rutas || !cedis) return [];
    return [
      { workspace: "Cronograma", Total: crono.kpis.actividadesPlanificadas, Completado: crono.kpis.actividadesCompletadas, Pendiente: crono.kpis.actividadesNoIniciadas + crono.kpis.actividadesEnCurso, Crítico: crono.kpis.actividadesVencidas },
      { workspace: "Rutas",      Total: rutas.kpis.totalAcompanamientos,    Completado: rutas.kpis.cerrados + rutas.kpis.completados, Pendiente: rutas.kpis.programados + rutas.kpis.enCurso, Crítico: rutas.kpis.criticos },
      { workspace: "CEDIS",      Total: cedis.kpis.totalHallazgos,          Completado: cedis.kpis.hallazgosCerrados, Pendiente: cedis.kpis.hallazgosAbiertos + cedis.kpis.hallazgosEnPlan, Crítico: cedis.kpis.criticos },
    ];
  }, [crono, rutas, cedis]);

  const downloadCronoExcel = async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
    const r = await fetch(`${apiBase}/api/v1/reports/cronograma/excel?year=2026`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return alert("Error");
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `informe-ejecutivo-${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Informe Ejecutivo Gerencial"
        subtitle={isLoading
          ? "Cargando vista C-level..."
          : `4 workspaces · ${dash?.usuarios.total ?? 0} usuarios · ${dash?.hallazgos.total ?? 0} hallazgos totales · vista en tiempo real`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4"/> Vista C-Level · cross-workspace
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => { dashQ.refetch(); cronoQ.refetch(); rutasQ.refetch(); cedisQ.refetch(); }} className="p-1.5 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8] hover:text-white">
              <RefreshCw className={cn("w-4 h-4", (dashQ.isFetching || cronoQ.isFetching || rutasQ.isFetching || cedisQ.isFetching) && "animate-spin")}/>
            </button>
            <button onClick={downloadCronoExcel} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-300 flex items-center gap-2 hover:bg-emerald-500/20">
              <FileSpreadsheet className="w-3.5 h-3.5"/> Excel Cronograma
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="card-base p-12 flex items-center justify-center text-[#475569]">
            <Loader2 className="w-6 h-6 animate-spin"/>
            <span className="ml-3 text-sm">Cargando informe ejecutivo...</span>
          </div>
        )}

        {!isLoading && dash && (
          <>
            {/* AI Summary del CEDIS · servirá de resumen estratégico general */}
            <div className="card-base border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-amber-500/5">
              <button onClick={() => setAiOpen(!aiOpen)} className="w-full flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/30 to-amber-500/30 border border-purple-500/40 flex items-center justify-center">
                    <Sparkles className={cn("w-5 h-5 text-amber-400", cedisAiQ.isFetching && "animate-pulse")}/>
                  </div>
                  <div className="text-left">
                    <p className="font-display font-bold text-white">Resumen Ejecutivo Estratégico</p>
                    <p className="text-[10px] text-[#94A3B8]">
                      {cedisAiQ.data?.mode === "claude" ? "🤖 Claude IA · análisis profundo" : "📊 Heurístico · operacional"}
                    </p>
                  </div>
                </div>
                {aiOpen ? <ChevronUp className="w-4 h-4 text-purple-300"/> : <ChevronDown className="w-4 h-4 text-purple-300"/>}
              </button>
              {aiOpen && cedisAiQ.data && (
                <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ExecSection title="📋 Resumen ejecutivo" items={cedisAiQ.data.resumen} accent="purple"/>
                  <ExecSection title="🎯 Recomendaciones estratégicas" items={cedisAiQ.data.recomendaciones} accent="emerald"/>
                  <ExecSection title="🚨 Riesgos operativos" items={cedisAiQ.data.riesgos} accent="red"/>
                  <ExecSection title="💡 Oportunidades de mejora" items={cedisAiQ.data.oportunidades} accent="amber"/>
                </div>
              )}
            </div>

            {/* Top-Level KPIs */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-[#94A3B8] font-semibold mb-3 flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-amber-400"/> KPIs Estratégicos (drill-through al click)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {topKpis.map((k, i) => (
                  <a key={i} href={k.link} className="card-base p-4 hover:scale-[1.02] transition-transform group" style={{ borderColor: `${k.color}30` }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${k.color}18`, color: k.color }}>
                        {k.icon}
                      </div>
                      <ArrowRight className="w-3 h-3 text-[#475569] group-hover:text-amber-400 group-hover:translate-x-1 transition-all"/>
                    </div>
                    <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{k.label}</p>
                    <p className="font-display text-2xl font-bold text-white mt-1">{k.value}</p>
                    <p className="text-[10px] text-[#475569] mt-1">{k.sub}</p>
                  </a>
                ))}
              </div>
            </div>

            {/* Radial Cumplimiento + Comparativo */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card-base p-4">
                <h3 className="font-display font-bold text-white text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400"/> Cumplimiento por workspace
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RadialBarChart innerRadius="20%" outerRadius="90%" data={radialData} startAngle={90} endAngle={-270}>
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false}/>
                    <RadialBar background dataKey="value" cornerRadius={6} angleAxisId={0}/>
                    <Legend iconSize={12} wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }}/>
                    <Tooltip />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>

              <div className="card-base p-4">
                <h3 className="font-display font-bold text-white text-sm mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400"/> Comparativo Operativo
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={compData} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false}/>
                    <XAxis dataKey="workspace" tick={{ fill: "#94A3B8", fontSize: 11 }}/>
                    <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }}/>
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }}/>
                    <Bar dataKey="Completado" stackId="a" fill="#10B981" radius={[3,3,0,0]}/>
                    <Bar dataKey="Pendiente"  stackId="a" fill="#F59E0B"/>
                    <Bar dataKey="Crítico"    stackId="a" fill="#EF4444" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Drill-down links */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <DrillCard label="Cronograma · Detalle" href="/indicadores/ejecutivo" icon={<Calendar className="w-4 h-4"/>} color="#3B82F6"/>
              <DrillCard label="Granjas · KPIs"        href="/granjas/kpi"           icon={<Tractor className="w-4 h-4"/>}  color="#10B981"/>
              <DrillCard label="Rutas · Ejecutivo"     href="/rutas/ejecutivo"       icon={<Truck className="w-4 h-4"/>}    color="#F59E0B"/>
              <DrillCard label="CEDIS · Ejecutivo"     href="/cedis/ejecutivo"       icon={<Warehouse className="w-4 h-4"/>}color="#8B5CF6"/>
            </div>

            {/* Banner descargas */}
            <div className="card-base p-4 bg-gradient-to-br from-cyan-500/5 to-emerald-500/5 border-cyan-500/20">
              <h3 className="font-display font-bold text-white text-sm flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-cyan-400"/> Centro de Reportes Ejecutivos
              </h3>
              <p className="text-xs text-[#94A3B8] mb-3">Acceso rápido a reportes detallados con datos en tiempo real.</p>
              <div className="flex gap-2 flex-wrap">
                <a href="/rutas/reportes" className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-xs text-cyan-300 hover:bg-cyan-500/25 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3 h-3"/> Reportes Rutas
                </a>
                <a href="/cedis/reportes" className="px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-xs text-purple-300 hover:bg-purple-500/25 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3 h-3"/> Reportes CEDIS
                </a>
                <a href="/granjas/reportes" className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 hover:bg-emerald-500/25 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3 h-3"/> Reportes Granjas
                </a>
                <a href="/indicadores/powerbi" className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 hover:bg-amber-500/25 flex items-center gap-1.5">
                  <Activity className="w-3 h-3"/> Power BI Embed
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ExecSection({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  const colorMap: Record<string, string> = {
    purple:  "border-purple-500/20 bg-purple-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    red:     "border-red-500/20 bg-red-500/5",
    amber:   "border-amber-500/20 bg-amber-500/5",
  };
  return (
    <div className={cn("rounded-lg border p-3", colorMap[accent])}>
      <p className="text-xs font-semibold text-white mb-2">{title}</p>
      <ul className="space-y-1.5 text-xs text-[#94A3B8]">
        {items.length === 0 ? <li className="text-[#475569]">Sin datos</li> : items.map((it, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="text-amber-400">•</span>
            <span dangerouslySetInnerHTML={{ __html: it.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>') }}/>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DrillCard({ label, href, icon, color }: { label: string; href: string; icon: React.ReactNode; color: string }) {
  return (
    <a href={href} className="card-base p-3 flex items-center gap-3 hover:scale-[1.02] transition-transform group" style={{ borderColor: `${color}30` }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <span className="text-sm text-white font-medium flex-1 min-w-0 truncate">{label}</span>
      <ArrowRight className="w-3 h-3 text-[#475569] group-hover:text-amber-400 group-hover:translate-x-1 transition-all"/>
    </a>
  );
}
