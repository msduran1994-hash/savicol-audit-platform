"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// HOJA INVENTARIOS · Dashboard (Fase 2 = landing de módulos · ejecutivo en Fase 6)
// ═══════════════════════════════════════════════════════════════════════════════
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { INVENTARIO_MODULOS, type ModuloInventario } from "@/lib/inventarios.constants";
import {
  Package, Container, Boxes, Wrench, Building2, Layers, ArrowRight, BarChart3,
} from "lucide-react";

const ICONO: Record<ModuloInventario, any> = {
  PRODUCTO: Package, TINAS: Container, INSUMOS: Boxes,
  MANTENIMIENTO: Wrench, ACTIVOS: Building2, OTROS: Layers,
};

export default function DashboardInventariosPage() {
  return (
    <div>
      <Header title="Dashboard Inventarios" subtitle="Hoja Inventarios · Centraliza la auditoría de inventarios" />

      <div className="flex-1 p-6 space-y-6">
        {/* Acceso a los módulos */}
        <div>
          <h2 className="text-sm font-bold text-white mb-3">Módulos de inventario</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {INVENTARIO_MODULOS.map(m => {
              const Icon = ICONO[m.key];
              return (
                <Link key={m.key} href={m.href}
                      className="card-base group flex items-start gap-3 hover:border-violet-500/40 transition-colors">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                       style={{ background: "rgba(139,92,246,0.12)", color: "#8B5CF6" }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold text-sm leading-tight">{m.label}</p>
                    <p className="text-[#94A3B8] text-xs mt-0.5">{m.descripcion}</p>
                    <p className="text-[10px] text-[#475569] font-mono mt-1">INV-{m.prefijo}-{new Date().getFullYear()}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#475569] group-hover:text-violet-400 transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Dashboard ejecutivo (Fase 6) */}
        <div className="card-base p-8 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
               style={{ background: "rgba(139,92,246,0.12)", color: "#8B5CF6" }}>
            <BarChart3 className="w-7 h-7" />
          </div>
          <p className="text-white font-semibold text-lg mb-1">Dashboard Ejecutivo consolidado</p>
          <p className="text-[#94A3B8] text-sm max-w-lg">
            Los indicadores (total inventarios, diferencias, cumplimiento, hallazgos, riesgos, alertas)
            y las gráficas consolidadas de los 7 módulos se incorporan en la fase de dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
