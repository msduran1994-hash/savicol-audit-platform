"use client";
// Error boundary del módulo Granjas: evita la pantalla blanca "Application error".
// Ante cualquier excepción en /granjas/* muestra un aviso con opción de reintentar.
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GranjasError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Granjas error:", error); }, [error]);
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-red-400"/>
      </div>
      <h2 className="font-display font-bold text-white text-lg">No se pudo cargar esta sección</h2>
      <p className="text-sm text-[#94A3B8] mt-1 max-w-md">
        Ocurrió un problema al mostrar el módulo de Granjas. Puedes reintentar; si persiste, verifica la conexión con el servidor.
      </p>
      {error?.message && <p className="text-[11px] text-[#475569] mt-2 font-mono max-w-lg break-words">{error.message}</p>}
      <button onClick={reset} className="mt-5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A111F] text-sm font-bold flex items-center gap-2">
        <RefreshCw className="w-4 h-4"/> Reintentar
      </button>
    </div>
  );
}
