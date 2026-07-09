"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// PANEL · Resumen Ejecutivo automático (solo lectura) al final de cada pestaña de
// Anexos Técnicos. Renderiza el análisis DETERMINISTA generado en lib/anexos-tecnicos.
// Sin inputs → identidad estable; no afecta el foco de las tablas.
// ═══════════════════════════════════════════════════════════════════════════════
import type { ResumenEjecutivo } from "@/lib/anexos-tecnicos";

export function ResumenEjecutivoPanel({ resumen }: { resumen: ResumenEjecutivo | null }) {
  if (!resumen) return null;
  return (
    <div className="rounded-lg border border-[#2A3F6A] bg-gradient-to-br from-[#0D1526] to-[#0A111F] p-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-4 rounded bg-[#4A7AFF]" />
        <span className="text-[12px] font-bold text-white">{resumen.titulo}</span>
        <span className="text-[9px] text-[#475569] ml-auto uppercase tracking-wider">Automático · basado en tus datos</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {resumen.metricas.map((m, i) => (
          <div key={i} className="bg-[#0A111F] border border-[#1E2D4A] rounded-lg p-2 text-center">
            <div className="text-sm font-bold" style={{ color: m.color || "#E2E8F0" }}>{m.valor}</div>
            <div className="text-[9px] text-[#94A3B8] mt-0.5 uppercase tracking-wide">{m.label}</div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {resumen.secciones.map((s, i) => (
          <div key={i}>
            <div className="text-[10px] font-semibold text-[#4A7AFF] uppercase tracking-wide mb-1">{s.titulo}</div>
            <ul className="space-y-1">
              {s.lineas.map((l, j) => (
                <li key={j} className="text-[11px] text-[#CBD5E1] leading-relaxed flex gap-1.5">
                  <span className="text-[#475569] shrink-0">•</span><span>{l}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
