"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, HelpCircle, Shield, Tractor, Truck, Warehouse } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";

interface HeaderProps { title: string; subtitle?: string; }

const WORKSPACES = [
  { id: "auditoria", label: "Auditoría", href: "/",        icon: Shield,    match: (p: string) => !p.startsWith("/granjas") && !p.startsWith("/rutas") && !p.startsWith("/cedis") },
  { id: "granjas",   label: "Granjas",   href: "/granjas", icon: Tractor,   match: (p: string) => p.startsWith("/granjas") },
  { id: "rutas",     label: "Rutas",     href: "/rutas",   icon: Truck,     match: (p: string) => p.startsWith("/rutas") },
  { id: "cedis",     label: "CEDIS",     href: "/cedis",   icon: Warehouse, match: (p: string) => p.startsWith("/cedis") },
] as const;

const WORKSPACE_ACTIVE: Record<string, string> = {
  auditoria: "bg-[#1A3A8F]/10 text-[#1A3A8F] border-[#1A3A8F]/25 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  granjas:   "bg-amber-500/10 text-amber-700 border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  rutas:     "bg-cyan-500/10 text-cyan-700 border-cyan-400/30 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30",
  cedis:     "bg-emerald-500/10 text-emerald-700 border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
};

export function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuthStore();
  const pathname = usePathname();

  return (
    <header
      className="h-14 flex items-center justify-between px-6 sticky top-0 z-10 backdrop-blur-sm"
      style={{
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--header-bg)",
      }}
    >
      {/* Page title */}
      <div>
        <h1 className="font-bold text-base leading-none" style={{ color: "var(--text-primary)" }}>{title}</h1>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
      </div>

      {/* Workspace tabs */}
      <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2 p-1 rounded-xl"
           style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
        {WORKSPACES.map((ws) => {
          const active = ws.match(pathname);
          const Icon = ws.icon;
          return (
            <Link
              key={ws.id}
              href={ws.href}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border",
                active
                  ? WORKSPACE_ACTIVE[ws.id]
                  : "border-transparent hover:bg-[var(--bg-overlay)]"
              )}
              style={active ? {} : { color: "var(--text-muted)" }}
            >
              <Icon className="w-3 h-3" />
              {ws.label}
            </Link>
          );
        })}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
             style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
             onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)"}
             onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)"}>
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs">Buscar...</span>
          <kbd className="ml-3 text-[10px] px-1.5 py-0.5 rounded font-mono"
               style={{ background: "var(--bg-overlay)", color: "var(--text-muted)" }}>⌘K</kbd>
        </div>

        <NotificationBell />

        <button className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
          <HelpCircle className="w-4 h-4" />
        </button>

        {user && (
          <div className="flex items-center gap-2 pl-2 ml-1" style={{ borderLeft: "1px solid var(--border-subtle)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                 style={{ background: "linear-gradient(135deg, #1A3A8F, #C41230)" }}>
              {user.name.split(" ").map(n => n[0]).slice(0,2).join("")}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-semibold leading-none" style={{ color: "var(--text-primary)" }}>
                {user.name.split(" ")[0]}
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
