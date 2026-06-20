"use client";

/*
 * useIsMobile — hook compartido de viewport.
 * Ubicación sugerida: apps/web/src/hooks/useIsMobile.ts
 * SSR-safe: devuelve false en el servidor y se actualiza tras el montaje.
 */

import { useEffect, useState } from "react";

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 0.1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return isMobile;
}
