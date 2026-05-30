"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// AuthGuard · Protege las rutas del (dashboard)
// ═══════════════════════════════════════════════════════════════════════════════
// Si no hay sesión activa, redirige a /login.
// Espera la hidratación del store de Zustand desde localStorage antes de evaluar.
// ═══════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { Shield } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [hydrated, setHydrated] = useState(false);

  // Esperar a que Zustand hidrate desde localStorage (solo en cliente)
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  // Mientras Zustand no se hidrata, mostrar splash en lugar de redirigir
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#070B14]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center animate-pulse">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <p className="text-xs text-[#475569] uppercase tracking-widest">Iniciando plataforma...</p>
        </div>
      </div>
    );
  }

  // Hidratado y sin sesión: el efecto ya está redirigiendo
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#070B14]">
        <p className="text-sm text-[#475569]">Redirigiendo a login...</p>
      </div>
    );
  }

  return <>{children}</>;
}
