"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { AuditTable } from "@/components/cronograma/audit-table";
import { AuditFilters } from "@/components/cronograma/audit-filters";
import { ActivityModal } from "@/components/cronograma/activity-modal";
import { useAuditStore, selectFilteredActivities, type AuditActivity } from "@/store/audit.store";
import { useShallow } from "zustand/react/shallow";
import { Plus, Download, Upload, RefreshCw } from "lucide-react";
import { calculateCompletionRate } from "@/lib/utils";
import { Can, usePermiso } from "@/components/system/can";

export default function CronogramaPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<AuditActivity | null>(null);

  const activities   = useAuditStore(useShallow((s) => s.activities));
  const filtered     = useAuditStore(useShallow(selectFilteredActivities));
  const resetFilters = useAuditStore((s) => s.resetFilters);
  const rate         = calculateCompletionRate(activities);
  const { puede }    = usePermiso();
  // Caso especial Cronograma 2026: el Auditor puede crear actividades pero NO
  // cambiar estados (eso es exclusivo de Admin y Supervisor).
  const puedeEditarEstados = puede("cambiarEstados");

  function openCreate() { setEditingActivity(null); setModalOpen(true); }
  function openEdit(a: AuditActivity) { setEditingActivity(a); setModalOpen(true); }

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Cronograma Anual 2026"
        subtitle={`${activities.length} actividades · ${rate}% completado · ${filtered.length} visibles`}
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <AuditFilters />
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={resetFilters}
              className="btn-ghost text-xs"
              title="Limpiar filtros"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Limpiar
            </button>
            <button
              className="btn-secondary text-xs"
              title="Exportar (próximamente)"
              disabled
            >
              <Download className="w-3.5 h-3.5" /> Exportar
            </button>
            <button
              className="btn-secondary text-xs"
              title="Importar desde Excel (próximamente)"
              disabled
            >
              <Upload className="w-3.5 h-3.5" /> Importar
            </button>
            <Can permiso="crear">
              <button onClick={openCreate} className="btn-primary text-xs">
                <Plus className="w-3.5 h-3.5" /> Nueva Actividad
              </button>
            </Can>
          </div>
        </div>

        {/* Table */}
        <AuditTable activities={filtered} onEdit={puedeEditarEstados ? openEdit : undefined} canEditStatus={puedeEditarEstados} />
      </div>

      {/* Modal */}
      {modalOpen && (
        <ActivityModal
          activity={editingActivity}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
