"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useCedisStore } from "@/store/cedis.store";
import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "@/store/auth.store";
import { InformeEjecutivoModal } from "./informe-ejecutivo-cedis";
import {
  Sparkles, AlertTriangle, Activity, Warehouse, Building2, MapPin, Target,
  TrendingUp, Award, Download,
} from "lucide-react";

export default function InformeEjecutivoCedisPage() {
  const cedis      = useCedisStore(useShallow((s) => s.cedis));
  const auditorias = useCedisStore(useShallow((s) => s.auditorias));
  const hallazgos  = useCedisStore(useShallow((s) => s.hallazgos));
  const usuario    = useAuthStore((s) => s.user?.name ?? "Auditor CEDIS");
  const [exportOpen, setExportOpen] = useState(false);

  const total          = auditorias.length;
  const cedisAuditados = new Set(auditorias.map(a => a.cediId)).size;
  const incidencia     = cedis.length > 0 ? Math.round((cedisAuditados / cedis.length) * 100) : 0;
  const criticos       = hallazgos.filter(h => h.criticidad === "Crítica");
  const altos          = hallazgos.filter(h => h.criticidad === "Alta");
  const reincidentes   = hallazgos.filter(h => h.reincidente);
  const cerrados       = hallazgos.filter(h => h.estado === "Cerrado");
  const abiertos       = hallazgos.filter(h => h.estado === "Abierto");
  const cumplimiento   = hallazgos.length > 0 ? Math.round((cerrados.length / hallazgos.length) * 100) : 0;

  // Riesgos dominantes
  const riesgoCount: Record<string, number> = {};
  hallazgos.forEach(h => { riesgoCount[h.tipoRiesgo] = (riesgoCount[h.tipoRiesgo] ?? 0) + 1; });
  const riesgosTop = Object.entries(riesgoCount).sort((a,b)=>b[1]-a[1]).slice(0,3);

  // CEDIS más críticos
  const cediStats: Record<string, { nombre: string; count: number; criticos: number }> = {};
  hallazgos.forEach(h => {
    if (!cediStats[h.cediId]) cediStats[h.cediId] = { nombre: h.cediNombre ?? "—", count: 0, criticos: 0 };
    cediStats[h.cediId].count += 1;
    if (h.criticidad === "Crítica" || h.criticidad === "Alta") cediStats[h.cediId].criticos += 1;
  });
  const cedisCriticos = Object.values(cediStats).sort((a,b)=>b.criticos-a.criticos).slice(0,3);

  // Categorías con mayor incidencia
  const catCount: Record<string, number> = {};
  hallazgos.forEach(h => { catCount[h.categoria] = (catCount[h.categoria] ?? 0) + 1; });
  const categoriasTop = Object.entries(catCount).sort((a,b)=>b[1]-a[1]).slice(0,3);

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Informe Ejecutivo IA · CEDIS"
        subtitle="Diagnóstico automático en tiempo real · Interpretación gerencial · Conclusiones"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Banner */}
        <div className="card-base bg-gradient-to-br from-[#0D1526] to-[#0A2D1F] border-emerald-900/30 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-48 opacity-[0.10]"
               style={{ backgroundImage: "repeating-linear-gradient(45deg, #10B981 0, #10B981 1px, transparent 0, transparent 50%)", backgroundSize: "10px 10px" }} />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-emerald-400 mb-2 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5"/> Diagnóstico Ejecutivo Generado por IA
              </p>
              <h2 className="font-display text-2xl font-bold text-white mb-2">Resumen Gerencial CEDIS</h2>
              <p className="text-[#94A3B8] text-sm leading-relaxed max-w-2xl">
                {total === 0
                  ? "Sin auditorías registradas. Active el módulo Consolidado para iniciar el motor de diagnóstico ejecutivo."
                  : `${total} auditorías ejecutadas en ${cedisAuditados} de ${cedis.length} CEDIS (${incidencia}% cobertura). ${criticos.length} hallazgos críticos, ${altos.length} altos, ${reincidentes.length} reincidentes. Cumplimiento actual: ${cumplimiento}%.`}
              </p>
            </div>
            <button onClick={() => setExportOpen(true)} className="btn-secondary text-xs shrink-0 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400">
              <Download className="w-3.5 h-3.5"/> Exportar PDF
            </button>
          </div>
        </div>

        {/* KPIs ejecutivos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={<Warehouse/>}     title="Cobertura"           value={`${incidencia}%`}      subtitle={`${cedisAuditados}/${cedis.length} CEDIS`}/>
          <KpiCard icon={<AlertTriangle/>} title="Riesgos Críticos"    value={criticos.length}        subtitle="Requieren atención" alert={criticos.length>0}/>
          <KpiCard icon={<Award/>}         title="Cumplimiento"        value={`${cumplimiento}%`}    subtitle={`${cerrados.length} cerrados`}/>
          <KpiCard icon={<Activity/>}      title="Reincidencias"       value={reincidentes.length}    subtitle="90 días" alert={reincidentes.length>0}/>
        </div>

        {/* Análisis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="CEDIS Más Críticos" icon={<MapPin/>}>
            {cedisCriticos.length === 0 ? <Empty/> : (
              <ol className="space-y-2">
                {cedisCriticos.map((c, i) => (
                  <li key={c.nombre} className="flex items-center gap-3 p-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A]">
                    <span className="w-6 h-6 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{c.nombre}</p>
                      <p className="text-[10px] text-[#94A3B8]">{c.count} hallazgo(s) · {c.criticos} crítico/alto</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>

          <SectionCard title="Riesgos Dominantes" icon={<AlertTriangle/>}>
            {riesgosTop.length === 0 ? <Empty/> : (
              <ol className="space-y-2">
                {riesgosTop.map(([r, count], i) => (
                  <li key={r} className="flex items-center gap-3 p-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A]">
                    <span className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Riesgo {r}</p>
                      <p className="text-[10px] text-[#94A3B8]">{count} hallazgo(s) afectado(s)</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>

          <SectionCard title="Categorías con Mayor Incidencia" icon={<Target/>}>
            {categoriasTop.length === 0 ? <Empty/> : (
              <ol className="space-y-2">
                {categoriasTop.map(([cat, count], i) => (
                  <li key={cat} className="flex items-center gap-3 p-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A]">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{cat}</p>
                      <p className="text-[10px] text-[#94A3B8]">{count} hallazgo(s)</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>

          <SectionCard title="Estado de Cumplimiento" icon={<TrendingUp/>}>
            <div className="space-y-2">
              <Bar label="Abiertos"      count={abiertos.length}                                        total={hallazgos.length} color="#EF4444"/>
              <Bar label="En Plan"       count={hallazgos.filter(h => h.estado === "En Plan").length} total={hallazgos.length} color="#F59E0B"/>
              <Bar label="En Verificación" count={hallazgos.filter(h => h.estado === "En Verificación").length} total={hallazgos.length} color="#3B82F6"/>
              <Bar label="Cerrados"      count={cerrados.length}                                        total={hallazgos.length} color="#10B981"/>
            </div>
          </SectionCard>
        </div>

        {/* Recomendaciones IA */}
        <div className="card-base bg-gradient-to-br from-[#0D1526] to-[#0A2D1F] border-emerald-900/30">
          <h3 className="font-display font-semibold text-emerald-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4"/> Recomendaciones Estratégicas IA
          </h3>
          {total === 0 ? (
            <p className="text-[#94A3B8] text-sm">Sin datos suficientes para generar recomendaciones.</p>
          ) : (
            <ul className="space-y-2 text-sm text-[#94A3B8]">
              {criticos.length > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">●</span>
                  <span><strong className="text-white">Acción urgente:</strong> {criticos.length} hallazgo(s) críticos requieren escalamiento inmediato al comité directivo.</span>
                </li>
              )}
              {reincidentes.length > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">●</span>
                  <span><strong className="text-white">Reincidencias detectadas:</strong> {reincidentes.length} hallazgo(s) reincidentes — revisar efectividad de planes correctivos anteriores.</span>
                </li>
              )}
              {incidencia < 80 && cedis.length > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">●</span>
                  <span><strong className="text-white">Cobertura insuficiente:</strong> {incidencia}% bajo del estándar 80%. Programar auditorías a {cedis.length - cedisAuditados} CEDIS pendientes.</span>
                </li>
              )}
              {riesgosTop[0]?.[0] === "Contagio" && (
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">●</span>
                  <span><strong className="text-white">Bioseguridad crítica:</strong> Auditar protocolos sanitarios en toda la red CEDIS.</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">●</span>
                <span><strong className="text-white">Plan de mejora:</strong> Establecer KPIs trimestrales por CEDI con seguimiento ejecutivo automatizado.</span>
              </li>
            </ul>
          )}
        </div>

        {/* Conclusiones */}
        <div className="card-base bg-blue-500/5 border-blue-500/20">
          <h3 className="font-display font-semibold text-blue-300 mb-2 flex items-center gap-2">
            <Award className="w-4 h-4"/> Conclusiones Ejecutivas
          </h3>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            {total === 0
              ? "Active el módulo Consolidado para activar los diagnósticos ejecutivos automáticos."
              : `La red de CEDIS muestra ${total} auditorías con ${hallazgos.length} hallazgos en seguimiento. Cumplimiento del ${cumplimiento}% con ${reincidentes.length} reincidencias detectadas. Categorías prioritarias: ${categoriasTop.map(([c]) => c).join(", ")}. Se recomienda revisión trimestral con responsables de cada CEDI.`}
          </p>
        </div>
      </div>

      {exportOpen && (
        <InformeEjecutivoModal
          cedis={cedis.map((c: any) => ({ id: c.id, nombre: c.nombre }))}
          hallazgos={hallazgos}
          auditorias={auditorias}
          usuario={usuario}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}

function KpiCard({ icon, title, value, subtitle, alert }: { icon: React.ReactNode; title: string; value: any; subtitle: string; alert?: boolean }) {
  return (
    <div className={`card-base ${alert ? "ring-1 ring-red-500/40" : ""}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">{icon}</div>
        <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">{title}</p>
      </div>
      <p className="font-display text-xl font-bold text-white">{value}</p>
      <p className="text-[10px] text-[#475569] mt-0.5">{subtitle}</p>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card-base">
      <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2 text-sm">
        <span className="text-emerald-400">{icon}</span>{title}
      </h3>
      {children}
    </div>
  );
}

function Bar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#94A3B8]">{label}</span>
        <span className="text-white font-medium">{count} ({pct}%)</span>
      </div>
      <div className="h-2 bg-[#1A2540] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }}/>
      </div>
    </div>
  );
}

function Empty() {
  return <p className="text-center text-sm text-[#475569] py-6">Sin datos</p>;
}
