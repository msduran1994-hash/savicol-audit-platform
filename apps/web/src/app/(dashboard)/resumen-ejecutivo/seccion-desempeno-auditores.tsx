"use client";
import { useMemo } from "react";
import {
  useDesempenoAuditores, AUDITORES,
  type DesempenoAuditor, type DesempenoFuente, type DesempenoGranjas,
} from "@/hooks/useAuditorActividades";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import {
  Users2, Loader2, CalendarDays, Route, Warehouse, Info, Tractor,
} from "lucide-react";

// ─── Sección de Desempeño de Auditores (consolidada en Resumen Ejecutivo) ──────
// Consolida automáticamente las fuentes reales con auditor: Cronograma 2026, Rutas
// y CEDIS. Cada fuente se muestra por separado (sin promediar). Sin registro manual.

function semColor(p: number) { return p >= 90 ? "#22C55E" : p >= 70 ? "#F59E0B" : "#EF4444"; }
function semLabel(p: number) { return p >= 90 ? "Óptimo" : p >= 70 ? "Aceptable" : "Crítico"; }

// Barra de cumplimiento de una fuente para un auditor
function FuenteBar({ f }: { f: DesempenoFuente }) {
  if (f.total === 0) return <span className="text-[10px] text-[#475569]">Sin actividad</span>;
  const c = semColor(f.cumplimiento);
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-[#94A3B8]">{f.completadas}/{f.total}</span>
        <span className="text-[11px] font-bold" style={{ color: c }}>{f.cumplimiento}%</span>
      </div>
      <div className="h-1 bg-[#1E2D4A] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${f.cumplimiento}%`, background: c }}/>
      </div>
    </div>
  );
}

// Celda de Granjas: muestra hallazgos detectados (volumen) y % cerrados, más KPIs
function GranjasCell({ g }: { g: DesempenoGranjas }) {
  if (g.hallazgos === 0) return <span className="text-[10px] text-[#475569]">Sin hallazgos</span>;
  const c = semColor(g.pctCerrados);
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-[#94A3B8]">{g.hallazgos} detect.</span>
        <span className="text-[11px] font-bold" style={{ color: c }}>{g.pctCerrados}% cerr.</span>
      </div>
      <div className="h-1 bg-[#1E2D4A] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${g.pctCerrados}%`, background: c }}/>
      </div>
      <div className="flex gap-2 mt-1 text-[9px] text-[#64748B]">
        <span title="Hallazgos críticos/altos">{g.criticos} críticos</span>
        {g.kpis > 0 && <span title="KPIs de cumplimiento atribuibles">· {g.kpisCompletados}/{g.kpis} KPI ({g.avanceKpi}%)</span>}
      </div>
    </div>
  );
}

export function SeccionDesempenoAuditores() {
  const { desempeno, totales, isLoading } = useDesempenoAuditores();

  // Datos para el gráfico comparativo por fuente (solo auditores con alguna actividad)
  const dataGrafico = useMemo(() =>
    desempeno.filter(d => d.totalActividades > 0).map(d => ({
      nombre: d.auditor.split(" ")[0],
      Cronograma: d.cronograma.total ? d.cronograma.cumplimiento : null,
      Rutas: d.rutas.total ? d.rutas.cumplimiento : null,
      CEDIS: d.cedis.total ? d.cedis.cumplimiento : null,
      "Granjas (% cerr.)": d.granjas.hallazgos ? d.granjas.pctCerrados : null,
    })), [desempeno]);

  const activos = desempeno.filter(d => d.totalActividades > 0).length;

  return (
    <section className="bg-[#0A111F] border border-[#1E2D4A] rounded-2xl p-5 space-y-5">
      {/* Encabezado */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#4A7AFF1A", color: "#4A7AFF" }}>
          <Users2 className="w-4.5 h-4.5"/>
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Desempeño de Auditores</h2>
          <p className="text-[11px] text-[#64748B]">Consolidado de Cronograma 2026, Rutas y CEDIS · datos reales por auditor</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-[#94A3B8] text-sm p-6 justify-center"><Loader2 className="w-5 h-5 animate-spin"/> Consolidando desempeño…</div>
      ) : (
      <>
      {/* KPIs por fuente */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-[#0D1526] rounded-xl p-3 border border-[#1E2D4A]">
          <div className="flex items-center gap-1.5 mb-1"><CalendarDays className="w-3.5 h-3.5 text-[#4A7AFF]"/><p className="text-[10px] text-[#94A3B8]">Cronograma 2026</p></div>
          <p className="text-2xl font-bold text-white">{totales.cronograma}</p>
          <p className="text-[10px] text-[#64748B]">actividades · {totales.cumplimientoCronograma}% completadas</p>
        </div>
        <div className="bg-[#0D1526] rounded-xl p-3 border border-[#1E2D4A]">
          <div className="flex items-center gap-1.5 mb-1"><Route className="w-3.5 h-3.5 text-emerald-400"/><p className="text-[10px] text-[#94A3B8]">Rutas</p></div>
          <p className="text-2xl font-bold text-white">{totales.rutas}</p>
          <p className="text-[10px] text-[#64748B]">acompañamientos</p>
        </div>
        <div className="bg-[#0D1526] rounded-xl p-3 border border-[#1E2D4A]">
          <div className="flex items-center gap-1.5 mb-1"><Warehouse className="w-3.5 h-3.5 text-amber-400"/><p className="text-[10px] text-[#94A3B8]">CEDIS</p></div>
          <p className="text-2xl font-bold text-white">{totales.cedis}</p>
          <p className="text-[10px] text-[#64748B]">auditorías</p>
        </div>
        <div className="bg-[#0D1526] rounded-xl p-3 border border-[#1E2D4A]">
          <div className="flex items-center gap-1.5 mb-1"><Tractor className="w-3.5 h-3.5 text-[#34D399]"/><p className="text-[10px] text-[#94A3B8]">Granjas</p></div>
          <p className="text-2xl font-bold text-white">{totales.hallazgosGranja}</p>
          <p className="text-[10px] text-[#64748B]">hallazgos · {totales.kpisAtribuidos} KPI atribuidos</p>
        </div>
        <div className="bg-[#0D1526] rounded-xl p-3 border border-[#1E2D4A]">
          <div className="flex items-center gap-1.5 mb-1"><Users2 className="w-3.5 h-3.5 text-[#A855F7]"/><p className="text-[10px] text-[#94A3B8]">Auditores activos</p></div>
          <p className="text-2xl font-bold text-white">{activos}</p>
          <p className="text-[10px] text-[#64748B]">de {AUDITORES.length}</p>
        </div>
      </div>

      {/* Gráfico comparativo de cumplimiento por fuente */}
      {dataGrafico.length > 0 && (
        <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">% Cumplimiento por auditor y fuente</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dataGrafico} margin={{ left: -15, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false}/>
              <XAxis dataKey="nombre" stroke="#94A3B8" fontSize={11}/>
              <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]}/>
              <Tooltip contentStyle={{ background: "#0D1526", border: "1px solid #1E2D4A", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#fff" }} cursor={{ fill: "#1E2D4A33" }}
                formatter={(v: any) => v == null ? ["Sin actividad", ""] : [`${v}%`, ""]}/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              <Bar dataKey="Cronograma" fill="#4A7AFF" radius={[3, 3, 0, 0]}/>
              <Bar dataKey="Rutas" fill="#22C55E" radius={[3, 3, 0, 0]}/>
              <Bar dataKey="CEDIS" fill="#F59E0B" radius={[3, 3, 0, 0]}/>
              <Bar dataKey="Granjas (% cerr.)" fill="#34D399" radius={[3, 3, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla de desempeño por auditor con las 3 fuentes separadas */}
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-[#1E2D4A] text-[#94A3B8] text-xs">
              <th className="text-left px-4 py-3 font-semibold">Auditor</th>
              <th className="text-left px-4 py-3 font-semibold"><span className="flex items-center gap-1"><CalendarDays className="w-3 h-3 text-[#4A7AFF]"/> Cronograma</span></th>
              <th className="text-left px-4 py-3 font-semibold"><span className="flex items-center gap-1"><Route className="w-3 h-3 text-emerald-400"/> Rutas</span></th>
              <th className="text-left px-4 py-3 font-semibold"><span className="flex items-center gap-1"><Warehouse className="w-3 h-3 text-amber-400"/> CEDIS</span></th>
              <th className="text-left px-4 py-3 font-semibold"><span className="flex items-center gap-1"><Tractor className="w-3 h-3 text-[#34D399]"/> Granjas</span></th>
              <th className="text-center px-4 py-3 font-semibold">Total act.</th>
            </tr>
          </thead>
          <tbody>
            {desempeno.map(d => (
              <tr key={d.auditor} className="border-b border-[#1E2D4A]/50 hover:bg-[#0A111F]/40">
                <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{d.auditor}</td>
                <td className="px-4 py-3 w-40"><FuenteBar f={d.cronograma}/></td>
                <td className="px-4 py-3 w-40"><FuenteBar f={d.rutas}/></td>
                <td className="px-4 py-3 w-40"><FuenteBar f={d.cedis}/></td>
                <td className="px-4 py-3 w-48"><GranjasCell g={d.granjas}/></td>
                <td className="px-4 py-3 text-center text-white font-bold">{d.totalActividades}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Nota de Granjas: métricas y KPIs no atribuibles (honestidad) */}
      <div className="flex items-start gap-2 bg-[#0A111F] border border-dashed border-[#1E2D4A] rounded-xl p-3">
        <Tractor className="w-4 h-4 text-[#34D399] mt-0.5 shrink-0"/>
        <p className="text-[11px] text-[#64748B]">
          <span className="text-[#94A3B8] font-semibold">Granjas:</span> se muestran los hallazgos detectados por cada auditor (volumen) y el % cerrado sobre su total. Los KPIs de cumplimiento se atribuyen al auditor mediante el hallazgo de origen: {totales.kpisAtribuidos} de {totales.kpisGranja} KPIs son atribuibles; los {totales.kpisSinAtribuir} restantes no tienen vínculo con un auditor en el origen y no se imputan a nadie.
        </p>
      </div>

      <p className="text-[11px] text-[#64748B] flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5"/> Cada fuente se muestra por separado con datos reales del backend. Cronograma, Rutas y CEDIS usan (completadas / total); Granjas usa hallazgos detectados y % cerrados.
      </p>
      </>
      )}
    </section>
  );
}
