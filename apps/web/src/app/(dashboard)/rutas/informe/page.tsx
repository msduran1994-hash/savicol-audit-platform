"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useRutasStore } from "@/store/rutas.store";
import { useAuthStore } from "@/store/auth.store";
import { useShallow } from "zustand/react/shallow";
import { formatCOP, formatKg, TIPO_RIESGO_RUTA } from "@/lib/rutas.constants";
import { InformeEjecutivoRutasModal } from "./informe-ejecutivo-rutas";
import {
  Sparkles, AlertTriangle, DollarSign, Building2, MapPin, Target,
  TrendingUp, FileText, Award, Download,
} from "lucide-react";

/**
 * INFORME EJECUTIVO IA — Diagnóstico automático en tiempo real basado en
 * los datos consolidados de acompañamientos. Calculado en cliente.
 */
export default function InformeEjecutivoPage() {
  const acomp        = useRutasStore(useShallow((s) => s.acompanamientos));
  const cumplimiento = useRutasStore(useShallow((s) => s.cumplimiento));
  const evidencias   = useRutasStore(useShallow((s) => s.evidencias));
  const usuario      = useAuthStore((s) => s.user?.name ?? "Auditor de Rutas");
  const [exportOpen, setExportOpen] = useState(false);

  const total = acomp.length;
  const valorTotal = acomp.reduce((s,a)=>s+a.valorDevueltoCOP, 0);
  const kgTotal    = acomp.reduce((s,a)=>s+a.cantidadKgDevueltos, 0);
  const criticos   = acomp.filter(a => a.criticidad === "Crítico");
  const altos      = acomp.filter(a => a.criticidad === "Alto");
  const conHallazgos = acomp.filter(a => a.estado === "Con Hallazgos");

  // Motivos recurrentes
  const motivoCount: Record<string, number> = {};
  acomp.forEach(a => motivoCount[a.motivo] = (motivoCount[a.motivo] ?? 0) + 1);
  const motivosTop = Object.entries(motivoCount).sort((a,b)=>b[1]-a[1]).slice(0,3);

  // Rutas críticas
  const rutaStats: Record<string, { nombre: string; count: number; valor: number }> = {};
  acomp.forEach(a => {
    if (!rutaStats[a.rutaId]) rutaStats[a.rutaId] = { nombre: a.rutaNombre, count: 0, valor: 0 };
    rutaStats[a.rutaId].count += 1;
    rutaStats[a.rutaId].valor += a.valorDevueltoCOP;
  });
  const rutasCriticas = Object.values(rutaStats).sort((a,b)=>b.valor-a.valor).slice(0,3);

  // Clientes afectados
  const clienteStats: Record<string, { nombre: string; valor: number }> = {};
  acomp.forEach(a => {
    if (!clienteStats[a.clienteId]) clienteStats[a.clienteId] = { nombre: a.clienteNombre, valor: 0 };
    clienteStats[a.clienteId].valor += a.valorDevueltoCOP;
  });
  const clientesTop = Object.values(clienteStats).sort((a,b)=>b.valor-a.valor).slice(0,3);

  // Riesgos
  const riesgoCount: Record<string, number> = {};
  acomp.forEach(a => a.riesgosAsociados.forEach(r => riesgoCount[r] = (riesgoCount[r] ?? 0) + 1));
  const riesgosTop = Object.entries(riesgoCount).sort((a,b)=>b[1]-a[1]).slice(0,3);

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Informe Ejecutivo IA"
        subtitle="Diagnóstico automático · Interpretación inteligente · Recomendaciones estratégicas"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Banner */}
        <div className="card-base bg-gradient-to-br from-[#0D1526] to-[#082F36] border-cyan-900/30 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-48 opacity-[0.1]"
               style={{ backgroundImage: "repeating-linear-gradient(45deg, #06B6D4 0, #06B6D4 1px, transparent 0, transparent 50%)", backgroundSize: "10px 10px" }} />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-cyan-400 mb-2 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5"/> Resumen Ejecutivo Generado por IA
              </p>
              <h2 className="font-display text-2xl font-bold text-white mb-2">Diagnóstico de Operación Logística</h2>
              <p className="text-[#94A3B8] text-sm leading-relaxed max-w-2xl">
                {total === 0
                  ? "Sin datos consolidados. Registre acompañamientos para activar el motor de diagnóstico ejecutivo."
                  : `Se ejecutaron ${total} acompañamientos auditados. Se detectaron ${conHallazgos.length} acompañamientos con hallazgos (${criticos.length} críticos, ${altos.length} altos). El impacto financiero acumulado es de ${formatCOP(valorTotal)} con ${formatKg(kgTotal)} de mercancía devuelta.`}
              </p>
            </div>
            <button onClick={() => setExportOpen(true)} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold shrink-0 transition-all active:scale-[0.98] bg-cyan-500 hover:bg-cyan-400 text-[#0A111F] shadow-lg shadow-cyan-500/20">
              <Download className="w-3.5 h-3.5"/> Exportar PDF
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={<DollarSign/>}     title="Impacto Financiero"  value={formatCOP(valorTotal)} subtitle="Valor devuelto" />
          <KpiCard icon={<AlertTriangle/>}  title="Riesgos Críticos"    value={criticos.length}        subtitle="Acompañamientos" alert={criticos.length>0} />
          <KpiCard icon={<Building2/>}      title="Clientes Afectados"  value={Object.keys(clienteStats).length} subtitle="Únicos" />
          <KpiCard icon={<MapPin/>}         title="Rutas Críticas"      value={Object.keys(rutaStats).length}    subtitle="Auditadas" />
        </div>

        {/* Análisis ejecutivo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Rutas críticas */}
          <SectionCard title="Rutas Críticas Identificadas" icon={<MapPin/>}>
            {rutasCriticas.length === 0 ? <Empty/> : (
              <ol className="space-y-2">
                {rutasCriticas.map((r, i) => (
                  <li key={r.nombre} className="flex items-center gap-3 p-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A]">
                    <span className="w-6 h-6 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{r.nombre}</p>
                      <p className="text-[10px] text-[#94A3B8]">{r.count} acomp · {formatCOP(r.valor)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>

          {/* Clientes afectados */}
          <SectionCard title="Clientes Afectados" icon={<Building2/>}>
            {clientesTop.length === 0 ? <Empty/> : (
              <ol className="space-y-2">
                {clientesTop.map((c, i) => (
                  <li key={c.nombre} className="flex items-center gap-3 p-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A]">
                    <span className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{c.nombre}</p>
                      <p className="text-[10px] text-[#94A3B8]">{formatCOP(c.valor)} acumulado</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>

          {/* Motivos recurrentes */}
          <SectionCard title="Motivos Recurrentes" icon={<Target/>}>
            {motivosTop.length === 0 ? <Empty/> : (
              <ol className="space-y-2">
                {motivosTop.map(([motivo, count], i) => (
                  <li key={motivo} className="flex items-center gap-3 p-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A]">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{motivo}</p>
                      <p className="text-[10px] text-[#94A3B8]">{count} ocurrencia(s)</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>

          {/* Riesgos dominantes */}
          <SectionCard title="Riesgos Dominantes" icon={<AlertTriangle/>}>
            {riesgosTop.length === 0 ? <Empty/> : (
              <ol className="space-y-2">
                {riesgosTop.map(([riesgo, count], i) => (
                  <li key={riesgo} className="flex items-center gap-3 p-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A]">
                    <span className="w-6 h-6 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Riesgo {riesgo}</p>
                      <p className="text-[10px] text-[#94A3B8]">{count} acompañamiento(s)</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </div>

        {/* Recomendaciones automáticas IA */}
        <div className="card-base bg-gradient-to-br from-[#0D1526] to-[#082F36] border-cyan-900/30">
          <h3 className="font-display font-semibold text-cyan-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4"/> Recomendaciones Automáticas IA
          </h3>
          {total === 0 ? (
            <p className="text-[#94A3B8] text-sm">Sin datos suficientes para generar recomendaciones.</p>
          ) : (
            <ul className="space-y-2 text-sm text-[#94A3B8]">
              {criticos.length > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">●</span>
                  <span><strong className="text-white">Acción urgente:</strong> {criticos.length} acompañamiento(s) críticos requieren escalamiento inmediato al comité de auditoría.</span>
                </li>
              )}
              {valorTotal > 5_000_000 && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">●</span>
                  <span><strong className="text-white">Impacto financiero significativo:</strong> {formatCOP(valorTotal)} en devoluciones. Revisar presupuesto de mermas y plan de contingencia.</span>
                </li>
              )}
              {motivosTop[0]?.[0] === "Cadena de Frío Rota" && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">●</span>
                  <span><strong className="text-white">Cadena de frío:</strong> Motivo dominante crítico. Auditar mantenimiento de equipos refrigerados en flota completa y considerar instalación de termógrafos GPS.</span>
                </li>
              )}
              {motivosTop[0]?.[0] === "Producto Vencido" && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">●</span>
                  <span><strong className="text-white">Rotación de inventario:</strong> Implementar control FIFO automatizado y alertas tempranas de productos próximos a vencer.</span>
                </li>
              )}
              {clientesTop.length > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">●</span>
                  <span><strong className="text-white">Relación comercial:</strong> Reunión proactiva con <em>{clientesTop[0].nombre}</em> para prevenir deterioro de la relación.</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">●</span>
                <span><strong className="text-white">Plan de mejora:</strong> Establecer KPIs mensuales de cumplimiento por ruta y vincular al sistema de incentivos.</span>
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
              ? "Active el módulo de Consolidado para comenzar a generar diagnósticos ejecutivos automáticos."
              : `La operación logística presenta ${conHallazgos.length} acompañamientos con hallazgos sobre ${total} ejecutados (${Math.round(conHallazgos.length / total * 100)}% incidencia). Se recomienda comité ejecutivo de revisión de procesos críticos, especialmente en motivo "${motivosTop[0]?.[0] ?? "—"}", y planes de acción correctiva en las ${rutasCriticas.length} rutas críticas identificadas.`}
          </p>
        </div>
      </div>

      {exportOpen && (
        <InformeEjecutivoRutasModal
          acompanamientos={acomp}
          cumplimiento={cumplimiento}
          evidencias={evidencias}
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
        <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">{icon}</div>
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
        <span className="text-cyan-400">{icon}</span>{title}
      </h3>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-center text-sm text-[#475569] py-6">Sin datos</p>;
}
