"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard Ejecutivo · Rutas (Acompañamientos)
// ═══════════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { useRutasExecutive, useRutasAiSummary, type RutasFilters } from "@/hooks/useRutasExecutive";
import { useAuthStore } from "@/store/auth.store";
import { useClientes, useRutasCat } from "@/hooks/useRutas";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, Pie, PieChart,
} from "recharts";
import {
  Truck, Building2, MapPin, AlertTriangle, Target, Users, Sparkles,
  Filter, RefreshCw, Download, FileSpreadsheet, FileText, Loader2,
  X, ChevronDown, ChevronUp, Award, Activity, DollarSign, Package,
  ShieldCheck, AlertOctagon, Bug, Gauge, ShoppingBag, Network,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_STYLE: Record<string, { bg: string; border: string; text: string; emoji: string }> = {
  CRITICAL: { bg: "bg-red-500/10",     border: "border-red-500/30",     text: "text-red-300",     emoji: "🚨" },
  HIGH:     { bg: "bg-orange-500/10",  border: "border-orange-500/30",  text: "text-orange-300",  emoji: "⚠️" },
  MEDIUM:   { bg: "bg-amber-500/10",   border: "border-amber-500/30",   text: "text-amber-300",   emoji: "⚡" },
  LOW:      { bg: "bg-blue-500/10",    border: "border-blue-500/30",    text: "text-blue-300",    emoji: "ℹ️" },
  INFO:     { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-300", emoji: "📋" },
};

const CRITICIDAD_COLOR: Record<string, string> = {
  CRITICO: "#EF4444",
  ALTO:    "#F97316",
  MEDIO:   "#F59E0B",
  BAJO:    "#10B981",
};

const ESTADO_COLOR: Record<string, string> = {
  PROGRAMADO:     "#3B82F6",
  EN_CURSO:       "#F59E0B",
  COMPLETADO:     "#10B981",
  CON_HALLAZGOS:  "#EF4444",
  CERRADO:        "#64748B",
};

export default function RutasEjecutivoPage() {
  const [filters, setFilters]         = useState<RutasFilters>({ year: 2026 });
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [aiOpen, setAiOpen]           = useState(true);
  const [aiTrigger, setAiTrigger]     = useState(false);

  const execQ = useRutasExecutive(filters);
  const aiQ   = useRutasAiSummary(filters, aiTrigger);
  const clientesQ = useClientes();
  const rutasCatQ = useRutasCat();

  const exec = execQ.data;
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

  // Auditores/ciudades/motivos derivados de los datos
  const filterOptions = useMemo(() => {
    if (!exec) return { auditores: [], ciudades: [], motivos: [] };
    return {
      auditores: Array.from(new Set(exec.charts.auditores.map(a => a.auditorNombre))),
      ciudades:  Array.from(new Set(exec.charts.distribucionCiudades.map(c => c.ciudad))),
      motivos:   Array.from(new Set(exec.charts.paretoMotivos.map(m => m.motivo))),
    };
  }, [exec]);

  const activeFiltersCount = Object.values(filters).filter(v => v != null && v !== "").length - 1;

  const downloadExcel = async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const qs = new URLSearchParams();
    if (filters.mes) qs.append("mes", String(filters.mes));
    if (filters.criticidad) qs.append("criticidad", filters.criticidad);
    const r = await fetch(`${apiBase}/api/v1/reports/rutas/excel?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return alert("Error al descargar");
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rutas-${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const r = await fetch(`${apiBase}/api/v1/reports/rutas/csv?entity=rutas`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return alert("Error al descargar");
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rutas-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Dashboard Ejecutivo · Rutas"
        subtitle={exec
          ? `${exec.kpis.totalAcompanamientos} acompañamientos · ${exec.resumenHeuristico.estado} · ${exec.kpis.criticos} críticos`
          : "Cargando datos ejecutivos de rutas..."}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="px-3 py-1.5 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-xs font-medium text-white flex items-center gap-2 hover:bg-[#243054]"
            >
              <Filter className="w-3.5 h-3.5"/>
              Filtros {activeFiltersCount > 0 && <span className="bg-cyan-500 text-[#0A111F] rounded-full px-1.5 text-[10px] font-bold">{activeFiltersCount}</span>}
              {filtersOpen ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
            </button>
            <button
              onClick={() => execQ.refetch()}
              className="p-1.5 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8] hover:text-white"
              title="Refrescar"
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
          <RutasFilterBar
            filters={filters}
            options={{
              auditores: filterOptions.auditores,
              ciudades:  filterOptions.ciudades,
              motivos:   filterOptions.motivos,
              rutas:     rutasCatQ.data ?? [],
              clientes:  clientesQ.data ?? [],
            }}
            onChange={setFilters}
          />
        )}

        {execQ.isLoading && (
          <div className="card-base p-12 flex items-center justify-center text-[#475569]">
            <Loader2 className="w-6 h-6 animate-spin"/>
            <span className="ml-3 text-sm">Cargando dashboard rutas...</span>
          </div>
        )}

        {exec && (
          <>
            {/* 14 KPIs */}
            <RutasKpiGrid kpis={exec.kpis} />

            {/* AI summary */}
            {aiTrigger && (
              <RutasAiCard
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
                  <AlertTriangle className="w-3.5 h-3.5 text-cyan-400"/> Alertas operativas ({exec.alertas.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {exec.alertas.map((a, i) => {
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
            )}

            {/* Charts grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Heatmap · Cobertura Ruta × Mes" subtitle="Intensidad por concentración de acompañamientos" full>
                <HeatmapRutaMes data={exec.charts.heatmap} />
              </ChartCard>
              <ChartCard title="Pareto de Motivos de Devolución" subtitle="Frecuencia + curva acumulada">
                <ParetoMotivosChart data={exec.charts.paretoMotivos} />
              </ChartCard>
              <ChartCard title="Acompañamientos por Auditor" subtitle="Total + criticidad">
                <AuditoresChart data={exec.charts.auditores} />
              </ChartCard>
              <ChartCard title="Ranking Clientes Impactados" subtitle="Top 10 por participación" full>
                <ClientesRankingChart data={exec.charts.clientesRanking} />
              </ChartCard>
              <ChartCard title="Tendencia Mensual" subtitle="Acompañamientos · valor devuelto · críticos">
                <TendenciaMesChart data={exec.charts.tendenciaMes} />
              </ChartCard>
              <ChartCard title="Matriz de Criticidad e Impacto" subtitle="Eventos por nivel + valor económico">
                <MatrizCriticidadChart data={exec.charts.matrizCriticidad} />
              </ChartCard>
            </div>

            {/* Calidad de datos */}
            <RutasCalidadDatos data={exec.calidadDatos} />

            {/* Matriz trazabilidad */}
            <RutasTrazabilidad rows={exec.trazabilidad} />
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── FilterBar */
function RutasFilterBar({ filters, options, onChange }: {
  filters: RutasFilters;
  options: { auditores: string[]; ciudades: string[]; motivos: string[]; rutas: any[]; clientes: any[] };
  onChange: (f: RutasFilters) => void;
}) {
  const set = (k: keyof RutasFilters, v: any) => onChange({ ...filters, [k]: v === "" ? undefined : v });
  return (
    <div className="card-base p-4 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <F label="Año">
          <select value={filters.year ?? 2026} onChange={e => set("year", +e.target.value)} className="filter-input">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </F>
        <F label="Auditor">
          <select value={filters.auditorId ?? ""} onChange={e => set("auditorId", e.target.value)} className="filter-input">
            <option value="">Todos</option>
            {options.auditores.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </F>
        <F label="Ruta">
          <select value={filters.rutaId ?? ""} onChange={e => set("rutaId", e.target.value)} className="filter-input">
            <option value="">Todas</option>
            {options.rutas.map((r: any) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </F>
        <F label="Cliente">
          <select value={filters.clienteId ?? ""} onChange={e => set("clienteId", e.target.value)} className="filter-input">
            <option value="">Todos</option>
            {options.clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </F>
        <F label="Ciudad">
          <select value={filters.ciudad ?? ""} onChange={e => set("ciudad", e.target.value)} className="filter-input">
            <option value="">Todas</option>
            {options.ciudades.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </F>
        <F label="Estado">
          <select value={filters.estado ?? ""} onChange={e => set("estado", e.target.value)} className="filter-input">
            <option value="">Todos</option>
            {["PROGRAMADO","EN_CURSO","COMPLETADO","CON_HALLAZGOS","CERRADO"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </F>
        <F label="Motivo">
          <select value={filters.motivo ?? ""} onChange={e => set("motivo", e.target.value)} className="filter-input">
            <option value="">Todos</option>
            {options.motivos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </F>
        <F label="Criticidad">
          <select value={filters.criticidad ?? ""} onChange={e => set("criticidad", e.target.value)} className="filter-input">
            <option value="">Todas</option>
            {["CRITICO","ALTO","MEDIO","BAJO"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </F>
        <F label="Mes">
          <select value={filters.mes ?? ""} onChange={e => set("mes", e.target.value ? +e.target.value : undefined)} className="filter-input">
            <option value="">Todos</option>
            {["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"].map((m, i) =>
              <option key={i+1} value={i+1}>{m}</option>
            )}
          </select>
        </F>
      </div>
      <div className="flex items-center justify-end">
        <button onClick={() => onChange({ year: 2026 })} className="text-xs text-[#94A3B8] hover:text-white flex items-center gap-1">
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
      `}</style>
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

/* ─────────────────────────────────────── KPI Grid */
function RutasKpiGrid({ kpis }: { kpis: any }) {
  const formatCOP = (n: number) => `$${(n / 1000).toFixed(0)}K`;
  const cards = [
    { label: "Acompañamientos",  value: kpis.totalAcompanamientos,             icon: <Truck/>,           color: "#3B82F6" },
    { label: "Críticos",         value: kpis.criticos,                         icon: <AlertTriangle/>,   color: "#EF4444" },
    { label: "Con hallazgos",    value: kpis.conHallazgos,                     icon: <Bug/>,             color: "#F97316" },
    { label: "Completados",      value: kpis.completados,                      icon: <ShieldCheck/>,     color: "#10B981" },
    { label: "Valor devuelto",   value: formatCOP(kpis.totalValorDevueltoCOP), icon: <DollarSign/>,      color: "#10B981" },
    { label: "Kg devueltos",     value: kpis.totalKgDevueltos.toFixed(0),      icon: <Package/>,         color: "#06B6D4" },
    { label: "Clientes únicos",  value: kpis.clientesUnicos,                   icon: <Building2/>,       color: "#8B5CF6" },
    { label: "Rutas únicas",     value: kpis.rutasUnicas,                      icon: <MapPin/>,          color: "#EC4899" },
    { label: "Auditores",        value: kpis.auditoresActivos,                 icon: <Users/>,           color: "#F59E0B" },
    { label: "Acciones generadas",value: kpis.accionesGeneradas,               icon: <Network/>,         color: "#0EA5E9" },
    { label: "Acciones cerradas",value: kpis.accionesCerradas,                 icon: <Award/>,           color: "#22C55E" },
    { label: "% Cierre acciones",value: `${kpis.tasaCierreAcciones}%`,         icon: <Gauge/>,           color: "#A855F7" },
    { label: "% Resolución",     value: `${kpis.tasaResolucion}%`,             icon: <Target/>,          color: "#06B6D4" },
    { label: "Índice criticidad",value: `${kpis.indiceCriticidad}/100`,        icon: <AlertOctagon/>,    color: "#EF4444" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
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

/* ─────────────────────────────────────── AI Card */
function RutasAiCard({ aiData, heuristico, loading, open, onToggle }: any) {
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
            <p className="font-display font-bold text-white text-sm">Análisis IA · Rutas</p>
            <p className="text-[10px] text-[#94A3B8]">
              {mode === "claude" ? "🤖 Claude IA" : "📊 Heurístico"}
              {aiData?.generadoEn && ` · ${new Date(aiData.generadoEn).toLocaleTimeString("es-CO")}`}
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-purple-300"/> : <ChevronDown className="w-4 h-4 text-purple-300"/>}
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <SummarySection title="📋 Resumen" items={data?.resumen ?? []} color="purple"/>
          <SummarySection title="🎯 Recomendaciones" items={data?.recomendaciones ?? []} color="amber"/>
          {aiData?.riesgos && <SummarySection title="🚨 Riesgos" items={aiData.riesgos} color="red"/>}
          {aiData?.oportunidades && <SummarySection title="💡 Oportunidades" items={aiData.oportunidades} color="emerald"/>}
        </div>
      )}
    </div>
  );
}

function SummarySection({ title, items, color }: { title: string; items: string[]; color: string }) {
  const colorMap: Record<string, string> = {
    purple:  "border-purple-500/20 bg-purple-500/5",
    amber:   "border-amber-500/20 bg-amber-500/5",
    red:     "border-red-500/20 bg-red-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
  };
  return (
    <div className={cn("rounded-lg border p-3", colorMap[color])}>
      <p className="text-xs font-semibold text-white mb-2">{title}</p>
      <ul className="space-y-1.5 text-xs text-[#94A3B8]">
        {items.length === 0 ? <li className="text-[#475569]">Sin datos</li> : items.map((it, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="text-cyan-400">•</span>
            <span dangerouslySetInnerHTML={{ __html: it.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>') }}/>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────── Charts */
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

function HeatmapRutaMes({ data }: { data: any[] }) {
  if (data.length === 0) return <p className="text-center text-xs text-[#475569] py-8">Sin acompañamientos en el período</p>;

  // Build matrix · rutas únicas × 12 meses
  const rutas = Array.from(new Set(data.map(d => d.ruta)));
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const maxCount = Math.max(...data.map(d => d.count));

  const getColor = (count: number) => {
    if (count === 0) return "#1A2540";
    const ratio = count / maxCount;
    if (ratio > 0.75) return "#EF4444";
    if (ratio > 0.5)  return "#F97316";
    if (ratio > 0.25) return "#F59E0B";
    return "#06B6D4";
  };

  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th className="text-left p-1 text-[#94A3B8] font-semibold sticky left-0 bg-[#0D1526]">Ruta \ Mes</th>
            {meses.map(m => <th key={m} className="p-1 text-[#94A3B8] font-medium text-center w-12">{m}</th>)}
          </tr>
        </thead>
        <tbody>
          {rutas.map(ruta => (
            <tr key={ruta}>
              <td className="text-left p-1 text-white text-[10px] sticky left-0 bg-[#0D1526] font-medium pr-3 max-w-[180px] truncate">{ruta}</td>
              {meses.map((_, mIdx) => {
                const cell = data.find(d => d.ruta === ruta && d.mes === mIdx + 1);
                const c = cell?.count ?? 0;
                return (
                  <td key={mIdx} className="p-0.5">
                    <div
                      className="w-10 h-7 rounded flex items-center justify-center font-mono text-[10px] font-bold transition-all hover:scale-110"
                      style={{
                        background: getColor(c),
                        color: c > 0 ? "white" : "#475569",
                      }}
                      title={cell ? `${c} acompañamientos · $${cell.valor.toLocaleString("es-CO")} COP` : "Sin actividad"}
                    >
                      {c > 0 ? c : "·"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-[#94A3B8]">
        <span>Intensidad:</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ background: "#06B6D4" }}/>Baja</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ background: "#F59E0B" }}/>Media</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ background: "#F97316" }}/>Alta</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ background: "#EF4444" }}/>Crítica</span>
      </div>
    </div>
  );
}

function ParetoMotivosChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data.slice(0, 10)}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A"/>
        <XAxis dataKey="motivo" tick={{ fill: "#94A3B8", fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={70}/>
        <YAxis yAxisId="left"  tick={{ fill: "#94A3B8", fontSize: 10 }} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <Tooltip content={<Tip/>}/>
        <Legend wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }}/>
        <Bar yAxisId="left" dataKey="count" fill="#06B6D4" name="Eventos" radius={[3,3,0,0]}/>
        <Line yAxisId="right" type="monotone" dataKey="acumulado" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} name="% Acumulado"/>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function AuditoresChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data.slice(0, 10)} layout="vertical" barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false}/>
        <XAxis type="number" tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <YAxis type="category" dataKey="auditorNombre" width={120} tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <Tooltip content={<Tip/>}/>
        <Legend wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }}/>
        <Bar dataKey="total" fill="#3B82F6" name="Total acompañamientos" radius={[0,3,3,0]}/>
        <Bar dataKey="criticos" fill="#EF4444" name="Críticos" radius={[0,3,3,0]}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ClientesRankingChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 28)}>
      <BarChart data={data} layout="vertical" barSize={12}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false}/>
        <XAxis type="number" tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <YAxis type="category" dataKey="nombre" width={180} tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <Tooltip content={<Tip/>}/>
        <Legend wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }}/>
        <Bar dataKey="total"        fill="#8B5CF6" name="Acompañamientos" radius={[0,3,3,0]}/>
        <Bar dataKey="participacion" fill="#06B6D4" name="% Participación" radius={[0,3,3,0]}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TendenciaMesChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A"/>
        <XAxis dataKey="mes" tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <YAxis yAxisId="left"  tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <YAxis yAxisId="right" orientation="right" tick={{ fill: "#94A3B8", fontSize: 9 }}/>
        <Tooltip content={<Tip/>}/>
        <Legend wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }}/>
        <Bar yAxisId="left" dataKey="Acompañamientos" fill="#3B82F6" radius={[3,3,0,0]}/>
        <Bar yAxisId="left" dataKey="Criticos"        fill="#EF4444" radius={[3,3,0,0]}/>
        <Line yAxisId="right" type="monotone" dataKey="ValorCOP" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Valor COP"/>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function MatrizCriticidadChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="count" label={(d: any) => `${d.impactoLabel}: ${d.count}`}>
          {data.map((d, i) => <Cell key={i} fill={CRITICIDAD_COLOR[d.criticidad] ?? "#64748B"}/>)}
        </Pie>
        <Tooltip content={<Tip/>}/>
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ─────────────────────────────────────── Calidad de Datos */
function RutasCalidadDatos({ data }: { data: any }) {
  const scoreColor = data.score >= 80 ? "#10B981" : data.score >= 60 ? "#F59E0B" : "#EF4444";
  return (
    <div className="card-base p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400"/> Calidad de datos · Rutas
          </h3>
          <p className="text-[10px] text-[#94A3B8]">{data.total} registros analizados</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Score</p>
          <p className="font-display text-3xl font-bold" style={{ color: scoreColor }}>{data.score}/100</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: "Sin cliente",     value: data.sinCliente },
          { label: "Sin ruta",        value: data.sinRuta },
          { label: "Sin observación", value: data.sinObservacion },
          { label: "Sin valor COP",   value: data.sinValor },
          { label: "Sin kg",          value: data.sinKg },
        ].map(it => {
          const c = it.value === 0 ? "#10B981" : it.value < 5 ? "#F59E0B" : "#EF4444";
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

/* ─────────────────────────────────────── Trazabilidad table */
function RutasTrazabilidad({ rows }: { rows: any[] }) {
  return (
    <div className="card-base p-0 overflow-hidden">
      <div className="p-4 border-b border-[#1E2D4A]">
        <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
          <Award className="w-4 h-4 text-cyan-400"/>
          Matriz de Trazabilidad · Top {rows.length} acompañamientos
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-[#475569] border-b border-[#1E2D4A]">
              <th className="text-left p-2 pl-4">Fecha</th>
              <th className="text-left p-2">Auditor</th>
              <th className="text-left p-2">Cliente</th>
              <th className="text-left p-2">Ruta</th>
              <th className="text-left p-2">Motivo</th>
              <th className="text-center p-2">Críticidad</th>
              <th className="text-center p-2">Estado</th>
              <th className="text-right p-2">Valor</th>
              <th className="text-center p-2">Acc</th>
              <th className="text-center p-2">Evid</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-[#1E2D4A]/30 hover:bg-[#0D1526]/50">
                <td className="p-2 pl-4 text-[#94A3B8] text-xs font-mono">{r.fecha}</td>
                <td className="p-2 text-white text-xs">{r.auditorNombre.split(" ").slice(0, 2).join(" ")}</td>
                <td className="p-2 text-white text-xs">{r.cliente}</td>
                <td className="p-2 text-[#94A3B8] text-xs">{r.ruta}</td>
                <td className="p-2 text-[#94A3B8] text-xs">{r.motivo}</td>
                <td className="p-2 text-center">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: `${CRITICIDAD_COLOR[r.criticidad]}18`,
                      color: CRITICIDAD_COLOR[r.criticidad],
                      border: `1px solid ${CRITICIDAD_COLOR[r.criticidad]}40`,
                    }}>
                    {r.criticidad}
                  </span>
                </td>
                <td className="p-2 text-center">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: `${ESTADO_COLOR[r.estado]}18`,
                      color: ESTADO_COLOR[r.estado],
                      border: `1px solid ${ESTADO_COLOR[r.estado]}40`,
                    }}>
                    {r.estado}
                  </span>
                </td>
                <td className="p-2 text-right text-emerald-300 text-xs font-mono">${(r.valorCOP / 1000).toFixed(0)}K</td>
                <td className="p-2 text-center text-[#94A3B8] text-xs">{r.acciones}</td>
                <td className="p-2 text-center text-[#94A3B8] text-xs">{r.evidencias}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
