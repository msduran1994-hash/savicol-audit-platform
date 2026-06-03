"use client";
import { Header } from "@/components/layout/header";
import { useAuditStore } from "@/store/audit.store";
import { useShallow } from "zustand/react/shallow";
import { AUDITORS, AUDIT_AREAS, MONTHS_2026 } from "@/lib/constants";
import { calculateCompletionRate } from "@/lib/utils";
import { useDashboardEjecutivo } from "@/hooks/useDashboardEjecutivo";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, Radar,
} from "recharts";
import {
  TrendingUp, BarChart2, Target, Tractor, Truck, Warehouse,
  AlertTriangle, ShieldCheck, Activity, Loader2, Sparkles,
} from "lucide-react";

const ChartTooltip = ({ active, payload, label }: any) => {
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

export default function IndicadoresPage() {
  const activities = useAuditStore(useShallow((s) => s.activities));
  const ejecutivoQ = useDashboardEjecutivo();
  const ejec       = ejecutivoQ.data;

  // Monthly completion
  const monthlyData = MONTHS_2026.map(m => {
    const month = activities.filter(a => new Date(a.startDate).getMonth() + 1 === m.value);
    return {
      name: m.short,
      Total: month.length,
      Completadas: month.filter(a => a.status === "COMPLETED").length,
      "En Curso": month.filter(a => a.status === "IN_PROGRESS").length,
    };
  });

  // By auditor
  const auditorData = AUDITORS.map(a => {
    const mine = activities.filter(act => act.auditorId === a.id);
    const done = mine.filter(x => x.status === "COMPLETED").length;
    return {
      name: a.name.split(" ")[0],
      Asignadas: mine.length,
      Completadas: done,
      Cumplimiento: mine.length > 0 ? Math.round((done / mine.length) * 100) : 0,
    };
  });

  // By area (top 8)
  const areaData = AUDIT_AREAS.slice(0, 8).map(area => {
    const areaActivities = activities.filter(a => a.area === area);
    const done = areaActivities.filter(a => a.status === "COMPLETED").length;
    return {
      name: area.length > 20 ? area.slice(0, 18) + "…" : area,
      Actividades: areaActivities.length,
      "% Cumplimiento": areaActivities.length > 0 ? Math.round((done / areaActivities.length) * 100) : 0,
    };
  }).filter(d => d.Actividades > 0);

  // Radar per auditor
  const radarData = AUDITORS.map(a => {
    const mine = activities.filter(act => act.auditorId === a.id);
    const done = mine.filter(x => x.status === "COMPLETED").length;
    return { subject: a.name.split(" ")[0], value: mine.length > 0 ? Math.round((done/mine.length)*100) : 0 };
  });

  const totalRate = calculateCompletionRate(activities);

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Indicadores y Analítica"
        subtitle={`Análisis ejecutivo · Año 2026 · ${totalRate}% cumplimiento general`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Banner · Dashboard Ejecutivo avanzado */}
        <a
          href="/indicadores/ejecutivo"
          className="card-base p-4 flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-amber-500/5 to-transparent border-purple-500/30 hover:border-amber-500/40 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/30 to-amber-500/30 border border-purple-500/40 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400"/>
            </div>
            <div>
              <p className="font-display font-bold text-white text-sm">Dashboard Ejecutivo Avanzado · Cronograma</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                13 KPIs · 8 gráficos · Matriz de riesgo · IA · Trazabilidad · Filtros globales · Export PDF/Excel
              </p>
            </div>
          </div>
          <span className="text-amber-400 text-sm font-semibold group-hover:translate-x-1 transition-transform">Ver dashboard →</span>
        </a>

        {/* Dashboard Ejecutivo · cross-workspace (NUEVO · desde API) */}
        <div>
          <h2 className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-3 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5"/>
            Dashboard Ejecutivo · cross-workspace
            {ejecutivoQ.isFetching && <Loader2 className="w-3 h-3 animate-spin"/>}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <KpiCard label="Granjas"        value={ejec?.workspaces.granjas.total ?? "—"}     sub={ejec ? `${ejec.workspaces.granjas.enRiesgo} en riesgo` : ""}   icon={<Tractor/>}       color="#3B82F6"/>
            <KpiCard label="Rutas"          value={ejec?.workspaces.rutas.total ?? "—"}       sub={ejec ? `${ejec.workspaces.rutas.activas} activas`     : ""}   icon={<Truck/>}         color="#10B981"/>
            <KpiCard label="CEDIS"          value={ejec?.workspaces.cedis.total ?? "—"}       sub={ejec ? `${ejec.workspaces.cedis.activos} activos`     : ""}   icon={<Warehouse/>}     color="#F59E0B"/>
            <KpiCard label="Hallazgos"      value={ejec?.hallazgos.total ?? "—"}              sub={ejec ? `${ejec.hallazgos.criticos} críticos`          : ""}   icon={<AlertTriangle/>} color="#EF4444"/>
            <KpiCard label="KPI Cumplim."   value={ejec ? `${ejec.kpi.cumplimiento}%` : "—"}  sub={ejec ? `${ejec.kpi.completados} completados`          : ""}   icon={<Target/>}        color="#8B5CF6"/>
            <KpiCard label="Cronograma"     value={ejec ? `${ejec.cronograma.progreso}%` : "—"} sub={ejec ? `${ejec.cronograma.completadas}/${ejec.cronograma.total}` : ""} icon={<ShieldCheck/>} color="#06B6D4"/>
          </div>
        </div>

        {/* Summary KPIs cronograma (legacy · datos locales) */}
        <div>
          <h2 className="text-xs uppercase tracking-wider text-[#94A3B8] font-semibold mb-3">
            Cronograma 2026 · análisis local
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Tasa de Cumplimiento", value: `${totalRate}%`, icon: <Target />, color: "blue" },
              { label: "Total Actividades", value: activities.length, icon: <BarChart2 />, color: "amber" },
              { label: "Auditores Activos", value: AUDITORS.filter(a => activities.some(act => act.auditorId === a.id)).length, icon: <TrendingUp />, color: "green" },
              { label: "Áreas Cubiertas", value: new Set(activities.map(a => a.area)).size, icon: <Target />, color: "cyan" },
            ].map(({ label, value, color }) => (
              <div key={label} className="card-base">
                <p className="text-xs text-[#475569] mb-1">{label}</p>
                <p className="font-display text-3xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly trend */}
        <div className="card-base">
          <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" /> Comparativo de Cumplimiento Mensual 2026
          </h3>
          {activities.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-[#475569] text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
                <XAxis dataKey="name" tick={{ fill:"#94A3B8", fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"#94A3B8", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize:"11px", color:"#94A3B8" }} />
                <Line type="monotone" dataKey="Total"      stroke="#3B82F6" strokeWidth={2} dot={{ fill:"#3B82F6", r:3 }} />
                <Line type="monotone" dataKey="Completadas" stroke="#10B981" strokeWidth={2} dot={{ fill:"#10B981", r:3 }} />
                <Line type="monotone" dataKey="En Curso"   stroke="#F59E0B" strokeWidth={2} dot={{ fill:"#F59E0B", r:3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Auditor bar chart */}
          <div className="card-base">
            <h3 className="font-display font-semibold text-white mb-4">Cumplimiento por Auditor</h3>
            {activities.length === 0 ? (
              <div className="flex items-center justify-center h-44 text-[#475569] text-sm">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={auditorData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill:"#94A3B8", fontSize:10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:"#94A3B8", fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Asignadas"  fill="#3B82F6" radius={[3,3,0,0]} />
                  <Bar dataKey="Completadas" fill="#10B981" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Radar */}
          <div className="card-base">
            <h3 className="font-display font-semibold text-white mb-4">Índice de Cumplimiento por Auditor</h3>
            {activities.length === 0 ? (
              <div className="flex items-center justify-center h-44 text-[#475569] text-sm">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1E2D4A" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill:"#94A3B8", fontSize:10 }} />
                  <Radar name="Cumplimiento %" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                  <Tooltip content={<ChartTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Area distribution */}
        {areaData.length > 0 && (
          <div className="card-base">
            <h3 className="font-display font-semibold text-white mb-4">Distribución de Cumplimiento por Área</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={areaData} layout="vertical" barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false} />
                <XAxis type="number" tick={{ fill:"#94A3B8", fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fill:"#94A3B8", fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="Actividades" fill="#3B82F6" radius={[0,3,3,0]} />
                <Bar dataKey="% Cumplimiento" fill="#10B981" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activities.length === 0 && (
          <div className="card-base flex flex-col items-center justify-center py-16 text-center">
            <BarChart2 className="w-10 h-10 text-[#1E2D4A] mb-4" />
            <p className="text-white font-semibold mb-2">Sin datos para analizar</p>
            <p className="text-[#475569] text-sm">
              Registra actividades en el <a href="/cronograma" className="text-blue-400 hover:underline">Cronograma 2026</a> para ver los indicadores.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── KpiCard · tarjeta compacta del Dashboard Ejecutivo ── */
function KpiCard({
  label, value, sub, icon, color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="card-base flex items-start gap-3 p-3" style={{ borderColor: `${color}30` }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
           style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider truncate">{label}</p>
        <p className="font-display text-xl font-bold text-white leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-[#475569] mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}
