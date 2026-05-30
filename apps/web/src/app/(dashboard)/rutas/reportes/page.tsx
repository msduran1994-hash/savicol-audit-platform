"use client";
import { Header } from "@/components/layout/header";
import {
  FileText, Download, Sparkles, AlertTriangle, Building2, Truck,
  Target, TrendingUp, GitCompare, Award, FileSpreadsheet,
} from "lucide-react";

const REPORTES = [
  { id: "hallazgos",    label: "Reporte de Hallazgos",         desc: "Listado de hallazgos por acompañamiento con criticidad",            icon: AlertTriangle,  formato: ["PDF", "Excel"] },
  { id: "riesgos",      label: "Análisis de Riesgos",          desc: "Distribución por tipo de riesgo (legal, operativo, financiero...)", icon: AlertTriangle,  formato: ["PDF"] },
  { id: "clientes",     label: "Clientes Impactados",          desc: "Ranking de clientes con devoluciones y valor acumulado",            icon: Building2,      formato: ["PDF", "Excel"] },
  { id: "vehiculos",    label: "Reporte de Vehículos",         desc: "Participación de flota, conductores y rutas más críticas",          icon: Truck,          formato: ["Excel"] },
  { id: "motivos",      label: "Motivos de Devolución",        desc: "Análisis de frecuencia y costo de cada motivo",                     icon: Target,         formato: ["PDF", "Excel"] },
  { id: "auditorias",   label: "Auditorías Realizadas",         desc: "Resumen ejecutivo de acompañamientos por auditor y mes",            icon: FileText,       formato: ["PDF"] },
  { id: "kpi",          label: "Indicadores KPI",               desc: "Métricas de cumplimiento, devoluciones y planes de acción",         icon: Target,         formato: ["PDF", "Power BI"] },
  { id: "tendencias",   label: "Tendencias",                    desc: "Evolución mensual de motivos, criticidad y valor devuelto",        icon: TrendingUp,     formato: ["PDF", "Power BI"] },
  { id: "criticos",     label: "Riesgos Críticos",              desc: "Solo acompañamientos críticos requiriendo escalamiento",             icon: AlertTriangle,  formato: ["PDF"] },
];

export default function ReportesRutasPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Reportes Ejecutivos · Rutas"
        subtitle="9 reportes preconfigurados · PDF · Excel · Power BI · Resumen IA"
      />

      <div className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTES.map(r => (
            <div key={r.id} className="card-base card-hover">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <r.icon className="w-5 h-5"/>
                </div>
                <div>
                  <h3 className="font-display font-semibold text-white text-sm">{r.label}</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5 leading-snug">{r.desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[#1E2D4A]">
                <div className="flex gap-1">
                  {r.formato.map(f => (
                    <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8]">{f}</span>
                  ))}
                </div>
                <button disabled className="btn-ghost text-xs opacity-50 cursor-not-allowed">
                  <Download className="w-3.5 h-3.5"/>Próximamente
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="card-base bg-gradient-to-br from-[#0D1526] to-[#082F36] border-cyan-900/30">
          <h3 className="font-display font-semibold text-cyan-400 flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4"/> Resumen Gerencial IA
          </h3>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Cada reporte incluirá un resumen ejecutivo generado automáticamente con recomendaciones inteligentes,
            planes de acción sugeridos y cierre inteligente de hallazgos. La generación de reportes podrá agendarse
            para envío automático por correo electrónico a los stakeholders configurados.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Export icon={<FileText/>}        label="PDF Ejecutivo"  desc="Reporte formal" />
          <Export icon={<FileSpreadsheet/>} label="Excel"          desc="Datos crudos" />
          <Export icon={<TrendingUp/>}      label="Power BI"        desc="Dataset compatible" />
          <Export icon={<Sparkles/>}        label="Dashboard"       desc="Interactivo" />
        </div>
      </div>
    </div>
  );
}

function Export({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <div className="card-base text-center">
      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-2">{icon}</div>
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="text-[10px] text-[#94A3B8] mt-1">{desc}</p>
    </div>
  );
}
