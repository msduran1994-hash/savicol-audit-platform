"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard Ejecutivo · CEDIS
// ═══════════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { useCedisExecutive, useCedisAiSummary, type CedisFilters } from "@/hooks/useCedisExecutive";
import { useAuthStore } from "@/store/auth.store";
import { useCedis } from "@/hooks/useCedis";
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
} from "recharts";
import { barLabelPct, sumField } from "@/lib/chart-pct";
import {
  Warehouse, Activity, AlertTriangle, ShieldCheck, Target, Users, Sparkles,
  Filter, RefreshCw, FileSpreadsheet, FileText, Loader2,
  X, ChevronDown, ChevronUp, Award, Gauge, AlertOctagon, Bug, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CEDIS_OFICIALES = [
  { id: "CEDI-CODABAS",   nombre: "CEDI Codabas" },
  { id: "CEDI-TUNJA",     nombre: "CEDI Tunja" },
  { id: "CEDI-GIRARDOT",  nombre: "CEDI Girardot" },
  { id: "CEDI-VILLAVO",   nombre: "CEDI Villavicencio" },
  { id: "CEDI-PRINCIPAL", nombre: "Principal Savicol" },
];

const SUBTEMAS_LIST = [
  "Inventario", "Caja", "Cartera", "Logística",
  "Bioseguridad", "Infraestructura", "Procedimientos",
];

const CRITICIDAD_COLOR: Record<string, string> = {
  CRITICA: "#EF4444", Crítica: "#EF4444",
  ALTA: "#F97316",    Alta: "#F97316",
  MEDIA: "#F59E0B",   Media: "#F59E0B",
  BAJA: "#10B981",    Baja: "#10B981",
};

const ESTADO_COLOR: Record<string, string> = {
  ABIERTO: "#EF4444",          Abierto: "#EF4444",
  EN_PLAN: "#F59E0B",          "En Plan": "#F59E0B",
  EN_VERIFICACION: "#06B6D4",  "En Verificación": "#06B6D4",
  CERRADO: "#10B981",          Cerrado: "#10B981",
  REINCIDENTE: "#A855F7",      Reincidente: "#A855F7",
};

const SEVERITY_STYLE: Record<string, { bg: string; border: string; text: string; emoji: string }> = {
  CRITICAL: { bg: "bg-red-500/10",     border: "border-red-500/30",     text: "text-red-300",     emoji: "🚨" },
  HIGH:     { bg: "bg-orange-500/10",  border: "border-orange-500/30",  text: "text-orange-300",  emoji: "⚠️" },
  MEDIUM:   { bg: "bg-amber-500/10",   border: "border-amber-500/30",   text: "text-amber-300",   emoji: "⚡" },
  INFO:     { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-300", emoji: "📋" },
};

export default function CedisEjecutivoPage() {
  const [filters, setFilters]         = useState<CedisFilters>({ year: 2026 });
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [aiOpen, setAiOpen]           = useState(true);
  const [aiTrigger, setAiTrigger]     = useState(false);

  const execQ = useCedisExecutive(filters);
  const aiQ   = useCedisAiSummary(filters, aiTrigger);
  const cedisQ = useCedis();

  const exec = execQ.data;
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

  const filterOptions = useMemo(() => {
    if (!exec) return { categorias: [], auditores: [] };
    return {
      categorias: Array.from(new Set(exec.charts.hallazgosPorCategoria.map(c => c.categoria))),
      auditores:  Array.from(new Set(exec.trazabilidad.map((t: any) => t.responsable))).filter((x: any) => x && x !== "—") as string[],
    };
  }, [exec]);

  const activeFiltersCount = Object.values(filters).filter(v => v != null && v !== "").length - 1;

  const downloadExcel = async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const qs = new URLSearchParams();
    if (filters.cediId)     qs.append("cediId", filters.cediId);
    if (filters.subtema)    qs.append("subtema", filters.subtema);
    if (filters.criticidad) qs.append("criticidad", filters.criticidad);
    if (filters.estado)     qs.append("estado", filters.estado);
    const r = await fetch(`${apiBase}/api/v1/reports/cedis/hallazgos/excel?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return alert("Error al descargar");
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cedis-hallazgos-${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Dashboard Ejecutivo · CEDIS"
        subtitle={exec
          ? `${exec.kpis.totalAuditorias} auditorías · ${exec.kpis.totalHallazgos} hallazgos · cobertura ${exec.kpis.coberturaPercent}% · ${exec.resumenHeuristico.estado}`
          : "Cargando datos ejecutivos CEDIS..."}
      />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setFiltersOpen(!filtersOpen)} className="px-3 py-1.5 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-xs font-medium text-white flex items-center gap-2 hover:bg-[#243054]">
              <Filter className="w-3.5 h-3.5"/>
              Filtros {activeFiltersCount > 0 && <span className="bg-emerald-500 text-[#0A111F] rounded-full px-1.5 text-[10px] font-bold">{activeFiltersCount}</span>}
              {filtersOpen ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
            </button>
            <button onClick={() => execQ.refetch()} className="p-1.5 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8] hover:text-white">
              <RefreshCw className={cn("w-4 h-4", execQ.isFetching && "animate-spin")}/>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setAiTrigger(true); setAiOpen(true); }} disabled={aiQ.isFetching} className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs font-semibold text-purple-300 flex items-center gap-2 hover:bg-purple-500/20 disabled:opacity-50">
              <Sparkles className={cn("w-3.5 h-3.5", aiQ.isFetching && "animate-spin")}/>
              {aiQ.isFetching ? "Generando..." : "Análisis IA"}
            </button>
            <button onClick={downloadExcel} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-300 flex items-center gap-2 hover:bg-emerald-500/20">
              <FileSpreadsheet className="w-3.5 h-3.5"/> Excel
            </button>
          </div>
        </div>

        {/* Filtros */}
        {filtersOpen && (
          <div className="card-base p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <F label="Año">
                <select value={filters.year ?? 2026} onChange={e => setFilters({ ...filters, year: +e.target.value })} className="filter-input">
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </F>
              <F label="CEDI">
                <select value={filters.cediId ?? ""} onChange={e => setFilters({ ...filters, cediId: e.target.value || undefined })} className="filter-input">
                  <option value="">Todos los CEDIS</option>
                  {(cedisQ.data ?? CEDIS_OFICIALES).map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </F>
              <F label="Subtema">
                <select value={filters.subtema ?? ""} onChange={e => setFilters({ ...filters, subtema: e.target.value || undefined })} className="filter-input">
                  <option value="">Todos</option>
                  {SUBTEMAS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </F>
              <F label="Categoría">
                <select value={filters.categoria ?? ""} onChange={e => setFilters({ ...filters, categoria: e.target.value || undefined })} className="filter-input">
                  <option value="">Todas</option>
                  {filterOptions.categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </F>
              <F label="Criticidad">
                <select value={filters.criticidad ?? ""} onChange={e => setFilters({ ...filters, criticidad: e.target.value || undefined })} className="filter-input">
                  <option value="">Todas</option>
                  {["CRITICA","ALTA","MEDIA","BAJA"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </F>
              <F label="Estado">
                <select value={filters.estado ?? ""} onChange={e => setFilters({ ...filters, estado: e.target.value || undefined })} className="filter-input">
                  <option value="">Todos</option>
                  {["ABIERTO","EN_PLAN","EN_VERIFICACION","CERRADO","REINCIDENTE"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </F>
              <F label="Tipo riesgo">
                <select value={filters.tipoRiesgo ?? ""} onChange={e => setFilters({ ...filters, tipoRiesgo: e.target.value || undefined })} className="filter-input">
                  <option value="">Todos</option>
                  {["REPUTACIONAL","FINANCIERO","CONTAGIO","OPERATIVO","LEGAL"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </F>
              <F label="Mes">
                <select value={filters.mes ?? ""} onChange={e => setFilters({ ...filters, mes: e.target.value ? +e.target.value : undefined })} className="filter-input">
                  <option value="">Todos</option>
                  {["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"].map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </F>
            </div>
            <div className="flex items-center justify-end">
              <button onClick={() => setFilters({ year: 2026 })} className="text-xs text-[#94A3B8] hover:text-white flex items-center gap-1">
                <X className="w-3 h-3"/> Limpiar
              </button>
            </div>
            <style jsx>{`
              :global(.filter-input) {
                width: 100%; background: #0D1526; border: 1px solid #2A3F6A;
                border-radius: 0.5rem; padding: 0.4rem 0.6rem; font-size: 0.75rem; color: white;
              }
            `}</style>
          </div>
        )}

        {execQ.isLoading && (
          <div className="card-base p-12 flex items-center justify-center text-[#475569]">
            <Loader2 className="w-6 h-6 animate-spin"/>
            <span className="ml-3 text-sm">Cargando dashboard CEDIS...</span>
          </div>
        )}

        {exec && (
          <>
            {/* Semaforización ejecutiva */}
            <SemaforosCard data={exec.charts.semaforizacion}/>

            {/* 15 KPIs */}
            <CedisKpiGrid kpis={exec.kpis}/>

            {/* AI summary */}
            {aiTrigger && (
              <AiCard
                aiData={aiQ.data}
                heuristico={exec.resumenHeuristico}
                loading={aiQ.isFetching}
                open={aiOpen}
                onToggle={() => setAiOpen(!aiOpen)}
              />
            )}

            {/* Alertas */}
            {exec.alertas.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs uppercase tracking-wider text-[#94A3B8] font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-emerald-400"/> Alertas ejecutivas ({exec.alertas.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {exec.alertas.map((a, i) => {
                    const style = SEVERITY_STYLE[a.severity] ?? SEVERITY_STYLE.INFO;
                    return (
                      <div key={i} className={cn("rounded-lg p-3 border", style.bg, style.border)}>
                        <div className="flex items-start gap-2">
                          <span className="text-base">{style.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-xs font-bold uppercase tracking-wider mb-1", style.text)}>{a.severity} · {a.type}</p>
                            <p className="text-sm text-white font-semibold">{a.title}</p>
                            <p className="text-xs text-[#94A3B8] mt-1">{a.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Cumplimiento por CEDI" subtitle="Ranking de los 5 CEDIS oficiales">
                <CumplimientoCediChart data={exec.charts.cumplimientoCedi}/>
              </ChartCard>
              <ChartCard title="Cumplimiento por Subtema" subtitle="Inventario · Caja · Cartera · Logística · Bioseguridad · Infraestructura · Procedimientos">
                <CumplimientoSubtemaChart data={exec.charts.cumplimientoSubtema}/>
              </ChartCard>
              <ChartCard title="Heatmap · Subtema × CEDI" subtitle="Concentración de hallazgos" full>
                <HeatmapSubtemaCedi data={exec.charts.heatmap}/>
              </ChartCard>
              <ChartCard title="Reportes por Ítem" subtitle="Inventario · Cartera · Logística · Bioseguridad · Infraestructura · Caja">
                <ReportesItemChart data={exec.charts.hallazgosPorCategoria}/>
              </ChartCard>
              <ChartCard title="Hallazgos recurrentes" subtitle="Top 10 por frecuencia">
                <RecurrentesChart data={exec.charts.hallazgosRecurrentes}/>
              </ChartCard>
              <ChartCard title="Hallazgos por categoría" subtitle="Distribución" full>
                <CategoriasChart data={exec.charts.hallazgosPorCategoria}/>
              </ChartCard>
            </div>

            {/* Calidad de datos */}
            <CalidadDatos data={exec.calidadDatos}/>

            {/* Matriz trazabilidad */}
            <TrazabilidadTable rows={exec.trazabilidad}/>
          </>
        )}
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-[#94A3B8]">{label}</label>
      {children}
    </div>
  );
}

/* ─────────────── Semáforos */
function SemaforosCard({ data }: { data: any[] }) {
  const colorMap: Record<string, string> = { GREEN: "#10B981", YELLOW: "#F59E0B", RED: "#EF4444" };
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {data.map((d, i) => (
        <div key={i} className="card-base p-4 flex items-center gap-4" style={{ borderColor: `${colorMap[d.status]}40` }}>
          <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: colorMap[d.status] }}/>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] truncate">{d.label}</p>
            <p className="font-display text-2xl font-bold text-white">{d.value}%</p>
            <p className="text-[9px] text-[#475569]">Meta: {d.target}% · {d.status === "GREEN" ? "OK ✓" : d.status === "YELLOW" ? "Atención" : "Crítico"}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────── KPI Grid */
function CedisKpiGrid({ kpis }: { kpis: any }) {
  const cards = [
    { label: "Auditorías",       value: kpis.totalAuditorias,         icon: <Activity/>,        color: "#3B82F6" },
    { label: "Hallazgos",        value: kpis.totalHallazgos,          icon: <Bug/>,             color: "#F97316" },
    { label: "CEDIS auditados",  value: kpis.cedisAuditados,          icon: <Warehouse/>,       color: "#8B5CF6" },
    { label: "Cobertura",        value: `${kpis.coberturaPercent}%`,  icon: <MapPin/>,          color: "#06B6D4" },
    { label: "Críticos",         value: kpis.criticos,                icon: <AlertTriangle/>,   color: "#EF4444" },
    { label: "Altos",            value: kpis.altos,                   icon: <AlertOctagon/>,    color: "#F59E0B" },
    { label: "Abiertos",         value: kpis.hallazgosAbiertos,       icon: <Bug/>,             color: "#EF4444" },
    { label: "En plan",          value: kpis.hallazgosEnPlan,         icon: <Target/>,          color: "#F59E0B" },
    { label: "En verificación",  value: kpis.hallazgosEnVerificacion, icon: <ShieldCheck/>,     color: "#06B6D4" },
    { label: "Cerrados",         value: kpis.hallazgosCerrados,       icon: <Award/>,           color: "#10B981" },
    { label: "Reincidentes",     value: kpis.hallazgosReincidentes,   icon: <AlertOctagon/>,    color: "#A855F7" },
    { label: "Índice criticidad",value: `${kpis.indiceCriticidad}/100`,icon: <Gauge/>,          color: "#EF4444" },
    { label: "% Avance prom.",   value: `${kpis.avancePromedio}%`,    icon: <Activity/>,        color: "#0EA5E9" },
    { label: "% Resolución",     value: `${kpis.tasaResolucion}%`,    icon: <Target/>,          color: "#10B981" },
    { label: "Auditores",        value: kpis.auditoresActivos,        icon: <Users/>,           color: "#EC4899" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-3">
      {cards.map(c => (
        <div key={c.label} className="card-base p-3" style={{ borderColor: `${c.color}30` }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${c.color}18`, color: c.color }}>
              {c.icon}
            </div>
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider truncate">{c.label}</p>
          </div>
          <p className="font-display text-xl font-bold text-white">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ─────────────── AI Card */
function AiCard({ aiData, heuristico, loading, open, onToggle }: any) {
  const data = aiData ?? heuristico;
  const mode = aiData?.mode ?? "heuristic";
  return (
    <div className="card-base border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
            <Sparkles className={cn("w-5 h-5 text-purple-400", loading && "animate-pulse")}/>
          </div>
          <div className="text-left">
            <p className="font-display font-bold text-white text-sm">Análisis IA · CEDIS</p>
            <p className="text-[10px] text-[#94A3B8]">
              {mode === "claude" ? "🤖 Claude" : "📊 Heurístico"}
              {aiData?.generadoEn && ` · ${new Date(aiData.generadoEn).toLocaleTimeString("es-CO")}`}
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-purple-300"/> : <ChevronDown className="w-4 h-4 text-purple-300"/>}
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <SummarySection title="📋 Resumen" items={data?.resumen ?? []} color="purple"/>
          <SummarySection title="🎯 Recomendaciones" items={data?.recomendaciones ?? []} color="emerald"/>
          {aiData?.riesgos       && <SummarySection title="🚨 Riesgos" items={aiData.riesgos} color="red"/>}
          {aiData?.oportunidades && <SummarySection title="💡 Oportunidades" items={aiData.oportunidades} color="amber"/>}
        </div>
      )}
    </div>
  );
}

function SummarySection({ title, items, color }: { title: string; items: string[]; color: string }) {
  const colorMap: Record<string, string> = {
    purple: "border-purple-500/20 bg-purple-500/5",
    emerald:"border-emerald-500/20 bg-emerald-500/5",
    red:    "border-red-500/20 bg-red-500/5",
    amber:  "border-amber-500/20 bg-amber-500/5",
  };
  return (
    <div className={cn("rounded-lg border p-3", colorMap[color])}>
      <p className="text-xs font-semibold text-white mb-2">{title}</p>
      <ul className="space-y-1.5 text-xs text-[#94A3B8]">
        {items.length === 0 ? <li className="text-[#475569]">Sin datos</li> : items.map((it, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="text-emerald-400">•</span>
            <span dangerouslySetInnerHTML={{ __html: it.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>') }}/>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────── Charts */
function ChartCard({ title, subtitle, children, full }: { title: string; subtitle?: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={cn("card-base p-4", full && "lg:col-span-2")}>
      <div className="mb-3">
        <h3 className="font-display font-bold text-white text-sm">{title}</h3>
        {subtitle && <p className="text-[10px] text-[#94A3B8] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-lg p-3 text-xs">
      {label && <p className="font-semibold text-white mb-1.5">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-2 text-[#94A3B8]">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color ?? p.fill }} />
          {p.name}: <span className="text-white font-medium ml-1">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

function CumplimientoCediChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false}/>
        <XAxis type="number" tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <YAxis type="category" dataKey="cediNombre" width={130} tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <Tooltip content={<Tip/>}/>
        <Legend wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }}/>
        <Bar dataKey="hallazgos"   fill="#F97316" name="Hallazgos"   radius={[0,3,3,0]}/>
        <Bar dataKey="criticos"    fill="#EF4444" name="Críticos"    radius={[0,3,3,0]}/>
        <Bar dataKey="cumplimiento" fill="#10B981" name="% Cumplim."  radius={[0,3,3,0]}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

function CumplimientoSubtemaChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barSize={18}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false}/>
        <XAxis dataKey="subtema" tick={{ fill: "#94A3B8", fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={70}/>
        <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <Tooltip content={<Tip/>}/>
        <Legend wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }}/>
        <Bar dataKey="hallazgos" fill="#06B6D4" name="Hallazgos"   radius={[3,3,0,0]}/>
        <Bar dataKey="cerrados"  fill="#10B981" name="Cerrados"    radius={[3,3,0,0]}/>
        <Bar dataKey="criticos"  fill="#EF4444" name="Críticos"    radius={[3,3,0,0]}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

function HeatmapSubtemaCedi({ data }: { data: any[] }) {
  if (data.length === 0) return <p className="text-center text-xs text-[#475569] py-8">Sin datos de heatmap · cargá hallazgos con subtema</p>;
  const subtemas = Array.from(new Set(data.map(d => d.subtema)));
  const cedis    = Array.from(new Set(data.map(d => d.cediNombre)));
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const color = (n: number) => {
    if (n === 0) return "#1A2540";
    const r = n / maxCount;
    if (r > 0.75) return "#EF4444";
    if (r > 0.5)  return "#F97316";
    if (r > 0.25) return "#F59E0B";
    return "#10B981";
  };
  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th className="text-left p-1 text-[#94A3B8] font-semibold sticky left-0 bg-[#0D1526]">Subtema \ CEDI</th>
            {cedis.map(c => <th key={c} className="p-1 text-[#94A3B8] font-medium text-center w-28 max-w-[120px] truncate">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {subtemas.map(s => (
            <tr key={s}>
              <td className="text-left p-1 text-white text-[10px] sticky left-0 bg-[#0D1526] font-medium pr-3">{s}</td>
              {cedis.map(c => {
                const cell = data.find(d => d.subtema === s && d.cediNombre === c);
                const n = cell?.count ?? 0;
                return (
                  <td key={c} className="p-0.5">
                    <div className="w-full h-8 rounded flex items-center justify-center font-mono text-[10px] font-bold transition-all hover:scale-110"
                         style={{ background: color(n), color: n > 0 ? "white" : "#475569" }}
                         title={cell ? `${n} hallazgos · ${cell.criticos} críticos` : "Sin hallazgos"}>
                      {n > 0 ? n : "·"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Reportes (hallazgos) por ítem/categoría — barras verticales ordenadas, un color
// por ítem y etiqueta de valor. Reemplaza la antigua "Tendencia mensual".
function ReportesItemChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <p className="text-center text-xs text-[#475569] py-8">Sin reportes por ítem</p>;
  const COLORS = ["#06B6D4", "#F97316", "#10B981", "#8B5CF6", "#EF4444", "#F59E0B", "#3B82F6", "#EC4899", "#A855F7"];
  const sorted = [...data].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={sorted} barSize={34} margin={{ top: 20, right: 8, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false}/>
        <XAxis dataKey="categoria" tick={{ fill: "#94A3B8", fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={64}/>
        <YAxis allowDecimals={false} tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <Tooltip content={<Tip/>} cursor={{ fill: "#1E2D4A33" }}/>
        <Bar dataKey="count" name="Reportes" radius={[4,4,0,0]}>
          {sorted.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
          <LabelList content={barLabelPct(sumField(sorted, "count"))}/>
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function RecurrentesChart({ data }: { data: any[] }) {
  if (data.length === 0) return <p className="text-center text-xs text-[#475569] py-8">Sin hallazgos recurrentes</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" barSize={12}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false}/>
        <XAxis type="number" tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <YAxis type="category" dataKey="titulo" width={200} tick={{ fill: "#94A3B8", fontSize: 9 }}/>
        <Tooltip content={<Tip/>}/>
        <Bar dataKey="count" fill="#A855F7" radius={[0,3,3,0]}>
          <LabelList content={barLabelPct(sumField(data, "count"), { horizontal: true })}/>
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function CategoriasChart({ data }: { data: any[] }) {
  if (data.length === 0) return <p className="text-center text-xs text-[#475569] py-8">Sin categorías</p>;
  const COLORS = ["#EF4444", "#F97316", "#F59E0B", "#10B981", "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899", "#A855F7"];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="count" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label={(d: any) => `${d.categoria}: ${d.count} · ${d.percent != null ? Math.round(d.percent * 100) : 0}%`}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
        </Pie>
        <Tooltip content={<Tip/>}/>
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ─────────────── Calidad de Datos */
function CalidadDatos({ data }: { data: any }) {
  const scoreColor = data.score >= 80 ? "#10B981" : data.score >= 60 ? "#F59E0B" : "#EF4444";
  return (
    <div className="card-base p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400"/> Calidad de datos · CEDIS
          </h3>
          <p className="text-[10px] text-[#94A3B8]">{data.totalAuditorias} auditorías · {data.totalHallazgos} hallazgos</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Score</p>
          <p className="font-display text-3xl font-bold" style={{ color: scoreColor }}>{data.score}/100</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Sin subtema",        value: data.sinSubtema },
          { label: "Sin responsable",    value: data.sinResponsable },
          { label: "Sin plan acción",    value: data.sinPlanAccion },
        ].map(it => {
          const c = it.value === 0 ? "#10B981" : it.value < 3 ? "#F59E0B" : "#EF4444";
          return (
            <div key={it.label} className="bg-[#1A2540] rounded-lg p-2 border border-[#2A3F6A]">
              <p className="text-[9px] uppercase tracking-wider text-[#94A3B8] truncate">{it.label}</p>
              <p className="font-display text-xl font-bold mt-1" style={{ color: c }}>{it.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────── Trazabilidad */
function TrazabilidadTable({ rows }: { rows: any[] }) {
  return (
    <div className="card-base p-0 overflow-hidden">
      <div className="p-4 border-b border-[#1E2D4A]">
        <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-400"/> Trazabilidad de Hallazgos · top {rows.length}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-[#475569] border-b border-[#1E2D4A]">
              <th className="text-left p-2 pl-4">CEDI</th>
              <th className="text-left p-2">Título</th>
              <th className="text-left p-2">Subtema</th>
              <th className="text-left p-2">Categoría</th>
              <th className="text-center p-2">Criticidad</th>
              <th className="text-center p-2">Estado</th>
              <th className="text-left p-2">Responsable</th>
              <th className="text-center p-2">Compromiso</th>
              <th className="text-center p-2">% Avance</th>
              <th className="text-center p-2">Reinc.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-b border-[#1E2D4A]/30 hover:bg-[#0D1526]/50">
                <td className="p-2 pl-4 text-white text-xs font-medium">{r.cediNombre}</td>
                <td className="p-2 text-white text-xs">{r.titulo}</td>
                <td className="p-2 text-cyan-300 text-xs">{r.subtema}</td>
                <td className="p-2 text-[#94A3B8] text-xs">{r.categoria}</td>
                <td className="p-2 text-center">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: `${CRITICIDAD_COLOR[r.criticidad]}18`, color: CRITICIDAD_COLOR[r.criticidad], border: `1px solid ${CRITICIDAD_COLOR[r.criticidad]}40` }}>
                    {r.criticidad}
                  </span>
                </td>
                <td className="p-2 text-center">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: `${ESTADO_COLOR[r.estado]}18`, color: ESTADO_COLOR[r.estado], border: `1px solid ${ESTADO_COLOR[r.estado]}40` }}>
                    {r.estado}
                  </span>
                </td>
                <td className="p-2 text-[#94A3B8] text-xs">{r.responsable}</td>
                <td className="p-2 text-center text-[#94A3B8] text-xs">{r.fechaCompromiso}</td>
                <td className="p-2 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-12 h-1.5 rounded-full bg-[#1A2540] overflow-hidden">
                      <div className="h-full" style={{ width: `${r.porcentajeAvance}%`, background: CRITICIDAD_COLOR[r.criticidad] }}/>
                    </div>
                    <span className="text-[10px] text-white font-mono">{r.porcentajeAvance}%</span>
                  </div>
                </td>
                <td className="p-2 text-center text-xs">
                  {r.reincidente ? <span className="text-purple-400">🔁</span> : <span className="text-[#475569]">·</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
