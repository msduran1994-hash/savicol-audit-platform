"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, HelpCircle, Shield, Tractor, Truck, Warehouse } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";

interface HeaderProps { title: string; subtitle?: string; }

// ─── 4 ESPACIOS DE LA PLATAFORMA ─────────────────────────────────────────────
const WORKSPACES = [
  { id: "auditoria", label: "Auditoría", href: "/",        icon: Shield,    match: (p: string) => !p.startsWith("/granjas") && !p.startsWith("/rutas") && !p.startsWith("/cedis") },
  { id: "granjas",   label: "Granjas",   href: "/granjas", icon: Tractor,   match: (p: string) => p.startsWith("/granjas") },
  { id: "rutas",     label: "Rutas",     href: "/rutas",   icon: Truck,     match: (p: string) => p.startsWith("/rutas") },
  { id: "cedis",     label: "CEDIS",     href: "/cedis",   icon: Warehouse, match: (p: string) => p.startsWith("/cedis") },
] as const;

export function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuthStore();
  const pathname = usePathname();

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-[#1E2D4A] bg-[#070B14]/80 backdrop-blur-sm sticky top-0 z-10">
      {/* Page title */}
      <div>
        <h1 className="font-display font-bold text-white text-lg leading-none">{title}</h1>
        {subtitle && <p className="text-xs text-[#475569] mt-0.5">{subtitle}</p>}
      </div>

      {/* Workspace tabs (centered) */}
      <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2 p-1 bg-[#0D1526] rounded-xl border border-[#1E2D4A]">
        {WORKSPACES.map((ws) => {
          const active = ws.match(pathname);
          const Icon = ws.icon;
          return (
            <Link
              key={ws.id}
              href={ws.href}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
                active
                  ? ws.id === "rutas"   ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-glow-blue"
                  : ws.id === "granjas" ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  : ws.id === "cedis"   ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  :                       "bg-blue-500/15 text-blue-300 border border-blue-500/30 shadow-glow-blue"
                  : "text-[#94A3B8] hover:text-white hover:bg-[#1A2540] border border-transparent"
              )}
            >
              <Icon className="w-3 h-3" />
              {ws.label}
            </Link>
          );
        })}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0D1526] border border-[#1E2D4A] text-[#475569] hover:border-[#2A3F6A] transition-colors cursor-pointer group">
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs">Buscar...</span>
          <kbd className="ml-3 text-[10px] px-1.5 py-0.5 rounded bg-[#1A2540] text-[#475569] font-mono">⌘K</kbd>
        </div>

        {/* Notifications */}
        <NotificationBell />

        <button className="w-9 h-9 rounded-lg bg-[#0D1526] border border-[#1E2D4A] flex items-center justify-center text-[#94A3B8] hover:text-white hover:border-[#2A3F6A] transition-colors">
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Avatar */}
        {user && (
          <div className="flex items-center gap-2 pl-2 ml-1 border-l border-[#1E2D4A]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-white">
              {user.name.split(" ").map(n => n[0]).slice(0,2).join("")}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-white leading-none">{user.name.split(" ")[0]}</p>
              <p className="text-[10px] text-[#475569]">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
