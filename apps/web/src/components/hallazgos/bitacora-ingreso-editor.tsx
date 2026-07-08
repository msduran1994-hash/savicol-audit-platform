"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// EDITOR · Bitácora de Ingreso a la Granja — tabla dinámica (fecha + responsable).
// Componente a nivel de módulo (identidad estable) para no perder el foco al editar.
// ═══════════════════════════════════════════════════════════════════════════════
import { Plus, Trash2 } from "lucide-react";
import type { BitacoraIngresoRow } from "@/lib/anexos-tecnicos";

const INP = "w-full px-2 py-1 bg-[#0A111F] border border-[#1E2D4A] rounded text-xs text-white focus:outline-none focus:border-[#4A7AFF]";

export function BitacoraIngresoEditor({ value, onChange }: { value: BitacoraIngresoRow[]; onChange: (rows: BitacoraIngresoRow[]) => void }) {
  const rows = value || [];
  const add = () => onChange([...rows, { fecha: "", responsable: "" }]);
  const edit = (i: number, patch: Partial<BitacoraIngresoRow>) => onChange(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const del = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-[#1E2D4A]">
        <table className="w-full text-xs">
          <thead><tr className="bg-[#0A111F] text-[#94A3B8]">
            <th className="px-2 py-1.5 text-left font-semibold">Fecha de visita</th>
            <th className="px-2 py-1.5 text-left font-semibold">Nombre del responsable</th>
            <th className="w-8"></th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={3} className="px-2 py-3 text-center text-[#475569]">Sin registros. Usa "Agregar ingreso".</td></tr>}
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-[#1E2D4A]">
                <td className="px-2 py-1"><input type="date" value={r.fecha ?? ""} onChange={e => edit(i, { fecha: e.target.value })} className={INP} /></td>
                <td className="px-2 py-1"><input value={r.responsable ?? ""} onChange={e => edit(i, { responsable: e.target.value })} placeholder="Nombre del responsable" className={INP} /></td>
                <td className="px-1 text-center"><button type="button" onClick={() => del(i)} className="text-[#94A3B8] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={add} className="mt-2 px-3 py-1.5 rounded-lg text-xs bg-[#1A2540] text-white flex items-center gap-1.5 hover:bg-[#22304d]"><Plus className="w-3.5 h-3.5" />Agregar ingreso</button>
    </div>
  );
}
