"use client";
import { useState } from "react";
import {
  Shield, User, Bell, Palette, Database, Key, ChevronRight, CheckCircle2,
  Users, Plus, Mail, Edit2, Trash2, Power, KeyRound, Copy, X, AlertCircle,
  Loader2, RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";
import {
  useUsers, useCreateUser, useUpdateUser, useUpdateUserRole,
  useToggleUserActive, useDeleteUser, useResetUserPassword,
  useChangePassword, type AppUser, type CreateUserPayload,
} from "@/hooks/useUsers";

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
  const { user } = useAuthStore();
  const [current, setCurrent] = useState("");
  const [next, setNext]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg]         = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const change = useChangePassword();

  const submit = async () => {
    setMsg(null);
    if (next !== confirm) {
      setMsg({ type: "err", text: "La nueva contraseña no coincide con la confirmación" });
      return;
    }
    if (next.length < 8) {
      setMsg({ type: "err", text: "La nueva contraseña debe tener al menos 8 caracteres" });
      return;
    }
    if (!user?.id) {
      setMsg({ type: "err", text: "No hay sesión activa" });
      return;
    }
    try {
      await change.mutateAsync({ id: user.id, currentPassword: current, newPassword: next });
      setMsg({ type: "ok", text: "Contraseña actualizada. La sesión se cerrará en 3 segundos." });
      setTimeout(() => {
        useAuthStore.getState().logout();
        if (typeof window !== "undefined") window.location.href = "/login";
      }, 3000);
    } catch (e: any) {
      setMsg({ type: "err", text: e?.response?.data?.message ?? "Error al cambiar contraseña" });
    }
  };

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
          {user?.mfaEnabled ? "Activo" : "Disponible"}
        </div>
      </div>

      {/* Password change · CONECTADO al API */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[#94A3B8]">Cambio de contraseña</h3>
        <div className="space-y-1">
          <label className="text-xs text-[#64748B]">Contraseña actual</label>
          <input type="password" value={current} onChange={e => setCurrent(e.target.value)}
            placeholder="••••••••••••"
            className="w-full bg-[#0D1526] border border-[#2A3F6A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#64748B]">Nueva contraseña (mín. 8 caracteres)</label>
          <input type="password" value={next} onChange={e => setNext(e.target.value)}
            placeholder="••••••••••••"
            className="w-full bg-[#0D1526] border border-[#2A3F6A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#64748B]">Confirmar nueva contraseña</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="••••••••••••"
            className="w-full bg-[#0D1526] border border-[#2A3F6A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all" />
        </div>

        {msg && (
          <div className={cn(
            "flex items-start gap-2 text-xs rounded-lg px-3 py-2 border",
            msg.type === "ok"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-red-500/10 border-red-500/20 text-red-300"
          )}>
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{msg.text}</span>
          </div>
        )}

        <button
          onClick={submit}
          disabled={change.isPending || !current || !next || !confirm}
          className="mt-2 px-4 py-2 rounded-lg bg-amber-500 text-[#0A111F] text-sm font-bold flex items-center gap-2 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {change.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <KeyRound className="w-3.5 h-3.5"/>}
          {change.isPending ? "Actualizando..." : "Actualizar contraseña"}
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

/* ── Usuarios · CONECTADO AL API ──────────────────────── */
const ROLES_CATALOG = [
  { id: "ADMIN",      label: "Administrador", desc: "Acceso total · gestiona usuarios, datos y configuración",     color: "#EF4444" },
  { id: "AUDITOR",    label: "Auditor",       desc: "Crear · Editar · Guardar · Actualizar registros operativos",  color: "#3B82F6" },
  { id: "SUPERVISOR", label: "Supervisor",    desc: "Supervisa auditores · Aprueba hallazgos",                     color: "#F59E0B" },
  { id: "AUDITEE",    label: "Auditeo",       desc: "Usuario auditado · Lectura limitada a sus registros",         color: "#06B6D4" },
  { id: "VIEWER",     label: "Visualizador",  desc: "Solo consulta · no puede modificar registros",                color: "#94A3B8" },
  { id: "AI_AGENT",   label: "Agente IA",     desc: "Agente automatizado · permisos restringidos",                 color: "#8B5CF6" },
];

const roleColor = (role: string) =>
  ROLES_CATALOG.find(r => r.id === role)?.color ?? "#94A3B8";

function UsuariosSection({ user }: { user: any }) {
  const isAdmin = user?.role === "ADMIN";
  const [search, setSearch]         = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState<AppUser | null>(null);
  const [pwdResult, setPwdResult]   = useState<{ email: string; password: string } | null>(null);

  const usersQ        = useUsers({ search });
  const createUser    = useCreateUser();
  const updateUser    = useUpdateUser();
  const updateRole    = useUpdateUserRole();
  const toggleActive  = useToggleUserActive();
  const deleteUser    = useDeleteUser();
  const resetPwd      = useResetUserPassword();

  const users = usersQ.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400"/> Gestión de Usuarios y Roles
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          disabled={!isAdmin}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all",
            isAdmin
              ? "bg-amber-500 text-[#0A111F] hover:bg-amber-400"
              : "bg-[#1A2540] text-[#475569] cursor-not-allowed border border-[#2A3F6A]"
          )}
          title={isAdmin ? "Crear nuevo usuario" : "Solo ADMIN puede crear usuarios"}
        >
          <Plus className="w-3.5 h-3.5"/> Crear Usuario
        </button>
      </div>

      {/* Tu sesión */}
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
          <span
            className="px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider"
            style={{
              background: `${roleColor(user?.role)}25`,
              color: roleColor(user?.role),
              borderColor: `${roleColor(user?.role)}40`,
            }}
          >
            {user?.role ?? "VIEWER"}
          </span>
        </div>
      </div>

      {/* Catálogo de roles */}
      <div>
        <p className="text-xs uppercase tracking-wider text-[#94A3B8] font-semibold mb-3">Roles disponibles ({ROLES_CATALOG.length})</p>
        <div className="space-y-2">
          {ROLES_CATALOG.map(r => (
            <div key={r.id} className="card-base flex items-center gap-3 p-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${r.color}18`, color: r.color }}>
                <Shield className="w-4 h-4"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">{r.label}</p>
                <p className="text-xs text-[#94A3B8] mt-0.5 truncate">{r.desc}</p>
              </div>
              <code className="text-[10px] px-2 py-1 rounded bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8] shrink-0">
                {r.id}
              </code>
            </div>
          ))}
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o correo..."
          className="flex-1 bg-[#0D1526] border border-[#2A3F6A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        />
        <button
          onClick={() => usersQ.refetch()}
          className="p-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8] hover:text-white"
          title="Refrescar"
        >
          <RefreshCw className={cn("w-4 h-4", usersQ.isFetching && "animate-spin")}/>
        </button>
      </div>

      {/* Tabla de usuarios desde API */}
      <div>
        <p className="text-xs uppercase tracking-wider text-[#94A3B8] font-semibold mb-3">
          Usuarios registrados {usersQ.data ? `(${usersQ.data.length})` : ""}
        </p>
        <div className="card-base p-0 overflow-hidden">
          {usersQ.isLoading ? (
            <div className="p-8 flex items-center justify-center text-[#475569]">
              <Loader2 className="w-5 h-5 animate-spin"/>
              <span className="ml-2 text-sm">Cargando usuarios...</span>
            </div>
          ) : usersQ.error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2"/>
              <p className="text-sm text-red-300">Error al cargar usuarios</p>
              <p className="text-xs text-[#475569] mt-1">{(usersQ.error as any)?.message ?? "Conexión fallida"}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-[#475569] text-sm">
              No hay usuarios que coincidan con la búsqueda
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[#475569] border-b border-[#1E2D4A]">
                  <th className="text-left p-3">Nombre</th>
                  <th className="text-left p-3">Correo</th>
                  <th className="text-left p-3">Rol</th>
                  <th className="text-center p-3">Estado</th>
                  <th className="text-center p-3 w-32">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: AppUser) => (
                  <tr key={u.id} className="border-b border-[#1E2D4A]/50 hover:bg-[#0D1526]/50">
                    <td className="p-3 text-white">{u.name}</td>
                    <td className="p-3 text-[#94A3B8]">{u.email}</td>
                    <td className="p-3">
                      <select
                        value={u.role}
                        disabled={!isAdmin}
                        onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value })}
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border bg-transparent disabled:cursor-not-allowed"
                        style={{
                          color: roleColor(u.role),
                          borderColor: `${roleColor(u.role)}40`,
                          background: `${roleColor(u.role)}15`,
                        }}
                      >
                        {ROLES_CATALOG.map(r => (
                          <option key={r.id} value={r.id} className="bg-[#0D1526] text-white">{r.id}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => isAdmin && toggleActive.mutate(u.id)}
                        disabled={!isAdmin || toggleActive.isPending}
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border font-medium transition-all",
                          u.isActive
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                            : "bg-[#1A2540] text-[#64748B] border-[#2A3F6A] hover:bg-[#1A2540]"
                        )}
                        title={isAdmin ? "Click para alternar" : "Solo ADMIN puede modificar"}
                      >
                        {u.isActive ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditing(u)}
                          disabled={!isAdmin}
                          className="p-1.5 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-white disabled:text-[#475569] disabled:cursor-not-allowed"
                          title="Editar"
                        >
                          <Edit2 className="w-3 h-3"/>
                        </button>
                        <button
                          onClick={async () => {
                            if (!isAdmin) return;
                            if (!confirm(`¿Resetear contraseña de ${u.email}?\nSe generará una contraseña temporal.`)) return;
                            try {
                              const r = await resetPwd.mutateAsync(u.id);
                              setPwdResult({ email: u.email, password: r.tempPassword });
                            } catch (e: any) {
                              alert("Error: " + (e?.response?.data?.message ?? "Falló"));
                            }
                          }}
                          disabled={!isAdmin || resetPwd.isPending}
                          className="p-1.5 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-amber-400 disabled:text-[#475569] disabled:cursor-not-allowed"
                          title="Resetear contraseña"
                        >
                          <KeyRound className="w-3 h-3"/>
                        </button>
                        <button
                          onClick={async () => {
                            if (!isAdmin) return;
                            if (u.id === user?.id) {
                              alert("No puedes eliminar tu propio usuario");
                              return;
                            }
                            if (!confirm(`¿Eliminar definitivamente a ${u.email}?\nEsta acción no se puede deshacer.`)) return;
                            try {
                              await deleteUser.mutateAsync(u.id);
                            } catch (e: any) {
                              alert("Error: " + (e?.response?.data?.message ?? "Falló"));
                            }
                          }}
                          disabled={!isAdmin || deleteUser.isPending || u.id === user?.id}
                          className="p-1.5 rounded hover:bg-red-500/10 text-[#94A3B8] hover:text-red-400 disabled:text-[#475569] disabled:cursor-not-allowed"
                          title={u.id === user?.id ? "No puedes eliminarte" : "Eliminar"}
                        >
                          <Trash2 className="w-3 h-3"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!isAdmin && (
          <p className="text-xs text-[#475569] mt-3 border border-[#1E2D4A] rounded-lg px-3 py-2">
            ℹ️ Las acciones de creación, edición, cambio de rol y eliminación requieren rol ADMIN.
          </p>
        )}
      </div>

      {/* Modal: Crear usuario */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={(result) => {
            setShowCreate(false);
            if (result.tempPassword) {
              setPwdResult({ email: result.email, password: result.tempPassword });
            }
          }}
          mutation={createUser}
        />
      )}

      {/* Modal: Editar usuario */}
      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
          mutation={updateUser}
        />
      )}

      {/* Modal: Resultado contraseña temporal */}
      {pwdResult && (
        <TempPasswordModal data={pwdResult} onClose={() => setPwdResult(null)} />
      )}
    </div>
  );
}

/* ── Modal: Crear usuario ─────────────────────────────── */
function CreateUserModal({ onClose, onCreated, mutation }: {
  onClose: () => void;
  onCreated: (r: { email: string; tempPassword?: string }) => void;
  mutation: ReturnType<typeof useCreateUser>;
}) {
  const [form, setForm] = useState<CreateUserPayload>({
    email: "", name: "", role: "VIEWER", mfaEnabled: false,
  });
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!form.email || !form.name) {
      setError("Email y nombre son obligatorios");
      return;
    }
    try {
      const u = await mutation.mutateAsync(form);
      onCreated({ email: u.email, tempPassword: (u as any).tempPassword });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error al crear usuario");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-white text-lg flex items-center gap-2">
            <Plus className="w-4 h-4 text-amber-400"/> Crear Usuario
          </h3>
          <button onClick={onClose} className="text-[#475569] hover:text-white"><X className="w-4 h-4"/></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#64748B]">Correo corporativo *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="usuario@savicol.com"
              className="w-full bg-[#1A2540] border border-[#2A3F6A] rounded-lg px-3 py-2 text-sm text-white mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-[#64748B]">Nombre completo *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre Apellido"
              className="w-full bg-[#1A2540] border border-[#2A3F6A] rounded-lg px-3 py-2 text-sm text-white mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-[#64748B]">Rol</label>
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full bg-[#1A2540] border border-[#2A3F6A] rounded-lg px-3 py-2 text-sm text-white mt-1"
            >
              {ROLES_CATALOG.map(r => (
                <option key={r.id} value={r.id}>{r.label} ({r.id})</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-[#475569] border border-[#1E2D4A] rounded-lg px-3 py-2">
            ℹ️ Se generará una contraseña temporal de 16 caracteres seguros. El usuario debe cambiarla en su primer login.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5"/> {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-3 py-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8] text-sm">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={mutation.isPending}
            className="flex-1 px-3 py-2 rounded-lg bg-amber-500 text-[#0A111F] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Plus className="w-3.5 h-3.5"/>}
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal: Editar usuario ────────────────────────────── */
function EditUserModal({ user, onClose, onSaved, mutation }: {
  user: AppUser;
  onClose: () => void;
  onSaved: () => void;
  mutation: ReturnType<typeof useUpdateUser>;
}) {
  const [name, setName]   = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    try {
      await mutation.mutateAsync({ id: user.id, patch: { name, email } });
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error al guardar");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-white text-lg flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-amber-400"/> Editar Usuario
          </h3>
          <button onClick={onClose} className="text-[#475569] hover:text-white"><X className="w-4 h-4"/></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#64748B]">Nombre</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-[#1A2540] border border-[#2A3F6A] rounded-lg px-3 py-2 text-sm text-white mt-1"/>
          </div>
          <div>
            <label className="text-xs text-[#64748B]">Correo</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#1A2540] border border-[#2A3F6A] rounded-lg px-3 py-2 text-sm text-white mt-1"/>
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5"/> {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-3 py-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8] text-sm">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={mutation.isPending}
            className="flex-1 px-3 py-2 rounded-lg bg-amber-500 text-[#0A111F] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Edit2 className="w-3.5 h-3.5"/>}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal: Contraseña temporal generada ──────────────── */
function TempPasswordModal({ data, onClose }: {
  data: { email: string; password: string };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(data.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0D1526] border border-amber-500/40 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-white text-lg flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400"/> Contraseña temporal
          </h3>
          <button onClick={onClose} className="text-[#475569] hover:text-white"><X className="w-4 h-4"/></button>
        </div>

        <div className="space-y-3">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0"/>
            <span>
              Esta contraseña <strong>no se mostrará otra vez</strong>. Copiala y entregala al usuario {data.email}.
              Debe cambiarla en su primer login.
            </span>
          </div>

          <div className="bg-[#1A2540] border border-[#2A3F6A] rounded-lg p-3">
            <p className="text-xs text-[#64748B] mb-1">Para: {data.email}</p>
            <p className="font-mono text-lg text-amber-400 text-center break-all tracking-wider py-2">{data.password}</p>
          </div>

          <button
            onClick={copy}
            className="w-full px-3 py-2 rounded-lg bg-amber-500 text-[#0A111F] text-sm font-bold flex items-center justify-center gap-2"
          >
            <Copy className="w-3.5 h-3.5"/>
            {copied ? "¡Copiado!" : "Copiar contraseña"}
          </button>
        </div>
      </div>
    </div>
  );
}
