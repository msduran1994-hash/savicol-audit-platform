"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// Pantalla de error compartida (error.tsx + global-error.tsx).
//  1. Si el error es de carga de "chunk" (assets viejos tras un despliegue), se
//     auto-recupera: desregistra el service worker, limpia cachés y recarga UNA vez
//     (guard en sessionStorage para no entrar en bucle).
//  2. Si es otro error, muestra el MENSAJE REAL en pantalla (no el genérico), con
//     botones Reintentar/Recargar, para poder diagnosticar desde una captura.
// ═══════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";

const CHUNK_RE = /ChunkLoadError|Loading chunk [\w-]+ failed|dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;
const GUARD = "__sv_chunk_recovered__";

export function ErrorScreen({ error, reset }: { error: (Error & { digest?: string }) | undefined; reset?: () => void }) {
  const msg = error?.message || String(error ?? "Error desconocido");
  const isChunk = CHUNK_RE.test(msg) || (error as any)?.name === "ChunkLoadError";
  const [recovering, setRecovering] = useState(isChunk);

  useEffect(() => {
    if (!isChunk) { try { sessionStorage.removeItem(GUARD); } catch { /* noop */ } return; }
    let cancelled = false;
    (async () => {
      try {
        if (sessionStorage.getItem(GUARD)) { setRecovering(false); return; } // ya intentamos: mostrar UI
        sessionStorage.setItem(GUARD, "1");
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch { /* seguimos al reload igual */ }
      if (!cancelled) window.location.reload();
    })();
    return () => { cancelled = true; };
  }, [isChunk]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A1628", color: "#E2E8F0", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{recovering ? "⏳" : "⚠️"}</div>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>
          {recovering ? "Actualizando la aplicación…" : "Ocurrió un error"}
        </h1>
        <p style={{ fontSize: 13, color: "#94A3B8", margin: "0 0 16px" }}>
          {recovering
            ? "Estamos cargando la versión más reciente. Espera un momento."
            : "Puedes reintentar. Si el problema continúa, comparte el detalle de abajo con soporte."}
        </p>
        {!recovering && (
          <>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
              {reset && (
                <button onClick={() => reset()} style={{ padding: "8px 16px", borderRadius: 8, background: "#4A7AFF", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}>Reintentar</button>
              )}
              <button onClick={() => window.location.reload()} style={{ padding: "8px 16px", borderRadius: 8, background: "#1A2540", color: "#E2E8F0", border: "1px solid #2A3F6A", cursor: "pointer" }}>Recargar</button>
            </div>
            <pre style={{ textAlign: "left", fontSize: 11, lineHeight: 1.5, color: "#F87171", background: "#0D1526", border: "1px solid #1E2D4A", borderRadius: 8, padding: 12, overflow: "auto", maxHeight: 200, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {msg}{error?.digest ? `\n\ndigest: ${error.digest}` : ""}
            </pre>
          </>
        )}
      </div>
    </div>
  );
}
