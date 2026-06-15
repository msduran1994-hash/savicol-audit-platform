"use client";
import { Header } from "@/components/layout/header";
import { useGranjasStore } from "@/store/granjas.store";
import { useShallow } from "zustand/react/shallow";
import { useState, useMemo } from "react";
import { AUDITORS } from "@/lib/constants";
import { TIPO_RIESGO, CRITICIDAD } from "@/lib/granjas.constants";
import {
  Trophy, AlertCircle, Clock, Award, TrendingUp, TrendingDown, Minus,
  ShieldAlert, Target, Filter, X, BarChart3, CheckCircle2,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════════════════
   MÓDULO RANKING DE GRANJAS — Dinámico, conectado con Hallazgos y KPI
   Genera 4 rankings (Hallazgos, Tipo de Riesgo, Criticidad, Cumplimiento KPI)
   recalculados automáticamente según los filtros activos.
   Normaliza valores del backend (MAYÚSCULAS) → etiquetas legibles.
   ════════════════════════════════════════════════════════════════════════ */

// ── Normalización de valores backend → legible ──────────────────────────────
// Maneja AMBOS formatos: crudo de DB ("CRITICA") y ya-mapeado del store ("Crítica").
// Se normalizan acentos para que "CRÍTICA".startsWith("CRIT") funcione.
const sinAcentos = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const normCriticidad = (c: string): "Crítica"|"Alta"|"Media"|"Baja"|"—" => {
  const v = sinAcentos((c ?? "").toString().toUpperCase());
  if (v.startsWith("CRIT")) return "Crítica";
  if (v.startsWith("ALT"))  return "Alta";
  if (v.startsWith("MED"))  return "Media";
  if (v.startsWith("BAJ"))  return "Baja";
  return "—";
};
const PESO_CRITICIDAD: Record<string, number> = { "Crítica": 4, "Alta": 3, "Media": 2, "Baja": 1, "—": 0 };

const normEstadoHallazgo = (e: string): "Abierto"|"En Plan"|"Cerrado"|"Verificado"|"—" => {
  const v = (e ?? "").toString().toUpperCase().replace(/ /g, "_");
  if (v === "ABIERTO")    return "Abierto";
  if (v === "EN_PLAN")    return "En Plan";
  if (v === "CERRADO")    return "Cerrado";
  if (v === "VERIFICADO") return "Verificado";
  return "—";
};

type EstadoKPIBI = "Completado"|"En Curso"|"En Espera"|"Atrasado"|"No Iniciado";
const normEstadoKPI = (k: any): EstadoKPIBI => {
  const raw = (k?.estado ?? "").toString().toUpperCase().replace(/ /g, "_");
  if (raw === "COMPLETADO" || raw === "CERRADO") return "Completado";
  if (k?.fechaCompromiso) {
    const fc = new Date(k.fechaCompromiso).getTime();
    if (!isNaN(fc) && fc < Date.now()) return "Atrasado";
  }
  if (raw === "EN_CURSO")  return "En Curso";
  if (raw === "EN_ESPERA") return "En Espera";
  if (raw === "NO_INICIADO" || raw === "PENDIENTE") return "No Iniciado";
  return "En Curso";
};

const normTipoRiesgo = (tr: any): string[] => {
  if (Array.isArray(tr)) return tr.map(x => String(x).toUpperCase());
  if (typeof tr === "string") {
    try { const p = JSON.parse(tr); if (Array.isArray(p)) return p.map(x=>String(x).toUpperCase()); } catch {}
    return [tr.toUpperCase()];
  }
  return [];
};

// Riesgo → nivel ejecutivo (Crítico/Alto/Medio/Bajo) por tipo de riesgo presente
const RIESGO_NIVEL: Record<string,"Crítico"|"Alto"|"Medio"|"Bajo"> = {
  "CONTAGIO": "Crítico", "LEGAL": "Alto", "FINANCIERO": "Alto",
  "REPUTACIONAL": "Medio", "OPERATIVO": "Bajo",
};

const SEL = "bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-[#4A7AFF] outline-none";

export default function RankingPage() {
  const granjas   = useGranjasStore(useShallow((s) => s.granjas));
  const hallazgos = useGranjasStore(useShallow((s) => s.hallazgos));
  const kpis      = useGranjasStore(useShallow((s) => s.kpis));

  // ── Filtros superiores ────────────────────────────────────────────────────
  const [fGranja,       setFGranja]       = useState("");
  const [fAuditor,      setFAuditor]      = useState("");
  const [fTipoRiesgo,   setFTipoRiesgo]   = useState("");
  const [fCriticidad,   setFCriticidad]   = useState("");
  const [fEstadoHall,   setFEstadoHall]   = useState("");
  const [fEstadoKPI,    setFEstadoKPI]    = useState("");
  const [fFechaHall,    setFFechaHall]    = useState("");
  const [fFechaCumpl,   setFFechaCumpl]   = useState("");

  const hayFiltros = !!(fGranja||fAuditor||fTipoRiesgo||fCriticidad||fEstadoHall||fEstadoKPI||fFechaHall||fFechaCumpl);
  const limpiar = () => { setFGranja("");setFAuditor("");setFTipoRiesgo("");setFCriticidad("");setFEstadoHall("");setFEstadoKPI("");setFFechaHall("");setFFechaCumpl(""); };

  // ── Hallazgos filtrados ───────────────────────────────────────────────────
  const hallazgosF = useMemo(() => {
    let l = hallazgos;
    if (fGranja)     l = l.filter(h => h.granjaId === fGranja);
    if (fAuditor)    l = l.filter(h => h.auditorId === fAuditor);
    if (fTipoRiesgo) l = l.filter(h => normTipoRiesgo(h.tiposRiesgo).includes(fTipoRiesgo.toUpperCase()));
    if (fCriticidad) l = l.filter(h => normCriticidad(h.criticidad) === fCriticidad);
    if (fEstadoHall) l = l.filter(h => normEstadoHallazgo(h.estado) === fEstadoHall);
    if (fFechaHall)  l = l.filter(h => (h.fechaVisita ?? "").startsWith(fFechaHall));
    return l;
  }, [hallazgos, fGranja, fAuditor, fTipoRiesgo, fCriticidad, fEstadoHall, fFechaHall]);

  // ── KPIs filtrados ────────────────────────────────────────────────────────
  const kpisF = useMemo(() => {
    let l = kpis;
    if (fGranja)    l = l.filter(k => k.granjaId === fGranja);
    if (fEstadoKPI) l = l.filter(k => normEstadoKPI(k) === fEstadoKPI);
    if (fFechaCumpl)l = l.filter(k => (k.fechaCumplimiento ?? "").startsWith(fFechaCumpl));
    // Si hay filtro de auditor, acotar KPIs a hallazgos de ese auditor
    if (fAuditor) {
      const hIds = new Set(hallazgosF.map(h => h.id));
      l = l.filter(k => hIds.has(k.hallazgoId));
    }
    return l;
  }, [kpis, hallazgosF, fGranja, fEstadoKPI, fFechaCumpl, fAuditor]);

  // ── Granjas en alcance (las que tienen datos tras filtrar) ────────────────
  const granjasScope = useMemo(() => {
    if (fGranja) return granjas.filter(g => g.id === fGranja);
    return granjas;
  }, [granjas, fGranja]);

  // ════════════════════════════════════════════════════════════════════════
  // CÁLCULO DE RANKINGS POR GRANJA
  // ════════════════════════════════════════════════════════════════════════
  const ranking = useMemo(() => {
    return granjasScope.map(g => {
      const gh = hallazgosF.filter(h => h.granjaId === g.id);
      const gk = kpisF.filter(k => k.granjaId === g.id);

      // — Hallazgos —
      const totalHall   = gh.length;
      const abiertos    = gh.filter(h => normEstadoHallazgo(h.estado) === "Abierto").length;
      const enPlan      = gh.filter(h => normEstadoHallazgo(h.estado) === "En Plan").length;
      const cerrados    = gh.filter(h => normEstadoHallazgo(h.estado) === "Cerrado").length;
      const verificados = gh.filter(h => normEstadoHallazgo(h.estado) === "Verificado").length;

      // — Criticidad acumulada (ponderada) —
      const criticos = gh.filter(h => normCriticidad(h.criticidad) === "Crítica").length;
      const altos    = gh.filter(h => normCriticidad(h.criticidad) === "Alta").length;
      const medios   = gh.filter(h => normCriticidad(h.criticidad) === "Media").length;
      const bajos    = gh.filter(h => normCriticidad(h.criticidad) === "Baja").length;
      const critAcum = criticos*4 + altos*3 + medios*2 + bajos*1;

      // — Niveles de riesgo (por tipo) —
      const nivel = { "Crítico":0, "Alto":0, "Medio":0, "Bajo":0 };
      gh.forEach(h => {
        const tipos = normTipoRiesgo(h.tiposRiesgo);
        // el nivel más alto presente en el hallazgo
        let mejor: "Crítico"|"Alto"|"Medio"|"Bajo"|null = null;
        const orden = ["Crítico","Alto","Medio","Bajo"] as const;
        tipos.forEach(t => {
          const lv = RIESGO_NIVEL[t];
          if (lv && (mejor === null || orden.indexOf(lv) < orden.indexOf(mejor))) mejor = lv;
        });
        if (mejor) nivel[mejor]++;
      });

      // — Cumplimiento KPI —
      const kComp = gk.filter(k => normEstadoKPI(k) === "Completado").length;
      const kCurso= gk.filter(k => normEstadoKPI(k) === "En Curso").length;
      const kEsp  = gk.filter(k => normEstadoKPI(k) === "En Espera").length;
      const kAtr  = gk.filter(k => normEstadoKPI(k) === "Atrasado").length;
      const kNoIni= gk.filter(k => normEstadoKPI(k) === "No Iniciado").length;
      const totalKpi = gk.length;
      const cumplimiento = totalKpi > 0 ? Math.round((kComp / totalKpi) * 100) : 0;
      const avgAvance = totalKpi > 0 ? Math.round(gk.reduce((a,k)=>a+(k.porcentajeAvance??0),0)/totalKpi) : 0;

      // — Score general (50% cumplimiento KPI + 50% inverso de criticidad) —
      const critPenalidad = Math.min(100, critAcum * 4); // a mayor criticidad, menor score
      const scoreGeneral = Math.round(Math.max(0, Math.min(100, cumplimiento*0.5 + (100-critPenalidad)*0.5)));

      // — Estado de desempeño —
      const desempeno = scoreGeneral >= 75 ? "Excelente" : scoreGeneral >= 50 ? "Aceptable" : scoreGeneral >= 30 ? "En Riesgo" : "Crítico";

      return {
        id: g.id, nombre: g.nombre, codigo: g.codigo, region: g.region,
        estadoSanitario: g.estadoSanitario, nivelRiesgo: g.nivelRiesgo,
        totalHall, abiertos, enPlan, cerrados, verificados,
        criticos, altos, medios, bajos, critAcum,
        nivelCritico: nivel["Crítico"], nivelAlto: nivel["Alto"], nivelMedio: nivel["Medio"], nivelBajo: nivel["Bajo"],
        totalKpi, kComp, kCurso, kEsp, kAtr, kNoIni, cumplimiento, avgAvance,
        scoreGeneral, desempeno,
      };
    });
  }, [granjasScope, hallazgosF, kpisF]);

  // ── Ordenamientos para cada ranking ───────────────────────────────────────
  const rkHallazgos   = useMemo(() => [...ranking].sort((a,b)=>b.totalHall-a.totalHall), [ranking]);
  const rkCriticidad  = useMemo(() => [...ranking].sort((a,b)=>b.critAcum-a.critAcum), [ranking]);
  const rkCumplimiento= useMemo(() => [...ranking].filter(r=>r.totalKpi>0).sort((a,b)=>b.cumplimiento-a.cumplimiento), [ranking]);
  const rkGeneral     = useMemo(() => [...ranking].sort((a,b)=>b.scoreGeneral-a.scoreGeneral), [ranking]);

  // ── Totales para tarjetas KPI ─────────────────────────────────────────────
  const tot = useMemo(() => ({
    granjas: ranking.length,
    hallazgos: hallazgosF.length,
    criticos: ranking.reduce((a,r)=>a+r.criticos,0),
    kpis: kpisF.length,
    cumplimientoProm: rkCumplimiento.length>0 ? Math.round(rkCumplimiento.reduce((a,r)=>a+r.cumplimiento,0)/rkCumplimiento.length) : 0,
  }), [ranking, hallazgosF, kpisF, rkCumplimiento]);

  // ── Discriminación de tipos de riesgo (sobre hallazgos filtrados) ─────────
  // Un hallazgo puede tener varios tipos; se cuenta en cada uno que aplique.
  const riesgosPorTipo = useMemo(() => {
    const conteo: Record<string, number> = { "Operativo":0, "Reputacional":0, "Financiero":0, "Legal":0, "Contagio":0 };
    hallazgosF.forEach(h => {
      const tipos = normTipoRiesgo(h.tiposRiesgo); // MAYÚSCULAS
      tipos.forEach(t => {
        if (t === "OPERATIVO")    conteo["Operativo"]++;
        if (t === "REPUTACIONAL") conteo["Reputacional"]++;
        if (t === "FINANCIERO")   conteo["Financiero"]++;
        if (t === "LEGAL")        conteo["Legal"]++;
        if (t === "CONTAGIO")     conteo["Contagio"]++;
      });
    });
    return conteo;
  }, [hallazgosF]);
  const RIESGO_COLOR: Record<string,string> = {
    "Operativo":"#4A7AFF", "Reputacional":"#8B5CF6", "Financiero":"#F59E0B", "Legal":"#EF4444", "Contagio":"#EC4899",
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Ranking de Granjas"
        subtitle={`Análisis comparativo dinámico · ${tot.granjas} granjas · ${tot.hallazgos} hallazgos · ${tot.kpis} KPIs`}
      />

      <div className="flex-1 p-6 space-y-6">

        {/* ── FILTROS SUPERIORES ─────────────────────────────────────────── */}
        <div className="card-base">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-[#4A7AFF]"/>
            <span className="text-xs font-semibold text-white uppercase tracking-wider">Filtros Dinámicos</span>
            {hayFiltros && (
              <button onClick={limpiar} className="ml-auto flex items-center gap-1 text-[10px] text-[#94A3B8] hover:text-white">
                <X className="w-3 h-3"/> Limpiar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Granja</span>
              <select value={fGranja} onChange={e=>setFGranja(e.target.value)} className={SEL}>
                <option value="">Todas</option>
                {granjas.map(g=><option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Auditor</span>
              <select value={fAuditor} onChange={e=>setFAuditor(e.target.value)} className={SEL}>
                <option value="">Todos</option>
                {AUDITORS.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Tipo de Riesgo</span>
              <select value={fTipoRiesgo} onChange={e=>setFTipoRiesgo(e.target.value)} className={SEL}>
                <option value="">Todos</option>
                {TIPO_RIESGO.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Criticidad</span>
              <select value={fCriticidad} onChange={e=>setFCriticidad(e.target.value)} className={SEL}>
                <option value="">Todas</option>
                {CRITICIDAD.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Estado Hallazgo</span>
              <select value={fEstadoHall} onChange={e=>setFEstadoHall(e.target.value)} className={SEL}>
                <option value="">Todos</option>
                {["Abierto","En Plan","Cerrado","Verificado"].map(e=><option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Estado KPI</span>
              <select value={fEstadoKPI} onChange={e=>setFEstadoKPI(e.target.value)} className={SEL}>
                <option value="">Todos</option>
                {["Completado","En Curso","En Espera","Atrasado","No Iniciado"].map(e=><option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Fecha Hallazgo</span>
              <input type="month" value={fFechaHall} onChange={e=>setFFechaHall(e.target.value)} className={SEL}/>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Fecha Cumplimiento</span>
              <input type="month" value={fFechaCumpl} onChange={e=>setFFechaCumpl(e.target.value)} className={SEL}/>
            </div>
          </div>
        </div>

        {/* ── TARJETAS KPI EJECUTIVAS ────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard icon={<Target className="w-4 h-4"/>}      label="Granjas" value={tot.granjas} color="#4A7AFF"/>
          <KpiCard icon={<AlertCircle className="w-4 h-4"/>}  label="Hallazgos" value={tot.hallazgos} color="#F59E0B"/>
          <KpiCard icon={<ShieldAlert className="w-4 h-4"/>}  label="Críticos" value={tot.criticos} color="#EF4444"/>
          <KpiCard icon={<BarChart3 className="w-4 h-4"/>}    label="KPIs" value={tot.kpis} color="#8B5CF6"/>
          <KpiCard icon={<CheckCircle2 className="w-4 h-4"/>} label="Cumpl. Prom." value={`${tot.cumplimientoProm}%`} color="#10B981"/>
        </div>

        {/* ── DISCRIMINACIÓN POR TIPO DE RIESGO ──────────────────────────── */}
        <div className="card-base">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-[#8B5CF6]"/>
            <span className="text-xs font-semibold text-white uppercase tracking-wider">Total Hallazgos por Tipo de Riesgo</span>
            <span className="ml-auto text-[10px] text-[#94A3B8]">Un hallazgo puede tener varios tipos</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(["Operativo","Reputacional","Financiero","Legal","Contagio"] as const).map(tipo => {
              const val = riesgosPorTipo[tipo];
              const totalRiesgos = Object.values(riesgosPorTipo).reduce((a,b)=>a+b,0) || 1;
              const pct = Math.round(val/totalRiesgos*100);
              const color = RIESGO_COLOR[tipo];
              return (
                <div key={tipo} className="rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-3" style={{ borderTop: `3px solid ${color}` }}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-display font-bold text-2xl text-white tabular-nums">{val}</span>
                    <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>{pct}%</span>
                  </div>
                  <p className="text-[11px] font-medium text-[#94A3B8] mt-1">{tipo}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-[#1E2D4A] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width:`${pct}%`, background: color }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── PODIO TOP 3 CUMPLIMIENTO ───────────────────────────────────── */}
        <div className="card-base bg-gradient-to-br from-[#0D1526] to-[#1A1208] border-amber-900/30">
          <h3 className="font-display font-semibold text-amber-400 mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4"/> Podio · Mejor Cumplimiento KPI
          </h3>
          {rkCumplimiento.length === 0 ? <Empty/> : (
            <div className="grid grid-cols-3 gap-3">
              {rkCumplimiento.slice(0,3).map((g, i) => {
                const colors = ["#FFD700","#C0C0C0","#CD7F32"];
                const labels = ["🥇 1° Lugar","🥈 2° Lugar","🥉 3° Lugar"];
                return (
                  <div key={g.id} className={`p-4 rounded-xl border text-center ${i===0?"bg-amber-500/10 border-amber-500/40":"bg-[#1A2540] border-[#2A3F6A]"}`}>
                    <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors[i] }}>{labels[i]}</p>
                    <p className="font-display font-bold text-white text-lg mt-2 truncate">{g.nombre}</p>
                    <p className="text-[10px] text-[#94A3B8] mb-2">{g.codigo}</p>
                    <p className="font-display text-4xl font-bold mt-2" style={{ color: colors[i] }}>{g.cumplimiento}%</p>
                    <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{g.kComp}/{g.totalKpi} KPIs · {g.desempeno}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 4 RANKINGS EN GRID ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Ranking por Hallazgos */}
          <RankingPanel
            title="Ranking por Hallazgos"
            icon={<AlertCircle className="w-4 h-4 text-amber-400"/>}
            color="#F59E0B"
            cols={["Abiertos","Cerrados","Verif.","Total"]}
            rows={rkHallazgos.slice(0,10).filter(r=>r.totalHall>0).map(g=>({
              nombre:g.nombre, codigo:g.codigo,
              valores:[g.abiertos, g.cerrados, g.verificados, g.totalHall],
              destacado:g.totalHall,
            }))}
          />

          {/* Ranking por Criticidad */}
          <RankingPanel
            title="Ranking por Criticidad"
            icon={<ShieldAlert className="w-4 h-4 text-red-400"/>}
            color="#EF4444"
            cols={["Crít.","Alta","Media","Acum."]}
            rows={rkCriticidad.slice(0,10).filter(r=>r.critAcum>0).map(g=>({
              nombre:g.nombre, codigo:g.codigo,
              valores:[g.criticos, g.altos, g.medios, g.critAcum],
              destacado:g.critAcum,
              estado:g.desempeno,
            }))}
          />

          {/* Ranking por Tipo de Riesgo */}
          <RankingPanel
            title="Ranking por Tipo de Riesgo"
            icon={<TrendingDown className="w-4 h-4 text-purple-400"/>}
            color="#8B5CF6"
            cols={["Crít.","Alto","Medio","Bajo"]}
            rows={[...ranking].sort((a,b)=>(b.nivelCritico+b.nivelAlto)-(a.nivelCritico+a.nivelAlto)).slice(0,10)
              .filter(r=>(r.nivelCritico+r.nivelAlto+r.nivelMedio+r.nivelBajo)>0).map(g=>({
                nombre:g.nombre, codigo:g.codigo,
                valores:[g.nivelCritico, g.nivelAlto, g.nivelMedio, g.nivelBajo],
                destacado:g.nivelCritico+g.nivelAlto,
              }))}
          />

          {/* Ranking por Cumplimiento KPI */}
          <RankingPanel
            title="Ranking por Cumplimiento KPI"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-400"/>}
            color="#10B981"
            cols={["Compl.","Atras.","Avance","Cumpl."]}
            rows={rkCumplimiento.slice(0,10).map(g=>({
              nombre:g.nombre, codigo:g.codigo,
              valores:[g.kComp, g.kAtr, `${g.avgAvance}%`, `${g.cumplimiento}%`],
              destacado:g.cumplimiento,
              estado:g.desempeno,
            }))}
          />
        </div>

        {/* ── RANKING GENERAL (TABLA COMPLETA) ───────────────────────────── */}
        <div className="card-base">
          <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400"/> Ranking General · Score de Desempeño
          </h3>
          {rkGeneral.length === 0 ? <Empty/> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[#475569] border-b border-[#1E2D4A]">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Granja</th>
                    <th className="text-left p-2">Región</th>
                    <th className="text-center p-2">Hallazgos</th>
                    <th className="text-center p-2">Crit. Acum.</th>
                    <th className="text-center p-2">KPIs</th>
                    <th className="text-center p-2">Cumplimiento</th>
                    <th className="text-center p-2">Desempeño</th>
                    <th className="text-right p-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {rkGeneral.map((g, i) => (
                    <tr key={g.id} className="table-row-hover border-b border-[#1E2D4A]/50">
                      <td className="p-2 text-[#94A3B8] font-mono">{i + 1}</td>
                      <td className="p-2 text-white font-medium">{g.nombre}<span className="text-[#475569] text-[10px] ml-1">{g.codigo}</span></td>
                      <td className="p-2 text-[#94A3B8]">{g.region}</td>
                      <td className="p-2 text-center text-white">{g.totalHall}</td>
                      <td className="p-2 text-center text-red-400 font-semibold">{g.critAcum}</td>
                      <td className="p-2 text-center text-[#94A3B8]">{g.totalKpi}</td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-12 h-1.5 rounded-full bg-[#1E2D4A] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width:`${g.cumplimiento}%`, background: g.cumplimiento>=70?"#10B981":g.cumplimiento>=40?"#F59E0B":"#EF4444" }}/>
                          </div>
                          <span className="text-[10px] text-white tabular-nums">{g.cumplimiento}%</span>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                          color: g.desempeno==="Excelente"?"#10B981":g.desempeno==="Aceptable"?"#4A7AFF":g.desempeno==="En Riesgo"?"#F59E0B":"#EF4444",
                          background: (g.desempeno==="Excelente"?"#10B981":g.desempeno==="Aceptable"?"#4A7AFF":g.desempeno==="En Riesgo"?"#F59E0B":"#EF4444")+"18",
                        }}>{g.desempeno}</span>
                      </td>
                      <td className="p-2 text-right">
                        <span className="font-display font-bold text-lg" style={{ color: g.scoreGeneral>=75?"#10B981":g.scoreGeneral>=50?"#4A7AFF":g.scoreGeneral>=30?"#F59E0B":"#EF4444" }}>
                          {g.scoreGeneral}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-[#475569] text-center">
          Score = 50% Cumplimiento KPI + 50% (100 − penalidad por criticidad acumulada). Criticidad ponderada: Crítica×4, Alta×3, Media×2, Baja×1. Todos los rankings se recalculan automáticamente con los filtros activos.
        </p>
      </div>
    </div>
  );
}

// ── Tarjeta KPI ──────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: any; color: string }) {
  return (
    <div className="card-base p-4 flex items-center gap-3" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="min-w-0">
        <p className="font-display font-bold text-xl text-white tabular-nums">{value}</p>
        <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider truncate">{label}</p>
      </div>
    </div>
  );
}

// ── Panel de Ranking (tabla compacta) ───────────────────────────────────────
function RankingPanel({ title, icon, color, cols, rows }: {
  title: string; icon: React.ReactNode; color: string;
  cols: string[]; rows: { nombre: string; codigo?: string; valores: any[]; destacado: number; estado?: string }[];
}) {
  return (
    <div className="card-base">
      <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">{icon}{title}</h3>
      {rows.length === 0 ? <Empty/> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[9px] uppercase tracking-wider text-[#475569] border-b border-[#1E2D4A]">
                <th className="text-left p-1.5 w-6">#</th>
                <th className="text-left p-1.5">Granja</th>
                {cols.map(c=><th key={c} className="text-center p-1.5">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-[#1E2D4A]/40">
                  <td className="p-1.5">
                    <span className="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center"
                          style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>{i+1}</span>
                  </td>
                  <td className="p-1.5 text-white font-medium truncate max-w-[120px]">{r.nombre}</td>
                  {r.valores.map((v, j) => (
                    <td key={j} className={`p-1.5 text-center tabular-nums ${j===r.valores.length-1?"font-bold":"text-[#94A3B8]"}`}
                        style={j===r.valores.length-1?{ color }:undefined}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Empty() {
  return <p className="text-center text-sm text-[#475569] py-8">Sin datos suficientes para el ranking con los filtros actuales</p>;
}
