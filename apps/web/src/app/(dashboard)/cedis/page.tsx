"use client";
import { Header } from "@/components/layout/header";
import { useCedisStore } from "@/store/cedis.store";
import { useShallow } from "zustand/react/shallow";
import {
  TIPO_RIESGO_CEDI, CRITICIDAD_CEDI, ESTADO_HALLAZGO_CEDI, CATEGORIA_CEDI,
} from "@/lib/cedis.constants";
import { AUDITORS } from "@/lib/constants";
import {
  Warehouse, AlertTriangle, Activity, Target, TrendingUp,
  Building2, Users, Sparkles, MapPin,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LabelList,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// Un color por mes para las barras de visitas (estética consistente con Granjas)
const MES_COLORS = ["#10B981","#3B82F6","#F59E0B","#8B5CF6","#EF4444","#06B6D4","#EC4899","#F97316","#14B8A6","#A855F7","#0EA5E9","#84CC16"];

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-lg p-3 text-xs shadow-card">
      {label && <p className="font-semibold text-white mb-1.5">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2 text-[#94A3B8]">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color ?? p.fill }} />
          {p.name}: <span className="text-white font-medium ml-1">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function CedisDashboardPage() {
  const cedis      = useCedisStore(useShallow((s) => s.cedis));
  const auditorias = useCedisStore(useShallow((s) => s.auditorias));
  const hallazgos  = useCedisStore(useShallow((s) => s.hallazgos));

  // ─── KPIs ──────────────────────────────────────────────────────────────────
  const cedisAuditados   = new Set(auditorias.map(a => a.cediId)).size;
  const hallazgosTotales = hallazgos.length;
  const incidencia       = cedis.length > 0 ? Math.round((cedisAuditados / cedis.length) * 100) : 0;
  const criticosAltos    = hallazgos.filter(h => h.criticidad === "Crítica" || h.criticidad === "Alta").length;
  const auditoresAsig    = new Set(auditorias.map(a => a.auditorId)).size;

  const riesgoCount: Record<string, number> = {};
  hallazgos.forEach(h => { riesgoCount[h.tipoRiesgo] = (riesgoCount[h.tipoRiesgo] ?? 0) + 1; });
  const riesgoDominante = Object.entries(riesgoCount).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? "—";

  const hallazgoCount: Record<string, number> = {};
  hallazgos.forEach(h => { hallazgoCount[h.titulo] = (hallazgoCount[h.titulo] ?? 0) + 1; });
  const hallazgoDominante = Object.entries(hallazgoCount).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? "—";

  // ─── DATOS PARA GRÁFICOS ───────────────────────────────────────────────────

  // Visitas a CEDIS por mes — desde el módulo Consolidado (auditorías). El mes/año
  // se lee del texto ISO (YYYY-MM) para evitar desfases de zona horaria (UTC-5).
  const MESES_ABBR = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const anioVisitas = (() => {
    const ys = auditorias.map(a => String(a.fechaVisita ?? "").slice(0, 4)).filter(s => s.length === 4);
    return ys.length ? ys.sort().reverse()[0] : String(new Date().getFullYear());
  })();
  const dataVisitasMes = MESES_ABBR.map((m, i) => {
    const mm = String(i + 1).padStart(2, "0");
    const visitas = auditorias.filter(a => {
      const f = String(a.fechaVisita ?? "");
      return f.slice(0, 4) === anioVisitas && f.slice(5, 7) === mm;
    }).length;
    return { name: m, visitas };
  });

  // Hallazgos por categoría
  const dataCategorias = CATEGORIA_CEDI.map(c => ({
    name: c, value: hallazgos.filter(h => h.categoria === c).length,
  })).filter(d => d.value > 0);

  // Tipos de riesgo
  const dataRiesgos = TIPO_RIESGO_CEDI.map(r => ({
    name: r, value: riesgoCount[r] ?? 0,
  })).filter(d => d.value > 0);

  // Ranking de CEDIS
  const rankingCedis = cedis.map(c => ({
    nombre: c.nombre,
    auditorias: auditorias.filter(a => a.cediId === c.id).length,
    hallazgos:  hallazgos.filter(h => h.cediId === c.id).length,
    criticidad: hallazgos.filter(h => h.cediId === c.id && (h.criticidad === "Crítica" || h.criticidad === "Alta")).length,
  })).sort((a,b)=>b.hallazgos-a.hallazgos).slice(0,8);

  // Criticidad
  const dataCriticidad = CRITICIDAD_CEDI.map(c => ({
    name: c, value: hallazgos.filter(h => h.criticidad === c).length,
  })).filter(d => d.value > 0);

  // Auditores asignados
  const auditorCount: Record<string, number> = {};
  auditorias.forEach(a => { auditorCount[a.auditorNombre] = (auditorCount[a.auditorNombre] ?? 0) + 1; });
  const dataAuditores = Object.entries(auditorCount).map(([name, value]) => ({ name: name.split(" ").slice(0,2).join(" "), value }));

  // Radar por categoría
  const dataRadar = CATEGORIA_CEDI.map(c => ({
    subject: c.length > 10 ? c.slice(0,9) + "…" : c,
    value: hallazgos.filter(h => h.categoria === c).length,
  }));

  // ─── ANÁLISIS IA POR ÁREA ──────────────────────────────────────────────────
  const insightsPorArea = [
    { area: "Cartera",         hallazgos: hallazgos.filter(h => h.categoria === "Cartera"),         icon: "💰" },
    { area: "Inventario",      hallazgos: hallazgos.filter(h => h.categoria === "Inventario"),       icon: "📦" },
    { area: "Caja",            hallazgos: hallazgos.filter(h => h.categoria === "Caja"),             icon: "💵" },
    { area: "Logística",       hallazgos: hallazgos.filter(h => h.categoria === "Logística"),        icon: "🚚" },
    { area: "Bioseguridad",    hallazgos: hallazgos.filter(h => h.categoria === "Bioseguridad"),     icon: "🛡️" },
    { area: "Infraestructura", hallazgos: hallazgos.filter(h => h.categoria === "Infraestructura"),  icon: "🏗️" },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Dashboard Ejecutivo · CEDIS"
        subtitle={`${cedis.length} CEDIS · ${cedisAuditados} auditados (${incidencia}%) · ${hallazgosTotales} hallazgos`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Banner: link al nuevo dashboard ejecutivo CEDIS */}
        <a
          href="/cedis/ejecutivo"
          className="card-base p-4 flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 hover:border-amber-500/40 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/30 to-emerald-500/30 border border-emerald-500/40 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400"/>
            </div>
            <div>
              <p className="font-display font-bold text-white text-sm">Dashboard Ejecutivo Avanzado · CEDIS</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                15 KPIs · 6 charts · Heatmap subtema×CEDI · Análisis IA · Semaforización · Trazabilidad
              </p>
            </div>
          </div>
          <span className="text-amber-400 text-sm font-semibold group-hover:translate-x-1 transition-transform">Ver dashboard →</span>
        </a>

        {/* Banner */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0A2D1F] via-[#0F4A3A] to-[#0A2D1F] border border-emerald-900/40 px-6 py-5">
          <div className="absolute right-0 top-0 bottom-0 w-48 opacity-[0.08]"
               style={{ backgroundImage: "repeating-linear-gradient(45deg, #10B981 0, #10B981 1px, transparent 0, transparent 50%)", backgroundSize: "10px 10px" }} />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-emerald-400 mb-1">
                Auditoría Centros de Distribución · Control Interno
              </p>
              <h2 className="font-display text-3xl font-bold text-white">Diagnóstico Ejecutivo CEDIS</h2>
              <p className="text-[#94A3B8] text-sm mt-1">
                {cedis.length > 0
                  ? `${cedis.length} CEDIS monitoreados · ${criticosAltos} hallazgos crítico/alto · ${auditoresAsig} auditores asignados`
                  : "Sin CEDIS registrados — comience cargando datos"}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-emerald-300">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-medium">Análisis IA · Tiempo real</span>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Kpi icon={<Warehouse/>}     label="CEDIS Auditados"        value={cedisAuditados}                       color="#10B981" />
          <Kpi icon={<AlertTriangle/>} label="Hallazgos Totales"      value={hallazgosTotales}                     color="#F59E0B" />
          <Kpi icon={<Target/>}        label="% Incidencia"           value={`${incidencia}%`}                     color="#06B6D4" />
          <Kpi icon={<AlertTriangle/>} label="Críticos/Altos"         value={criticosAltos} alert={criticosAltos>0} color="#EF4444" />
          <Kpi icon={<Users/>}         label="Auditores Asignados"    value={auditoresAsig}                        color="#3B82F6" />
          <Kpi icon={<Activity/>}      label="Riesgo Dominante"       value={riesgoDominante}                      color="#8B5CF6" small />
          <Kpi icon={<Sparkles/>}      label="Hallazgo Dominante"     value={hallazgoDominante}                    color="#EC4899" small />
        </div>

        {/* Tendencia mensual + Distribución porcentual */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title={`CEDIS Visitados por Mes · ${anioVisitas}`} colSpan="lg:col-span-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dataVisitasMes} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
                <XAxis dataKey="name" tick={{ fill:"#94A3B8", fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill:"#94A3B8", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} cursor={{ fill: "#1E2D4A33" }} />
                <Bar dataKey="visitas" name="Visitas" radius={[4,4,0,0]} maxBarSize={46}>
                  {dataVisitasMes.map((_, i) => <Cell key={i} fill={MES_COLORS[i % 12]} />)}
                  <LabelList dataKey="visitas" position="top" fill="#E2E8F0" fontSize={11} formatter={(v: any) => (v > 0 ? v : "")} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Distribución por Categoría">
            {dataCategorias.length === 0 ? <Empty/> : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={dataCategorias} dataKey="value" nameKey="name" outerRadius={80} innerRadius={40} label={(d:any)=>d.value}>
                    {dataCategorias.map((_, i) => <Cell key={i} fill={["#10B981","#3B82F6","#F59E0B","#8B5CF6","#EF4444","#06B6D4","#EC4899"][i % 7]} />)}
                  </Pie>
                  <Tooltip content={<Tip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Ranking CEDIS + Riesgos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Ranking de CEDIS por Hallazgos">
            {rankingCedis.length === 0 ? <Empty/> : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
                {rankingCedis.map((c, i) => (
                  <div key={c.nombre} className="flex items-center gap-3 p-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A]">
                    <span className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.nombre}</p>
                      <p className="text-[10px] text-[#94A3B8]">{c.auditorias} auditoría(s) · {c.criticidad} crítico/alto</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-300">{c.hallazgos}</span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          <ChartCard title="Tipos de Riesgo Identificados">
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

        {/* Auditores + Criticidad + Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Auditores Asignados por CEDI">
            {dataAuditores.length === 0 ? <Empty/> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dataAuditores} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill:"#94A3B8", fontSize:9 }} angle={-25} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:"#94A3B8", fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="value" fill="#10B981" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Distribución Criticidad">
            {dataCriticidad.length === 0 ? <Empty/> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={dataCriticidad} dataKey="value" nameKey="name" outerRadius={70} label={(d:any)=>d.name}>
                    {dataCriticidad.map((_, i) => <Cell key={i} fill={["#EF4444","#F59E0B","#3B82F6","#94A3B8"][["Crítica","Alta","Media","Baja"].indexOf(dataCriticidad[i].name)]} />)}
                  </Pie>
                  <Tooltip content={<Tip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Cobertura por Categoría (Radar)">
            {dataRadar.length === 0 ? <Empty/> : (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={dataRadar}>
                  <PolarGrid stroke="#1E2D4A" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill:"#94A3B8", fontSize:9 }} />
                  <Radar name="Hallazgos" dataKey="value" stroke="#10B981" fill="#10B981" fillOpacity={0.25} />
                  <Tooltip content={<Tip />} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Análisis IA por área */}
        <div className="card-base bg-gradient-to-br from-[#0D1526] to-[#0A2D1F] border-emerald-900/30">
          <h3 className="font-display font-semibold text-emerald-400 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Análisis Ejecutivo IA por Área
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {insightsPorArea.map(({ area, hallazgos: hh, icon }) => {
              const crit = hh.filter(h => h.criticidad === "Crítica" || h.criticidad === "Alta").length;
              return (
                <div key={area} className="bg-[#1A2540] border border-[#2A3F6A] rounded-lg p-3">
                  <div className="text-lg mb-1">{icon}</div>
                  <p className="text-xs font-bold text-white">{area}</p>
                  <p className="text-[10px] text-[#94A3B8] mt-1">{hh.length} hallazgo(s)</p>
                  {crit > 0 && <p className="text-[10px] text-red-400 font-semibold mt-0.5">{crit} crítico/alto</p>}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#1E2D4A] text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#94A3B8] mb-2 font-semibold">Resumen automático</p>
              <p className="text-[#94A3B8] leading-relaxed">
                {hallazgosTotales === 0
                  ? "Sin datos suficientes. Cargue auditorías en el módulo Consolidado."
                  : `${cedisAuditados} CEDIS auditados sobre ${cedis.length} registrados (${incidencia}% incidencia). El riesgo dominante es "${riesgoDominante}". ${criticosAltos} hallazgos requieren atención crítica/alta.`}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[#94A3B8] mb-2 font-semibold">Recomendaciones</p>
              <ul className="space-y-1 text-[#94A3B8]">
                {criticosAltos > 0 && <li>• Priorizar atención de {criticosAltos} hallazgo(s) crítico/alto</li>}
                {hallazgos.filter(h => h.reincidente).length > 0 && (
                  <li>• Plan urgente para hallazgos reincidentes</li>
                )}
                {incidencia < 70 && cedis.length > 0 && <li>• Cobertura de auditoría por debajo del 70%</li>}
                <li>• Comité ejecutivo mensual con responsables CEDI</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, color, alert, small }: {
  icon: React.ReactNode; label: string; value: number | string; color: string; alert?: boolean; small?: boolean;
}) {
  return (
    <div className={`card-base relative overflow-hidden ${alert ? "ring-1 ring-red-500/40" : ""}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, color }}>{icon}</div>
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
