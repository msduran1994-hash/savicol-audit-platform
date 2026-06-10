import { Sidebar } from "@/components/layout/sidebar";
import { DataHydration } from "@/components/system/data-hydration";
import { AuthGuard } from "@/components/system/auth-guard";
import { SessionWatcher } from "@/components/layout/session-watcher";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>
        {/* Sincroniza API ↔ Zustand cuando el usuario está autenticado */}
        <DataHydration />
        {/* Monitoriza inactividad y dispara warning/logout según rol */}
        <SessionWatcher />
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
