"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// El módulo de Desempeño de Auditores fue consolidado dentro del Resumen Ejecutivo.
// Esta ruta queda como redirección para no romper enlaces antiguos.
export default function DesempenoAuditoresRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/resumen-ejecutivo");
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[60vh] text-[#94A3B8] text-sm">
      Redirigiendo al Resumen Ejecutivo…
    </div>
  );
}
