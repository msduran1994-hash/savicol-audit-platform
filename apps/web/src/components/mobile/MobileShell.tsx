"use client";

/*
 * MobileShell.tsx — Cáscara de app móvil · Audit Platform Savicol
 * Ubicación sugerida: apps/web/src/components/mobile/MobileShell.tsx
 * Import:            import MobileShell from "@/components/mobile/MobileShell";
 * -----------------------------------------------------------------------------
 * Aditivo y fiel al sistema actual:
 *  - Usa tus tokens semánticos (bg-*, text-*, border-*, accent-*) y tu marca
 *    Savicol => hereda automáticamente modo claro/oscuro (.dark).
 *  - El chrome móvil (top bar, bottom nav, drawer) se oculta en >= md (768px)
 *    con `md:hidden` => el escritorio NO se toca.
 *  - NO registra Service Worker: <PwaRegister /> ya lo hace en tu layout raíz.
 *  - Iconos con lucide-react (ya está en tus dependencias).
 *
 * Ajusta los `href` de NAV_ITEMS / DRAWER_ITEMS a tus rutas reales.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ClipboardCheck,
  Egg,
  Warehouse,
  Route as RouteIcon,
  BarChart3,
  Menu,
  Bell,
  Settings,
  User,
  LogOut,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", Icon: Home },
  { href: "/auditoria", label: "Auditoría", Icon: ClipboardCheck },
  { href: "/granjas", label: "Granjas", Icon: Egg },
  { href: "/cedis", label: "CEDIS", Icon: Warehouse },
  { href: "/rutas", label: "Rutas", Icon: RouteIcon },
  { href: "/reportes", label: "Reportes", Icon: BarChart3 },
];

const DRAWER_ITEMS = [
  { href: "/configuracion", label: "Configuración", Icon: Settings },
  { href: "/perfil", label: "Perfil", Icon: User },
  { href: "/notificaciones", label: "Notificaciones", Icon: Bell },
];

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 0.1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return isMobile;
}

export default function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Bloquear scroll del fondo con el drawer abierto (solo en móvil).
  useEffect(() => {
    if (!isMobile) return;
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen, isMobile]);

  // Cerrar el drawer al navegar.
  useEffect(() => setDrawerOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="min-h-[100dvh] bg-bg-base text-text-primary">
      {/* ───── Top bar (solo móvil) ───── */}
      <header
        className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4
                   h-[calc(56px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)]
                   bg-[var(--header-bg)] backdrop-blur-xl border-b border-border-subtle"
      >
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
          className="grid place-items-center w-10 h-10 rounded-xl text-text-secondary
                     active:bg-bg-elevated transition-colors"
        >
          <Menu size={22} />
        </button>

        <div className="flex items-center gap-2.5 font-semibold">
          <span className="grid place-items-center w-[30px] h-[30px] rounded-[9px] text-[12px]
                           font-bold text-white bg-accent-primary shadow-glow-blue">
            AP
          </span>
          <span className="text-[15px]">Audit Platform</span>
        </div>

        <Link
          href="/notificaciones"
          aria-label="Notificaciones"
          className="relative grid place-items-center w-10 h-10 rounded-xl text-text-secondary
                     active:bg-bg-elevated transition-colors"
        >
          <Bell size={22} />
          <span className="absolute top-2.5 right-2.5 w-[7px] h-[7px] rounded-full bg-savicol-red" />
        </Link>
      </header>

      {/* ───── Contenido ───── */}
      <main className="md:contents pb-[calc(64px+env(safe-area-inset-bottom)+12px)] md:pb-0">
        {children}
      </main>

      {/* ───── Bottom nav (solo móvil) ───── */}
      <nav
        aria-label="Navegación principal"
        className="md:hidden fixed inset-x-0 bottom-0 z-50 flex justify-around items-stretch
                   h-[calc(64px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)]
                   bg-[var(--header-bg)] backdrop-blur-xl border-t border-border-subtle"
      >
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex-1 flex flex-col items-center justify-center gap-[3px] pt-1.5
                          transition-colors ${active ? "text-accent-primary" : "text-text-muted"}`}
            >
              {active && (
                <span className="absolute top-0 w-7 h-[3px] rounded-b bg-accent-primary shadow-glow-blue" />
              )}
              <Icon
                size={23}
                className={active ? "drop-shadow-[0_3px_10px_rgba(59,130,246,0.55)]" : ""}
                strokeWidth={active ? 2.3 : 1.9}
              />
              <span className="text-[10.5px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ───── Scrim + Drawer (solo móvil) ───── */}
      <div
        onClick={() => setDrawerOpen(false)}
        aria-hidden
        className={`md:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs transition-opacity duration-300
                    ${drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        className={`md:hidden fixed top-0 left-0 z-[70] flex flex-col w-[min(84vw,320px)] h-[100dvh]
                    px-4 pt-[calc(env(safe-area-inset-top)+18px)] pb-[calc(env(safe-area-inset-bottom)+18px)]
                    bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] border-r border-[var(--sidebar-border)]
                    shadow-sidebar-dark transition-transform duration-300 ease-out
                    ${drawerOpen ? "translate-x-0" : "-translate-x-[104%]"}`}
      >
        <div className="flex items-start justify-between pb-[18px] border-b border-[var(--sidebar-border)]">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-11 h-11 rounded-[13px] text-sm font-bold
                             text-white bg-accent-primary">
              MD
            </span>
            <div>
              <p className="text-[15px] font-semibold text-[var(--sidebar-active)]">Michael Duran</p>
              <p className="text-xs opacity-80">Control Interno · Admin</p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
            className="grid place-items-center w-10 h-10 rounded-xl text-[var(--sidebar-text)]
                       active:bg-white/10 transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-col gap-1 py-4 flex-1">
          {DRAWER_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3.5 px-3 py-3 rounded-xl text-[15px]
                         text-[var(--sidebar-active)] active:bg-white/10 transition-colors"
            >
              <Icon size={21} className="text-accent-cyan" />
              {label}
            </Link>
          ))}
        </div>

        <div className="border-t border-[var(--sidebar-border)] pt-3.5">
          <button
            onClick={() => {
              /* TODO: conecta con tu logout real (JWT / NestJS). */
              window.location.href = "/logout";
            }}
            className="flex items-center gap-3.5 w-full px-3 py-3 rounded-xl text-[15px]
                       text-red-300 active:bg-red-500/10 transition-colors"
          >
            <LogOut size={21} />
            Cerrar sesión
          </button>
          <p className="mt-3 pl-3 text-[11px] opacity-70">v1.0.0 · Savicol S.A.S.</p>
        </div>
      </aside>
    </div>
  );
}
