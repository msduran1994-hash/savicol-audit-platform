"use client";
import { Header } from "@/components/layout/header";
import { useGranjasStore } from "@/store/granjas.store";
import { useShallow } from "zustand/react/shallow";
import { CATEGORIA_INVENTARIO, ESTADO_INVENTARIO } from "@/lib/granjas.constants";
import { Package, Plus, AlertTriangle, Filter, TrendingDown, Calendar } from "lucide-react";

export default function InventarioPage() {
  const items = useGranjasStore(useShallow((s) => s.inventario));

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Inventario General"
        subtitle={`${items.length} ítems · alimentos · insumos · medicamentos · equipos · bioseguridad`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Toolbar */}
        <div className="card-base p-3 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-[#94A3B8] flex items-center gap-1.5"><Filter className="w-3.5 h-3.5"/></span>
          <select className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todas las categorías</option>
            {CATEGORIA_INVENTARIO.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todos los estados</option>
            {ESTADO_INVENTARIO.map(e => <option key={e}>{e}</option>)}
          </select>
          <button className="btn-primary text-xs ml-auto"><Plus className="w-3.5 h-3.5"/>Nuevo Ítem</button>
        </div>

        {/* Cards por categoría */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIA_INVENTARIO.map(cat => {
            const count = items.filter(i => i.categoria === cat).length;
            return (
              <div key={cat} className="card-base text-center">
                <Package className="w-5 h-5 text-amber-400 mx-auto mb-2"/>
                <p className="font-display text-2xl font-bold text-white">{count}</p>
                <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider mt-1">{cat}</p>
              </div>
            );
          })}
        </div>

        {/* Alertas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <AlertCard icon={<TrendingDown className="w-5 h-5"/>} count={0} label="Stock Bajo"   color="#F59E0B" />
          <AlertCard icon={<AlertTriangle className="w-5 h-5"/>} count={0} label="Agotados"     color="#EF4444" />
          <AlertCard icon={<Calendar className="w-5 h-5"/>}      count={0} label="Por Vencer"   color="#06B6D4" />
        </div>

        {/* Empty state */}
        <div className="card-base flex flex-col items-center justify-center py-16 text-center">
          <Package className="w-10 h-10 text-[#1E2D4A] mb-4"/>
          <p className="text-white font-semibold mb-2">Sin inventario registrado</p>
          <p className="text-[#475569] text-sm max-w-md">
            El inventario se carga por granja. Click en "Nuevo Ítem" para agregar productos.
            Cuando esté disponible la conexión con la DB, podrá importarse desde Excel.
          </p>
        </div>

        {/* Trazabilidad */}
        <div className="card-base bg-blue-500/5 border-blue-500/20">
          <h3 className="text-blue-400 font-semibold mb-2">Funcionalidades preparadas</h3>
          <ul className="text-xs text-[#94A3B8] space-y-1 list-disc list-inside">
            <li>Alertas automáticas de stock bajo y vencimientos próximos</li>
            <li>Trazabilidad de movimientos (entradas, salidas, ajustes)</li>
            <li>Diferencias de inventario físico vs sistema</li>
            <li>Importación masiva desde Excel (cuando se active la DB)</li>
            <li>Filtros multi-criterio: granja, categoría, estado, fecha</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function AlertCard({ icon, count, label, color }: { icon: React.ReactNode; count: number; label: string; color: string }) {
  return (
    <div className="card-base flex items-center gap-3" style={{ borderColor: `${color}30` }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div>
        <p className="font-display text-2xl font-bold" style={{ color }}>{count}</p>
        <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
