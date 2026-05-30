"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Save } from "lucide-react";
import { useAuditStore, type AuditActivity } from "@/store/audit.store";
import { AUDITORS, AUDIT_AREAS, AUDIT_STATUS, ACTIVITY_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const schema = z.object({
  area:         z.string().min(1, "Requerido"),
  auditorId:    z.string().min(1, "Requerido"),
  activity:     z.string().min(3, "Mínimo 3 caracteres"),
  activityType: z.string().min(1, "Requerido"),
  startDate:    z.string().min(1, "Requerido"),
  endDate:      z.string().min(1, "Requerido"),
  status:       z.enum(["COMPLETED","IN_PROGRESS","NOT_STARTED","OVERDUE"]),
  notes:        z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props { activity: AuditActivity | null; onClose: () => void; }

export function ActivityModal({ activity, onClose }: Props) {
  const { activities, addActivity, updateActivity } = useAuditStore();
  const isEdit = !!activity;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: activity ? {
      area: activity.area, auditorId: activity.auditorId,
      activity: activity.activity, activityType: activity.activityType,
      startDate: activity.startDate, endDate: activity.endDate,
      status: activity.status, notes: activity.notes ?? "",
    } : { status: "NOT_STARTED", activityType: ACTIVITY_TYPES[0] },
  });

  useEffect(() => { if (!activity) reset({ status: "NOT_STARTED" }); }, [activity, reset]);

  const onSubmit = (data: FormValues) => {
    const auditor = AUDITORS.find(a => a.id === data.auditorId)!;
    const now = new Date().toISOString();
    if (isEdit) {
      updateActivity(activity!.id, { ...data, auditorName: auditor.name, updatedAt: now });
    } else {
      addActivity({
        id: `act_${Date.now()}`,
        item: activities.length + 1,
        auditorName: auditor.name,
        createdAt: now, updatedAt: now,
        ...data,
      } as AuditActivity);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#0D1526] rounded-2xl border border-[#1E2D4A] shadow-card animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <h2 className="font-display font-bold text-white">
            {isEdit ? "Editar Actividad" : "Nueva Actividad"}
          </h2>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Area */}
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-[#94A3B8]">Área / Proceso *</label>
              <select {...register("area")} className={cn("input-base", errors.area && "border-red-500")}>
                <option value="">Seleccionar área...</option>
                {AUDIT_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              {errors.area && <p className="text-xs text-red-400">{errors.area.message}</p>}
            </div>

            {/* Auditor */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#94A3B8]">Responsable / Auditor *</label>
              <select {...register("auditorId")} className={cn("input-base", errors.auditorId && "border-red-500")}>
                <option value="">Seleccionar auditor...</option>
                {AUDITORS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {errors.auditorId && <p className="text-xs text-red-400">{errors.auditorId.message}</p>}
            </div>

            {/* Activity type */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#94A3B8]">Tipo de Actividad *</label>
              <select {...register("activityType")} className={cn("input-base", errors.activityType && "border-red-500")}>
                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Activity description */}
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-[#94A3B8]">Actividad Planificada *</label>
              <input {...register("activity")} placeholder="Descripción de la actividad..."
                className={cn("input-base", errors.activity && "border-red-500")} />
              {errors.activity && <p className="text-xs text-red-400">{errors.activity.message}</p>}
            </div>

            {/* Dates */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#94A3B8]">Fecha Inicio *</label>
              <input {...register("startDate")} type="date" className="input-base" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#94A3B8]">Fecha Finalización *</label>
              <input {...register("endDate")} type="date" className="input-base" />
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#94A3B8]">Estado *</label>
              <select {...register("status")} className="input-base">
                {Object.values(AUDIT_STATUS).map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#94A3B8]">Observaciones</label>
              <input {...register("notes")} placeholder="Opcional..." className="input-base" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1E2D4A] mt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              {isEdit ? "Guardar Cambios" : "Crear Actividad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
