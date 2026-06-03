"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useAuthStore } from "@/store/auth.store";
import {
  FileText, Download, Sparkles, AlertTriangle, Building2, Truck,
  Target, TrendingUp, Award, FileSpreadsheet, Loader2, CheckCircle2, ExternalLink,
} from "lucide-react";

interface Reporte {
  id: string;
  label: string;
  desc: string;
  icon: any;
  formatos: Array<{
    tipo: "Excel" | "CSV" | "PDF" | "Power BI";
    endpoint: string;
    filename: string;
  }>;
}

const REPORTES: Reporte[] = [
  {
    id: "acompanamientos",
    label: "Acompañamientos Detallados",
    desc: "Listado completo con joins cliente·ruta·vehículo·conductor y filtros opcionales",
    icon: Truck,
    formatos: [
      { tipo: "Excel", endpoint: "/api/v1/reports/rutas/excel",      filename: "rutas-acompanamientos.xlsx" },
      { tipo: "CSV",   endpoint: "/api/v1/reports/rutas/csv?entity=rutas", filename: "rutas-acompanamientos.csv" },
    ],
  },
  {
    id: "hallazgos-cedis",
    label: "Hallazgos CEDI",
    desc: "Hallazgos del módulo CEDI con criticidad y categoría",
    icon: AlertTriangle,
    formatos: [
      { tipo: "Excel", endpoint: "/api/v1/reports/cedis/auditorias/excel", filename: "cedi-auditorias.xlsx" },
    ],
  },
  {
    id: "granjas",
    label: "Reporte de Granjas",
    desc: "Catálogo de granjas con veterinario y caracterización operativa",
    icon: Award,
    formatos: [
      { tipo: "Excel", endpoint: "/api/v1/reports/granjas/excel",         filename: "granjas.xlsx" },
      { tipo: "CSV",   endpoint: "/api/v1/reports/granjas/csv?entity=granjas", filename: "granjas.csv" },
    ],
  },
  {
    id: "hallazgos-granjas",
    label: "Hallazgos Granjas",
    desc: "Listado de hallazgos por granja con auditor y descripción",
    icon: AlertTriangle,
    formatos: [
      { tipo: "Excel", endpoint: "/api/v1/reports/hallazgos/granjas/excel", filename: "hallazgos-granjas.xlsx" },
      { tipo: "CSV",   endpoint: "/api/v1/reports/granjas/csv?entity=hallazgos", filename: "hallazgos.csv" },
    ],
  },
  {
    id: "cedis",
    label: "Centros de Distribución",
    desc: "Listado de CEDIS con administrador, ciudad y capacidad",
    icon: Building2,
    formatos: [
      { tipo: "CSV", endpoint: "/api/v1/reports/cedis/csv?entity=cedis", filename: "cedis.csv" },
    ],
  },
  {
    id: "cronograma",
    label: "Cronograma Ejecutivo",
    desc: "Resumen ejecutivo + detalle + cumplimiento por auditor del año",
    icon: Target,
    formatos: [
      { tipo: "Excel", endpoint: "/api/v1/reports/cronograma/excel?year=2026", filename: "cronograma-2026.xlsx" },
    ],
  },
  {
    id: "users",
    label: "Usuarios y Roles",
    desc: "Listado de usuarios con rol, estado y fecha de creación",
    icon: FileText,
    formatos: [
      { tipo: "CSV", endpoint: "/api/v1/reports/users/csv?entity=users", filename: "usuarios.csv" },
    ],
  },
  {
    id: "powerbi",
    label: "Power BI · 8 Datasets",
    desc: "Endpoints JSON para conectar Power BI Desktop con X-API-Token",
    icon: TrendingUp,
    formatos: [
      { tipo: "Power BI", endpoint: "/api/v1/powerbi/metadata", filename: "powerbi-metadata.json" },
    ],
  },
];

interface DownloadHistoryItem {
  id: string;
  reporte: string;
  formato: string;
  filename: string;
  size: number;
  timestamp: string;
  status: "ok" | "error";
}

export default function ReportesRutasPage() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [history, setHistory]         = useState<DownloadHistoryItem[]>([]);

  const handleDownload = async (rep: Reporte, fmt: Reporte["formatos"][number]) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      alert("Sesión expirada · iniciá sesión de nuevo");
      return;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
    const url = `${apiBase}${fmt.endpoint}`;
    const downloadKey = `${rep.id}-${fmt.tipo}`;
    setDownloading(downloadKey);

    try {
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      // Si es Power BI metadata, abrir nueva pestaña con el JSON
      if (fmt.tipo === "Power BI") {
        const data = await r.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const objUrl = URL.createObjectURL(blob);
        window.open(objUrl, "_blank");
        URL.revokeObjectURL(objUrl);
        setHistory(h => [{
          id: Date.now().toString(),
          reporte: rep.label, formato: fmt.tipo, filename: fmt.filename,
          size: blob.size, timestamp: new Date().toISOString(), status: "ok" as const,
        }, ...h].slice(0, 20));
        return;
      }

      const blob = await r.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = fmt.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);

      setHistory(h => [{
        id: Date.now().toString(),
        reporte: rep.label, formato: fmt.tipo, filename: fmt.filename,
        size: blob.size, timestamp: new Date().toISOString(), status: "ok" as const,
      }, ...h].slice(0, 20));
    } catch (e: any) {
      setHistory(h => [{
        id: Date.now().toString(),
        reporte: rep.label, formato: fmt.tipo, filename: fmt.filename,
        size: 0, timestamp: new Date().toISOString(), status: "error" as const,
      }, ...h].slice(0, 20));
      alert(`Error descargando ${rep.label}: ${e?.message ?? "desconocido"}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Reportes · Centro de Descargas"
        subtitle={`${REPORTES.length} reportes preconfigurados · Excel · CSV · Power BI · descargas en vivo`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Grid de reportes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTES.map(r => (
            <div key={r.id} className="card-base">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <r.icon className="w-5 h-5"/>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-white text-sm">{r.label}</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5 leading-snug">{r.desc}</p>
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-2 pt-3 border-t border-[#1E2D4A]">
                {r.formatos.map(f => {
                  const key = `${r.id}-${f.tipo}`;
                  const isDownloading = downloading === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleDownload(r, f)}
                      disabled={isDownloading}
                      className="px-2.5 py-1 rounded-lg bg-[#1A2540] border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-1.5 hover:bg-cyan-500/10 disabled:opacity-50 transition-all"
                    >
                      {isDownloading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Download className="w-3 h-3"/>}
                      {f.tipo}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Banner IA */}
        <div className="card-base bg-gradient-to-br from-purple-500/5 to-cyan-500/5 border-purple-500/20">
          <h3 className="font-display font-semibold text-cyan-400 flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4"/> Reporte ejecutivo con IA
          </h3>
          <p className="text-sm text-[#94A3B8] leading-relaxed mb-3">
            Los Dashboards Ejecutivos generan resúmenes inteligentes automáticos (Claude IA + heurístico) con riesgos, recomendaciones y oportunidades.
          </p>
          <div className="flex gap-2">
            <a href="/indicadores/ejecutivo" className="px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-medium flex items-center gap-1.5 hover:bg-purple-500/25">
              <ExternalLink className="w-3 h-3"/> Dashboard Cronograma
            </a>
            <a href="/rutas/ejecutivo" className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-medium flex items-center gap-1.5 hover:bg-cyan-500/25">
              <ExternalLink className="w-3 h-3"/> Dashboard Rutas
            </a>
          </div>
        </div>

        {/* Historial de descargas */}
        {history.length > 0 && (
          <div className="card-base p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1E2D4A] flex items-center justify-between">
              <h3 className="font-display font-bold text-white text-sm">Historial de descargas (sesión actual)</h3>
              <button onClick={() => setHistory([])} className="text-xs text-[#94A3B8] hover:text-white">Limpiar</button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[#475569] border-b border-[#1E2D4A]">
                  <th className="text-left p-2 pl-4">Hora</th>
                  <th className="text-left p-2">Reporte</th>
                  <th className="text-left p-2">Formato</th>
                  <th className="text-left p-2">Archivo</th>
                  <th className="text-right p-2">Tamaño</th>
                  <th className="text-center p-2 w-16">Estado</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} className="border-b border-[#1E2D4A]/30">
                    <td className="p-2 pl-4 text-[#94A3B8] text-xs font-mono">{new Date(h.timestamp).toLocaleTimeString("es-CO")}</td>
                    <td className="p-2 text-white text-xs">{h.reporte}</td>
                    <td className="p-2 text-[#94A3B8] text-xs">{h.formato}</td>
                    <td className="p-2 text-[#94A3B8] text-xs font-mono truncate max-w-xs">{h.filename}</td>
                    <td className="p-2 text-right text-[#94A3B8] text-xs font-mono">{h.size > 0 ? `${(h.size / 1024).toFixed(1)} KB` : "—"}</td>
                    <td className="p-2 text-center">
                      {h.status === "ok"
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto"/>
                        : <AlertTriangle className="w-3.5 h-3.5 text-red-400 mx-auto"/>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
