"use client";
import { Header } from "@/components/layout/header";
import { useGranjasStore } from "@/store/granjas.store";
import { useShallow } from "zustand/react/shallow";
import { Trophy, TrendingDown, AlertCircle, Clock, Award } from "lucide-react";

/**
 * SCORE IA DETERMINÍSTICO POR GRANJA
 *   score = base 100
 *         - hallazgos críticos * 15
 *         - hallazgos altos    * 8
 *         - kpis no iniciados  * 5
 *         + kpis completados   * 3
 *         + nivel sanitario óptimo * 5
 *   → resultado 0-100 (clamp)
 */
export default function RankingPage() {
  const granjas   = useGranjasStore(useShallow((s) => s.granjas));
  const hallazgos = useGranjasStore(useShallow((s) => s.hallazgos));
  const kpis      = useGranjasStore(useShallow((s) => s.kpis));

  const scored = granjas.map(g => {
    const granjaHal = hallazgos.filter(h => h.granjaId === g.id);
    const granjaKpi = kpis.filter(k => k.granjaId === g.id);
    let score = 100;
    score -= granjaHal.filter(h => h.criticidad === "Crítica").length * 15;
    score -= granjaHal.filter(h => h.criticidad === "Alta").length    * 8;
    score -= granjaKpi.filter(k => k.estado === "No Iniciado").length * 5;
    score += granjaKpi.filter(k => k.estado === "Completado").length  * 3;
    if (g.estadoSanitario === "Óptimo") score += 5;
    if (g.estadoSanitario === "Crítico") score -= 10;
    return {
      ...g,
      score: Math.max(0, Math.min(100, score)),
      hallazgos: granjaHal.length,
      kpisCompletados: granjaKpi.filter(k => k.estado === "Completado").length,
      kpisRetrasados:  granjaKpi.filter(k => k.estado === "No Iniciado" || k.estado === "En Espera").length,
    };
  });

  const mejorCumplimiento = [...scored].sort((a,b) => b.score - a.score);
  const mayorCriticidad   = [...scored].sort((a,b) => b.hallazgos - a.hallazgos);
  const mayorRetraso      = [...scored].sort((a,b) => b.kpisRetrasados - a.kpisRetrasados);

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Ranking de Granjas"
        subtitle={`Score IA determinístico · ${scored.length} granjas evaluadas`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Top 3 Mejor Cumplimiento (podio) */}
        <div className="card-base bg-gradient-to-br from-[#0D1526] to-[#1A1208] border-amber-900/30">
          <h3 className="font-display font-semibold text-amber-400 mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4"/> Podio · Mejor Cumplimiento General
          </h3>
          {mejorCumplimiento.length === 0 ? (
            <Empty/>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {mejorCumplimiento.slice(0,3).map((g, i) => {
                const colors = ["#FFD700","#C0C0C0","#CD7F32"];
                const labels = ["🥇 1° Lugar","🥈 2° Lugar","🥉 3° Lugar"];
                return (
                  <div key={g.id} className={`p-4 rounded-xl border text-center ${
                    i === 0 ? "bg-amber-500/10 border-amber-500/40" : "bg-[#1A2540] border-[#2A3F6A]"
                  }`}>
                    <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors[i] }}>{labels[i]}</p>
                    <p className="font-display font-bold text-white text-lg mt-2 truncate">{g.nombre}</p>
                    <p className="text-[10px] text-[#94A3B8] mb-2">{g.codigo}</p>
                    <p className="font-display text-4xl font-bold mt-2" style={{ color: colors[i] }}>{g.score}</p>
                    <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Score IA</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top tablas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RankingTable
            title="Mayor Criticidad"
            icon={<AlertCircle className="w-4 h-4 text-red-400"/>}
            rows={mayorCriticidad.slice(0,10).map(g => ({ nombre: g.nombre, valor: g.hallazgos, sub: `${g.hallazgos} hallazgos` }))}
            color="#EF4444"
          />
          <RankingTable
            title="Mayor Retraso KPI"
            icon={<Clock className="w-4 h-4 text-amber-400"/>}
            rows={mayorRetraso.slice(0,10).map(g => ({ nombre: g.nombre, valor: g.kpisRetrasados, sub: `${g.kpisRetrasados} sin iniciar` }))}
            color="#F59E0B"
          />
        </div>

        {/* Tabla completa con scores */}
        <div className="card-base">
          <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400"/> Ranking Completo · Score IA por Granja
          </h3>
          {scored.length === 0 ? (
            <Empty/>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[#475569] border-b border-[#1E2D4A]">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Granja</th>
                    <th className="text-left p-2">Región</th>
                    <th className="text-center p-2">Hallazgos</th>
                    <th className="text-center p-2">KPI Completados</th>
                    <th className="text-center p-2">Estado Sanitario</th>
                    <th className="text-right p-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {mejorCumplimiento.map((g, i) => (
                    <tr key={g.id} className="table-row-hover border-b border-[#1E2D4A]/50">
                      <td className="p-2 text-[#94A3B8] font-mono">{i + 1}</td>
                      <td className="p-2 text-white font-medium">{g.nombre}</td>
                      <td className="p-2 text-[#94A3B8]">{g.region}</td>
                      <td className="p-2 text-center text-white">{g.hallazgos}</td>
                      <td className="p-2 text-center text-emerald-400">{g.kpisCompletados}</td>
                      <td className="p-2 text-center">
                        <span className="text-[10px] font-semibold"
                              style={{ color:
                                g.estadoSanitario === "Óptimo"  ? "#10B981" :
                                g.estadoSanitario === "Alerta"  ? "#F59E0B" : "#EF4444" }}>
                          {g.estadoSanitario}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <span className="font-display font-bold text-lg"
                              style={{ color: g.score >= 80 ? "#10B981" : g.score >= 60 ? "#F59E0B" : "#EF4444" }}>
                          {g.score}
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
          Fórmula del score: 100 - (críticos×15) - (altos×8) - (kpi_no_iniciados×5) + (kpi_completados×3) ± ajuste sanitario
        </p>
      </div>
    </div>
  );
}

function RankingTable({ title, icon, rows, color }: { title: string; icon: React.ReactNode; rows: any[]; color: string }) {
  return (
    <div className="card-base">
      <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">{icon}{title}</h3>
      {rows.filter(r => r.valor > 0).length === 0 ? <Empty/> : (
        <div className="space-y-2">
          {rows.filter(r => r.valor > 0).map((r, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A]">
              <span className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{r.nombre}</p>
                <p className="text-[10px] text-[#94A3B8]">{r.sub}</p>
              </div>
              <span className="font-display font-bold tabular-nums" style={{ color }}>{r.valor}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty() {
  return <p className="text-center text-sm text-[#475569] py-8">Sin datos suficientes para el ranking</p>;
}
