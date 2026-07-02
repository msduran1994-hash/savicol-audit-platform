"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// HOJA INVENTARIOS · Vista genérica de módulo (motor reutilizado por los 6 módulos)
// Fase 2 = backbone (encabezado + resumen + estado "listo"). El formulario, la
// tabla, los filtros y el kardex se incorporan en las fases siguientes.
// ═══════════════════════════════════════════════════════════════════════════════
import { Header } from "@/components/layout/header";
import { moduloByKey, type ModuloInventario } from "@/lib/inventarios.constants";
import { useInventarios } from "@/hooks/useInventarios";
import { Boxes, Hash, Layers, Loader2 } from "lucide-react";

export function ModuloInventarioView({ modulo }: { modulo: ModuloInventario }) {
  const def = moduloByKey(modulo);
  const q = useInventarios({ modulo });
  const rows = q.data ?? [];
  const year = new Date().getFullYear();

  if (!def) return null;

  return (
    <div>
      <Header title={def.label} subtitle={`Hoja Inventarios · ${def.descripcion}`} />

      <div className="flex-1 p-6 space-y-6">
        {/* Resumen ligero */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniCard icon={<Boxes className="w-4 h-4" />}  label="Registros"    value={q.isLoading ? "…" : String(rows.length)} color="#8B5CF6" />
          <MiniCard icon={<Layers className="w-4 h-4" />} label="Módulo"        value={modulo}                                  color="#06B6D4" />
          <MiniCard icon={<Hash className="w-4 h-4" />}   label="Consecutivo"   value={`INV-${def.prefijo}-${year}`}            color="#F59E0B" />
          <MiniCard icon={<Boxes className="w-4 h-4" />}  label="Estado módulo" value="Listo"                                   color="#10B981" />
        </div>

        {/* Estado de preparación (Fase 2) */}
        <div className="card-base p-10 flex flex-col items-center justify-center text-center">
          {q.isLoading ? (
            <Loader2 className="w-8 h-8 text-[#8B5CF6] animate-spin mb-4" />
          ) : (
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                 style={{ background: "rgba(139,92,246,0.12)", color: "#8B5CF6" }}>
              <Boxes className="w-7 h-7" />
            </div>
          )}
          <p className="text-white font-semibold text-lg mb-1">{def.label}</p>
          <p className="text-[#94A3B8] text-sm max-w-md mb-2">{def.descripcion}</p>
          <p className="text-[#475569] text-xs max-w-md">
            Módulo creado y conectado a la base de datos (folio automático
            <span className="text-[#94A3B8] font-mono"> INV-{def.prefijo}-{year}-0001</span>).
            El formulario de registro, la tabla, los filtros y el kardex de movimientos
            se habilitan en las siguientes fases.
          </p>
        </div>
      </div>
    </div>
  );
}

function MiniCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="card-base flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="min-w-0">
        <p className="font-display text-base font-bold text-white leading-tight truncate">{value}</p>
        <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
