"use client";
import { useState } from "react";
import { Shield, User, Bell, Palette, Database, Key, ChevronRight, CheckCircle2, Users, Plus, Mail, Edit2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

const sections = [
  { id: "perfil",       label: "Perfil",          icon: User,      description: "Información personal y credenciales" },
  { id: "usuarios",     label: "Usuarios",         icon: Users,     description: "Crear y gestionar usuarios + roles" },
  { id: "seguridad",    label: "Seguridad",        icon: Shield,    description: "MFA, contraseña y sesiones activas" },
  { id: "notificaciones", label: "Notificaciones", icon: Bell,      description: "Alertas y recordatorios de auditoría" },
  { id: "apariencia",   label: "Apariencia",       icon: Palette,   description: "Tema, idioma y preferencias visuales" },
  { id: "datos",        label: "Datos",            icon: Database,  description: "Importación, exportación y respaldos" },
  { id: "api",          label: "API & Tokens",     icon: Key,       description: "Tokens de integración para Power BI y externos" },
] as const;

type SectionId = typeof sections[number]["id"];

export default function ConfiguracionPage() {
  const { user } = useAuthStore();
  const [active, setActive] = useState<SectionId>("perfil");

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Configuración</h1>
        <p className="text-[#94A3B8] text-sm mt-1">
          Gestiona tu cuenta, seguridad y preferencias de la plataforma
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="w-56 shrink-0 space-y-1">
          {sections.map(({ id, label, icon: Icon, description }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group",
                active === id
                  ? "bg-[#1A2540] border border-[#2A3F6A] text-white"
                  : "text-[#64748B] hover:text-[#94A3B8] hover:bg-[#0D1526]"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active === id ? "text-amber-400" : "")} />
              <span className="text-sm font-medium">{label}</span>
              {active === id && <ChevronRight className="w-3 h-3 ml-auto text-[#475569]" />}
            </button>
          ))}
        </nav>

        {/* Content panel */}
        <div className="flex-1 bg-[#0D1526] border border-[#1E2D4A] rounded-2xl p-6">
          {active === "perfil" && <PerfilSection user={user} />}
          {active === "usuarios" && <UsuariosSection user={user} />}
          {active === "seguridad" && <SeguridadSection />}
          {active === "notificaciones" && <PlaceholderSection label="Notificaciones" />}
          {active === "apariencia" && <PlaceholderSection label="Apariencia" />}
          {active === "datos" && <DatosSection />}
          {active === "api" && <ApiSection />}
        </div>
      </div>
    </div>
  );
}

/* ── Perfil ─────────────────────────────────────────────── */
function PerfilSection({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-lg text-white">Perfil de usuario</h2>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold font-display text-xl">
          {user?.name?.slice(0,2).toUpperCase() ?? "AU"}
        </div>
        <div>
          <p className="font-semibold text-white">{user?.name ?? "—"}</p>
          <p className="text-sm text-[#94A3B8]">{user?.email ?? "—"}</p>
          <span className="inline-flex mt-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
            {user?.role ?? "VIEWER"}
          </span>
        </div>
      </div>

      {/* Read-only fields */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Nombre completo", value: user?.name ?? "—" },
          { label: "Correo electrónico", value: user?.email ?? "—" },
          { label: "Rol asignado", value: user?.role ?? "—" },
          { label: "ID de usuario", value: user?.id ? user.id.slice(0, 12) + "..." : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="space-y-1">
            <label className="text-xs text-[#64748B] tracking-wider uppercase">{label}</label>
            <div className="bg-[#1A2540] border border-[#2A3F6A] rounded-lg px-3 py-2 text-sm text-[#94A3B8] font-mono">
              {value}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-[#475569] border border-[#1E2D4A] rounded-lg px-3 py-2">
        ℹ️ Los datos de perfil son administrados por el ADMIN de la plataforma. Para cambios, contacte al administrador del sistema.
      </p>
    </div>
  );
}

/* ── Seguridad ──────────────────────────────────────────── */
function SeguridadSection() {
  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-lg text-white">Seguridad</h2>

      {/* MFA status */}
      <div className="flex items-center justify-between p-4 bg-[#1A2540] rounded-xl border border-[#2A3F6A]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Autenticación de dos factores</p>
            <p className="text-xs text-[#94A3B8]">TOTP via Google Authenticator / Authy</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4" />
          Activo
        </div>
      </div>

      {/* Password change — placeholder */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[#94A3B8]">Cambio de contraseña</h3>
        {["Contraseña actual", "Nueva contraseña", "Confirmar contraseña"].map(lbl => (
          <div key={lbl} className="space-y-1">
            <label className="text-xs text-[#64748B]">{lbl}</label>
            <input type="password" placeholder="••••••••••••"
              className="w-full bg-[#0D1526] border border-[#2A3F6A] rounded-lg px-3 py-2 text-sm text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all" />
          </div>
        ))}
        <button
          disabled
          className="mt-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium opacity-60 cursor-not-allowed"
        >
          Actualizar contraseña — Conectar con API
        </button>
      </div>
    </div>
  );
}

/* ── Datos ──────────────────────────────────────────────── */
function DatosSection() {
  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-lg text-white">Datos y exportación</h2>

      <div className="grid gap-3">
        {[
          { label: "Exportar cronograma 2026", desc: "Descarga el cronograma completo en formato Excel (.xlsx)", icon: "📊", ready: false },
          { label: "Exportar reporte PDF", desc: "Genera un PDF ejecutivo con KPIs e indicadores", icon: "📄", ready: false },
          { label: "Importar desde Excel", desc: "Carga actividades desde una plantilla Excel proporcionada", icon: "📥", ready: false },
          { label: "Respaldo de datos", desc: "Genera un respaldo JSON de todas las actividades", icon: "💾", ready: false },
        ].map(({ label, desc, icon, ready }) => (
          <div key={label} className="flex items-center justify-between p-4 bg-[#1A2540] rounded-xl border border-[#2A3F6A]">
            <div className="flex items-center gap-3">
              <span className="text-xl">{icon}</span>
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-[#64748B]">{desc}</p>
              </div>
            </div>
            <button
              disabled={!ready}
              className="px-3 py-1.5 text-xs rounded-lg bg-[#0D1526] border border-[#2A3F6A] text-[#475569] cursor-not-allowed"
            >
              Próximamente
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-[#475569] border border-[#1E2D4A] rounded-lg px-3 py-2">
        ℹ️ Las funciones de exportación e importación estarán disponibles tras completar la integración con el API. Solo se procesarán datos reales.
      </p>
    </div>
  );
}

/* ── API & Tokens ───────────────────────────────────────── */
function ApiSection() {
  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-lg text-white">API & Tokens de integración</h2>

      <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <p className="text-sm text-blue-300 font-medium mb-1">Integraciones planificadas</p>
        <ul className="text-xs text-[#94A3B8] space-y-1 list-disc list-inside">
          <li>Power BI — acceso directo a datasets de auditoría</li>
          <li>Google Analytics — métricas de uso de la plataforma</li>
          <li>Webhook saliente — notificaciones a sistemas externos</li>
        </ul>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-[#1A2540] rounded-xl border border-[#2A3F6A]">
          <div>
            <p className="text-sm font-semibold text-white">Token de acceso API</p>
            <p className="text-xs text-[#64748B]">Para integraciones externas y Power BI</p>
          </div>
          <button
            disabled
            className="px-3 py-1.5 text-xs rounded-lg bg-[#0D1526] border border-[#2A3F6A] text-[#475569] cursor-not-allowed"
          >
            Generar token
          </button>
        </div>
      </div>

      <p className="text-xs text-[#475569] border border-[#1E2D4A] rounded-lg px-3 py-2">
        ℹ️ La generación de tokens requerirá autenticación de administrador. Funcionalidad pendiente de conexión con el API.
      </p>
    </div>
  );
}

/* ── Placeholder ────────────────────────────────────────── */
function PlaceholderSection({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-[#1A2540] border border-[#2A3F6A] flex items-center justify-center mb-4">
        <Bell className="w-5 h-5 text-[#475569]" />
      </div>
      <p className="font-semibold text-[#94A3B8]">{label}</p>
      <p className="text-sm text-[#475569] mt-1">Próximamente disponible</p>
    </div>
  );
}

/* ── Usuarios ─────────────────────────────────────────── */
function UsuariosSection({ user }: { user: any }) {
  const ROLES = [
    { id: "ADMIN",        label: "Administrador",   desc: "Acceso total · gestiona usuarios, datos y configuración", color: "#EF4444" },
    { id: "AUDITOR",      label: "Auditor",         desc: "Crear · Editar · Guardar · Actualizar registros operativos", color: "#3B82F6" },
    { id: "VISUALIZADOR", label: "Visualizador",    desc: "Solo consulta · no puede modificar registros",               color: "#94A3B8" },
    { id: "GERENCIAL",    label: "Gerencial",       desc: "Ver Dashboards · Reportes · Indicadores · Exportar",         color: "#8B5CF6" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400"/> Gestión de Usuarios y Roles
        </h2>
        <button disabled className="btn-primary text-xs bg-amber-500 opacity-60 cursor-not-allowed">
          <Plus className="w-3.5 h-3.5"/> Crear Usuario
        </button>
      </div>

      {/* Rol del usuario actual */}
      <div className="card-base bg-amber-500/5 border-amber-500/20 p-4">
        <p className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-2">Tu sesión actual</p>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
            {user?.name?.slice(0,2).toUpperCase() ?? "AU"}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">{user?.name ?? "—"}</p>
            <p className="text-xs text-[#94A3B8] flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3 h-3"/> {user?.email ?? "—"}
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold uppercase tracking-wider">
            {user?.role ?? "VIEWER"}
          </span>
        </div>
      </div>

      {/* Catálogo de roles */}
      <div>
        <p className="text-xs uppercase tracking-wider text-[#94A3B8] font-semibold mb-3">Roles disponibles</p>
        <div className="space-y-2">
          {ROLES.map(r => (
            <div key={r.id} className="card-base flex items-center gap-3 p-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${r.color}18`, color: r.color }}>
                <Shield className="w-4 h-4"/>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">{r.label}</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">{r.desc}</p>
              </div>
              <code className="text-[10px] px-2 py-1 rounded bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8]">
                {r.id}
              </code>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de usuarios registrados */}
      <div>
        <p className="text-xs uppercase tracking-wider text-[#94A3B8] font-semibold mb-3">Usuarios registrados</p>
        <div className="card-base p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[#475569] border-b border-[#1E2D4A]">
                <th className="text-left p-3">Nombre</th>
                <th className="text-left p-3">Correo</th>
                <th className="text-left p-3">Rol</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-center p-3 w-16">Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#1E2D4A]/50">
                <td className="p-3 text-white">{user?.name ?? "—"}</td>
                <td className="p-3 text-[#94A3B8]">{user?.email ?? "—"}</td>
                <td className="p-3">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 font-bold uppercase">
                    {user?.role ?? "—"}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Activo
                  </span>
                </td>
                <td className="p-3 text-center">
                  <button disabled className="p-1 rounded hover:bg-[#1A2540] text-[#475569]">
                    <Edit2 className="w-3 h-3"/>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[#475569] mt-3 border border-[#1E2D4A] rounded-lg px-3 py-2">
          ℹ️ La creación de usuarios adicionales y asignación de roles requiere conexión al endpoint <code>/users</code> del API.
          Ya disponible en backend (controllers + service). La UI completa de gestión llegará en la próxima iteración.
        </p>
      </div>
    </div>
  );
}
