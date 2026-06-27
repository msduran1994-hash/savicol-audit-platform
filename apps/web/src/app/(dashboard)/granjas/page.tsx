"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard Ejecutivo · Granjas
// ═══════════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { useGranjasExecutive, useGranjasAiSummary, type GranjasFilters } from "@/hooks/useGranjasExecutive";
import { useGranjas } from "@/hooks/useGranjas";
import { useAuthStore } from "@/store/auth.store";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, ReferenceLine,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import {
  Tractor, AlertTriangle, ShieldCheck, Target, Users, Sparkles, Bug,
  Filter, RefreshCw, FileSpreadsheet, FileText, Loader2,
  X, ChevronDown, ChevronUp, Award, Gauge, Activity, Package, Wheat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLotes, useChecklists, calcularCumplimiento, type LoteItem, type ChecklistData } from "@/hooks/useLotes";
import { mortLote, statMuestreo, galponesDeLote, pesoLoteD7, stddev, MORT_RANGO_D7 } from "@/lib/trazabilidad-metrics";
import { exportarDashboardPDF } from "@/lib/dashboard-pdf";

const TIPOS_GRANJA = ["PROPIA", "ARRENDADA", "INTEGRADA"];
const TIPOS_OPERATIVO = ["ENGORDE", "REPRODUCTORA"];
const ESTADOS_GRANJA = ["ACTIVA", "INACTIVA", "CUARENTENA"];
const CRITICIDADES = ["CRITICA", "ALTA", "MEDIA", "BAJA"];
const TIPOS_RIESGO = ["OPERATIVO", "REPUTACIONAL", "FINANCIERO", "LEGAL", "CONTAGIO"];

const CRIT_COLOR: Record<string, string> = {
  CRITICA: "#EF4444", ALTA: "#F97316", MEDIA: "#F59E0B", BAJA: "#10B981",
};

const STATUS_COLOR: Record<string, string> = {
  PENDIENTE: "#94A3B8", EN_PROCESO: "#F59E0B", COMPLETADA: "#3B82F6",
  APROBADA: "#10B981", NO_APROBADA: "#EF4444",
};

const SEV_STYLE: Record<string, { bg: string; border: string; text: string; emoji: string }> = {
  CRITICAL: { bg: "bg-red-500/10",     border: "border-red-500/30",     text: "text-red-300",     emoji: "🚨" },
  HIGH:     { bg: "bg-orange-500/10",  border: "border-orange-500/30",  text: "text-orange-300",  emoji: "⚠️" },
  MEDIUM:   { bg: "bg-amber-500/10",   border: "border-amber-500/30",   text: "text-amber-300",   emoji: "⚡" },
  INFO:     { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-300", emoji: "📋" },
};

export default function GranjasDashboardPage() {
  const [filters, setFilters]       = useState<GranjasFilters>({ year: 2026, estado: "ACTIVA" });
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [aiOpen, setAiOpen]         = useState(true);
  const [aiTrigger, setAiTrigger]   = useState(false);
  const [pdfBusy, setPdfBusy]       = useState(false);

  const execQ = useGranjasExecutive(filters);
  const aiQ   = useGranjasAiSummary(filters, aiTrigger);
  const granjasQ = useGranjas();

  // ─── Trazabilidad (lotes/checklists de /documentos), sincronizado con filtros ──
  const { data: lotesTrz = [] } = useLotes();
  const { data: encItems = [] } = useChecklists("encacetamiento");
  const { data: trzItems = [] } = useChecklists("trazabilidad7");
  const trzData = useMemo(() => {
    const gId = filters.granjaId, fD = filters.fechaDesde, fH = filters.fechaHasta;
    const enRango = (f?: string) => { if (!f) return true; if (fD && f < fD) return false; if (fH && f > fH) return false; return true; };
    const lotesF = lotesTrz.filter(l => (!gId || l.data.granjaId === gId) && enRango(l.data.fechaIngreso));
    const chksF: ChecklistData[] = [...encItems, ...trzItems].map(c => c.data).filter(c => (!gId || c.granjaId === gId) && enRango(c.fechaVisita));
    const map = new Map<string, { nombre: string; lotes: LoteItem[]; chks: ChecklistData[] }>();
    lotesF.forEach(l => { const k = l.data.granjaId || l.data.granjaNombre || "—"; if (!map.has(k)) map.set(k, { nombre: l.data.granjaNombre || "—", lotes: [], chks: [] }); map.get(k)!.lotes.push(l); });
    chksF.forEach(c => { const k = c.granjaId || "—"; if (map.has(k)) map.get(k)!.chks.push(c); });
    const datos = Array.from(map.values()).map(g => {
      const ms = g.lotes.map(mortLote);
      const pob = ms.reduce((s, m) => s + m.pob, 0), muertas = ms.reduce((s, m) => s + m.totalMuertas, 0);
      const mort = pob > 0 ? (muertas / pob) * 100 : 0;
      const galMorts: number[] = []; g.lotes.forEach((l, i) => galponesDeLote(l).forEach(() => galMorts.push(ms[i].general)));
      const disp = stddev(galMorts);
      const cumplVals = g.chks.map(c => calcularCumplimiento((c.preguntas || []).map(p => p.resultado)));
      const cumpl = cumplVals.length ? Math.round(cumplVals.reduce((a, b) => a + b, 0) / cumplVals.length) : 0;
      const allMs = g.chks.flatMap(c => (c.muestreos || []).filter(m => (m.cantidad ?? 0) > 0 && (m.pesoTotal ?? 0) > 0));
      const st = statMuestreo(allMs);
      let peso = st.unit > 0 ? st.unit * 1000 : 0;
      if (peso === 0) { const ps = g.lotes.map(l => pesoLoteD7((l.data as any).seguimiento || [])).filter(v => v > 0); peso = ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : 0; }
      const cv = st.totalM > 0 ? st.cv : 0;
      const noConf = g.chks.reduce((s, c) => s + (c.preguntas || []).filter(p => p.resultado === "no_cumple").length, 0);
      let crit = 0; crit += Math.min(35, (mort / MORT_RANGO_D7) * 17.5); crit += Math.min(30, (100 - cumpl) * 0.3); crit += cv > 12 ? 20 : cv > 8 ? 10 : 0; crit += Math.min(15, noConf * 3); crit = Math.round(crit);
      return { name: g.nombre, lotes: g.lotes.length, mort: +mort.toFixed(2), cumpl, disp: +disp.toFixed(2), peso: Math.round(peso), cv: +cv.toFixed(1), crit,
        mortColor: mort <= MORT_RANGO_D7 ? "#10B981" : "#EF4444", cumplColor: cumpl >= 90 ? "#10B981" : cumpl >= 70 ? "#F59E0B" : "#EF4444", critColor: crit >= 60 ? "#EF4444" : crit >= 35 ? "#F59E0B" : "#10B981" };
    }).sort((a, b) => b.crit - a.crit);
    const totPob = lotesF.reduce((s, l) => s + mortLote(l).pob, 0);
    const totMuertas = lotesF.reduce((s, l) => s + mortLote(l).totalMuertas, 0);
    const allCumpl = chksF.map(c => calcularCumplimiento((c.preguntas || []).map(p => p.resultado)));
    const allMsG = chksF.flatMap(c => (c.muestreos || []).filter(m => (m.cantidad ?? 0) > 0 && (m.pesoTotal ?? 0) > 0));
    const stG = statMuestreo(allMsG);
    return { datos, kpi: { lotes: lotesF.length, mort: totPob > 0 ? (totMuertas / totPob) * 100 : 0, cumpl: allCumpl.length ? Math.round(allCumpl.reduce((a, b) => a + b, 0) / allCumpl.length) : 0, peso: stG.unit > 0 ? Math.round(stG.unit * 1000) : 0, cv: stG.totalM > 0 ? stG.cv : 0, criticas: datos.filter(d => d.crit >= 60).length } };
  }, [lotesTrz, encItems, trzItems, filters.granjaId, filters.fechaDesde, filters.fechaHasta]);

  const exec = execQ.data;
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

  const auditoresOptions = useMemo(() => {
    if (!exec) return [];
    return Array.from(new Set((exec.charts?.auditores ?? []).map(a => a.auditorNombre)));
  }, [exec]);

  const activeFilters = Object.values(filters).filter(v => v != null && v !== "").length - 1;

  const downloadExcel = async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const qs = new URLSearchParams();
    if (filters.criticidad) qs.append("criticidad", filters.criticidad);
    if (filters.estado)     qs.append("estado", filters.estado);
    const r = await fetch(`${apiBase}/api/v1/reports/hallazgos/granjas/excel?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return alert("Error al descargar");
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `granjas-hallazgos-${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Dashboard · Granjas"
        subtitle={exec?.kpis
          ? `${exec.kpis.totalGranjas} granjas · ${exec.kpis.totalAuditorias} auditorías · ${exec.kpis.totalHallazgos} hallazgos · ${exec.resumenHeuristico?.estado ?? ""}`
          : "Cargando dashboard..."}
      />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setFiltersOpen(!filtersOpen)} className="px-3 py-1.5 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-xs font-medium text-white flex items-center gap-2 hover:bg-[#243054]">
              <Filter className="w-3.5 h-3.5"/>
              Filtros {activeFilters > 0 && <span className="bg-amber-500 text-[#0A111F] rounded-full px-1.5 text-[10px] font-bold">{activeFilters}</span>}
              {filtersOpen ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
            </button>
            <button onClick={() => execQ.refetch()} className="p-1.5 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8] hover:text-white">
              <RefreshCw className={cn("w-4 h-4", execQ.isFetching && "animate-spin")}/>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setAiTrigger(true); setAiOpen(true); }} disabled={aiQ.isFetching} className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs font-semibold text-purple-300 flex items-center gap-2 hover:bg-purple-500/20 disabled:opacity-50">
              <Sparkles className={cn("w-3.5 h-3.5", aiQ.isFetching && "animate-spin")}/>
              {aiQ.isFetching ? "Generando..." : "Análisis Ejecutivo"}
            </button>
            <button onClick={downloadExcel} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-300 flex items-center gap-2 hover:bg-emerald-500/20">
              <FileSpreadsheet className="w-3.5 h-3.5"/> Excel Hallazgos
            </button>
            <button onClick={async () => { setPdfBusy(true); try { await exportarDashboardPDF({ exec, trz: trzData, filters }); } catch { alert("Error al generar el PDF"); } finally { setPdfBusy(false); } }} disabled={pdfBusy || !exec} className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs font-medium text-cyan-300 flex items-center gap-2 hover:bg-cyan-500/20 disabled:opacity-50">
              {pdfBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <FileText className="w-3.5 h-3.5"/>} {pdfBusy ? "Generando…" : "Exportar PDF"}
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className="card-base p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <F label="Año">
                <select value={filters.year ?? 2026} onChange={e => setFilters({ ...filters, year: +e.target.value })} className="filter-input">
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </F>
              <F label="Granja">
                <select value={filters.granjaId ?? ""} onChange={e => setFilters({ ...filters, granjaId: e.target.value || undefined })} className="filter-input">
                  <option value="">Todas</option>
                  {(granjasQ.data ?? []).map((g: any) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                </select>
              </F>
              <F label="Auditor">
                <select value={filters.auditorId ?? ""} onChange={e => setFilters({ ...filters, auditorId: e.target.value || undefined })} className="filter-input">
                  <option value="">Todos</option>
                  {auditoresOptions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </F>
              <F label="Tipo Granja">
                <select value={filters.tipoGranja ?? ""} onChange={e => setFilters({ ...filters, tipoGranja: e.target.value || undefined })} className="filter-input">
                  <option value="">Todos</option>
                  {TIPOS_GRANJA.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </F>
              <F label="Tipo Operativo">
                <select value={filters.tipoOperativo ?? ""} onChange={e => setFilters({ ...filters, tipoOperativo: e.target.value || undefined })} className="filter-input">
                  <option value="">Todos</option>
                  {TIPOS_OPERATIVO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </F>
              <F label="Estado">
                <select value={filters.estado ?? ""} onChange={e => setFilters({ ...filters, estado: e.target.value || undefined })} className="filter-input">
                  <option value="">Todos</option>
                  {ESTADOS_GRANJA.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </F>
              <F label="Criticidad">
                <select value={filters.criticidad ?? ""} onChange={e => setFilters({ ...filters, criticidad: e.target.value || undefined })} className="filter-input">
                  <option value="">Todas</option>
                  {CRITICIDADES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </F>
              <F label="Tipo Riesgo">
                <select value={filters.tipoRiesgo ?? ""} onChange={e => setFilters({ ...filters, tipoRiesgo: e.target.value || undefined })} className="filter-input">
                  <option value="">Todos</option>
                  {TIPOS_RIESGO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </F>
              <F label="Fecha desde">
                <input type="date" value={filters.fechaDesde ?? ""} onChange={e => setFilters({ ...filters, fechaDesde: e.target.value || undefined })} className="filter-input"/>
              </F>
              <F label="Fecha hasta">
                <input type="date" value={filters.fechaHasta ?? ""} onChange={e => setFilters({ ...filters, fechaHasta: e.target.value || undefined })} className="filter-input"/>
              </F>
            </div>
            <div className="flex items-center justify-end">
              <button onClick={() => setFilters({ year: 2026, estado: "ACTIVA" })} className="text-xs text-[#94A3B8] hover:text-white flex items-center gap-1">
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
            <span className="ml-3 text-sm">Cargando dashboard Granjas...</span>
          </div>
        )}

        {exec && (
          <>
            {exec.kpis && <KpiGrid kpis={exec.kpis}/>}

            {aiTrigger && (
              <AiCard aiData={aiQ.data} heuristico={exec.resumenHeuristico} loading={aiQ.isFetching} open={aiOpen} onToggle={() => setAiOpen(!aiOpen)}/>
            )}

            {(exec.alertas?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs uppercase tracking-wider text-[#94A3B8] font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400"/> Alertas estratégicas ({exec.alertas.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {exec.alertas.map((a, i) => {
                    const style = SEV_STYLE[a.severity] ?? SEV_STYLE.INFO;
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Hallazgos por Categoría" subtitle="Distribución de hallazgos por área temática">
                <CategoriaChart data={exec.charts?.hallazgosPorCategoria}/>
              </ChartCard>
              <ChartCard title="Diagnóstico por Fecha de Reporte" subtitle="Serie temporal de hallazgos">
                <DiagnosticoFechaChart data={exec.charts?.diagnosticoFecha}/>
              </ChartCard>
              <ChartCard title="Distribución de Granjas por Tipo" subtitle="Propia · Arrendada · Integrada">
                <DistribucionTipoChart data={exec.charts?.distribucionTipo}/>
              </ChartCard>
              <ChartCard title="Línea Productiva" subtitle="Engorde vs Reproductoras">
                <LineaProductivaChart data={exec.charts?.lineaProductiva}/>
              </ChartCard>
              <ChartCard title="Visitas por Auditor" subtitle="Ranking de auditores activos" full>
                <AuditoresChart data={exec.charts?.auditores}/>
              </ChartCard>
              <ChartCard title="Tendencia Mensual de Visitas" subtitle="Visitas · hallazgos · críticos por mes" full>
                <TendenciaChart data={exec.charts?.tendenciaMes}/>
              </ChartCard>
              <ChartCard title="Matriz de Criticidad" subtitle="Distribución por nivel">
                <CriticidadChart data={exec.charts?.matrizCriticidad}/>
              </ChartCard>
              <ChartCard title="Granjas por Producción" subtitle="Top 10 por capacidad de aves">
                <ProduccionChart data={exec.charts?.granjasProduccion}/>
              </ChartCard>
              <ChartCard title="Radar de Riesgos por Categoría" subtitle="Concentración de hallazgos por área">
                <RadarCategoriaChart data={exec.charts?.hallazgosPorCategoria}/>
              </ChartCard>
              <ChartCard title="Riesgos: Mitigados vs Activos" subtitle="Cerrados/verificados vs abiertos">
                <MitigadosChart cerrados={exec.kpis?.hallazgosCerrados ?? 0} activos={exec.kpis?.hallazgosAbiertos ?? 0}/>
              </ChartCard>
            </div>

            {exec.calidadDatos && <CalidadCard data={exec.calidadDatos}/>}

            <TrazabilidadTable rows={exec.trazabilidad ?? []}/>
          </>
        )}

        {trzData.datos.length > 0 && (
          <div className="card-base p-5 space-y-5 border border-cyan-500/20">
            <div>
              <h2 className="font-display font-bold text-white text-base flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-400"/> Trazabilidad · Resultados por Granja</h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">Mortalidad, cumplimiento, dispersión, peso y criticidad — sincronizado con los filtros (Granja y Fecha)</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {([
                ["Lotes", String(trzData.kpi.lotes), "#06B6D4"],
                ["Mortalidad gral.", `${trzData.kpi.mort.toFixed(2)}%`, trzData.kpi.mort <= MORT_RANGO_D7 ? "#10B981" : "#EF4444"],
                ["Cumplim. prom.", `${trzData.kpi.cumpl}%`, trzData.kpi.cumpl >= 90 ? "#10B981" : trzData.kpi.cumpl >= 70 ? "#F59E0B" : "#EF4444"],
                ["Peso prom.", trzData.kpi.peso > 0 ? `${trzData.kpi.peso} g` : "—", "#3B82F6"],
                ["CV muestreos", trzData.kpi.cv > 0 ? `${trzData.kpi.cv.toFixed(1)}%` : "—", trzData.kpi.cv === 0 ? "#94A3B8" : trzData.kpi.cv <= 8 ? "#10B981" : trzData.kpi.cv <= 12 ? "#F59E0B" : "#EF4444"],
                ["Granjas críticas", String(trzData.kpi.criticas), trzData.kpi.criticas > 0 ? "#EF4444" : "#10B981"],
              ] as [string, string, string][]).map(c => (
                <div key={c[0]} className="card-base p-3" style={{ borderColor: `${c[2]}30` }}>
                  <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">{c[0]}</p>
                  <p className="text-xl font-bold mt-0.5" style={{ color: c[2] }}>{c[1]}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Mortalidad por granja (%)" subtitle="Acumulada D1–D7 · referencia 0.7%">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={trzData.datos} barSize={24} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false}/>
                    <XAxis dataKey="name" tick={{ fill:"#94A3B8", fontSize:10 }} angle={-20} textAnchor="end" height={56} interval={0} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:"#94A3B8", fontSize:10 }} axisLine={false} tickLine={false}/>
                    <Tooltip/>
                    <ReferenceLine y={MORT_RANGO_D7} stroke="#EF4444" strokeDasharray="4 3"/>
                    <Bar dataKey="mort" name="Mortalidad %" radius={[3,3,0,0]}>{trzData.datos.map((d, i) => <Cell key={i} fill={d.mortColor}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Cumplimiento por granja (%)" subtitle="Promedio de checklists">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={trzData.datos} barSize={24} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false}/>
                    <XAxis dataKey="name" tick={{ fill:"#94A3B8", fontSize:10 }} angle={-20} textAnchor="end" height={56} interval={0} axisLine={false} tickLine={false}/>
                    <YAxis domain={[0,100]} tick={{ fill:"#94A3B8", fontSize:10 }} axisLine={false} tickLine={false}/>
                    <Tooltip/>
                    <Bar dataKey="cumpl" name="Cumplimiento %" radius={[3,3,0,0]}>{trzData.datos.map((d, i) => <Cell key={i} fill={d.cumplColor}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Dispersión de mortalidad entre galpones (σ, pp)" subtitle="Desviación estándar por granja">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={trzData.datos} barSize={24} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false}/>
                    <XAxis dataKey="name" tick={{ fill:"#94A3B8", fontSize:10 }} angle={-20} textAnchor="end" height={56} interval={0} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:"#94A3B8", fontSize:10 }} axisLine={false} tickLine={false}/>
                    <Tooltip/>
                    <Bar dataKey="disp" name="σ mortalidad (pp)" fill="#8B5CF6" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Peso promedio por granja (g)" subtitle="Muestreos · fallback Seguimiento D7">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={trzData.datos} barSize={24} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false}/>
                    <XAxis dataKey="name" tick={{ fill:"#94A3B8", fontSize:10 }} angle={-20} textAnchor="end" height={56} interval={0} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:"#94A3B8", fontSize:10 }} axisLine={false} tickLine={false}/>
                    <Tooltip/>
                    <Bar dataKey="peso" name="Peso prom (g)" fill="#06B6D4" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <ChartCard title="Índice de criticidad por granja (0–100)" subtitle="Mortalidad + cumplimiento + CV + no conformes" full>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trzData.datos} barSize={26} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false}/>
                  <XAxis dataKey="name" tick={{ fill:"#94A3B8", fontSize:10 }} angle={-15} textAnchor="end" height={56} interval={0} axisLine={false} tickLine={false}/>
                  <YAxis domain={[0,100]} tick={{ fill:"#94A3B8", fontSize:10 }} axisLine={false} tickLine={false}/>
                  <Tooltip/>
                  <ReferenceLine y={60} stroke="#EF4444" strokeDasharray="4 3"/>
                  <ReferenceLine y={35} stroke="#F59E0B" strokeDasharray="4 3"/>
                  <Bar dataKey="crit" name="Índice criticidad" radius={[3,3,0,0]}>{trzData.datos.map((d, i) => <Cell key={i} fill={d.critColor}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
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

/* ─────────────── KPI Grid · 14 cards */
function KpiGrid({ kpis }: { kpis: any }) {
  const cards = [
    { label: "Granjas",             value: kpis.totalGranjas,                  icon: <Tractor/>,        color: "#3B82F6" },
    { label: "Activas",             value: kpis.granjasActivas,                icon: <ShieldCheck/>,    color: "#10B981" },
    { label: "Cuarentena",          value: kpis.granjasCuarentena,             icon: <AlertTriangle/>,  color: "#F59E0B" },
    { label: "Riesgo alto",         value: kpis.granjasRiesgoAlto,             icon: <AlertTriangle/>,  color: "#EF4444" },
    { label: "Capacidad aves",      value: (kpis.capacidadTotal ?? 0).toLocaleString("es-CO"), icon: <Wheat/>,   color: "#06B6D4" },
    { label: "Auditorías",          value: kpis.totalAuditorias,               icon: <Activity/>,       color: "#8B5CF6" },
    { label: "Auditores",           value: kpis.auditoresActivos,              icon: <Users/>,          color: "#EC4899" },
    { label: "Hallazgos",           value: kpis.totalHallazgos,                icon: <Bug/>,            color: "#F97316" },
    { label: "Críticos",            value: kpis.hallazgosCriticos,             icon: <AlertTriangle/>,  color: "#EF4444" },
    { label: "Abiertos",            value: kpis.hallazgosAbiertos,             icon: <Bug/>,            color: "#EF4444" },
    { label: "Cerrados",            value: kpis.hallazgosCerrados,             icon: <Award/>,          color: "#10B981" },
    { label: "KPIs",                value: kpis.totalKPIs,                     icon: <Target/>,         color: "#3B82F6" },
    { label: "Cumplim. KPI",        value: `${kpis.cumplimientoKPI}%`,         icon: <Gauge/>,          color: "#A855F7" },
    { label: "Tasa resolución",     value: `${kpis.tasaResolucion}%`,          icon: <Target/>,         color: "#10B981" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
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
            <p className="font-display font-bold text-white text-sm">Análisis Ejecutivo · Granjas</p>
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
          <Section title="📋 Resumen" items={data?.resumen ?? []} color="purple"/>
          <Section title="🎯 Recomendaciones" items={data?.recomendaciones ?? []} color="emerald"/>
          {aiData?.riesgos       && <Section title="🚨 Riesgos" items={aiData.riesgos} color="red"/>}
          {aiData?.oportunidades && <Section title="💡 Oportunidades" items={aiData.oportunidades} color="amber"/>}
        </div>
      )}
    </div>
  );
}

function Section({ title, items, color }: { title: string; items: string[]; color: string }) {
  const map: Record<string, string> = {
    purple: "border-purple-500/20 bg-purple-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    red: "border-red-500/20 bg-red-500/5",
    amber: "border-amber-500/20 bg-amber-500/5",
  };
  return (
    <div className={cn("rounded-lg border p-3", map[color])}>
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

function CategoriaChart({ data }: { data: any[] }) {
  if (!data?.length) return <p className="text-center text-xs text-[#475569] py-8">Sin hallazgos por categoría</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" barSize={16}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false}/>
        <XAxis type="number" tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <YAxis type="category" dataKey="categoria" width={130} tick={{ fill: "#94A3B8", fontSize: 9 }}/>
        <Tooltip content={<Tip/>}/>
        <Bar dataKey="count" fill="#F97316" radius={[0,3,3,0]}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

function DiagnosticoFechaChart({ data }: { data: any[] }) {
  if (!data?.length) return <p className="text-center text-xs text-[#475569] py-8">Sin datos de fechas</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A"/>
        <XAxis dataKey="fecha" tick={{ fill: "#94A3B8", fontSize: 9 }}/>
        <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <Tooltip content={<Tip/>}/>
        <Area type="monotone" dataKey="count" stroke="#8B5CF6" fill="url(#diagGrad)" strokeWidth={2}/>
        <defs>
          <linearGradient id="diagGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#8B5CF6" stopOpacity={0.5}/>
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0}/>
          </linearGradient>
        </defs>
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DistribucionTipoChart({ data }: { data: any[] }) {
  if (!data?.length) return <p className="text-center text-xs text-[#475569] py-8">Sin granjas</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="count" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={(d: any) => `${d.tipo}: ${d.count}`}>
          {data.map((d, i) => <Cell key={i} fill={d.color}/>)}
        </Pie>
        <Tooltip content={<Tip/>}/>
      </PieChart>
    </ResponsiveContainer>
  );
}

function LineaProductivaChart({ data }: { data: any[] }) {
  if (!data?.length) return <p className="text-center text-xs text-[#475569] py-8">Sin línea productiva</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barSize={50}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false}/>
        <XAxis dataKey="linea" tick={{ fill: "#94A3B8", fontSize: 11 }}/>
        <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <Tooltip content={<Tip/>}/>
        <Bar dataKey="count" radius={[3,3,0,0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function AuditoresChart({ data }: { data: any[] }) {
  if (!data?.length) return <p className="text-center text-xs text-[#475569] py-8">Sin auditores</p>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 30)}>
      <BarChart data={data} layout="vertical" barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false}/>
        <XAxis type="number" tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <YAxis type="category" dataKey="auditorNombre" width={150} tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <Tooltip content={<Tip/>}/>
        <Legend wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }}/>
        <Bar dataKey="visitas"   fill="#3B82F6" name="Visitas"  radius={[0,3,3,0]}/>
        <Bar dataKey="hallazgos" fill="#F97316" name="Hallazgos" radius={[0,3,3,0]}/>
        <Bar dataKey="criticos"  fill="#EF4444" name="Críticos" radius={[0,3,3,0]}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TendenciaChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A"/>
        <XAxis dataKey="mes" tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <Tooltip content={<Tip/>}/>
        <Legend wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }}/>
        <Bar dataKey="Visitas"   fill="#3B82F6" radius={[3,3,0,0]}/>
        <Bar dataKey="Hallazgos" fill="#F97316" radius={[3,3,0,0]}/>
        <Line type="monotone" dataKey="Criticos" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }}/>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function CriticidadChart({ data }: { data: any[] }) {
  if (!data?.length) return <p className="text-center text-xs text-[#475569] py-8">Sin hallazgos</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="count" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={(d: any) => `${d.criticidad}: ${d.count}`}>
          {data.map((d, i) => <Cell key={i} fill={CRIT_COLOR[d.criticidad] ?? "#64748B"}/>)}
        </Pie>
        <Tooltip content={<Tip/>}/>
      </PieChart>
    </ResponsiveContainer>
  );
}

function ProduccionChart({ data }: { data: any[] }) {
  if (!data?.length) return <p className="text-center text-xs text-[#475569] py-8">Sin datos de capacidad</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false}/>
        <XAxis type="number" tick={{ fill: "#94A3B8", fontSize: 10 }}/>
        <YAxis type="category" dataKey="nombre" width={160} tick={{ fill: "#94A3B8", fontSize: 9 }}/>
        <Tooltip content={<Tip/>}/>
        <Bar dataKey="capacidad" fill="#10B981" name="Aves" radius={[0,3,3,0]}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

function RadarCategoriaChart({ data }: { data: any[] }) {
  if (!data?.length) return <p className="text-center text-xs text-[#475569] py-8">Sin hallazgos por categoría</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#1E2D4A"/>
        <PolarAngleAxis dataKey="categoria" tick={{ fill: "#94A3B8", fontSize: 9 }}/>
        <Tooltip content={<Tip/>}/>
        <Radar dataKey="count" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.4}/>
      </RadarChart>
    </ResponsiveContainer>
  );
}

function MitigadosChart({ cerrados, activos }: { cerrados: number; activos: number }) {
  if ((cerrados + activos) === 0) return <p className="text-center text-xs text-[#475569] py-8">Sin hallazgos</p>;
  const data = [{ name: "Mitigados", value: cerrados, color: "#10B981" }, { name: "Activos", value: activos, color: "#EF4444" }];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={90} label={(d: any) => `${d.name}: ${d.value}`}>
          {data.map((d, i) => <Cell key={i} fill={d.color}/>)}
        </Pie>
        <Tooltip content={<Tip/>}/>
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ─────────────── Calidad de datos */
function CalidadCard({ data }: { data: any }) {
  const c = data.score >= 80 ? "#10B981" : data.score >= 60 ? "#F59E0B" : "#EF4444";
  return (
    <div className="card-base p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400"/> Calidad de Datos Granjas
          </h3>
          <p className="text-[10px] text-[#94A3B8]">{data.totalRegistros} registros analizados</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Score</p>
          <p className="font-display text-3xl font-bold" style={{ color: c }}>{data.score}/100</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Granjas sin veterinario", value: data.granjasSinVeterinario },
          { label: "Audit. sin fecha ejec.",  value: data.auditoriasSinFechaEjecutada },
          { label: "Hallaz. sin responsable", value: data.hallazgosSinResponsable },
          { label: "KPIs sin responsable",    value: data.kpisSinResponsable },
        ].map(it => {
          const col = it.value === 0 ? "#10B981" : it.value < 3 ? "#F59E0B" : "#EF4444";
          return (
            <div key={it.label} className="bg-[#1A2540] rounded-lg p-2 border border-[#2A3F6A]">
              <p className="text-[9px] uppercase tracking-wider text-[#94A3B8] truncate">{it.label}</p>
              <p className="font-display text-xl font-bold mt-1" style={{ color: col }}>{it.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────── Trazabilidad */
function TrazabilidadTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="card-base p-0 overflow-hidden">
      <div className="p-4 border-b border-[#1E2D4A]">
        <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400"/> Trazabilidad de Auditorías · top {rows.length}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-[#475569] border-b border-[#1E2D4A]">
              <th className="text-left p-2 pl-4">Auditor</th>
              <th className="text-left p-2">Granja</th>
              <th className="text-left p-2">Tipo Granja</th>
              <th className="text-left p-2">Tipo Auditoría</th>
              <th className="text-center p-2">Fecha visita</th>
              <th className="text-center p-2">Estado</th>
              <th className="text-center p-2">Hallazgos</th>
              <th className="text-center p-2">Críticos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-b border-[#1E2D4A]/30 hover:bg-[#0D1526]/50">
                <td className="p-2 pl-4 text-white text-xs font-medium">{r.auditorNombre}</td>
                <td className="p-2 text-cyan-300 text-xs">{r.granjaNombre}</td>
                <td className="p-2 text-[#94A3B8] text-xs">{r.tipoGranja}</td>
                <td className="p-2 text-[#94A3B8] text-xs">{r.tipoAuditoria}</td>
                <td className="p-2 text-center text-[#94A3B8] text-xs">{r.fechaProgramada}</td>
                <td className="p-2 text-center">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: `${STATUS_COLOR[r.estado] ?? "#64748B"}18`,
                      color: STATUS_COLOR[r.estado] ?? "#94A3B8",
                      border: `1px solid ${STATUS_COLOR[r.estado] ?? "#64748B"}40`,
                    }}>
                    {r.estado}
                  </span>
                </td>
                <td className="p-2 text-center text-white text-xs font-mono">{r.hallazgos}</td>
                <td className="p-2 text-center text-red-300 text-xs font-mono">{r.criticos > 0 ? r.criticos : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
