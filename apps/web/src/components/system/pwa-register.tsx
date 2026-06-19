"use client";
import { useEffect } from "react";

// Registra el service worker de la PWA. No altera la lógica de la app: solo
// habilita instalación y apertura offline. Se monta una vez en el layout raíz.
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Evita registrar en desarrollo para no interferir con HMR
    if (process.env.NODE_ENV !== "production") return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // Silencioso: si el SW no registra, la app sigue funcionando como web normal
        });
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
