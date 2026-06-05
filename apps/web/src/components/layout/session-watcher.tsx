"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// SessionWatcher · monta useIdleTimeout + modal de advertencia + force logout
// ═══════════════════════════════════════════════════════════════════════════════
// Se inserta UNA SOLA VEZ en el dashboard layout. Responsabilidades:
//  1. Aplicar política de timeout según rol del usuario actual
//  2. Mostrar modal de advertencia X minutos antes de cerrar sesión
//  3. Forzar logout vía /auth/logout?reason=idle_timeout y redirect a /login
//  4. Permitir al usuario "Continuar sesión" desde el modal
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useCallback } from "react";
import { Shield, Clock, AlertTriangle, LogOut, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { getPolicy, hasIdleTimeout } from "@/lib/session-policy";

export function SessionWatcher() {
  const { user, logout } = useAuthStore();
  const [showWarning, setShowWarning] = useState(false);

  const policy = getPolicy(user?.role);
  const enabled = !!user && hasIdleTimeout(policy);
  const warningMs = policy.warningMinutes * 60_000;
  const timeoutMs = policy.timeoutMinutes * 60_000;

  const doLogout = useCallback(async (reason: "idle_timeout" | "manual") => {
    try {
      // Notifica al backend para registrar el cierre en audit-logs
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      await fetch(`${apiUrl}/api/v1/auth/logout?reason=${reason}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(useAuthStore.getState().accessToken
            ? { Authorization: `Bearer ${useAuthStore.getState().accessToken}` }
            : {}),
        },
      });
    } catch { /* no bloqueamos el redirect */ }
    logout();
    if (typeof window !== "undefined") {
      const params = reason === "idle_timeout" ? "?reason=idle_timeout" : "";
      window.location.href = `/login${params}`;
    }
  }, [logout]);

  const { isWarning, msUntilTimeout, reset } = useIdleTimeout({
    warningMs,
    timeoutMs,
    enabled,
    onWarning: () => setShowWarning(true),
    onTimeout: () => { setShowWarning(false); doLogout("idle_timeout"); },
  });

  // Modal visible solo si está en ventana warning Y el state local lo permite
  const visible = isWarning && showWarning;

  if (!enabled || !visible) return null;

  const secondsLeft = Math.ceil(msUntilTimeout / 1000);
  const minLeft = Math.floor(secondsLeft / 60);
  const secLeft = secondsLeft % 60;
  const pct = Math.max(0, Math.min(100, (msUntilTimeout / (timeoutMs - warningMs)) * 100));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-amber-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-slide-up">
        <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 px-6 py-4 border-b border-amber-500/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400"/>
          </div>
          <div>
            <h3 className="font-display font-bold text-white text-base">Sesión por expirar</h3>
            <p className="text-[10px] text-amber-200 mt-0.5">Política {policy.label} · {policy.timeoutMinutes}min total</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-[#E2E8F0]">
            Tu sesión se cerrará automáticamente por inactividad en
          </p>

          {/* Countdown */}
          <div className="bg-[#0A111F] border border-[#1E2D4A] rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-3">
              <Clock className="w-5 h-5 text-amber-400"/>
              <span className="font-display text-4xl font-bold text-amber-400 tabular-nums">
                {minLeft.toString().padStart(2, "0")}:{secLeft.toString().padStart(2, "0")}
              </span>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-2 uppercase tracking-wider">minutos restantes</p>
          </div>

          {/* Barra de progreso descendente */}
          <div className="h-1.5 bg-[#1A2540] rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-1000 ease-linear"
              style={{
                width: `${pct}%`,
                background: pct > 50
                  ? "linear-gradient(90deg, #F59E0B, #FBBF24)"
                  : pct > 25
                  ? "linear-gradient(90deg, #EF4444, #F59E0B)"
                  : "#EF4444",
              }}
            />
          </div>

          <p className="text-xs text-[#94A3B8] flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400"/>
            <span>
              Por seguridad corporativa, cerramos automáticamente las sesiones inactivas.
              Cualquier actividad (mouse, teclado, scroll) reinicia el contador.
            </span>
          </p>
        </div>

        <div className="px-6 py-3 border-t border-[#1E2D4A] bg-[#0A111F] flex gap-2">
          <button
            onClick={() => doLogout("manual")}
            className="flex-1 px-3 py-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8] hover:text-white hover:border-red-500/40 text-xs flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5"/>Cerrar ahora
          </button>
          <button
            onClick={() => { reset(); setShowWarning(false); }}
            className="flex-1 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-[#0A111F] text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5"/>Continuar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
