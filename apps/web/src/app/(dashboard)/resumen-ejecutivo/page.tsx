"use client";
import { useMemo } from "react";
import { Header } from "@/components/layout/header";
import { useGranjas } from "@/hooks/useGranjas";
import { useCedis, useHallazgosCedi, useAuditoriasCedi } from "@/hooks/useCedis";
import { useLotes, useChecklists, calcularCumplimiento } from "@/hooks/useLotes";
import {
  Gauge, ShieldCheck, AlertTriangle, ClipboardCheck, Tractor, Egg,
  TrendingUp, Activity, CheckCircle2, XCircle, Clock, Loader2,
  Package, Route, Warehouse, DollarSign, Megaphone, Users2, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  const ind = useMemo(() => {
    const granjas = granjasQ.data ?? [];
    const hallazgosCedi = hallazgosCediQ.data ?? [];
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

    return {
      totalAuditorias, hallAbiertos, hallCerrados, riesgosCriticos, cumplimientoAud,
      totalGranjas, hallGranjas, kpiGranjas, riesgoAlto, sanitarioOptimo, sanitarioCritico, cumplimientoSanitario,
      totalLotes, totalChecklists, cumplChecklists,
      totalCedis: cedis.length,
      totalHallazgos: hallAbiertos + hallCerrados + hallGranjas,
    };
  }, [granjasQ.data, hallazgosCediQ.data, auditoriasCediQ.data, cedisQ.data, lotesQ.data, chkEncQ.data, chkTrzQ.data]);

  // Cumplimiento general corporativo (promedio de los cumplimientos con datos)
  const cumplimientoGeneral = Math.round(
    (ind.cumplimientoAud + ind.cumplimientoSanitario + (ind.cumplChecklists || ind.cumplimientoSanitario)) / 3
  );

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Resumen Ejecutivo" subtitle="Portada corporativa · consolidado gerencial de auditoría" />
      <div className="flex-1 p-6 space-y-6">

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

        {/* Bloque Auditoría / CEDIS */}
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
