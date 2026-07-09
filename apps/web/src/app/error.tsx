"use client";
// Boundary de error a nivel de segmento (dentro del layout raíz). Auto-recupera de
// chunks viejos y muestra el error real. Ver components/system/error-screen.tsx.
import { ErrorScreen } from "@/components/system/error-screen";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen error={error} reset={reset} />;
}
