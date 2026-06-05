"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// NotificationBell · campana del header con badge y dropdown
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useRef, useEffect } from "react";
import {
  Bell, CheckCheck, X, AlertCircle, CheckCircle2, AlertTriangle, Info,
  Trash2, Loader2,
} from "lucide-react";
import {
  useNotifications, useNotificationsCount,
  useMarkRead, useMarkAllRead, useDeleteNotification,
  type NotificationItem,
} from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const SEVERITY_ICON: Record<string, any> = {
  INFO: Info, SUCCESS: CheckCircle2, WARNING: AlertTriangle, CRITICAL: AlertCircle,
};
const SEVERITY_COLOR: Record<string, string> = {
  INFO: "#3B82F6", SUCCESS: "#10B981", WARNING: "#F59E0B", CRITICAL: "#EF4444",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: countData } = useNotificationsCount();
  const { data: items = [], isLoading } = useNotifications({ limit: 30 });
  const markRead    = useMarkRead();
  const markAllRead = useMarkAllRead();
  const remove      = useDeleteNotification();

  const count = countData?.count ?? 0;

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const visible: NotificationItem[] = items.slice(0, 30);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 rounded-lg bg-[#0D1526] border border-[#1E2D4A] flex items-center justify-center text-[#94A3B8] hover:text-white hover:border-[#2A3F6A] transition-colors"
        title={`${count} notificaciones sin leer`}
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-[10px] text-[#0A111F] font-bold flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-[#0D1526] border border-[#1E2D4A] rounded-xl shadow-2xl overflow-hidden z-50">
          <header className="flex items-center justify-between px-4 py-3 border-b border-[#1E2D4A]">
            <div>
              <p className="font-display font-bold text-white text-sm">Notificaciones</p>
              <p className="text-[10px] text-[#94A3B8] mt-0.5">
                {count > 0 ? `${count} sin leer · ${visible.length} totales` : "Todas leídas"}
              </p>
            </div>
            <div className="flex gap-1">
              {count > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  className="p-1.5 rounded-lg hover:bg-[#1A2540] text-[#94A3B8] hover:text-emerald-400 disabled:opacity-50"
                  title="Marcar todas como leídas"
                >
                  {markAllRead.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCheck className="w-4 h-4"/>}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-[#1A2540] text-[#94A3B8] hover:text-white">
                <X className="w-4 h-4"/>
              </button>
            </div>
          </header>

          <div className="max-h-[480px] overflow-y-auto">
            {isLoading ? (
              <div className="py-10 text-center text-[#475569]">
                <Loader2 className="w-5 h-5 animate-spin mx-auto"/>
              </div>
            ) : visible.length === 0 ? (
              <div className="py-12 text-center text-[#475569]">
                <Bell className="w-8 h-8 mx-auto mb-3 opacity-30"/>
                <p className="text-xs">Sin notificaciones</p>
              </div>
            ) : (
              visible.map(n => {
                const Icon = SEVERITY_ICON[n.severity] ?? Info;
                const color = SEVERITY_COLOR[n.severity] ?? "#3B82F6";
                const unread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "px-4 py-3 border-b border-[#1E2D4A]/40 hover:bg-[#1A2540] transition-colors cursor-pointer group",
                      unread && "bg-[#0F1A2E]"
                    )}
                    onClick={() => { if (unread) markRead.mutate(n.id); }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>
                        <Icon className="w-4 h-4"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={cn("text-xs font-semibold truncate", unread ? "text-white" : "text-[#94A3B8]")}>
                            {n.title}
                          </p>
                          {unread && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"/>}
                        </div>
                        <p className="text-[11px] text-[#94A3B8] leading-snug">{n.message}</p>
                        <p className="text-[10px] text-[#475569] mt-1">
                          {new Date(n.createdAt).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); remove.mutate(n.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#475569] hover:text-red-400 transition-opacity"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3 h-3"/>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {visible.length > 0 && (
            <footer className="px-4 py-2 border-t border-[#1E2D4A] bg-[#0A111F]">
              <p className="text-[10px] text-[#475569] text-center">
                Click en una notificación para marcarla como leída
              </p>
            </footer>
          )}
        </div>
      )}
    </div>
  );
}
