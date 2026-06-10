// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL SERVICE · SMTP nodemailer + Brevo HTTP API + Resend HTTP API
// ═══════════════════════════════════════════════════════════════════════════════
// Vars requeridas para Brevo API (modo recomendado en Railway):
//   BREVO_API_KEY   → xsmtpsib-... (Settings > API Keys en app.brevo.com)
//   SMTP_FROM       → "Auditoría Savicol <auditoriasavicol@gmail.com>"
//   APP_BASE_URL    → https://savicol-audit-platform-web.vercel.app
//
// Vars para Resend API (alternativa):
//   RESEND_API_KEY  → re_...
//
// Vars para SMTP clásico (fallback):
//   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
//
// Prioridad: BREVO_API_KEY > RESEND_API_KEY > SMTP_HOST > no-op
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

export interface EmailEnvelope {
  to:       string | string[];
  subject:  string;
  html:     string;
  text?:    string;
  replyTo?: string;
  cc?:      string[];
  bcc?:     string[]
}

export interface EmailDispatchResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  mode: "brevo" | "resend" | "smtp" | "noop";
}

type EmailMode = "brevo" | "resend" | "smtp" | "noop";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private from: string;
  private mode: EmailMode;
  private brevoKey: string | null = null;
  private resendKey: string | null = null;

  constructor() {
    this.from = process.env.SMTP_FROM ?? "Savicol Audit <noreply@savicol.com>";

    const brevoKey  = process.env.BREVO_API_KEY?.trim();
    const resendKey = process.env.RESEND_API_KEY?.trim();
    const smtpHost  = process.env.SMTP_HOST?.trim();
    const smtpUser  = process.env.SMTP_USER?.trim();
    const smtpPass  = process.env.SMTP_PASS?.trim();

    // ── Modo 1: Brevo HTTP API (recomendado en Railway) ──────────────────
    if (brevoKey) {
      this.mode     = "brevo";
      this.brevoKey = brevoKey;
      this.logger.log(`[EmailService] Modo BREVO API · from=${this.from}`);
      return;
    }

    // ── Modo 2: Resend HTTP API ───────────────────────────────────────────
    if (resendKey) {
      this.mode      = "resend";
      this.resendKey = resendKey;
      this.logger.log(`[EmailService] Modo RESEND API · from=${this.from}`);
      return;
    }

    // ── Modo 3: SMTP nodemailer (bloqueado en Railway Starter) ────────────
    if (smtpHost && smtpUser && smtpPass) {
      this.mode = "smtp";
      const port     = Number(process.env.SMTP_PORT ?? 587);
      const cleanPw  = smtpPass.replace(/\s+/g, "");
      this.transporter = nodemailer.createTransport({
        host: smtpHost, port,
        secure: port === 465,
        requireTLS: port === 587,
        auth: { user: smtpUser, pass: cleanPw },
        tls: { rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false" },
        logger: process.env.SMTP_DEBUG === "true",
        debug:  process.env.SMTP_DEBUG === "true",
      });
      this.logger.log(`[EmailService] Modo SMTP · ${smtpHost}:${port} · from=${this.from}`);
      this.transporter.verify((err) => {
        if (err) this.logger.error(`[EmailService] ⚠️ verify() falló: ${err.message}. Los envíos pueden fallar. Verifica credenciales SMTP.`);
        else      this.logger.log(`[EmailService] ✅ Conexión SMTP verificada · listo para enviar`);
      });
      return;
    }

    // ── Modo 4: No-op ─────────────────────────────────────────────────────
    this.mode = "noop";
    this.logger.warn(
      "[EmailService] Modo NO-OP · configura BREVO_API_KEY, RESEND_API_KEY o SMTP_* en Railway → Variables. " +
      `Estado: brevo=${brevoKey ? "✓" : "✗"} resend=${resendKey ? "✓" : "✗"} smtp=${smtpHost ? "✓" : "✗"}`,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SEND
  // ──────────────────────────────────────────────────────────────────────────

  async send(envelope: EmailEnvelope): Promise<EmailDispatchResult> {
    switch (this.mode) {
      case "brevo":  return this.sendBrevo(envelope);
      case "resend": return this.sendResend(envelope);
      case "smtp":   return this.sendSmtp(envelope);
      default:
        this.logger.log(`[EmailService NOOP] → ${envelope.to} · ${envelope.subject}`);
        return { ok: true, mode: "noop", messageId: `noop-${Date.now()}` };
    }
  }

  // ── Brevo HTTP API ────────────────────────────────────────────────────────
  private async sendBrevo(envelope: EmailEnvelope): Promise<EmailDispatchResult> {
    const toList = Array.isArray(envelope.to) ? envelope.to : [envelope.to];
    const [fromName, fromEmail] = this.parseFrom(this.from);

    const body = JSON.stringify({
      sender:      { name: fromName, email: fromEmail },
      to:          toList.map(e => ({ email: e })),
      cc:          envelope.cc?.map(e => ({ email: e })),
      bcc:         envelope.bcc?.map(e => ({ email: e })),
      replyTo:     envelope.replyTo ? { email: envelope.replyTo } : undefined,
      subject:     envelope.subject,
      htmlContent: envelope.html,
      textContent: envelope.text ?? this.stripHtml(envelope.html),
    });

    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept":       "application/json",
          "api-key":      this.brevoKey!,
          "content-type": "application/json",
        },
        body,
      });
      const data: any = await res.json();
      if (!res.ok) throw new Error(data?.message ?? `Brevo ${res.status}`);
      this.logger.log(`[EmailService BREVO] ✓ ${envelope.to} · ${envelope.subject} · ${data.messageId}`);
      return { ok: true, mode: "brevo", messageId: data.messageId };
    } catch (e: any) {
      this.logger.error(`[EmailService BREVO] ✗ ${envelope.to}: ${e?.message}`);
      return { ok: false, mode: "brevo", error: e?.message ?? "Brevo error" };
    }
  }

  // ── Resend HTTP API ───────────────────────────────────────────────────────
  private async sendResend(envelope: EmailEnvelope): Promise<EmailDispatchResult> {
    const toList = Array.isArray(envelope.to) ? envelope.to : [envelope.to];

    const body = JSON.stringify({
      from:     this.from,
      to:       toList,
      cc:       envelope.cc,
      bcc:      envelope.bcc,
      reply_to: envelope.replyTo,
      subject:  envelope.subject,
      html:     envelope.html,
      text:     envelope.text ?? this.stripHtml(envelope.html),
    });

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.resendKey}`,
          "Content-Type":  "application/json",
        },
        body,
      });
      const data: any = await res.json();
      if (!res.ok) throw new Error(data?.message ?? `Resend ${res.status}`);
      this.logger.log(`[EmailService RESEND] ✓ ${envelope.to} · ${envelope.subject} · ${data.id}`);
      return { ok: true, mode: "resend", messageId: data.id };
    } catch (e: any) {
      this.logger.error(`[EmailService RESEND] ✗ ${envelope.to}: ${e?.message}`);
      return { ok: false, mode: "resend", error: e?.message ?? "Resend error" };
    }
  }

  // ── SMTP nodemailer ───────────────────────────────────────────────────────
  private async sendSmtp(envelope: EmailEnvelope): Promise<EmailDispatchResult> {
    if (!this.transporter) return { ok: false, mode: "smtp", error: "transporter not initialized" };
    try {
      const info = await this.transporter.sendMail({
        from:    this.from,
        to:      Array.isArray(envelope.to) ? envelope.to.join(",") : envelope.to,
        subject: envelope.subject,
        html:    envelope.html,
        text:    envelope.text ?? this.stripHtml(envelope.html),
        replyTo: envelope.replyTo,
        cc:      envelope.cc,
        bcc:     envelope.bcc,
      });
      this.logger.log(`[EmailService SMTP] ✓ ${envelope.to} · ${envelope.subject} · ${info.messageId}`);
      return { ok: true, mode: "smtp", messageId: info.messageId };
    } catch (e: any) {
      this.logger.error(`[EmailService SMTP] ✗ ${envelope.to}: ${e?.message}`);
      return { ok: false, mode: "smtp", error: e?.message ?? "unknown SMTP error" };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  /** Parsea "Nombre Apellido <email@dom.com>" → ["Nombre Apellido", "email@dom.com"] */
  private parseFrom(from: string): [string, string] {
    const m = from.match(/^(.+)<([^>]+)>\s*$/);
    if (m) return [m[1].trim(), m[2].trim()];
    return ["Savicol Audit", from.trim()];
  }

  private escape(s: string): string {
    return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]!));
  }

  private stripHtml(html: string): string {
    return html.replace(/<style[\s\S]*?<\/style>/gi, "")
               .replace(/<[^>]+>/g, " ")
               .replace(/\s+/g, " ")
               .trim();
  }

  get isConfigured(): boolean { return this.mode !== "noop"; }

  // ──────────────────────────────────────────────────────────────────────────
  // TEMPLATES (sin cambios — preservados intactos)
  // ──────────────────────────────────────────────────────────────────────────

  layout(opts: { title: string; previewText: string; body: string; ctaText?: string; ctaUrl?: string }): string {
    const baseUrl = process.env.APP_BASE_URL ?? "https://savicol-audit-platform-web.vercel.app";
    return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${this.escape(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#0A111F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;">${this.escape(opts.previewText)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0A111F;padding:24px 12px">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#0D1526;border:1px solid #1E2D4A;border-radius:16px;overflow:hidden">
      <tr><td style="background:linear-gradient(135deg,#F59E0B,#FBBF24);padding:24px 28px">
        <h1 style="margin:0;color:#0A111F;font-size:24px;font-weight:800;letter-spacing:-0.02em">Savicol Audit Platform</h1>
        <p style="margin:4px 0 0;color:#0A111F;font-size:12px;opacity:0.7">Auditoría corporativa · gestión integral</p>
      </td></tr>
      <tr><td style="padding:32px 28px;color:#E2E8F0;font-size:14px;line-height:1.6">
        <h2 style="margin:0 0 16px;color:#FFFFFF;font-size:20px;font-weight:700">${this.escape(opts.title)}</h2>
        ${opts.body}
        ${opts.ctaText && opts.ctaUrl ? `<div style="margin:32px 0;text-align:center">
          <a href="${opts.ctaUrl}" style="display:inline-block;padding:12px 32px;background:#F59E0B;color:#0A111F;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px">${this.escape(opts.ctaText)}</a>
        </div>` : ""}
      </td></tr>
      <tr><td style="padding:20px 28px;border-top:1px solid #1E2D4A;background:#0A111F;color:#475569;font-size:11px;line-height:1.5">
        <p style="margin:0">Este correo fue enviado automáticamente por la plataforma de auditoría Savicol.</p>
        <p style="margin:6px 0 0">Si no esperabas este mensaje, ignóralo o contacta al administrador.</p>
        <p style="margin:12px 0 0"><a href="${baseUrl}" style="color:#64748B;text-decoration:none">${baseUrl}</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
  }

  templateInvitation(opts: { name: string; activationUrl: string; expiresAt: Date; invitedBy: string; role: string }): string {
    const body = `
      <p>Hola <strong>${this.escape(opts.name)}</strong>,</p>
      <p><strong>${this.escape(opts.invitedBy)}</strong> te ha invitado a formar parte de la plataforma corporativa de auditoría de <strong>Savicol</strong> con el rol <strong style="color:#F59E0B">${this.escape(opts.role)}</strong>.</p>
      <p>Para activar tu cuenta y establecer tu contraseña, haz click en el botón a continuación. El enlace expira el <strong>${opts.expiresAt.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}</strong>.</p>
      <p style="color:#94A3B8;font-size:12px;margin-top:24px">Si el botón no funciona, copia este enlace en tu navegador:<br>
        <span style="color:#06B6D4;word-break:break-all">${opts.activationUrl}</span>
      </p>`;
    return this.layout({ title: "Activa tu cuenta Savicol Audit", previewText: `${opts.invitedBy} te invita a Savicol Audit`, body, ctaText: "Activar mi cuenta", ctaUrl: opts.activationUrl });
  }

  templateTempPassword(opts: { name: string; tempPassword: string; loginUrl: string }): string {
    const body = `
      <p>Hola <strong>${this.escape(opts.name)}</strong>,</p>
      <p>Un administrador ha restablecido tu contraseña. A continuación encontrarás una contraseña temporal:</p>
      <div style="margin:24px 0;padding:16px;background:#0A111F;border:1px solid #2A3F6A;border-radius:8px;text-align:center">
        <code style="font-family:monospace;font-size:18px;color:#F59E0B;letter-spacing:0.05em">${this.escape(opts.tempPassword)}</code>
      </div>
      <p><strong style="color:#F59E0B">Por seguridad</strong>, ingresa con esta contraseña y cámbiala inmediatamente desde Configuración → Seguridad.</p>
      <p style="color:#94A3B8;font-size:12px">Esta contraseña es de un solo uso. No la compartas con nadie.</p>`;
    return this.layout({ title: "Tu contraseña temporal", previewText: "Un administrador restableció tu contraseña", body, ctaText: "Ir a la plataforma", ctaUrl: opts.loginUrl });
  }

  templatePasswordReset(opts: { name: string; resetUrl: string; expiresAt: Date }): string {
    const body = `
      <p>Hola <strong>${this.escape(opts.name)}</strong>,</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. Si no fuiste tú, ignora este correo.</p>
      <p>Para crear una nueva contraseña, haz click en el botón. El enlace expira el <strong>${opts.expiresAt.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}</strong>.</p>`;
    return this.layout({ title: "Restablecer contraseña", previewText: "Solicitud de restablecimiento de contraseña", body, ctaText: "Crear nueva contraseña", ctaUrl: opts.resetUrl });
  }

  templateRoleChanged(opts: { name: string; oldRole: string; newRole: string; changedBy: string }): string {
    const body = `
      <p>Hola <strong>${this.escape(opts.name)}</strong>,</p>
      <p>Tu rol en la plataforma ha sido actualizado:</p>
      <table style="margin:16px 0;border-collapse:collapse">
        <tr><td style="padding:6px 12px;color:#94A3B8">Rol anterior:</td><td style="padding:6px 12px;color:#FFFFFF"><code>${this.escape(opts.oldRole)}</code></td></tr>
        <tr><td style="padding:6px 12px;color:#94A3B8">Rol nuevo:</td><td style="padding:6px 12px;color:#F59E0B"><strong>${this.escape(opts.newRole)}</strong></td></tr>
        <tr><td style="padding:6px 12px;color:#94A3B8">Realizado por:</td><td style="padding:6px 12px;color:#FFFFFF">${this.escape(opts.changedBy)}</td></tr>
      </table>
      <p style="color:#94A3B8;font-size:12px">Los cambios de permisos tomarán efecto en tu próximo inicio de sesión.</p>`;
    return this.layout({ title: "Cambio de rol en tu cuenta", previewText: `Tu rol cambió a ${opts.newRole}`, body });
  }

  templateHallazgoAssigned(opts: { name: string; titulo: string; criticidad: string; recurso: string; link?: string }): string {
    const colorCrit = opts.criticidad.toUpperCase().includes("CRIT") ? "#EF4444"
      : opts.criticidad.toUpperCase().includes("ALT") ? "#F59E0B" : "#3B82F6";
    const body = `
      <p>Hola <strong>${this.escape(opts.name)}</strong>,</p>
      <p>Se te ha asignado un nuevo hallazgo para gestión y seguimiento:</p>
      <div style="margin:16px 0;padding:16px;background:#0A111F;border-left:4px solid ${colorCrit};border-radius:6px">
        <p style="margin:0 0 6px"><span style="display:inline-block;padding:2px 8px;background:${colorCrit}30;color:${colorCrit};font-size:10px;font-weight:700;border-radius:10px;text-transform:uppercase">${this.escape(opts.criticidad)}</span></p>
        <p style="margin:0;color:#FFFFFF;font-size:15px;font-weight:600">${this.escape(opts.titulo)}</p>
        <p style="margin:6px 0 0;color:#94A3B8;font-size:12px">Recurso: ${this.escape(opts.recurso)}</p>
      </div>`;
    return this.layout({ title: "Nuevo hallazgo asignado", previewText: opts.titulo, body, ctaText: opts.link ? "Ver hallazgo" : undefined, ctaUrl: opts.link });
  }
}
