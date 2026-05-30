"use client";
import { Header } from "@/components/layout/header";
import {
  Files, Upload, FileText, FileSpreadsheet, FileImage,
  Sparkles, Search, Filter, FolderOpen,
} from "lucide-react";

const TIPOS = [
  { tipo: "PDF",    icon: FileText,        color: "#EF4444", desc: "Informes, contratos, certificados" },
  { tipo: "Excel",  icon: FileSpreadsheet, color: "#10B981", desc: "Inventarios, registros operativos" },
  { tipo: "Word",   icon: FileText,        color: "#3B82F6", desc: "Actas, procedimientos" },
  { tipo: "CSV",    icon: FileSpreadsheet, color: "#06B6D4", desc: "Importación de datos masivos" },
  { tipo: "Imagen", icon: FileImage,       color: "#8B5CF6", desc: "Fotos, evidencias visuales" },
];

const CATEGORIAS = [
  "Contratos", "Licencias", "Certificaciones", "Inventarios",
  "Actas de visita", "Informes técnicos", "Fotos de evidencia",
  "Manuales operativos", "Registros sanitarios", "Documentos legales",
];

export default function DocumentosPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Gestión Documental"
        subtitle="Repositorio centralizado · OCR IA · indexación inteligente · vinculación por granja"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Toolbar */}
        <div className="card-base p-3 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]"/>
            <input placeholder="Buscar documento por nombre, contenido OCR, granja..." className="w-full pl-10 pr-3 py-2 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-amber-500/40"/>
          </div>
          <select className="px-3 py-2 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="px-3 py-2 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todos los tipos</option>
            {TIPOS.map(t => <option key={t.tipo}>{t.tipo}</option>)}
          </select>
          <button className="btn-primary text-xs ml-auto"><Upload className="w-3.5 h-3.5"/>Cargar documento</button>
        </div>

        {/* Tipos soportados */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {TIPOS.map(t => (
            <div key={t.tipo} className="card-base text-center">
              <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: `${t.color}18`, color: t.color }}>
                <t.icon className="w-5 h-5"/>
              </div>
              <p className="font-display text-2xl font-bold text-white">0</p>
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider mt-1">{t.tipo}</p>
              <p className="text-[9px] text-[#475569] mt-1 leading-tight">{t.desc}</p>
            </div>
          ))}
        </div>

        {/* Empty state */}
        <div className="card-base flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="w-10 h-10 text-[#1E2D4A] mb-4"/>
          <p className="text-white font-semibold mb-2">Sin documentos cargados</p>
          <p className="text-[#475569] text-sm max-w-md mb-4">
            Carga documentos relacionados con cada granja. El OCR IA extraerá el contenido automáticamente
            para hacerlo buscable. (Funcionalidad activa al conectar storage)
          </p>
          <button disabled className="btn-secondary text-xs opacity-60 cursor-not-allowed">
            <Upload className="w-3.5 h-3.5"/> Cargar primer documento
          </button>
        </div>

        {/* OCR IA */}
        <div className="card-base bg-gradient-to-br from-[#0D1526] to-[#1A1208] border-amber-900/30">
          <h3 className="font-display font-semibold text-amber-400 flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4"/> OCR IA — Indexación Inteligente
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#94A3B8] mb-2 font-semibold">Capacidades</p>
              <ul className="text-[#94A3B8] space-y-1 list-disc list-inside text-xs">
                <li>Extracción de texto de PDFs escaneados</li>
                <li>Reconocimiento de tablas en Excel</li>
                <li>Análisis de imágenes con datos críticos</li>
                <li>Detección automática de fechas, números y nombres</li>
                <li>Vinculación automática con granja correspondiente</li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[#94A3B8] mb-2 font-semibold">Categorías sugeridas</p>
              <div className="flex flex-wrap gap-1">
                {CATEGORIAS.map(c => (
                  <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8]">{c}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Almacenamiento */}
        <div className="card-base bg-red-500/5 border-red-500/20">
          <h3 className="text-red-400 font-semibold text-sm mb-2 flex items-center gap-2">
            <Files className="w-4 h-4"/> Almacenamiento (Filesystem · solo desarrollo)
          </h3>
          <p className="text-xs text-[#94A3B8]">
            Los archivos se guardan en <code className="text-[10px] px-1.5 py-0.5 rounded bg-[#0D1526] border border-[#2A3F6A]">apps/api/uploads/</code> durante desarrollo.
            <strong className="text-amber-400"> No es apto para producción.</strong> Para producción debe migrarse a Supabase Storage, S3 o equivalente.
          </p>
        </div>
      </div>
    </div>
  );
}
