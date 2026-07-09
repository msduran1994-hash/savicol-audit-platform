"use client";
// Boundary de error del layout RAÍZ (reemplaza <html>). Mismo comportamiento:
// auto-recupera de chunks viejos y muestra el error real en pantalla.
import { ErrorScreen } from "@/components/system/error-screen";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body>
        <ErrorScreen error={error} reset={reset} />
      </body>
    </html>
  );
}
