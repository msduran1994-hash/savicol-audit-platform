"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, BarChart3, Users,
  Settings, Shield, ChevronLeft, ChevronRight, LogOut,
  Tractor, ClipboardCheck, AlertTriangle, Target, Trophy,
  Package, FileText, Activity, Files,
  Truck, Table2, CheckSquare, Camera, Sparkles,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { APP_NAME, APP_COMPANY } from "@/lib/constants";
import { useState } from "react";

// ─── NAV DE LA PLATAFORMA PRINCIPAL ───────────────────────────────────────────
const MAIN_NAV = [
  { href: "/",              label: "Dashboard",       icon: LayoutDashboard, badge: null },
  { href: "/cronograma",    label: "Cronograma 2026", icon: CalendarDays,    badge: null },
  { href: "/indicadores",   label: "Indicadores",     icon: BarChart3,       badge: null },
  { href: "/auditores",     label: "Auditores",       icon: Users,           badge: "6"  },
  { href: "/configuracion", label: "Configuración",   icon: Settings,        badge: null },
];

// ─── NAV INTERNO DEL MÓDULO GRANJAS ───────────────────────────────────────────
const GRANJAS_NAV = [
  { href: "/granjas",            label: "Dashboard",        icon: LayoutDashboard,   badge: null },
  { href: "/granjas/registro",   label: "Granjas",          icon: Tractor,           badge: null },
  { href: "/granjas/auditorias", label: "Auditorías",       icon: ClipboardCheck,    badge: null },
  { href: "/granjas/hallazgos",  label: "Hallazgos",        icon: AlertTriangle,     badge: null },
  { href: "/granjas/kpi",        label: "Cumplimiento KPI", icon: Target,            badge: null },
  { href: "/granjas/ranking",    label: "Ranking",          icon: Trophy,            badge: null },
  { href: "/granjas/inventario", label: "Inventario",       icon: Package,           badge: null },
  { href: "/granjas/reportes",   label: "Reportes",         icon: FileText,          badge: null },
  { href: "/granjas/actividad",  label: "Actividad",        icon: Activity,          badge: null },
  { href: "/granjas/documentos", label: "Documentos",       icon: Files,             badge: null },
];

// ─── NAV INTERNO DEL MÓDULO RUTAS ────────────────────────────────────────────
const RUTAS_NAV = [
  { href: "/rutas",              label: "Dashboard",         icon: LayoutDashboard, badge: null },
  { href: "/rutas/consolidado",  label: "Consolidado",       icon: Table2,          badge: null },
  { href: "/rutas/reportes",     label: "Reportes",          icon: FileText,        badge: null },
  { href: "/rutas/cumplimiento", label: "Cumplimiento",      icon: CheckSquare,     badge: null },
  { href: "/rutas/evidencias",   label: "Evidencias",        icon: Camera,          badge: null },
  { href: "/rutas/informe",      label: "Informe Ejecutivo", icon: Sparkles,        badge: null },
];

// ─── NAV INTERNO DEL MÓDULO CEDIS ────────────────────────────────────────────
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

const META: Record<Workspace, {
  brand: string;
  subtitle: string;
  logoIcon: any;
  logoGradient: string;
  navTitle: string;
  navAccent: "blue" | "amber" | "cyan";
  nav: typeof MAIN_NAV;
}> = {
  auditoria: {
    brand:        APP_NAME,
    subtitle:     APP_COMPANY,
    logoIcon:     Shield,
    logoGradient: "from-blue-500 to-cyan-400",
    navTitle:     "Navegación",
    navAccent:    "blue",
    nav:          MAIN_NAV,
  },
  granjas: {
    brand:        "Granjas Avícolas",
    subtitle:     "Módulo Granjas",
    logoIcon:     Tractor,
    logoGradient: "from-amber-500 to-amber-600",
    navTitle:     "Módulo Granjas",
    navAccent:    "amber",
    nav:          GRANJAS_NAV,
  },
  rutas: {
    brand:        "Acompañamiento Rutas",
    subtitle:     "Módulo Rutas",
    logoIcon:     Truck,
    logoGradient: "from-cyan-500 to-teal-400",
    navTitle:     "Módulo Rutas",
    navAccent:    "cyan",
    nav:          RUTAS_NAV,
  },
  cedis: {
    brand:        "Auditoría CEDIS",
    subtitle:     "Módulo CEDIS",
    logoIcon:     Warehouse,
    logoGradient: "from-emerald-500 to-green-400",
    navTitle:     "Módulo CEDIS",
    navAccent:    "emerald" as any,
    nav:          CEDIS_NAV,
  },
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const workspace = detectWorkspace(pathname);
  const meta = META[workspace];
  const LogoIcon = meta.logoIcon;

  const accentClasses = ({
    blue:    { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/20",    bar: "bg-blue-400"    },
    amber:   { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-500/20",   bar: "bg-amber-400"   },
    cyan:    { bg: "bg-cyan-500/15",    text: "text-cyan-400",    border: "border-cyan-500/20",    bar: "bg-cyan-400"    },
    emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20", bar: "bg-emerald-400" },
  } as any)[meta.navAccent];

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-[#0D1526] border-r border-[#1E2D4A] shadow-sidebar",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Toggle */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="absolute -right-3.5 top-6 z-10 w-7 h-7 rounded-full bg-[#1A2540] border border-[#2A3F6A]
                   flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-[#243356]
                   transition-all shadow-card"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Logo */}
      <div className="flex items-center gap-3 p-4 h-16 border-b border-[#1E2D4A]">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-glow-blue bg-gradient-to-br", meta.logoGradient)}>
          <LogoIcon className="w-4.5 h-4.5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-display font-bold text-white text-sm leading-none truncate">{meta.brand}</p>
            <p className="text-xs text-amber-400 font-semibold tracking-widest uppercase mt-0.5">{meta.subtitle}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#475569] px-2.5 mb-3">
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
              className={cn(
                "flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative",
                active
                  ? cn(accentClasses.bg, accentClasses.text, "border", accentClasses.border)
                  : "text-[#94A3B8] hover:bg-[#1A2540] hover:text-white"
              )}
            >
              <Icon className={cn("w-4.5 h-4.5 shrink-0", active && accentClasses.text)} />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{label}</span>
                  {badge && (
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#243356] text-[#94A3B8]">
                      {badge}
                    </span>
                  )}
                </>
              )}
              {active && (
                <span className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r", accentClasses.bar)} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-2.5 border-t border-[#1E2D4A] space-y-1">
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-[#1A2540] mb-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user.name.split(" ").map(n => n[0]).slice(0,2).join("")}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-[#475569] truncate">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm text-[#94A3B8] hover:bg-red-950/30 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
