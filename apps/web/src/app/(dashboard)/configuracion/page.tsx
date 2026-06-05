"use client";
import React, { useState } from "react";
import {
  Shield, User, Bell, Palette, Database, Key, ChevronRight, CheckCircle2,
  Users, Plus, Mail, Edit2, Trash2, Power, KeyRound, Copy, X, AlertCircle,
  Loader2, RefreshCw, Activity,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";
import {
  useUsers, useCreateUser, useUpdateUser, useUpdateUserRole,
  useToggleUserActive, useDeleteUser, useResetUserPassword,
  useChangePassword, type AppUser, type CreateUserPayload,
} from "@/hooks/useUsers";
import {
  useSettings, useUpsertSetting, useApiTokens, useCreateApiToken,
  useRevokeApiToken, useDeleteApiToken, getSetting,
  type ApiToken,
} from "@/hooks/useSettings";
import {
  useInvitations, useCreateInvitation, useRevokeInvitation, useResendInvitation,
  type InvitationItem,
} from "@/hooks/useInvitations";
import { Send, Clock, CheckCircle as CheckSolid, Filter } from "lucide-react";

const sections = [
  { id: "perfil",       label: "Perfil",          icon: User,      description: "Información personal y credenciales" },
  { id: "usuarios",     label: "Usuarios",         icon: Users,     description: "Crear y gestionar usuarios + roles" },
  { id: "invitaciones", label: "Invitaciones",     icon: Send,      description: "Enviar invitaciones por correo con token temporal" },
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
          {active === "invitaciones" && <InvitacionesSection />}
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
          { label: "Importación masiva (CSV)", desc: "Carga lotes de granjas, hallazgos, KPIs, cronograma o CEDIS desde CSV", icon: "📥", href: "/configuracion/importar" },
          { label: "Exportar Excel · módulos", desc: "Cada módulo (Granjas, Rutas, CEDIS, Cronograma) tiene su propio botón Excel/CSV", icon: "📊", href: "/cedis/reportes" },
          { label: "Power BI · tokens API", desc: "Genera tokens externos para integración Power BI/datos en vivo", icon: "🔑", href: undefined, section: "api" as const },
        ].map((it: any) => (
          <a
            key={it.label}
            href={it.href ?? "#"}
            onClick={(e) => { if (!it.href) { e.preventDefault(); } }}
            className="flex items-center justify-between p-4 bg-[#1A2540] rounded-xl border border-[#2A3F6A] hover:border-cyan-500/40 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{it.icon}</span>
              <div>
                <p className="text-sm font-semibold text-white">{it.label}</p>
                <p className="text-xs text-[#64748B]">{it.desc}</p>
              </div>
            </div>
            <span className="px-3 py-1.5 text-xs rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 group-hover:bg-cyan-500/20">
              Abrir →
            </span>
          </a>
        ))}
      </div>

      <p className="text-xs text-[#475569] border border-[#1E2D4A] rounded-lg px-3 py-2">
        ℹ️ Las funciones de exportación e importación estarán disponibles tras completar la integración con el API. Solo se procesarán datos reales.
      </p>
    </div>
  );
}

/* ── API & Tokens · CONECTADO AL API ─────────────────── */
function ApiSection() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const integrationsQ = useSettings("integrations");
  const upsertSetting = useUpsertSetting();
  const tokensQ       = useApiTokens();
  const createToken   = useCreateApiToken();
  const revokeToken   = useRevokeApiToken();
  const deleteToken   = useDeleteApiToken();

  const [showCreate, setShowCreate] = useState(false);
  const [newToken, setNewToken]     = useState<{ name: string; token: string } | null>(null);
  const [pbiUrl, setPbiUrl]         = useState("");
  const [gaId, setGaId]             = useState("");
  const [savedMsg, setSavedMsg]     = useState<{ key: string; ok: boolean } | null>(null);

  // Hidratar valores desde Settings
  React.useEffect(() => {
    if (integrationsQ.data) {
      setPbiUrl(getSetting(integrationsQ.data, "integrations.powerBiEmbedUrl") ?? "");
      setGaId(getSetting(integrationsQ.data, "integrations.googleAnalyticsId") ?? "");
    }
  }, [integrationsQ.data]);

  const saveSetting = async (key: string, value: string, isPublic: boolean) => {
    try {
      await upsertSetting.mutateAsync({
        key,
        value,
        type: "STRING",
        category: "integrations",
        isPublic,
      });
      setSavedMsg({ key, ok: true });
      setTimeout(() => setSavedMsg(null), 3000);
    } catch {
      setSavedMsg({ key, ok: false });
    }
  };

  const tokens = tokensQ.data ?? [];
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-lg text-white">API · Power BI · Google Analytics</h2>

      {/* Banner informativo */}
      <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <p className="text-sm text-blue-300 font-medium mb-1">Integraciones activas</p>
        <ul className="text-xs text-[#94A3B8] space-y-1 list-disc list-inside">
          <li>Power BI · acceso directo a 8 datasets vía X-API-Token</li>
          <li>Google Analytics 4 · tracking pageviews + eventos custom</li>
          <li>Power BI embed · iframe configurable desde aquí</li>
        </ul>
      </div>

      {/* ── Power BI embed URL ── */}
      <div className="card-base p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Database className="w-4 h-4 text-amber-400"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Power BI · URL de embed</p>
            <p className="text-xs text-[#64748B] mt-0.5">
              Pega aquí la URL de Power BI "Publish to web" o "Embed in app"
            </p>
          </div>
        </div>
        <input
          type="url"
          value={pbiUrl}
          onChange={e => setPbiUrl(e.target.value)}
          placeholder="https://app.powerbi.com/view?r=eyJrIjoi..."
          className="w-full bg-[#1A2540] border border-[#2A3F6A] rounded-lg px-3 py-2 text-sm text-white"
          disabled={!isAdmin}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => saveSetting("integrations.powerBiEmbedUrl", pbiUrl, false)}
            disabled={!isAdmin || upsertSetting.isPending}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-[#0A111F] text-xs font-bold disabled:opacity-50"
          >
            Guardar
          </button>
          {pbiUrl && (
            <a
              href="/indicadores/powerbi"
              className="px-3 py-1.5 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-xs text-[#94A3B8] hover:text-white"
            >
              Ver embed →
            </a>
          )}
          {savedMsg?.key === "integrations.powerBiEmbedUrl" && (
            <span className={cn("text-xs", savedMsg.ok ? "text-emerald-400" : "text-red-400")}>
              {savedMsg.ok ? "✓ Guardado" : "✗ Error"}
            </span>
          )}
        </div>
      </div>

      {/* ── Google Analytics ID ── */}
      <div className="card-base p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-blue-400"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Google Analytics 4 · Measurement ID</p>
            <p className="text-xs text-[#64748B] mt-0.5">
              Formato G-XXXXXXXXXX (lo encuentras en Admin → Data Streams)
            </p>
          </div>
        </div>
        <input
          type="text"
          value={gaId}
          onChange={e => setGaId(e.target.value)}
          placeholder="G-XXXXXXXXXX"
          pattern="^G-[A-Z0-9]+$"
          className="w-full bg-[#1A2540] border border-[#2A3F6A] rounded-lg px-3 py-2 text-sm text-white font-mono"
          disabled={!isAdmin}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => saveSetting("integrations.googleAnalyticsId", gaId, true)}
            disabled={!isAdmin || upsertSetting.isPending}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-[#0A111F] text-xs font-bold disabled:opacity-50"
          >
            Guardar
          </button>
          {savedMsg?.key === "integrations.googleAnalyticsId" && (
            <span className={cn("text-xs", savedMsg.ok ? "text-emerald-400" : "text-red-400")}>
              {savedMsg.ok ? "✓ Guardado · refrescá la página para activar" : "✗ Error"}
            </span>
          )}
        </div>
      </div>

      {/* ── API Tokens ── */}
      <div className="card-base p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400"/> Tokens API · Power BI / scripts externos
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Tokens permanentes para servicios que no inician sesión humana
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            disabled={!isAdmin}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2",
              isAdmin
                ? "bg-amber-500 text-[#0A111F] hover:bg-amber-400"
                : "bg-[#1A2540] text-[#475569] cursor-not-allowed border border-[#2A3F6A]"
            )}
          >
            <Plus className="w-3.5 h-3.5"/> Generar token
          </button>
        </div>

        {tokensQ.isLoading ? (
          <div className="py-6 flex items-center justify-center text-[#475569]">
            <Loader2 className="w-4 h-4 animate-spin"/>
            <span className="ml-2 text-xs">Cargando...</span>
          </div>
        ) : tokens.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#475569]">
            Sin tokens generados aún. Click en "Generar token" para crear uno.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[#475569] border-b border-[#1E2D4A]">
                <th className="text-left p-2">Nombre</th>
                <th className="text-left p-2">Prefix</th>
                <th className="text-left p-2">Scopes</th>
                <th className="text-center p-2">Estado</th>
                <th className="text-left p-2">Último uso</th>
                <th className="text-center p-2 w-20">Acción</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t: ApiToken) => {
                const scopesArr: string[] = (() => { try { return JSON.parse(t.scopes); } catch { return []; } })();
                return (
                  <tr key={t.id} className="border-b border-[#1E2D4A]/50">
                    <td className="p-2 text-white">{t.name}</td>
                    <td className="p-2 text-[#94A3B8] font-mono text-xs">{t.tokenPrefix}…</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {scopesArr.map(s => (
                          <code key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1A2540] text-[#94A3B8] border border-[#2A3F6A]">
                            {s}
                          </code>
                        ))}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border",
                        t.isActive
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-red-500/15 text-red-300 border-red-500/30"
                      )}>
                        {t.isActive ? "Activo" : "Revocado"}
                      </span>
                    </td>
                    <td className="p-2 text-[#94A3B8] text-xs">
                      {t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString("es-CO") : "Nunca"}
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {t.isActive && (
                          <button
                            onClick={async () => {
                              if (confirm(`¿Revocar token "${t.name}"? Power BI dejará de tener acceso.`)) {
                                await revokeToken.mutateAsync(t.id);
                              }
                            }}
                            disabled={!isAdmin}
                            className="p-1.5 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-orange-400 disabled:text-[#475569]"
                            title="Revocar"
                          >
                            <Power className="w-3 h-3"/>
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (confirm(`¿Eliminar definitivamente el token "${t.name}"?`)) {
                              await deleteToken.mutateAsync(t.id);
                            }
                          }}
                          disabled={!isAdmin}
                          className="p-1.5 rounded hover:bg-red-500/10 text-[#94A3B8] hover:text-red-400 disabled:text-[#475569]"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3 h-3"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Instrucciones Power BI Desktop ── */}
      <div className="card-base p-4 bg-blue-500/5 border-blue-500/20">
        <h3 className="text-sm font-semibold text-blue-300 mb-2">📊 Conectar Power BI Desktop</h3>
        <ol className="text-xs text-[#94A3B8] space-y-2 list-decimal list-inside">
          <li>En Power BI Desktop · <code className="text-amber-400">Obtener datos → Web</code></li>
          <li>Elegí <code className="text-amber-400">Avanzado</code> e ingresá:
            <div className="ml-4 mt-1 space-y-1">
              <p>URL: <code className="text-emerald-300">{apiBase}/api/v1/powerbi/granjas</code></p>
              <p>HTTP request header parameters:</p>
              <p className="ml-3"><code className="text-emerald-300">X-API-Token = savicol_pk_XXXXXXXX</code></p>
            </div>
          </li>
          <li>Cargar · Power BI ingiere el JSON automáticamente</li>
          <li>Repetir para cada dataset: rutas, cedis, hallazgos-granjas, hallazgos-cedis, kpis, cronograma, summary</li>
          <li>Programar refresh en Power BI Service para datos actualizados</li>
        </ol>
        <p className="text-[10px] text-[#475569] mt-3">
          📚 Discovery endpoint: <code className="text-amber-400">GET /api/v1/powerbi/metadata</code> · lista todos los datasets disponibles
        </p>
      </div>

      {/* Modal: Crear token */}
      {showCreate && (
        <CreateTokenModal
          onClose={() => setShowCreate(false)}
          onCreated={(result) => {
            setShowCreate(false);
            setNewToken({ name: result.name, token: (result as any).token });
          }}
          mutation={createToken}
        />
      )}

      {/* Modal: Token recién creado (solo se ve una vez) */}
      {newToken && (
        <TokenRevealModal data={newToken} onClose={() => setNewToken(null)} />
      )}
    </div>
  );
}

/* ── Modal: Crear API Token ──────────────────────────── */
function CreateTokenModal({ onClose, onCreated, mutation }: {
  onClose: () => void;
  onCreated: (r: any) => void;
  mutation: ReturnType<typeof useCreateApiToken>;
}) {
  const [name, setName]       = useState("");
  const [scopes, setScopes]   = useState<string[]>(["powerbi:read"]);
  const [expDays, setExpDays] = useState<number | "">("");
  const [error, setError]     = useState("");

  const SCOPE_OPTIONS = [
    { id: "powerbi:read",     label: "Power BI · lectura de datasets" },
    { id: "reports:read",     label: "Reports · descarga Excel/CSV" },
    { id: "dashboards:read",  label: "Dashboards · KPIs ejecutivos" },
    { id: "granjas:read",     label: "Granjas · solo este módulo" },
    { id: "rutas:read",       label: "Rutas · solo este módulo" },
    { id: "cedis:read",       label: "CEDIS · solo este módulo" },
    { id: "hallazgos:read",   label: "Hallazgos · solo este módulo" },
    { id: "all:read",         label: "Todo · lectura completa" },
  ];

  const submit = async () => {
    setError("");
    if (!name || name.length < 3) {
      setError("Nombre debe tener al menos 3 caracteres");
      return;
    }
    if (scopes.length === 0) {
      setError("Elegí al menos un scope");
      return;
    }
    try {
      const t = await mutation.mutateAsync({
        name,
        scopes,
        expiresInDays: expDays ? +expDays : undefined,
      });
      onCreated(t);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error al crear token");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-white text-lg flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400"/> Generar API Token
          </h3>
          <button onClick={onClose} className="text-[#475569] hover:text-white"><X className="w-4 h-4"/></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#64748B]">Nombre descriptivo *</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Power BI Producción"
              className="w-full bg-[#1A2540] border border-[#2A3F6A] rounded-lg px-3 py-2 text-sm text-white mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-[#64748B]">Permisos (scopes)</label>
            <div className="grid grid-cols-1 gap-1 mt-1 max-h-40 overflow-y-auto bg-[#1A2540] border border-[#2A3F6A] rounded-lg p-2">
              {SCOPE_OPTIONS.map(opt => (
                <label key={opt.id} className="flex items-center gap-2 text-xs text-white py-1 cursor-pointer hover:bg-[#0D1526] rounded px-2">
                  <input
                    type="checkbox"
                    checked={scopes.includes(opt.id)}
                    onChange={e => {
                      if (e.target.checked) setScopes([...scopes, opt.id]);
                      else setScopes(scopes.filter(s => s !== opt.id));
                    }}
                  />
                  <code className="text-amber-400 text-[10px]">{opt.id}</code>
                  <span className="text-[#94A3B8] truncate">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-[#64748B]">Expiración (días · dejar vacío = sin expiración)</label>
            <input
              type="number" min="1" max="365"
              value={expDays}
              onChange={e => setExpDays(e.target.value ? +e.target.value : "")}
              placeholder="Ej: 90"
              className="w-full bg-[#1A2540] border border-[#2A3F6A] rounded-lg px-3 py-2 text-sm text-white mt-1"
            />
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
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Key className="w-3.5 h-3.5"/>}
            Generar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal: Token recién creado ─────────────────────── */
function TokenRevealModal({ data, onClose }: {
  data: { name: string; token: string };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0D1526] border border-amber-500/40 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-white text-lg flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400"/> Token generado · "{data.name}"
          </h3>
          <button onClick={onClose} className="text-[#475569] hover:text-white"><X className="w-4 h-4"/></button>
        </div>

        <div className="space-y-3">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0"/>
            <span>
              Esta es la <strong>ÚNICA vez</strong> que verás este token completo.
              Si lo perdés, deberás generar uno nuevo. Cópialo y configurálo en Power BI ahora.
            </span>
          </div>

          <div className="bg-[#1A2540] border border-[#2A3F6A] rounded-lg p-3">
            <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-2">Token</p>
            <p className="font-mono text-sm text-amber-400 break-all py-2">{data.token}</p>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(data.token);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="w-full px-3 py-2 rounded-lg bg-amber-500 text-[#0A111F] text-sm font-bold flex items-center justify-center gap-2"
          >
            <Copy className="w-3.5 h-3.5"/>
            {copied ? "¡Copiado!" : "Copiar token"}
          </button>

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2 text-xs text-[#94A3B8]">
            <p className="font-semibold text-blue-300 mb-1">Header HTTP en Power BI:</p>
            <code className="block text-emerald-300 bg-[#070B14] rounded px-2 py-1 mt-1 text-[10px] break-all">
              X-API-Token: {data.token}
            </code>
          </div>
        </div>
      </div>
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

// ═══════════════════════════════════════════════════════════════════════════════
// INVITACIONES · admin
// ═══════════════════════════════════════════════════════════════════════════════
function InvitacionesSection() {
  const [status, setStatus]       = useState<string>("");
  const [showInvite, setShowInvite] = useState(false);
  const [resentLink, setResentLink] = useState<string | null>(null);

  const invQ        = useInvitations(status ? { status } : {});
  const createInv   = useCreateInvitation();
  const revokeInv   = useRevokeInvitation();
  const resendInv   = useResendInvitation();

  const items: InvitationItem[] = invQ.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg text-white">Invitaciones de usuarios</h2>
          <p className="text-xs text-[#94A3B8] mt-1">
            Envía invitaciones por correo · el usuario crea su propia contraseña vía token temporal (24h).
          </p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary text-xs bg-amber-500 hover:bg-amber-600 flex items-center gap-1.5">
          <Send className="w-3.5 h-3.5"/>Enviar invitación
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-[#94A3B8]"/>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
          <option value="">Todas</option>
          <option value="PENDING">Pendientes</option>
          <option value="ACCEPTED">Aceptadas</option>
          <option value="EXPIRED">Expiradas</option>
          <option value="REVOKED">Revocadas</option>
        </select>
        <span className="text-[10px] text-[#475569] ml-auto">{items.length} registros</span>
      </div>

      {resentLink && (
        <div className="px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold mb-1">SMTP no configurado — link generado manualmente:</p>
            <p className="text-[10px] text-cyan-200 break-all">{resentLink}</p>
            <button onClick={() => { navigator.clipboard.writeText(resentLink); setResentLink(null); }} className="text-[10px] underline mt-1">Copiar y cerrar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {invQ.isLoading ? (
          <div className="py-10 text-center text-[#475569]"><Loader2 className="w-5 h-5 animate-spin mx-auto"/></div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <Send className="w-8 h-8 text-[#1E2D4A] mx-auto mb-3"/>
            <p className="text-xs text-[#94A3B8]">No hay invitaciones {status && `· status: ${status}`}</p>
          </div>
        ) : items.map(inv => {
          const expired = inv.status === "EXPIRED" || (inv.status === "PENDING" && new Date(inv.expiresAt).getTime() < Date.now());
          const color = inv.status === "ACCEPTED" ? "#10B981" : inv.status === "PENDING" ? (expired ? "#94A3B8" : "#F59E0B") : "#94A3B8";
          const Icon  = inv.status === "ACCEPTED" ? CheckSolid : expired ? Clock : Send;
          return (
            <div key={inv.id} className="bg-[#1A2540] border border-[#2A3F6A] rounded-lg p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>
                <Icon className="w-4 h-4"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-white font-semibold truncate">{inv.name}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: `${color}18`, color }}>
                    {inv.status}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-semibold">{inv.role}</span>
                </div>
                <p className="text-[11px] text-[#94A3B8]">{inv.email}</p>
                <p className="text-[10px] text-[#475569] mt-0.5">
                  Invitado por {inv.invitedByName} · {new Date(inv.createdAt).toLocaleDateString("es-CO")}
                  {inv.status === "PENDING" && !expired && ` · expira ${new Date(inv.expiresAt).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}`}
                  {inv.status === "ACCEPTED" && inv.acceptedAt && ` · aceptada ${new Date(inv.acceptedAt).toLocaleDateString("es-CO")}`}
                </p>
              </div>
              {inv.status === "PENDING" && (
                <div className="flex gap-1">
                  <button
                    onClick={async () => {
                      try {
                        const r = await resendInv.mutateAsync(inv.id);
                        if (r.mode === "noop" && r.activationUrl) setResentLink(r.activationUrl);
                        else alert(`Correo reenviado a ${inv.email}`);
                      } catch (e: any) {
                        alert("Error: " + (e?.response?.data?.message ?? e?.message));
                      }
                    }}
                    className="p-1.5 rounded hover:bg-cyan-500/10 text-[#94A3B8] hover:text-cyan-400"
                    title="Reenviar"
                  >
                    <Send className="w-3.5 h-3.5"/>
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`¿Revocar invitación de ${inv.email}?`)) return;
                      try { await revokeInv.mutateAsync(inv.id); }
                      catch (e: any) { alert("Error: " + (e?.response?.data?.message ?? e?.message)); }
                    }}
                    className="p-1.5 rounded hover:bg-red-500/10 text-[#94A3B8] hover:text-red-400"
                    title="Revocar"
                  >
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSubmit={async (dto) => {
            try {
              const r = await createInv.mutateAsync(dto);
              if (r.emailMode === "noop" && r.activationUrl) {
                setResentLink(r.activationUrl);
              } else {
                alert(`Invitación enviada a ${r.email}`);
              }
              setShowInvite(false);
            } catch (e: any) {
              throw e;
            }
          }}
        />
      )}
    </div>
  );
}

function InviteModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (dto: { email: string; name: string; role: string }) => Promise<void>;
}) {
  const [form, setForm] = useState({ email: "", name: "", role: "AUDITOR" });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    if (!form.email.includes("@")) { setErr("Email inválido"); return; }
    if (!form.name.trim())         { setErr("Nombre obligatorio"); return; }
    setSubmitting(true);
    try { await onSubmit(form); }
    catch (e: any) { setErr(e?.response?.data?.message ?? e?.message ?? "Error"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-md overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h3 className="font-display font-bold text-white">Enviar invitación</h3>
            <p className="text-[10px] text-[#94A3B8] mt-0.5">El usuario recibirá un correo con link de activación</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>
        <form onSubmit={submit} className="px-6 py-4 space-y-3">
          <div>
            <label className="text-xs text-[#94A3B8] mb-1.5 block">Correo *</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              required className="input-base" placeholder="usuario@savicol.com"/>
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] mb-1.5 block">Nombre *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              required className="input-base" placeholder="Ej. Juan Pérez"/>
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] mb-1.5 block">Rol</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-base">
              {ROLES_CATALOG.filter(r => r.id !== "AI_AGENT").map(r => (
                <option key={r.id} value={r.id}>{r.label} · {r.id}</option>
              ))}
            </select>
          </div>
          {err && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5"/><span>{err}</span>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost text-xs" disabled={submitting}>Cancelar</button>
            <button type="submit" disabled={submitting}
              className="btn-primary text-xs bg-amber-500 hover:bg-amber-600 flex items-center gap-2 disabled:opacity-50">
              {submitting && <Loader2 className="w-3 h-3 animate-spin"/>}
              {submitting ? "Enviando..." : "Enviar invitación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
