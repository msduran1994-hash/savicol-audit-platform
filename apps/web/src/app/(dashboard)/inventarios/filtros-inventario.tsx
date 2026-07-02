"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// HOJA INVENTARIOS · Barra de filtros globales (Fase 7) — compartida dashboard/módulos
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from "react";
import { useInventariosFiltros, contarFiltrosActivos } from "@/store/inventarios-filtros.store";
import { INVENTARIO_MODULOS, ESTADO_INVENTARIO, moduloLabel } from "@/lib/inventarios.constants";
import { useCedis } from "@/hooks/useCedis";
import { useGranjas } from "@/hooks/useGranjas";
import { AUDITORS } from "@/lib/constants";
import { Filter, X } from "lucide-react";

export function InventariosFiltros({ showModulo = false, categorias = [], responsables = [], rightSlot }: {
  showModulo?: boolean; categorias?: string[]; responsables?: string[]; rightSlot?: React.ReactNode;
}) {
  const { filtros: f, setFiltro, reset } = useInventariosFiltros();
  const [open, setOpen] = useState(false);
  const cedis = (useCedis().data ?? []) as any[];
  const granjas = (useGranjas().data ?? []) as any[];
  const activos = contarFiltrosActivos(f, !showModulo);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => setOpen(o => !o)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white flex items-center gap-1.5 hover:bg-[#1A2540]">
          <Filter className="w-3.5 h-3.5" />Filtros globales{activos > 0 && <span className="bg-violet-500 text-white rounded-full px-1.5 text-[10px] font-bold">{activos}</span>}
        </button>
        {activos > 0 && (
          <button onClick={reset} className="text-xs text-[#94A3B8] hover:text-white flex items-center gap-1"><X className="w-3 h-3" />Limpiar</button>
        )}
        <span className="text-[10px] text-[#475569]">Sincronizados: dashboard + módulos</span>
        {rightSlot && <div className="ml-auto">{rightSlot}</div>}
      </div>

      {open && (
        <div className="card-base p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {showModulo && (
              <FSel label="Tipo de inventario" value={f.modulo} onChange={v => setFiltro("modulo", v)}
                    opts={INVENTARIO_MODULOS.map(m => ({ v: m.key, l: moduloLabel(m.key) }))} />
            )}
            <FSel label="Estado" value={f.estado} onChange={v => setFiltro("estado", v)} opts={ESTADO_INVENTARIO.map(e => ({ v: e, l: e }))} />
            <FSel label="Categoría" value={f.categoria} onChange={v => setFiltro("categoria", v)} opts={categorias.map(c => ({ v: c, l: c }))} />
            <FSel label="Auditor" value={f.auditor} onChange={v => setFiltro("auditor", v)} opts={AUDITORS.map(a => ({ v: a.name, l: a.name }))} />
            <FSel label="Responsable" value={f.responsable} onChange={v => setFiltro("responsable", v)} opts={responsables.map(r => ({ v: r, l: r }))} />
            <FSel label="CEDI" value={f.cediId} onChange={v => setFiltro("cediId", v)} opts={cedis.map(c => ({ v: c.id, l: c.nombre }))} />
            <FSel label="Granja" value={f.granjaId} onChange={v => setFiltro("granjaId", v)} opts={granjas.map(g => ({ v: g.id, l: g.nombre }))} />
            <div>
              <label className="text-[10px] text-[#94A3B8] mb-1 block">Fecha desde</label>
              <input type="date" value={f.fechaDesde} onChange={e => setFiltro("fechaDesde", e.target.value)} className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label className="text-[10px] text-[#94A3B8] mb-1 block">Fecha hasta</label>
              <input type="date" value={f.fechaHasta} onChange={e => setFiltro("fechaHasta", e.target.value)} className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FSel({ label, value, onChange, opts }: {
  label: string; value: string; onChange: (v: string) => void; opts: { v: string; l: string }[];
}) {
  return (
    <div>
      <label className="text-[10px] text-[#94A3B8] mb-1 block">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white">
        <option value="">Todos</option>
        {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
