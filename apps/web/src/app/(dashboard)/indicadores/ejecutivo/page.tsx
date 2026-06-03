"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard Ejecutivo del Cronograma Anual · página principal
// ═══════════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { useCronogramaExecutive, useCronogramaAiSummary, type CronogramaFilters } from "@/hooks/useCronogramaExecutive";
import { useAuthStore } from "@/store/auth.store";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter, ZAxis,
} from "recharts";
import {
  CheckCircle2, Clock, Circle, AlertTriangle, Target, Activity,
  Users, MapPin, Bug, AlertOctagon, ShieldCheck, Gauge, Award,
  Sparkles, Filter, Download, FileText, FileSpreadsheet, Loader2,
  RefreshCw, ChevronDown, ChevronUp, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_STYLE: Record<string, { bg: string; border: string; text: string; emoji: string }> = {
  CRITICAL: { bg: "bg-red-500/10",     border: "border-red-500/30",     text: "text-red-300",     emoji: "🚨" },
  HIGH:     { bg: "bg-orange-500/10",  border: "border-orange-500/30",  text: "text-orange-300",  emoji: "⚠️" },
  MEDIUM:   { bg: "bg-amber-500/10",   border: "border-amber-500/30",   text: "text-amber-300",   emoji: "⚡" },
  LOW:      { bg: "bg-blue-500/10",    border: "border-blue-500/30",    text: "text-blue-300",    emoji: "ℹ️" },
  INFO:     { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-300", emoji: "📋" },
};

const STATUS_LABEL: Record<string, string> = {
  COMPLETED:   "Completada",
  IN_PROGRESS: "En Curso",
  NOT_STARTED: "No Iniciada",
  OVERDUE:     "Vencida",
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED:   "#10B981",
  IN_PROGRESS: "#F59E0B",
  NOT_STARTED: "#64748B",
  OVERDUE:     "#EF4444",
};

const IMPACTO_COLOR: Record<string, string> = {
  CRITICO: "#EF4444",
  ALTO:    "#F97316",
  MEDIO:   "#F59E0B",
  BAJO:    "#10B981",
};

export default function DashboardEjecutivoPage() {
  const { user } = useAuthStore();
  const [filters, setFilters]       = useState<CronogramaFilters>({ year: 2026 });
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [aiOpen, setAiOpen]         = useState(true);
  const [aiTrigger, setAiTrigger]   = useState(false);

  const execQ = useCronogramaExecutive(filters);
  const aiQ   = useCronogramaAiSummary(filters, aiTrigger);

  const exec = execQ.data;
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

  // ── Opciones de filtros derivadas del dataset ──
  const filterOptions = useMemo(() => {
    if (!exec) return { auditores: [], areas: [], tipos: [] };
    const auditores = Array.from(new Set(exec.charts.ranking.map(r => r.auditorName)))
      .map(name => ({ name, id: exec.charts.ranking.find(r => r.auditorName === name)?.auditorId ?? name }));
    const areas = Array.from(new Set(exec.charts.distribucionAreas.map(a => a.areaFull)));
    const tipos = Array.from(new Set(exec.trazabilidad.map(t => t.tipo))).filter(Boolean);
    return { auditores, areas, tipos };
  }, [exec]);

  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined && v !== "").length - 1;

  // ── Export ──
  const downloadExcel = async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v != null && v !== "" && k !== "year") qs.append(k, String(v));
    });
    if (filters.year) qs.append("year", String(filters.year));

    const r = await fetch(`${apiBase}/api/v1/reports/cronograma/excel?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return alert("Error al descargar");
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cronograma-ejecutivo-${filters.year ?? 2026}-${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const r = await fetch(`${apiBase}/api/v1/reports/audit-activities/csv?entity=audit-activities`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return alert("Error al descargar");
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cronograma-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Dashboard Ejecutivo · Cronograma Anual"
        subtitle={exec
          ? `${exec.meta.actividadesFiltradas} actividades · ${exec.kpis.porcentajeCumplimientoGeneral}% cumplimiento general · ${exec.resumenHeuristico.estado}`
          : "Cargando datos ejecutivos..."}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Toolbar header · acciones */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="px-3 py-1.5 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-xs font-medium text-white flex items-center gap-2 hover:bg-[#243054]"
            >
              <Filter className="w-3.5 h-3.5"/>
              Filtros {activeFiltersCount > 0 && <span className="bg-amber-500 text-[#0A111F] rounded-full px-1.5 text-[10px] font-bold">{activeFiltersCount}</span>}
              {filtersOpen ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
            </button>
            <button
              onClick={() => execQ.refetch()}
              className="p-1.5 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8] hover:text-white"
              title="Refrescar datos"
            >
              <RefreshCw className={cn("w-4 h-4", execQ.isFetching && "animate-spin")}/>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setAiTrigger(true); setAiOpen(true); }}
              disabled={aiQ.isFetching}
              className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs font-semibold text-purple-300 flex items-center gap-2 hover:bg-purple-500/20 disabled:opacity-50"
            >
              <Sparkles className={cn("w-3.5 h-3.5", aiQ.isFetching && "animate-spin")}/>
              {aiQ.isFetching ? "Generando..." : "Análisis IA"}
            </button>
            <button onClick={downloadExcel} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-300 flex items-center gap-2 hover:bg-emerald-500/20">
              <FileSpreadsheet className="w-3.5 h-3.5"/> Excel
            </button>
            <button onClick={downloadCsv} className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs font-medium text-blue-300 flex items-center gap-2 hover:bg-blue-500/20">
              <FileText className="w-3.5 h-3.5"/> CSV
            </button>
          </div>
        </div>

        {/* Filtros globales */}
        {filtersOpen && (
          <FilterBar
            filters={filters}
            options={filterOptions}
            onChange={setFilters}
          />
        )}

        {/* Loading / Error */}
        {execQ.isLoading && (
          <div className="card-base p-12 flex items-center justify-center text-[#475569]">
            <Loader2 className="w-6 h-6 animate-spin"/>
            <span className="ml-3 text-sm">Cargando dashboard ejecutivo...</span>
          </div>
        )}
        {execQ.error && (
          <div className="card-base p-6 border-red-500/30 bg-red-500/5">
            <p className="text-red-300 text-sm font-semibold mb-1">Error cargando dashboard</p>
            <p className="text-red-400 text-xs">{(execQ.error as any)?.message ?? "Error desconocido"}</p>
          </div>
        )}

        {exec && (
          <>
            {/* 13 KPI Cards */}
            <KpiGrid kpis={exec.kpis} />

            {/* AI Summary */}
            {aiTrigger && (
              <AISummaryCard
                aiData={aiQ.data}
                heuristico={exec.resumenHeuristico}
                loading={aiQ.isFetching}
                open={aiOpen}
                onToggle={() => setAiOpen(!aiOpen)}
              />
            )}

            {/* Alertas */}
            {exec.alertas.length > 0 && (
              <AlertsPanel alertas={exec.alertas} />
            )}

            {/* Gráficos · grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Distribución por Estado" subtitle="Completadas · En curso · No iniciadas · Vencidas">
                <DistribucionEstadoChart data={exec.charts.distribucionEstado} />
              </ChartCard>
              <ChartCard title="Cumplimiento por Mes" subtitle="Vista mensual">
                <CumplimientoMesChart data={exec.charts.cumplimientoMes} />
              </ChartCard>
              <ChartCard title="Tendencia Acumulada" subtitle="Planificado vs Ejecutado">
                <TendenciaMesChart data={exec.charts.tendenciaMes} />
              </ChartCard>
              <ChartCard title="Ranking de Auditores" subtitle="Productividad + cumplimiento">
                <RankingAuditoresChart data={exec.charts.ranking} />
              </ChartCard>
              <ChartCard title="Distribución por Áreas" subtitle="Participación + cumplimiento" full>
                <DistribucionAreasChart data={exec.charts.distribucionAreas} />
              </ChartCard>
              <ChartCard title="Matriz de Riesgo Operativo" subtitle="Impacto × Probabilidad · vencidas/no iniciadas" full>
                <MatrizRiesgoChart data={exec.charts.matrizRiesgo} />
              </ChartCard>
            </div>

            {/* Calidad de datos */}
            <CalidadDatosCard data={exec.calidadDatos} />

            {/* Matriz de trazabilidad */}
            <TrazabilidadMatrix rows={exec.trazabilidad} />
          </>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   FilterBar · 11 filtros
   ──────────────────────────────────────────────────────── */
function FilterBar({
  filters, options, onChange,
}: {
  filters: CronogramaFilters;
  options: { auditores: { name: string; id: string }[]; areas: string[]; tipos: string[] };
  onChange: (f: CronogramaFilters) => void;
}) {
  const set = (k: keyof CronogramaFilters, v: any) => onChange({ ...filters, [k]: v === "" ? undefined : v });

  return (
    <div className="card-base p-4 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <FilterField label="Año">
          <select value={filters.year ?? 2026} onChange={e => set("year", +e.target.value)} className="filter-input">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </FilterField>
        <FilterField label="Auditor">
          <select value={filters.auditorId ?? ""} onChange={e => set("auditorId", e.target.value)} className="filter-input">
            <option value="">Todos los auditores</option>
            {options.auditores.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </FilterField>
        <FilterField label="Estado">
          <select value={filters.status ?? ""} onChange={e => set("status", e.target.value)} className="filter-input">
            <option value="">Todos los estados</option>
            {["COMPLETED","IN_PROGRESS","NOT_STARTED","OVERDUE"].map(s =>
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            )}
          </select>
        </FilterField>
        <FilterField label="Mes">
          <select value={filters.mes ?? ""} onChange={e => set("mes", e.target.value ? +e.target.value : undefined)} className="filter-input">
            <option value="">Todos los meses</option>
            {["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"].map((m, i) =>
              <option key={i+1} value={i+1}>{m}</option>
            )}
          </select>
        </FilterField>
        <FilterField label="Área auditada">
          <select value={filters.area ?? ""} onChange={e => set("area", e.target.value)} className="filter-input">
            <option value="">Todas las áreas</option>
            {options.areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </FilterField>
        <FilterField label="Tipo de auditoría">
          <select value={filters.activityType ?? ""} onChange={e => set("activityType", e.target.value)} className="filter-input">
            <option value="">Todos los tipos</option>
            {options.tipos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </FilterField>
        <FilterField label="Fecha desde">
          <input type="date" value={filters.fechaDesde ?? ""} onChange={e => set("fechaDesde", e.target.value)} className="filter-input"/>
        </FilterField>
        <FilterField label="Fecha hasta">
          <input type="date" value={filters.fechaHasta ?? ""} onChange={e => set("fechaHasta", e.target.value)} className="filter-input"/>
        </FilterField>
        <FilterField label="% Cumplimiento min">
          <input type="number" min="0" max="100" value={filters.cumplimientoMin ?? ""} onChange={e => set("cumplimientoMin", e.target.value ? +e.target.value : undefined)} placeholder="0" className="filter-input"/>
        </FilterField>
        <FilterField label="% Cumplimiento max">
          <input type="number" min="0" max="100" value={filters.cumplimientoMax ?? ""} onChange={e => set("cumplimientoMax", e.target.value ? +e.target.value : undefined)} placeholder="100" className="filter-input"/>
        </FilterField>
      </div>
      <div className="flex items-center justify-end">
        <button
          onClick={() => onChange({ year: 2026 })}
          className="text-xs text-[#94A3B8] hover:text-white flex items-center gap-1"
        >
          <X className="w-3 h-3"/> Limpiar filtros
        </button>
      </div>

      <style jsx>{`
        :global(.filter-input) {
          width: 100%;
          background: #0D1526;
          border: 1px solid #2A3F6A;
          border-radius: 0.5rem;
          padding: 0.4rem 0.6rem;
          font-size: 0.75rem;
          color: white;
        }
        :global(.filter-input:focus) {
          outline: none;
          border-color: #F59E0B66;
        }
      `}</style>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-[#94A3B8]">{label}</label>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   KpiGrid · 13 KPI cards
   ──────────────────────────────────────────────────────── */
function KpiGrid({ kpis }: { kpis: any }) {
  const cards = [
    { label: "Planificadas",          value: kpis.actividadesPlanificadas,        icon: <Activity/>, color: "#3B82F6" },
    { label: "Completadas",           value: kpis.actividadesCompletadas,         icon: <CheckCircle2/>, color: "#10B981" },
    { label: "En curso",              value: kpis.actividadesEnCurso,             icon: <Clock/>, color: "#F59E0B" },
    { label: "No iniciadas",          value: kpis.actividadesNoIniciadas,         icon: <Circle/>, color: "#64748B" },
    { label: "Vencidas",              value: kpis.actividadesVencidas,            icon: <AlertTriangle/>, color: "#EF4444" },
    { label: "% Cumplimiento",        value: `${kpis.porcentajeCumplimientoGeneral}%`, icon: <Target/>, color: "#8B5CF6" },
    { label: "Avance ponderado",      value: `${kpis.avanceAcumuladoPonderado}%`, icon: <Gauge/>, color: "#06B6D4" },
    { label: "Áreas auditadas",       value: kpis.totalAreasAuditadas,            icon: <MapPin/>, color: "#EC4899" },
    { label: "Hallazgos",             value: kpis.totalHallazgos,                 icon: <Bug/>, color: "#F97316" },
    { label: "Incidencias",           value: kpis.totalIncidencias,               icon: <AlertOctagon/>, color: "#EF4444" },
    { label: "Calidad cronograma",    value: `${kpis.indiceCalidadCronograma}%`,  icon: <ShieldCheck/>, color: "#22C55E" },
    { label: "Ejecución operativa",   value: `${kpis.indiceEjecucionOperativa}%`, icon: <Activity/>, color: "#0EA5E9" },
    { label: "Cobertura auditoría",   value: `${kpis.coberturaAuditoria}%`,       icon: <Users/>, color: "#A855F7" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
      {cards.map(c => (
        <div key={c.label} className="card-base p-3" style={{ borderColor: `${c.color}30` }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${c.color}18`, color: c.color }}>
              {c.icon}
            </div>
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider truncate">{c.label}</p>
          </div>
          <p className="font-display text-2xl font-bold text-white">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   AI Summary Card
   ──────────────────────────────────────────────────────── */
function AISummaryCard({ aiData, heuristico, loading, open, onToggle }: {
  aiData: any; heuristico: any; loading: boolean; open: boolean; onToggle: () => void;
}) {
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
            <p className="font-display font-bold text-white text-sm">Análisis IA · Resumen ejecutivo</p>
            <p className="text-[10px] text-[#94A3B8]">
              {mode === "claude" ? "🤖 Generado con Claude IA" : "📊 Análisis heurístico"}
              {aiData?.generadoEn && ` · ${new Date(aiData.generadoEn).toLocaleTimeString("es-CO")}`}
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-purple-300"/> : <ChevronDown className="w-4 h-4 text-purple-300"/>}
      </button>

      {open && (
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <SummarySection title="📋 Resumen" items={data?.resumen ?? heuristico?.resumen ?? []} accent="purple"/>
          <SummarySection title="🎯 Recomendaciones" items={data?.recomendaciones ?? heuristico?.recomendaciones ?? []} accent="amber"/>
          {aiData?.riesgos && (
            <SummarySection title="🚨 Riesgos" items={aiData.riesgos} accent="red"/>
          )}
          {aiData?.oportunidades && (
            <SummarySection title="💡 Oportunidades" items={aiData.oportunidades} accent="emerald"/>
          )}
        </div>
      )}
    </div>
  );
}

function SummarySection({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  const colorMap: Record<string, string> = {
    purple:  "border-purple-500/20  bg-purple-500/5",
    amber:   "border-amber-500/20   bg-amber-500/5",
    red:     "border-red-500/20     bg-red-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
  };
  return (
    <div className={cn("rounded-lg border p-3", colorMap[accent])}>
      <p className="text-xs font-semibold text-white mb-2">{title}</p>
      <ul className="space-y-1.5 text-xs text-[#94A3B8]">
        {items.length === 0
          ? <li className="text-[#475569]">Sin datos para esta sección</li>
          : items.map((it, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-amber-400">•</span>
                <span dangerouslySetInnerHTML={{ __html: it.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>') }}/>
              </li>
            ))}
      </ul>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Alerts Panel
   ──────────────────────────────────────────────────────── */
function AlertsPanel({ alertas }: { alertas: any[] }) {
  return (
    <div className="space-y-2">
      <h2 className="text-xs uppercase tracking-wider text-[#94A3B8] font-semibold flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400"/> Alertas ejecutivas ({alertas.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {alertas.map((a, i) => {
          const style = SEVERITY_STYLE[a.severity] ?? SEVERITY_STYLE.INFO;
          return (
            <div key={i} className={cn("rounded-lg p-3 border", style.bg, style.border)}>
              <div className="flex items-start gap-2">
                <span className="text-base">{style.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-bold uppercase tracking-wider mb-1", style.text)}>
                    {a.severity} · {a.type}
                  </p>
                  <p className="text-sm text-white font-semibold">{a.title}</p>
                  <p className="text-xs text-[#94A3B8] mt-1">{a.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Chart wrappers
   ──────────────────────────────────────────────────────── */
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

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-lg p-3 text-xs shadow-card">
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

function DistribucionEstadoChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label>
          {data.map((d, i) => <Cell key={i} fill={d.color}/>)}
        </Pie>
        <Tooltip content={<ChartTooltip/>}/>
        <Legend wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }}/>
      </PieChart>
    </ResponsiveContainer>
  );
}

function CumplimientoMesChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={12}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false}/>
        <XAxis dataKey="mes" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false}/>
        <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false}/>
        <Tooltip content={<ChartTooltip/>}/>
        <Legend wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }}/>
        <Bar dataKey="Planificadas"  fill="#3B82F6" radius={[3,3,0,0]}/>
        <Bar dataKey="Completadas"   fill="#10B981" radius={[3,3,0,0]}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TendenciaMesChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A"/>
        <XAxis dataKey="mes" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false}/>
        <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false}/>
        <Tooltip content={<ChartTooltip/>}/>
        <Legend wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }}/>
        <Line type="monotone" dataKey="AcumPlanificadas" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Acum. Planificadas"/>
        <Line type="monotone" dataKey="AcumEjecutadas"   stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Acum. Ejecutadas"/>
      </LineChart>
    </ResponsiveContainer>
  );
}

function RankingAuditoresChart({ data }: { data: any[] }) {
  const sorted = [...data].sort((a, b) => b.completionRate - a.completionRate).slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={sorted} layout="vertical" barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false}/>
        <XAxis type="number" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false}/>
        <YAxis type="category" dataKey="auditorName" width={130} tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false}/>
        <Tooltip content={<ChartTooltip/>}/>
        <Bar dataKey="completionRate" fill="#F59E0B" name="% Cumplimiento" radius={[0,3,3,0]}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

function DistribucionAreasChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 26)}>
      <BarChart data={data} layout="vertical" barSize={10}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false}/>
        <XAxis type="number" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false}/>
        <YAxis type="category" dataKey="area" width={180} tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false}/>
        <Tooltip content={<ChartTooltip/>}/>
        <Legend wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }}/>
        <Bar dataKey="Actividades" fill="#3B82F6" radius={[0,3,3,0]}/>
        <Bar dataKey="Completadas" fill="#10B981" radius={[0,3,3,0]}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

function MatrizRiesgoChart({ data }: { data: any[] }) {
  if (data.length === 0) return <p className="text-center text-xs text-[#475569] py-8">Sin actividades en riesgo · cronograma saludable ✓</p>;
  const mapped = data.map(d => ({
    x: d.diasVencimiento,
    y: d.probabilidad,
    z: d.impacto === "CRITICO" ? 200 : d.impacto === "ALTO" ? 150 : d.impacto === "MEDIO" ? 100 : 60,
    name: d.actividad,
    auditor: d.auditor,
    impacto: d.impacto,
    color: IMPACTO_COLOR[d.impacto] ?? "#64748B",
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A"/>
        <XAxis type="number" dataKey="x" name="Días vencidos" tick={{ fill: "#94A3B8", fontSize: 10 }} label={{ value: "Días vencidos", position: "bottom", fill: "#94A3B8" }}/>
        <YAxis type="number" dataKey="y" name="Probabilidad" tick={{ fill: "#94A3B8", fontSize: 10 }} label={{ value: "Probabilidad %", angle: -90, position: "left", fill: "#94A3B8" }}/>
        <ZAxis type="number" dataKey="z" range={[60, 250]} name="Impacto"/>
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={({ active, payload }: any) => {
            if (!active || !payload?.[0]) return null;
            const d = payload[0].payload;
            return (
              <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-lg p-3 text-xs">
                <p className="font-semibold text-white mb-1">{d.name}</p>
                <p className="text-[#94A3B8]">Auditor: {d.auditor}</p>
                <p className="text-[#94A3B8]">Días vencidos: <span className="text-white">{d.x}</span></p>
                <p className="text-[#94A3B8]">Probabilidad: <span className="text-white">{d.y}%</span></p>
                <p className="text-[#94A3B8]">Impacto: <span style={{ color: d.color }} className="font-bold">{d.impacto}</span></p>
              </div>
            );
          }}
        />
        <Scatter data={mapped}>
          {mapped.map((d, i) => <Cell key={i} fill={d.color}/>)}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/* ────────────────────────────────────────────────────────
   Calidad de Datos
   ──────────────────────────────────────────────────────── */
function CalidadDatosCard({ data }: { data: any }) {
  const scoreColor = data.score >= 80 ? "#10B981"
                   : data.score >= 60 ? "#F59E0B"
                   : "#EF4444";
  return (
    <div className="card-base p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400"/>
            Diagnóstico de calidad de datos
          </h3>
          <p className="text-[10px] text-[#94A3B8]">Score: {data.issuesTotal} issues detectados en {data.total} registros</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Score global</p>
          <p className="font-display text-3xl font-bold" style={{ color: scoreColor }}>{data.score}/100</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <DataQualityItem label="Sin notas"        value={data.camposVacios.sinNotas}/>
        <DataQualityItem label="Sin auditor"      value={data.camposVacios.sinAuditorAsignado}/>
        <DataQualityItem label="Sin fechas"       value={data.camposVacios.sinFechas}/>
        <DataQualityItem label="Duplicados"       value={data.duplicados}/>
        <DataQualityItem label="Fechas inválidas" value={data.inconsistenciasFechas}/>
        <DataQualityItem label="Fuera de año"     value={data.fechasFueraDeAnio}/>
      </div>
    </div>
  );
}

function DataQualityItem({ label, value }: { label: string; value: number }) {
  const color = value === 0 ? "#10B981" : value < 5 ? "#F59E0B" : "#EF4444";
  return (
    <div className="bg-[#1A2540] rounded-lg p-2 border border-[#2A3F6A]">
      <p className="text-[9px] uppercase tracking-wider text-[#94A3B8] truncate">{label}</p>
      <p className="font-display text-xl font-bold mt-1" style={{ color }}>{value}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Matriz de Trazabilidad
   ──────────────────────────────────────────────────────── */
function TrazabilidadMatrix({ rows }: { rows: any[] }) {
  return (
    <div className="card-base p-0 overflow-hidden">
      <div className="p-4 border-b border-[#1E2D4A]">
        <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400"/>
          Matriz de Trazabilidad Operativa
        </h3>
        <p className="text-[10px] text-[#94A3B8] mt-0.5">Top {rows.length} actividades · seguimiento detallado</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-[#475569] border-b border-[#1E2D4A]">
              <th className="text-left p-2 pl-4">#</th>
              <th className="text-left p-2">Actividad</th>
              <th className="text-left p-2">Área</th>
              <th className="text-left p-2">Responsable</th>
              <th className="text-left p-2">Tipo</th>
              <th className="text-center p-2">Inicio</th>
              <th className="text-center p-2">Compromiso</th>
              <th className="text-center p-2">Estado</th>
              <th className="text-center p-2">% Cumpl.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-[#1E2D4A]/30 hover:bg-[#0D1526]/50">
                <td className="p-2 pl-4 text-[#475569] text-xs">{r.item}</td>
                <td className="p-2 text-white text-xs max-w-md truncate" title={r.actividad}>{r.actividad}</td>
                <td className="p-2 text-[#94A3B8] text-xs">{r.area}</td>
                <td className="p-2 text-[#94A3B8] text-xs">{r.responsable}</td>
                <td className="p-2 text-[#94A3B8] text-xs">{r.tipo}</td>
                <td className="p-2 text-[#94A3B8] text-xs text-center">{r.fechaInicio}</td>
                <td className="p-2 text-[#94A3B8] text-xs text-center">{r.fechaCompromiso}</td>
                <td className="p-2 text-center">
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: `${STATUS_COLOR[r.status]}18`,
                      color: STATUS_COLOR[r.status],
                      border: `1px solid ${STATUS_COLOR[r.status]}40`,
                    }}
                  >
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </td>
                <td className="p-2 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-12 h-1.5 rounded-full bg-[#1A2540] overflow-hidden">
                      <div className="h-full" style={{ width: `${r.cumplimiento}%`, background: STATUS_COLOR[r.status] }}/>
                    </div>
                    <span className="text-[10px] text-white font-mono">{r.cumplimiento}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
