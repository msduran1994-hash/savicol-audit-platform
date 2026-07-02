"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, BarChart3, Users,
  Settings, Shield, ChevronLeft, ChevronRight, LogOut,
  Tractor, ClipboardCheck, AlertTriangle, Target, Trophy,
  Package, FileText, Activity, Files,
  Gauge,
  Truck, Table2, CheckSquare, Camera, Sparkles,
  Warehouse, Egg, Bird,
  Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { APP_NAME, APP_COMPANY } from "@/lib/constants";
import { useState, useEffect } from "react";

const MAIN_NAV = [
  { href: "/resumen-ejecutivo", label: "Resumen Ejecutivo", icon: Gauge,        badge: null },
  { href: "/",              label: "Dashboard",       icon: LayoutDashboard, badge: null },
  { href: "/cronograma",    label: "Cronograma 2026", icon: CalendarDays,    badge: null },
  { href: "/indicadores",   label: "Indicadores",     icon: BarChart3,       badge: null },
  { href: "/auditores",     label: "Auditores",       icon: Users,           badge: "6"  },
  { href: "/formatos",      label: "Formatos Auditoría", icon: Files,        badge: null },
  { href: "/configuracion", label: "Configuración",   icon: Settings,        badge: null },
];

const GRANJAS_NAV = [
  { href: "/granjas/dinamico",   label: "Dashboard Dinámico", icon: LayoutDashboard, badge: null },
  { href: "/granjas/registro",   label: "Granjas",          icon: Tractor,          badge: null },
  { href: "/granjas/auditorias", label: "Auditorías",       icon: ClipboardCheck,   badge: null },
  { href: "/granjas/hallazgos",  label: "Hallazgos",        icon: AlertTriangle,    badge: null },
  { href: "/granjas/kpi",        label: "Cumplimiento KPI", icon: Target,           badge: null },
  { href: "/granjas/trazabilidad", label: "Trazabilidad",   icon: Egg,              badge: null },
  { href: "/granjas/descartes",  label: "Trazabilidad de Descartes", icon: Bird,   badge: null },
  { href: "/granjas/ranking",    label: "Ranking",          icon: Trophy,           badge: null },
  { href: "/granjas/inventario", label: "Inventario",       icon: Package,          badge: null },
  { href: "/granjas/reportes",   label: "Reportes",         icon: FileText,         badge: null },
  { href: "/granjas/actividad",  label: "Actividad",        icon: Activity,         badge: null },
  { href: "/granjas/documentos", label: "Documentos",       icon: Files,            badge: null },
];

const RUTAS_NAV = [
  { href: "/rutas",              label: "Dashboard",         icon: LayoutDashboard, badge: null },
  { href: "/rutas/consolidado",  label: "Consolidado",       icon: Table2,          badge: null },
  { href: "/rutas/reportes",     label: "Reportes",          icon: FileText,        badge: null },
  { href: "/rutas/cumplimiento", label: "Cumplimiento",      icon: CheckSquare,     badge: null },
  { href: "/rutas/evidencias",   label: "Evidencias",        icon: Camera,          badge: null },
  { href: "/rutas/informe",      label: "Informe Ejecutivo", icon: Sparkles,        badge: null },
];

const CEDIS_NAV = [
  { href: "/cedis",              label: "Dashboard",         icon: LayoutDashboard, badge: null },
  { href: "/cedis/consolidado",  label: "Consolidado",       icon: Table2,          badge: null },
  { href: "/cedis/reportes",     label: "Reportes",          icon: FileText,        badge: null },
  { href: "/cedis/cumplimiento", label: "Cumplimiento",      icon: CheckSquare,     badge: null },
  { href: "/cedis/evidencias",   label: "Evidencias",        icon: Camera,          badge: null },
  { href: "/cedis/informe",      label: "Informe Ejecutivo", icon: Sparkles,        badge: null },
];

type Workspace = "auditoria" | "granjas" | "rutas" | "cedis";

function detectWorkspace(pathname: string): Workspace {
  if (pathname.startsWith("/granjas")) return "granjas";
  if (pathname.startsWith("/rutas"))   return "rutas";
  if (pathname.startsWith("/cedis"))   return "cedis";
  return "auditoria";
}

type AccentKey = "corp" | "amber" | "cyan" | "emerald";

const ACCENT: Record<AccentKey, { active: string; activeBg: string; bar: string }> = {
  corp:    { active: "#FFFFFF",  activeBg: "rgba(255,255,255,0.15)", bar: "#C41230" },
  amber:   { active: "#FCD34D",  activeBg: "rgba(252,211,77,0.12)",  bar: "#F59E0B" },
  cyan:    { active: "#67E8F9",  activeBg: "rgba(103,232,249,0.12)", bar: "#06B6D4" },
  emerald: { active: "#6EE7B7",  activeBg: "rgba(110,231,183,0.12)", bar: "#10B981" },
};

const META: Record<Workspace, {
  brand: string; subtitle: string; logoIcon: any;
  navTitle: string; accent: AccentKey; nav: typeof MAIN_NAV;
}> = {
  auditoria: { brand: APP_NAME,                 subtitle: APP_COMPANY,      logoIcon: Shield,   navTitle: "Navegación",    accent: "corp",    nav: MAIN_NAV    },
  granjas:   { brand: "Granjas Avícolas",       subtitle: "Módulo Granjas", logoIcon: Tractor,  navTitle: "Módulo Granjas",accent: "amber",   nav: GRANJAS_NAV },
  rutas:     { brand: "Acompañamiento Rutas",   subtitle: "Módulo Rutas",   logoIcon: Truck,    navTitle: "Módulo Rutas",  accent: "cyan",    nav: RUTAS_NAV   },
  cedis:     { brand: "Auditoría CEDIS",        subtitle: "Módulo CEDIS",   logoIcon: Warehouse,navTitle: "Módulo CEDIS",  accent: "emerald", nav: CEDIS_NAV   },
};

export function Sidebar() {
  const pathname  = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const workspace = detectWorkspace(pathname);
  const meta      = META[workspace];
  const a         = ACCENT[meta.accent];
  const LogoIcon  = meta.logoIcon;

  // En móvil, el sidebar se cierra automáticamente al cambiar de ruta
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <>
      {/* Botón hamburguesa flotante — solo móvil */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
        style={{ background: "#1A3A8F", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop oscuro — solo móvil, cuando el menú está abierto */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

    <aside
      className={cn(
        "flex flex-col h-screen transition-all duration-300 ease-in-out sidebar-corporate",
        // Escritorio: relativo, con colapso. Móvil: drawer deslizante fijo.
        "max-lg:fixed max-lg:top-0 max-lg:left-0 max-lg:z-50 max-lg:w-[260px]",
        mobileOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
        "lg:relative lg:translate-x-0",
        collapsed ? "lg:w-[68px]" : "lg:w-[240px]"
      )}
    >
      {/* Botón cerrar — solo móvil */}
      <button
        onClick={() => setMobileOpen(false)}
        className="lg:hidden absolute right-3 top-4 z-20 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}
        aria-label="Cerrar menú"
      >
        <X className="w-4 h-4" />
      </button>

      {/* SAVICOL red top stripe */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "#C41230" }} />

      {/* Toggle button — solo escritorio */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="hidden lg:flex absolute -right-3.5 top-6 z-20 w-7 h-7 rounded-full items-center justify-center
                   transition-all shadow-lg"
        style={{
          background: "#1A3A8F",
          border: "2px solid rgba(255,255,255,0.20)",
          color: "rgba(255,255,255,0.70)",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.70)")}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 h-16 overflow-hidden" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {workspace === "auditoria" ? (
          collapsed ? (
            /* Collapsed: solo icono AP en gradiente rojo-azul */
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: "linear-gradient(135deg, #C41230 0%, #1A3A8F 100%)",
                           boxShadow: "0 2px 12px rgba(196,18,48,0.35)" }}>
              <span style={{ color: "#FFFFFF", fontWeight: 900, fontSize: 13,
                              letterSpacing: "-0.03em", fontFamily: "inherit" }}>AP</span>
            </div>
          ) : (
            /* Expanded: wordmark corporativo rojo + azul */
            <div className="flex flex-col leading-none overflow-hidden">
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: "-0.03em",
                                background: "linear-gradient(90deg, #C41230, #E8192C)",
                                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                                backgroundClip: "text" }}>AUDIT</span>
                <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: "-0.03em",
                                background: "linear-gradient(90deg, #4A7AFF, #FFFFFF)",
                                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                                backgroundClip: "text" }}>PLATFORM</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 9, letterSpacing: "0.20em",
                              textTransform: "uppercase" as const,
                              background: "linear-gradient(90deg, rgba(255,255,255,0.55), rgba(255,255,255,0.80))",
                              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                              backgroundClip: "text", marginTop: 2 }}>SOFTWARE</span>
            </div>
          )
        ) : (
          <>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <LogoIcon className="w-4.5 h-4.5 text-white" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="font-black text-white text-sm leading-none truncate tracking-tight">{meta.brand}</p>
                <p className="text-[10px] font-bold tracking-[0.15em] uppercase mt-0.5"
                   style={{ color: "#C41230" }}>{meta.subtitle}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-4 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase px-2.5 mb-3"
             style={{ color: "rgba(255,255,255,0.30)" }}>
            {meta.navTitle}
          </p>
        )}
        {meta.nav.map(({ href, label, icon: Icon, badge }) => {
          const active = (href === "/" || href === "/granjas" || href === "/rutas")
            ? pathname === href
            : pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative group"
              style={{
                background: active ? a.activeBg : "transparent",
                color: active ? a.active : "rgba(255,255,255,0.60)",
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
                if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.90)";
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.60)";
              }}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{label}</span>
                  {badge && (
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(196,18,48,0.25)", color: "#FCA5A5" }}>
                      {badge}
                    </span>
                  )}
                </>
              )}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r"
                      style={{ background: a.bar }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-2.5 pb-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-1"
               style={{ background: "rgba(255,255,255,0.07)" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                 style={{ background: "linear-gradient(135deg, #C41230, #9B0E25)" }}>
              {user.name.split(" ").map(n => n[0]).slice(0,2).join("")}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.40)" }}>{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ color: "rgba(255,255,255,0.45)" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(196,18,48,0.15)";
            (e.currentTarget as HTMLElement).style.color = "#FCA5A5";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)";
          }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
