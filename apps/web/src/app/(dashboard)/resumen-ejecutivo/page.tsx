"use client";
import { useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { useGranjas } from "@/hooks/useGranjas";
import { useCedis, useHallazgosCedi, useAuditoriasCedi } from "@/hooks/useCedis";
import { useLotes, useChecklists, calcularCumplimiento } from "@/hooks/useLotes";
import {
  Gauge, ShieldCheck, AlertTriangle, ClipboardCheck, Tractor, Egg,
  TrendingUp, Activity, CheckCircle2, XCircle, Clock, Loader2,
  Package, Route, Warehouse, DollarSign, Megaphone, Users2, Info,
  BarChart3, Trophy, FileDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { SeccionDesempenoAuditores } from "./seccion-desempeno-auditores";
import { SeccionDiagnosticoRutas } from "./seccion-diagnostico-rutas";

// ─── Resumen Ejecutivo · portada corporativa · Fase 1 ──────────────────────────
// Consolida indicadores REALES de Auditoría/CEDIS, Granjas y Trazabilidad.
// Las áreas sin datos integrados se muestran honestamente como "Módulo no integrado".

const fNum = (n: number) => (n ?? 0).toLocaleString("es-CO");

// Semaforización corporativa 90/70 (criterios del prompt ejecutivo)
function semColor(pct: number): string {
  if (pct >= 90) return "#22C55E";
  if (pct >= 70) return "#F59E0B";
  return "#EF4444";
}
function semLabel(pct: number): string {
  if (pct >= 90) return "Óptimo";
  if (pct >= 70) return "Aceptable";
  return "Crítico";
}

// Normaliza estados de hallazgo a abierto/cerrado
function esCerrado(estado: string): boolean {
  return ["CERRADO", "cerrado", "CLOSED"].includes(estado);
}

// Tarjeta KPI individual
function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}1A`, color }}>
          <Icon className="w-5 h-5"/>
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-[11px] text-[#94A3B8] mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[#64748B] mt-0.5">{sub}</p>}
    </div>
  );
}

// Barra de semáforo con porcentaje
function SemBar({ label, pct, extra }: { label: string; pct: number; extra?: string }) {
  const c = semColor(pct);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[#cbd5e1]">{label}</span>
        <div className="flex items-center gap-2">
          {extra && <span className="text-[10px] text-[#64748B]">{extra}</span>}
          <span className="text-xs font-bold" style={{ color: c }}>{pct}%</span>
        </div>
      </div>
      <div className="h-1.5 bg-[#1E2D4A] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: c }}/>
      </div>
    </div>
  );
}

// Encabezado de bloque de sección
function BloqueTitulo({ icon: Icon, titulo, sub, color }: { icon: any; titulo: string; sub?: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}1A`, color }}>
        <Icon className="w-4.5 h-4.5"/>
      </div>
      <div>
        <h2 className="text-sm font-bold text-white">{titulo}</h2>
        {sub && <p className="text-[11px] text-[#64748B]">{sub}</p>}
      </div>
    </div>
  );
}

export default function ResumenEjecutivoPage() {
  const granjasQ = useGranjas();
  const cedisQ = useCedis();
  const hallazgosCediQ = useHallazgosCedi();
  const auditoriasCediQ = useAuditoriasCedi();
  const lotesQ = useLotes();
  const chkEncQ = useChecklists("encacetamiento");
  const chkTrzQ = useChecklists("trazabilidad7");

  const cargando = granjasQ.isLoading || hallazgosCediQ.isLoading || auditoriasCediQ.isLoading;

  // ── Filtros globales (Fase 3) ──
  const [fRegion, setFRegion] = useState("");
  const [fRiesgo, setFRiesgo] = useState("");
  const [fSanitario, setFSanitario] = useState("");
  const [fCriticidad, setFCriticidad] = useState("");
  const filtrosActivos = !!(fRegion || fRiesgo || fSanitario || fCriticidad);
  function limpiarFiltros() { setFRegion(""); setFRiesgo(""); setFSanitario(""); setFCriticidad(""); }

  // Opciones de filtro derivadas de los datos reales
  const opciones = useMemo(() => {
    const granjas = granjasQ.data ?? [];
    const regiones = Array.from(new Set(granjas.map((g: any) => g.region).filter(Boolean))).sort();
    return { regiones };
  }, [granjasQ.data]);

  const ind = useMemo(() => {
    // Aplicar filtros a granjas y hallazgos antes de calcular indicadores
    const granjas = (granjasQ.data ?? []).filter((g: any) => {
      if (fRegion && g.region !== fRegion) return false;
      if (fRiesgo && (g.nivelRiesgo ?? "").toUpperCase() !== fRiesgo) return false;
      if (fSanitario && (g.estadoSanitario ?? "").toUpperCase() !== fSanitario) return false;
      return true;
    });
    const hallazgosCedi = (hallazgosCediQ.data ?? []).filter(h => {
      if (fCriticidad && (h.criticidad ?? "").toUpperCase() !== fCriticidad) return false;
      return true;
    });
    const auditoriasCedi = auditoriasCediQ.data ?? [];
    const cedis = cedisQ.data ?? [];
    const lotes = lotesQ.data ?? [];
    const checklists = [...(chkEncQ.data ?? []), ...(chkTrzQ.data ?? [])];

    // ── Auditoría / CEDIS ──
    const totalAuditorias = auditoriasCedi.length;
    const hallAbiertos = hallazgosCedi.filter(h => !esCerrado(h.estado)).length;
    const hallCerrados = hallazgosCedi.filter(h => esCerrado(h.estado)).length;
    const riesgosCriticos = hallazgosCedi.filter(h => ["CRITICA", "ALTA"].includes((h.criticidad ?? "").toUpperCase())).length;
    const cumplimientoAud = hallazgosCedi.length ? Math.round((hallCerrados / hallazgosCedi.length) * 100) : 0;

    // ── Granjas ──
    const totalGranjas = granjas.length;
    const hallGranjas = granjas.reduce((a, g: any) => a + (g._count?.hallazgos ?? 0), 0);
    const kpiGranjas = granjas.reduce((a, g: any) => a + (g._count?.kpis ?? 0), 0);
    const riesgoAlto = granjas.filter((g: any) => (g.nivelRiesgo ?? "").toUpperCase() === "ALTO").length;
    const sanitarioOptimo = granjas.filter((g: any) => (g.estadoSanitario ?? "").toUpperCase() === "OPTIMO").length;
    const sanitarioCritico = granjas.filter((g: any) => (g.estadoSanitario ?? "").toUpperCase() === "CRITICO").length;
    const cumplimientoSanitario = totalGranjas ? Math.round((sanitarioOptimo / totalGranjas) * 100) : 0;

    // ── Trazabilidad ──
    const totalLotes = lotes.length;
    const totalChecklists = checklists.length;
    const cumplChecklists = checklists.length
      ? Math.round(checklists.reduce((a, c) => a + calcularCumplimiento(c.data.preguntas.map((p: any) => p.resultado)), 0) / checklists.length)
      : 0;

    // ── Datos para gráficos y rankings (Fase 2) ──
    // Top granjas por hallazgos
    const topGranjas = [...granjas]
      .sort((a: any, b: any) => (b._count?.hallazgos ?? 0) - (a._count?.hallazgos ?? 0))
      .slice(0, 6)
      .map((g: any) => ({ nombre: (g.nombre ?? "—").length > 16 ? g.nombre.slice(0, 15) + "…" : (g.nombre ?? "—"), hallazgos: g._count?.hallazgos ?? 0, riesgo: g.nivelRiesgo }));

    // Distribución de granjas por nivel de riesgo
    const distRiesgo = ["ALTO", "MEDIO", "BAJO"].map(nivel => ({
      nivel: nivel === "ALTO" ? "Alto" : nivel === "MEDIO" ? "Medio" : "Bajo",
      valor: granjas.filter((g: any) => (g.nivelRiesgo ?? "").toUpperCase() === nivel).length,
    }));

    // Distribución por estado sanitario
    const distSanitario = [
      { estado: "Óptimo", valor: sanitarioOptimo, color: "#22C55E" },
      { estado: "Alerta", valor: granjas.filter((g: any) => (g.estadoSanitario ?? "").toUpperCase() === "ALERTA").length, color: "#F59E0B" },
      { estado: "Crítico", valor: sanitarioCritico, color: "#EF4444" },
    ];

    // Hallazgos CEDIS por criticidad
    const distCriticidadCedi = ["CRITICA", "ALTA", "MEDIA", "BAJA"].map(c => ({
      criticidad: c.charAt(0) + c.slice(1).toLowerCase(),
      valor: hallazgosCedi.filter(h => (h.criticidad ?? "").toUpperCase() === c).length,
    }));

    // Ranking de CEDIS por hallazgos
    const cediMap: Record<string, number> = {};
    hallazgosCedi.forEach(h => { const n = (h as any).cedi?.nombre ?? "—"; cediMap[n] = (cediMap[n] ?? 0) + 1; });
    const rankingCedis = Object.entries(cediMap).map(([nombre, hallazgos]) => ({ nombre, hallazgos })).sort((a, b) => b.hallazgos - a.hallazgos);

    // Granjas por región
    const regionMap: Record<string, number> = {};
    granjas.forEach((g: any) => { const r = g.region ?? "—"; regionMap[r] = (regionMap[r] ?? 0) + 1; });
    const distRegion = Object.entries(regionMap).map(([region, valor]) => ({ region, valor })).sort((a, b) => b.valor - a.valor);

    return {
      totalAuditorias, hallAbiertos, hallCerrados, riesgosCriticos, cumplimientoAud,
      totalGranjas, hallGranjas, kpiGranjas, riesgoAlto, sanitarioOptimo, sanitarioCritico, cumplimientoSanitario,
      totalLotes, totalChecklists, cumplChecklists,
      totalCedis: cedis.length,
      totalHallazgos: hallAbiertos + hallCerrados + hallGranjas,
      topGranjas, distRiesgo, distSanitario, distCriticidadCedi, rankingCedis, distRegion,
    };
  }, [granjasQ.data, hallazgosCediQ.data, auditoriasCediQ.data, cedisQ.data, lotesQ.data, chkEncQ.data, chkTrzQ.data, fRegion, fRiesgo, fSanitario, fCriticidad]);

  // Cumplimiento general corporativo (promedio de los cumplimientos con datos)
  const cumplimientoGeneral = Math.round(
    (ind.cumplimientoAud + ind.cumplimientoSanitario + (ind.cumplChecklists || ind.cumplimientoSanitario)) / 3
  );

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Resumen Ejecutivo" subtitle="Portada corporativa · consolidado gerencial de auditoría" />
      <div className="flex-1 p-6 space-y-6">

        {/* Barra de filtros globales + Generar Informe (Fase 3) */}
        <div className="bg-[#0A111F] border border-[#1E2D4A] rounded-2xl p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[130px]">
              <label className="text-[10px] text-[#94A3B8] mb-1 block">Región</label>
              <select value={fRegion} onChange={e => setFRegion(e.target.value)} className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50">
                <option value="">Todas</option>
                {opciones.regiones.map((r: string) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="text-[10px] text-[#94A3B8] mb-1 block">Nivel de riesgo</label>
              <select value={fRiesgo} onChange={e => setFRiesgo(e.target.value)} className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50">
                <option value="">Todos</option>
                <option value="ALTO">Alto</option>
                <option value="MEDIO">Medio</option>
                <option value="BAJO">Bajo</option>
              </select>
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="text-[10px] text-[#94A3B8] mb-1 block">Estado sanitario</label>
              <select value={fSanitario} onChange={e => setFSanitario(e.target.value)} className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50">
                <option value="">Todos</option>
                <option value="OPTIMO">Óptimo</option>
                <option value="ALERTA">Alerta</option>
                <option value="CRITICO">Crítico</option>
              </select>
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="text-[10px] text-[#94A3B8] mb-1 block">Criticidad hallazgos</label>
              <select value={fCriticidad} onChange={e => setFCriticidad(e.target.value)} className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50">
                <option value="">Todas</option>
                <option value="CRITICA">Crítica</option>
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>
            {filtrosActivos && (
              <button onClick={limpiarFiltros} className="px-3 py-2 rounded-lg bg-[#1A2540] hover:bg-[#243150] text-[#94A3B8] text-xs font-semibold flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5"/> Limpiar
              </button>
            )}
            <button onClick={() => generarInformeEjecutivo(ind, { fRegion, fRiesgo, fSanitario, fCriticidad })}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A111F] text-sm font-bold flex items-center gap-2 whitespace-nowrap">
              <FileDown className="w-4 h-4"/> Generar Informe
            </button>
          </div>
          {filtrosActivos && (
            <p className="text-[11px] text-emerald-400/80 mt-2.5 flex items-center gap-1.5">
              <Info className="w-3 h-3"/> Filtros activos — los indicadores y gráficos reflejan el subconjunto seleccionado.
            </p>
          )}
        </div>

        {cargando ? (
          <div className="flex items-center gap-2 text-[#94A3B8] text-sm p-12 justify-center">
            <Loader2 className="w-5 h-5 animate-spin"/> Consolidando indicadores…
          </div>
        ) : (
        <>
        {/* Tarjetas KPI corporativas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Cumplimiento general" value={`${cumplimientoGeneral}%`} sub={semLabel(cumplimientoGeneral)} icon={Gauge} color={semColor(cumplimientoGeneral)}/>
          <KpiCard label="Hallazgos totales" value={fNum(ind.totalHallazgos)} sub={`${ind.hallAbiertos} abiertos · ${ind.hallCerrados} cerrados (CEDIS)`} icon={AlertTriangle} color="#F59E0B"/>
          <KpiCard label="Riesgos críticos" value={fNum(ind.riesgosCriticos + ind.riesgoAlto)} sub="CEDIS + granjas riesgo alto" icon={ShieldCheck} color="#EF4444"/>
          <KpiCard label="Auditorías ejecutadas" value={fNum(ind.totalAuditorias)} sub={`${ind.totalCedis} CEDIS evaluados`} icon={ClipboardCheck} color="#4A7AFF"/>
        </div>

        {/* ═══════════════ GRANJAS ═══════════════ */}
        {/* Bloque Granjas */}
        <section className="bg-[#0A111F] border border-[#1E2D4A] rounded-2xl p-5">
          <BloqueTitulo icon={Tractor} titulo="Granjas" sub="Estado sanitario, hallazgos y KPIs" color="#22C55E"/>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-3">
              <SemBar label="Cumplimiento sanitario (granjas óptimas)" pct={ind.cumplimientoSanitario} extra={`${ind.sanitarioOptimo}/${ind.totalGranjas}`}/>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="bg-[#0D1526] rounded-lg py-2 text-center"><p className="text-lg font-bold text-white">{fNum(ind.totalGranjas)}</p><p className="text-[9px] text-[#64748B]">Granjas</p></div>
                <div className="bg-[#0D1526] rounded-lg py-2 text-center"><p className="text-lg font-bold text-amber-400">{fNum(ind.hallGranjas)}</p><p className="text-[9px] text-[#64748B]">Hallazgos</p></div>
                <div className="bg-[#0D1526] rounded-lg py-2 text-center"><p className="text-lg font-bold text-[#4A7AFF]">{fNum(ind.kpiGranjas)}</p><p className="text-[9px] text-[#64748B]">KPIs</p></div>
              </div>
            </div>
            <div className="flex items-center justify-around">
              <div className="text-center"><p className="text-3xl font-bold text-red-400">{fNum(ind.riesgoAlto)}</p><p className="text-[10px] text-[#64748B] mt-1">Riesgo alto</p></div>
              <div className="text-center"><p className="text-3xl font-bold text-emerald-400">{fNum(ind.sanitarioOptimo)}</p><p className="text-[10px] text-[#64748B] mt-1">Sanitario óptimo</p></div>
              <div className="text-center"><p className="text-3xl font-bold text-red-400">{fNum(ind.sanitarioCritico)}</p><p className="text-[10px] text-[#64748B] mt-1">Sanitario crítico</p></div>
            </div>
          </div>
        </section>

        {/* Bloque Trazabilidad */}
        <section className="bg-[#0A111F] border border-[#1E2D4A] rounded-2xl p-5">
          <BloqueTitulo icon={Egg} titulo="Trazabilidad Avícola" sub="Lotes y checklists de encasetamiento/seguimiento" color="#A855F7"/>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-3">
              <SemBar label="Cumplimiento promedio de checklists" pct={ind.cumplChecklists} extra={`${ind.totalChecklists} checklists`}/>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-[#0D1526] rounded-lg py-2 text-center"><p className="text-lg font-bold text-white">{fNum(ind.totalLotes)}</p><p className="text-[9px] text-[#64748B]">Lotes registrados</p></div>
                <div className="bg-[#0D1526] rounded-lg py-2 text-center"><p className="text-lg font-bold text-[#A855F7]">{fNum(ind.totalChecklists)}</p><p className="text-[9px] text-[#64748B]">Checklists</p></div>
              </div>
            </div>
            <div className="flex items-center justify-center">
              {ind.totalLotes === 0 && ind.totalChecklists === 0 ? (
                <p className="text-xs text-[#64748B] text-center max-w-[200px]">Aún no hay lotes ni checklists registrados. Los indicadores se poblarán a medida que se registren en el módulo de Trazabilidad.</p>
              ) : (
                <div className="text-center"><p className="text-3xl font-bold" style={{ color: semColor(ind.cumplChecklists) }}>{ind.cumplChecklists}%</p><p className="text-[10px] text-[#64748B] mt-1">{semLabel(ind.cumplChecklists)}</p></div>
              )}
            </div>
          </div>
        </section>

        {/* Analítica · Granjas */}
        <div className="flex items-center gap-2.5 pt-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#22C55E1A", color: "#22C55E" }}>
            <BarChart3 className="w-4.5 h-4.5"/>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Analítica · Granjas</h2>
            <p className="text-[11px] text-[#64748B]">Rankings, estado sanitario y distribución por riesgo/región</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top granjas por hallazgos */}
          <div className="bg-[#0A111F] border border-[#1E2D4A] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-amber-400"/>
              <h3 className="text-sm font-bold text-white">Top granjas por hallazgos</h3>
            </div>
            {ind.topGranjas.length === 0 ? (
              <p className="text-xs text-[#64748B] py-8 text-center">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={ind.topGranjas} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" horizontal={false}/>
                  <XAxis type="number" stroke="#64748B" fontSize={11}/>
                  <YAxis type="category" dataKey="nombre" stroke="#94A3B8" fontSize={10} width={100}/>
                  <Tooltip contentStyle={{ background: "#0D1526", border: "1px solid #1E2D4A", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#fff" }} cursor={{ fill: "#1E2D4A33" }}/>
                  <Bar dataKey="hallazgos" radius={[0, 4, 4, 0]}>
                    {ind.topGranjas.map((g: any, i: number) => (
                      <Cell key={i} fill={g.riesgo === "ALTO" ? "#EF4444" : g.riesgo === "MEDIO" ? "#F59E0B" : "#22C55E"}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Estado sanitario de granjas (dona) */}
          <div className="bg-[#0A111F] border border-[#1E2D4A] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-emerald-400"/>
              <h3 className="text-sm font-bold text-white">Estado sanitario de granjas</h3>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={ind.distSanitario} dataKey="valor" nameKey="estado" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {ind.distSanitario.map((d: any, i: number) => <Cell key={i} fill={d.color}/>)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0D1526", border: "1px solid #1E2D4A", borderRadius: 8, fontSize: 12 }}/>
                <Legend wrapperStyle={{ fontSize: 12 }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Distribución de riesgo de granjas */}
          <div className="bg-[#0A111F] border border-[#1E2D4A] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-red-400"/>
              <h3 className="text-sm font-bold text-white">Granjas por nivel de riesgo</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ind.distRiesgo} margin={{ left: -15, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false}/>
                <XAxis dataKey="nivel" stroke="#94A3B8" fontSize={11}/>
                <YAxis stroke="#64748B" fontSize={11}/>
                <Tooltip contentStyle={{ background: "#0D1526", border: "1px solid #1E2D4A", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#fff" }} cursor={{ fill: "#1E2D4A33" }}/>
                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                  {ind.distRiesgo.map((d: any, i: number) => (
                    <Cell key={i} fill={d.nivel === "Alto" ? "#EF4444" : d.nivel === "Medio" ? "#F59E0B" : "#22C55E"}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Granjas por región */}
          <div className="bg-[#0A111F] border border-[#1E2D4A] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Tractor className="w-4 h-4 text-emerald-400"/>
              <h3 className="text-sm font-bold text-white">Granjas por región</h3>
            </div>
            <div className="space-y-2.5">
              {ind.distRegion.map((r: any, i: number) => {
                const maxVal = Math.max(...ind.distRegion.map((x: any) => x.valor), 1);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#cbd5e1]">{r.region}</span>
                      <span className="text-xs font-bold text-white">{r.valor}</span>
                    </div>
                    <div className="h-1.5 bg-[#1E2D4A] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(r.valor / maxVal) * 100}%` }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══════════════ CEDIS (debajo de Granjas) ═══════════════ */}
        {/* Bloque Auditoría · CEDIS */}
        <section className="bg-[#0A111F] border border-[#1E2D4A] rounded-2xl p-5">
          <BloqueTitulo icon={ShieldCheck} titulo="Auditoría · CEDIS" sub="Hallazgos y cumplimiento de centros de distribución" color="#4A7AFF"/>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-3">
              <SemBar label="Cumplimiento (hallazgos cerrados)" pct={ind.cumplimientoAud} extra={`${ind.hallCerrados}/${ind.hallAbiertos + ind.hallCerrados}`}/>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="bg-[#0D1526] rounded-lg py-2 text-center"><p className="text-lg font-bold text-white">{fNum(ind.totalAuditorias)}</p><p className="text-[9px] text-[#64748B]">Auditorías</p></div>
                <div className="bg-[#0D1526] rounded-lg py-2 text-center"><p className="text-lg font-bold text-amber-400">{fNum(ind.hallAbiertos)}</p><p className="text-[9px] text-[#64748B]">Abiertos</p></div>
                <div className="bg-[#0D1526] rounded-lg py-2 text-center"><p className="text-lg font-bold text-emerald-400">{fNum(ind.hallCerrados)}</p><p className="text-[9px] text-[#64748B]">Cerrados</p></div>
              </div>
            </div>
            <div className="flex items-center justify-around">
              <div className="text-center"><p className="text-3xl font-bold text-red-400">{fNum(ind.riesgosCriticos)}</p><p className="text-[10px] text-[#64748B] mt-1">Riesgos críticos/altos</p></div>
              <div className="text-center"><p className="text-3xl font-bold text-white">{fNum(ind.totalCedis)}</p><p className="text-[10px] text-[#64748B] mt-1">CEDIS evaluados</p></div>
            </div>
          </div>
        </section>

        {/* Analítica · CEDIS */}
        <div className="flex items-center gap-2.5 pt-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#4A7AFF1A", color: "#4A7AFF" }}>
            <BarChart3 className="w-4.5 h-4.5"/>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Analítica · CEDIS</h2>
            <p className="text-[11px] text-[#64748B]">Distribución de criticidad y ranking de centros de distribución</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Hallazgos CEDIS por criticidad */}
          <div className="bg-[#0A111F] border border-[#1E2D4A] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-400"/>
              <h3 className="text-sm font-bold text-white">Hallazgos CEDIS por criticidad</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ind.distCriticidadCedi} margin={{ left: -15, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false}/>
                <XAxis dataKey="criticidad" stroke="#94A3B8" fontSize={11}/>
                <YAxis stroke="#64748B" fontSize={11} allowDecimals={false}/>
                <Tooltip contentStyle={{ background: "#0D1526", border: "1px solid #1E2D4A", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#fff" }} cursor={{ fill: "#1E2D4A33" }}/>
                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                  {ind.distCriticidadCedi.map((d: any, i: number) => (
                    <Cell key={i} fill={d.criticidad === "Critica" ? "#EF4444" : d.criticidad === "Alta" ? "#F97316" : d.criticidad === "Media" ? "#F59E0B" : "#22C55E"}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Ranking CEDIS por hallazgos */}
          <div className="bg-[#0A111F] border border-[#1E2D4A] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-[#4A7AFF]"/>
              <h3 className="text-sm font-bold text-white">Ranking CEDIS por hallazgos</h3>
            </div>
            <div className="space-y-2">
              {ind.rankingCedis.length === 0 ? <p className="text-xs text-[#64748B] py-4 text-center">Sin datos</p> :
                ind.rankingCedis.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#1A2540] text-[10px] font-bold text-white flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="text-sm text-white flex-1">{c.nombre}</span>
                    <span className="text-xs font-bold text-amber-400">{c.hallazgos} hallazgos</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Diagnóstico Ejecutivo de Rutas (FASE 1) */}
        <SeccionDiagnosticoRutas />

        {/* Desempeño de Auditores (consolidado) */}
        <SeccionDesempenoAuditores />

        {/* Áreas pendientes de integración (honestidad: sin datos inventados) */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-[#64748B]"/>
            <h2 className="text-sm font-bold text-[#94A3B8]">Áreas pendientes de integración</h2>
          </div>
          <p className="text-[11px] text-[#64748B] mb-3">Estos módulos aún no tienen origen de datos conectado. Se mostrarán con indicadores reales en cuanto se integren, evitando cifras ficticias.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Inventarios", icon: Package },
              { label: "Rutas", icon: Route },
              { label: "Operaciones", icon: Warehouse },
              { label: "Financiero", icon: DollarSign },
              { label: "Mercadeo", icon: Megaphone },
              { label: "Administrativo", icon: Users2 },
            ].map(a => {
              const Icon = a.icon;
              return (
                <div key={a.label} className="bg-[#0A111F] border border-dashed border-[#1E2D4A] rounded-xl p-3 text-center opacity-70">
                  <Icon className="w-5 h-5 mx-auto mb-1.5 text-[#475569]"/>
                  <p className="text-[11px] font-semibold text-[#94A3B8]">{a.label}</p>
                  <p className="text-[9px] text-[#475569] mt-0.5">Módulo no integrado</p>
                </div>
              );
            })}
          </div>
        </section>
        </>
        )}
      </div>
    </div>
  );
}

// ─── Informe Ejecutivo PDF (consolida los indicadores visibles) ────────────────
const EMPRESA_RE = { nombre: "Pollos Savicol S.A.S.", nit: "860.403.974-4" };

async function generarInformeEjecutivo(ind: any, filtros: { fRegion: string; fRiesgo: string; fSanitario: string; fCriticidad: string }) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 15, CW = PW - M * 2;
  let y = M;
  const setFill = (hex: string) => { const n = parseInt(hex.replace("#",""),16); doc.setFillColor((n>>16)&255,(n>>8)&255,n&255); };
  const setText = (hex: string) => { const n = parseInt(hex.replace("#",""),16); doc.setTextColor((n>>16)&255,(n>>8)&255,n&255); };
  const need = (h: number) => { if (y + h > PH - M) { doc.addPage(); y = M; } };
  const semCol = (p: number) => p >= 90 ? "#16A34A" : p >= 70 ? "#D97706" : "#DC2626";
  const semLab = (p: number) => p >= 90 ? "ÓPTIMO" : p >= 70 ? "ACEPTABLE" : "CRÍTICO";

  // Encabezado
  setFill("#0D1526"); doc.rect(0, 0, PW, 36, "F");
  setFill("#C41230"); doc.rect(0, 34, PW, 2, "F");
  setText("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text(EMPRESA_RE.nombre, M, 13);
  setText("#94A3B8"); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text(`NIT ${EMPRESA_RE.nit}  ·  Auditoría Interna`, M, 19);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-CO", { day:"2-digit", month:"long", year:"numeric" })}`, M, 24);
  setText("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("Informe Ejecutivo Corporativo", M, 31);
  y = 44;

  // Filtros aplicados
  const filtrosTxt: string[] = [];
  if (filtros.fRegion) filtrosTxt.push(`Región: ${filtros.fRegion}`);
  if (filtros.fRiesgo) filtrosTxt.push(`Riesgo: ${filtros.fRiesgo}`);
  if (filtros.fSanitario) filtrosTxt.push(`Sanitario: ${filtros.fSanitario}`);
  if (filtros.fCriticidad) filtrosTxt.push(`Criticidad: ${filtros.fCriticidad}`);
  if (filtrosTxt.length) {
    setText("#475569"); doc.setFont("helvetica", "italic"); doc.setFontSize(8);
    doc.text(`Filtros aplicados — ${filtrosTxt.join("  ·  ")}`, M, y); y += 6;
  }

  // Cumplimiento general
  const cg = Math.round((ind.cumplimientoAud + ind.cumplimientoSanitario + (ind.cumplChecklists || ind.cumplimientoSanitario)) / 3);
  need(20);
  setFill("#F8FAFC"); doc.roundedRect(M, y, CW, 16, 2, 2, "F");
  setText("#475569"); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("Cumplimiento General Corporativo", M + 4, y + 7);
  setText(semCol(cg)); doc.setFontSize(18); doc.text(`${cg}%`, M + 4, y + 13.5);
  setText(semCol(cg)); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text(semLab(cg), PW - M - 4, y + 10, { align: "right" });
  y += 22;

  // Tabla de indicadores por área
  const bloque = (titulo: string, filas: [string, string][]) => {
    need(12 + filas.length * 6);
    setFill("#0D1526"); doc.rect(M, y, CW, 8, "F");
    setText("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text(titulo, M + 3, y + 5.3); y += 8;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    filas.forEach((f, i) => {
      if (i % 2 === 0) { setFill("#F8FAFC"); doc.rect(M, y, CW, 6, "F"); }
      setText("#334155"); doc.text(f[0], M + 3, y + 4);
      setText("#0D1526"); doc.setFont("helvetica", "bold"); doc.text(f[1], PW - M - 3, y + 4, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 6;
    });
    y += 4;
  };

  bloque("Auditoría · CEDIS", [
    ["Auditorías ejecutadas", String(ind.totalAuditorias)],
    ["CEDIS evaluados", String(ind.totalCedis)],
    ["Hallazgos abiertos", String(ind.hallAbiertos)],
    ["Hallazgos cerrados", String(ind.hallCerrados)],
    ["Riesgos críticos/altos", String(ind.riesgosCriticos)],
    ["Cumplimiento (hallazgos cerrados)", `${ind.cumplimientoAud}%`],
  ]);
  bloque("Granjas", [
    ["Total granjas", String(ind.totalGranjas)],
    ["Hallazgos en granjas", String(ind.hallGranjas)],
    ["KPIs registrados", String(ind.kpiGranjas)],
    ["Granjas en riesgo alto", String(ind.riesgoAlto)],
    ["Sanitario óptimo", String(ind.sanitarioOptimo)],
    ["Sanitario crítico", String(ind.sanitarioCritico)],
    ["Cumplimiento sanitario", `${ind.cumplimientoSanitario}%`],
  ]);
  bloque("Trazabilidad Avícola", [
    ["Lotes registrados", String(ind.totalLotes)],
    ["Checklists realizados", String(ind.totalChecklists)],
    ["Cumplimiento promedio checklists", `${ind.cumplChecklists}%`],
  ]);

  // Ranking top granjas
  if (ind.topGranjas?.length) {
    need(12 + ind.topGranjas.length * 6);
    setFill("#0D1526"); doc.rect(M, y, CW, 8, "F");
    setText("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("Top Granjas por Hallazgos", M + 3, y + 5.3); y += 8;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    ind.topGranjas.forEach((g: any, i: number) => {
      if (i % 2 === 0) { setFill("#F8FAFC"); doc.rect(M, y, CW, 6, "F"); }
      setText("#334155"); doc.text(`${i + 1}. ${g.nombre}`, M + 3, y + 4);
      setText("#DC2626"); doc.setFont("helvetica", "bold"); doc.text(`${g.hallazgos} hallazgos`, PW - M - 3, y + 4, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 6;
    });
    y += 4;
  }

  // Conclusión calculada
  need(30);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); setText("#0D1526");
  doc.text("Conclusión Ejecutiva", M, y); y += 2;
  setFill("#10B981"); doc.rect(M, y, 26, 0.7, "F"); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); setText("#334155");
  const concl = cg >= 90
    ? `El estado corporativo consolidado es óptimo (${cg}%). Se recomienda mantener los controles y dar continuidad al seguimiento periódico de hallazgos abiertos.`
    : cg >= 70
    ? `El estado corporativo consolidado es aceptable (${cg}%), con oportunidades de mejora. Se recomienda priorizar el cierre de los ${ind.hallAbiertos} hallazgos abiertos en CEDIS y atender las ${ind.riesgoAlto} granjas en riesgo alto.`
    : `El estado corporativo consolidado es crítico (${cg}%). Se requiere intervención prioritaria sobre los ${ind.riesgosCriticos} hallazgos críticos/altos en CEDIS y las ${ind.sanitarioCritico} granjas en estado sanitario crítico.`;
  doc.splitTextToSize(concl, CW).forEach((ln: string) => { need(5); doc.text(ln, M, y); y += 4.6; });

  // Pie
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    setText("#94A3B8"); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text(`${EMPRESA_RE.nombre} · Informe Ejecutivo · Documento confidencial`, M, PH - 8);
    doc.text(`Página ${p} de ${pages}`, PW - M, PH - 8, { align: "right" });
  }

  doc.save(`Informe-Ejecutivo-Savicol-${new Date().toISOString().slice(0,10)}.pdf`);
}
