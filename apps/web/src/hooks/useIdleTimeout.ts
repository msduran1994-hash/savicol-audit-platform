// ═══════════════════════════════════════════════════════════════════════════════
// useIdleTimeout · Detecta inactividad del usuario y dispara warning/logout
// ═══════════════════════════════════════════════════════════════════════════════
// Eventos monitoreados: mousemove, mousedown, keydown, scroll, touchstart, focus
// Throttle: el reset solo se aplica cada 5s para no spam-rerenderizar.
// Cuando el usuario inactivo alcanza warningMs → onWarning() (modal visible)
// Cuando alcanza timeoutMs → onTimeout() (force logout)
// ═══════════════════════════════════════════════════════════════════════════════
"use client";
import { useEffect, useRef, useState, useCallback } from "react";

interface IdleTimeoutOptions {
  warningMs:  number;       // ms desde última actividad hasta mostrar warning
  timeoutMs:  number;       // ms desde última actividad hasta logout forzado
  enabled?:   boolean;      // si false, hook no hace nada
  onWarning?: () => void;
  onTimeout?: () => void;
}

interface IdleTimeoutState {
  isIdle:           boolean;
  isWarning:        boolean;
  msSinceActivity:  number;
  msUntilTimeout:   number;
  reset:            () => void;
}

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "focus"] as const;
const THROTTLE_MS = 5_000;
const TICK_MS = 1_000;

export function useIdleTimeout(opts: IdleTimeoutOptions): IdleTimeoutState {
  const { warningMs, timeoutMs, enabled = true, onWarning, onTimeout } = opts;

  const lastActivityRef = useRef<number>(Date.now());
  const lastResetEmitRef = useRef<number>(0);
  const warnedRef = useRef<boolean>(false);
  const timedOutRef = useRef<boolean>(false);

  const [tick, setTick] = useState(0);

  const reset = useCallback(() => {
    lastActivityRef.current = Date.now();
    warnedRef.current = false;
    timedOutRef.current = false;
    setTick(t => t + 1);
  }, []);

  // Listener de eventos · throttled para evitar setState en cada mousemove
  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      if (now - lastResetEmitRef.current > THROTTLE_MS) {
        lastResetEmitRef.current = now;
        warnedRef.current = false;
        timedOutRef.current = false;
        setTick(t => t + 1);
      }
    };
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handler, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handler));
  }, [enabled]);

  // Tick de evaluación · cada segundo revisamos si pasamos warning/timeout
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= timeoutMs && !timedOutRef.current) {
        timedOutRef.current = true;
        onTimeout?.();
      } else if (elapsed >= warningMs && !warnedRef.current && !timedOutRef.current) {
        warnedRef.current = true;
        onWarning?.();
      }
      // Trigger re-render para que el componente pinte el countdown
      setTick(t => t + 1);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [enabled, warningMs, timeoutMs, onWarning, onTimeout]);

  const elapsed = Date.now() - lastActivityRef.current;
  const isIdle    = elapsed >= warningMs;
  const isWarning = isIdle && elapsed < timeoutMs;

  return {
    isIdle,
    isWarning,
    msSinceActivity: elapsed,
    msUntilTimeout:  Math.max(0, timeoutMs - elapsed),
    reset,
  };
}
