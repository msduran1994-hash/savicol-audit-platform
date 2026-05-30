"use client";
import { Header } from "@/components/layout/header";
import { Camera, Upload, FileText, Image as ImageIcon, Video, FileSpreadsheet, Sparkles, Search, Filter, FolderOpen, Cloud } from "lucide-react";

const TIPOS = [
  { tipo: "Foto",  icon: ImageIcon,       color: "#3B82F6", desc: "Evidencia visual del acompañamiento" },
  { tipo: "PDF",   icon: FileText,        color: "#EF4444", desc: "Actas, certificados, reportes" },
  { tipo: "Excel", icon: FileSpreadsheet, color: "#10B981", desc: "Inventarios, pesajes, datos" },
  { tipo: "Video", icon: Video,           color: "#8B5CF6", desc: "Grabaciones de la inspección" },
  { tipo: "Otro",  icon: FolderOpen,      color: "#94A3B8", desc: "Otros documentos" },
];

const CATEGORIAS = [
  "Acta de devolución", "Foto del producto", "Temperatura cadena de frío",
  "Empaque dañado", "Pesaje", "Factura", "Termógrafo",
  "Carta cliente", "Foto vehículo", "Otros",
];

export default function EvidenciasRutasPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Evidencias · Acompañamientos"
        subtitle="Repositorio multimedia · OCR IA · vinculación automática por acompañamiento"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Toolbar */}
        <div className="card-base p-3 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]"/>
            <input placeholder="Buscar por nombre, contenido OCR, acompañamiento..." className="w-full pl-10 pr-3 py-2 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-cyan-500/40"/>
          </div>
          <select className="px-3 py-2 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="px-3 py-2 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todos los tipos</option>
            {TIPOS.map(t => <option key={t.tipo}>{t.tipo}</option>)}
          </select>
          <button className="btn-primary text-xs ml-auto"><Upload className="w-3.5 h-3.5"/>Cargar evidencia</button>
        </div>

        {/* Tipos */}
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

        {/* Drag & drop area */}
        <div className="card-base border-2 border-dashed border-[#1E2D4A] hover:border-cyan-500/40 transition-colors py-12 text-center cursor-pointer">
          <Upload className="w-10 h-10 text-[#1E2D4A] mx-auto mb-4"/>
          <p className="text-white font-semibold mb-1">Arrastra archivos aquí o click para seleccionar</p>
          <p className="text-[#475569] text-sm">Compresión automática · OCR IA · Categorización inteligente</p>
        </div>

        {/* OCR IA */}
        <div className="card-base bg-gradient-to-br from-[#0D1526] to-[#082F36] border-cyan-900/30">
          <h3 className="font-display font-semibold text-cyan-400 flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4"/> OCR IA + Categorización Inteligente
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#94A3B8] mb-2 font-semibold">Capacidades activas</p>
              <ul className="text-[#94A3B8] space-y-1 list-disc list-inside text-xs">
                <li>Extracción de texto de fotografías de actas y facturas</li>
                <li>Lectura automática de datos de termógrafos</li>
                <li>Detección automática de placas de vehículo</li>
                <li>Categorización por similitud con tipo de evidencia</li>
                <li>Vista previa inline de imágenes y PDFs</li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[#94A3B8] mb-2 font-semibold">Categorías disponibles</p>
              <div className="flex flex-wrap gap-1">
                {CATEGORIAS.map(c => (
                  <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8]">{c}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Storage */}
        <div className="card-base bg-red-500/5 border-red-500/20">
          <h3 className="text-red-400 font-semibold text-sm mb-2 flex items-center gap-2">
            <Cloud className="w-4 h-4"/> Almacenamiento (filesystem · solo desarrollo)
          </h3>
          <p className="text-xs text-[#94A3B8]">
            Las evidencias se guardan en <code className="text-[10px] px-1.5 py-0.5 rounded bg-[#0D1526] border border-[#2A3F6A]">apps/api/uploads/rutas/</code> durante desarrollo.
            <strong className="text-amber-400"> No es apto para producción.</strong> En producción se migrará a Supabase Storage o Google Drive API
            con compresión automática, enlaces externos y vista previa.
          </p>
        </div>
      </div>
    </div>
  );
}
