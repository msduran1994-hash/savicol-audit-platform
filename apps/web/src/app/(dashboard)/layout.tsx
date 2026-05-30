import { Sidebar } from "@/components/layout/sidebar";
import { DataHydration } from "@/components/system/data-hydration";
import { AuthGuard } from "@/components/system/auth-guard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-[#070B14]">
        {/* Sincroniza API ↔ Zustand cuando el usuario está autenticado */}
        <DataHydration />
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
