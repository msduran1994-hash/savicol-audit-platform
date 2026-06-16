"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useCedisStore } from "@/store/cedis.store";
import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "@/store/auth.store";
import {
  FileText, Download, Sparkles, AlertTriangle, Activity, Target,
  TrendingUp, GitCompare, Award, BarChart3, Loader2, FileSpreadsheet,
} from "lucide-react";
import {
  construirInforme, generarPDF, generarXLSXCedis, extraerEvidencias,
  type ModeloId,
} from "../cumplimiento/informe-cedis";

// Cada reporte se mapea a un modelo del generador + los formatos que ofrece.
// "criticos" además aplica un prefiltro (solo críticos abiertos).
type Formato = "PDF" | "Excel" | "Power BI";
interface ReporteDef {
  id: string;
  label: string;
  desc: string;
  icon: any;
  formato: Formato[];
  modelo: ModeloId;
  prefiltro?: (h: any) => boolean;
}

const sinAcentos = (s: string) => (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const esCritico = (h: any) => sinAcentos((h.criticidad ?? "").toUpperCase()).startsWith("CRIT");
const esAbierto = (h: any) => sinAcentos((h.estado ?? "").toUpperCase()).replace(/ /g, "_") === "ABIERTO";

const REPORTES: ReporteDef[] = [
  { id: "hallazgos",   label: "Reporte de Hallazgos",  desc: "Listado completo con criticidad y estado",            icon: AlertTriangle, formato: ["PDF","Excel"],     modelo: "operativo" },
  { id: "riesgos",     label: "Análisis de Riesgos",    desc: "Distribución por reputacional/financiero/operativo",   icon: Activity,      formato: ["PDF"],             modelo: "estrategico" },
  { id: "incidencias", label: "Incidencias",            desc: "% de incidencia por CEDI, categoría y mes",             icon: Target,        formato: ["PDF","Power BI"],  modelo: "corporativo" },
  { id: "comparativos",label: "Comparativos",           desc: "Benchmarking entre CEDIS por indicadores clave",       icon: GitCompare,    formato: ["Excel","Power BI"],modelo: "corporativo" },
  { id: "auditorias",  label: "Auditorías Realizadas",   desc: "Resumen ejecutivo de auditorías por auditor y mes",    icon: FileText,      formato: ["PDF"],             modelo: "ejecutivo" },
  { id: "tendencias",  label: "Tendencias",              desc: "Evolución mensual de hallazgos, riesgos y cierre",     icon: TrendingUp,    formato: ["PDF","Power BI"],  modelo: "estrategico" },
  { id: "cumplimiento",label: "Cumplimiento",            desc: "Estado de planes de acción y porcentajes de cierre",   icon: Award,         formato: ["PDF","Excel"],     modelo: "operativo" },
  { id: "criticos",    label: "Riesgos Críticos",        desc: "Solo hallazgos críticos abiertos requiriendo escalamiento", icon: AlertTriangle, formato: ["PDF"],        modelo: "ejecutivo", prefiltro: (h) => esCritico(h) && esAbierto(h) },
  { id: "kpi",         label: "KPI Auditoría",           desc: "Métricas de cobertura, frecuencia y desempeño",        icon: BarChart3,     formato: ["PDF","Power BI"],  modelo: "ejecutivo" },
];

export default function ReportesCedisPage() {
  const hallazgos = useCedisStore(useShallow((s) => s.hallazgos));
  const auditorias = useCedisStore(useShallow((s) => s.auditorias));
  const cedisRaw = useCedisStore(useShallow((s) => s.cedis));
  const usuario = useAuthStore((s) => s.user?.name ?? "Auditor CEDIS");

  // Mapa id→nombre de CEDI (tolera distintas formas del store)
  const cedis: { id: string; nombre: string }[] = Array.isArray(cedisRaw)
    ? cedisRaw.map((c: any) => ({ id: c.id, nombre: c.nombre }))
    : [];
  const cedisMap: Record<string, string> = Object.fromEntries(cedis.map((c) => [c.id, c.nombre]));

  const [generando, setGenerando] = useState<string | null>(null); // `${id}-${formato}`

  function datosDe(rep: ReporteDef): any[] {
    const base = Array.isArray(hallazgos) ? hallazgos : [];
    return rep.prefiltro ? base.filter(rep.prefiltro) : base;
  }

  async function generar(rep: ReporteDef, formato: Formato) {
    const key = `${rep.id}-${formato}`;
    const datos = datosDe(rep);
    if (formato === "Power BI") {
      window.location.href = "/cedis";
      return;
    }
    if (datos.length === 0) {
      alert("No hay registros disponibles para este reporte.");
      return;
    }
    setGenerando(key);
    try {
      const fechaStr = new Date().toISOString().slice(0, 10);
      const nombreArchivo = `Reporte-${rep.label.replace(/ /g, "-")}-CEDIS-${fechaStr}`;
      if (formato === "PDF") {
        const cediIds = new Set(datos.map((h) => h.cediId).filter(Boolean));
        const evidencias = extraerEvidencias(Array.isArray(auditorias) ? auditorias : [], cediIds);
        const filtrosTxt = rep.prefiltro ? ["Solo críticos abiertos"] : [];
        const html = construirInforme(rep.modelo, datos, cedisMap, usuario, filtrosTxt, evidencias);
        await generarPDF(html, `${nombreArchivo}.pdf`);
      } else if (formato === "Excel") {
        await generarXLSXCedis(datos, cedisMap, `${nombreArchivo}.xlsx`);
      }
    } catch (e: any) {
      alert("Error al generar el reporte: " + (e?.message ?? "desconocido"));
    } finally {
      setGenerando(null);
    }
  }

  function iconoFormato(f: Formato) {
    if (f === "Excel") return <FileSpreadsheet className="w-3 h-3" />;
    if (f === "Power BI") return <BarChart3 className="w-3 h-3" />;
    return <Download className="w-3 h-3" />;
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Reportes Ejecutivos · CEDIS" subtitle="9 reportes preconfigurados · PDF · Excel · Power BI · Resumen IA"/>
      <div className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTES.map(r => {
            const count = datosDe(r).length;
            return (
              <div key={r.id} className="card-base card-hover">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <r.icon className="w-5 h-5"/>
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-white text-sm">{r.label}</h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5 leading-snug">{r.desc}</p>
                    <p className="text-[10px] text-[#64748B] mt-1">{count} registro(s) en alcance</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-[#1E2D4A]">
                  <div className="flex gap-1">
                    {r.formato.map(f => <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8]">{f}</span>)}
                  </div>
                  <div className="flex gap-1.5">
                    {r.formato.map(f => {
                      const key = `${r.id}-${f}`;
                      const cargando = generando === key;
                      return (
                        <button key={f} onClick={() => generar(r, f)} disabled={!!generando}
                          title={f === "Power BI" ? "Abrir Dashboard BI" : `Descargar ${f}`}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#1A2540] border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-semibold disabled:opacity-40">
                          {cargando ? <Loader2 className="w-3 h-3 animate-spin"/> : iconoFormato(f)}
                          {f === "Power BI" ? "BI" : f}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="card-base bg-gradient-to-br from-[#0D1526] to-[#0A2D1F] border-emerald-900/30">
          <h3 className="font-display font-semibold text-emerald-400 flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4"/> Resumen Ejecutivo IA + Cierre Inteligente
          </h3>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Cada reporte consolida la información de Consolidado y Cumplimiento, e incluye recomendaciones IA,
            evidencias fotográficas y gráficos ejecutivos. Los reportes Power BI abren el Dashboard interactivo de CEDIS.
          </p>
        </div>
      </div>
    </div>
  );
}
