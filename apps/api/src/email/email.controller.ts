// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL CONTROLLER · diagnóstico + test (admin only)
// ═══════════════════════════════════════════════════════════════════════════════
import { Body, Controller, Get, Post, Req, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { EmailService } from "./email.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

interface AuthRequest {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("email")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class EmailController {
  constructor(private email: EmailService) {}

  /**
   * GET /email/status
   * Devuelve estado actual del servicio SMTP sin exponer credenciales.
   */
  @Get("status")
  status() {
    const hasBrevo  = !!process.env.BREVO_API_KEY?.trim();
    const hasResend = !!process.env.RESEND_API_KEY?.trim();
    const host      = process.env.SMTP_HOST ?? null;
    const port      = process.env.SMTP_PORT ?? "587";
    const smtpUser  = process.env.SMTP_USER ?? null;
    const hasPass   = !!process.env.SMTP_PASS;
    const from      = process.env.SMTP_FROM ?? null;
    const baseUrl   = process.env.APP_BASE_URL ?? null;

    const activeMode = hasBrevo ? "brevo" : hasResend ? "resend" : host ? "smtp" : "noop";

    return {
      configured: this.email.isConfigured,
      mode: activeMode,
      brevo: { keySet: hasBrevo },
      resend: { keySet: hasResend },
      smtp: {
        host,
        port,
        user: smtpUser ? smtpUser.replace(/(.{2}).*(@.*)/, "$1***$2") : null,
        passSet: hasPass,
        from,
      },
      appBaseUrl: baseUrl,
      diagnostics: this.buildDiagnostics(hasBrevo, hasResend, host, smtpUser, hasPass, baseUrl),
    };
  }

  /**
   * POST /email/test
   * Envía un correo de prueba al email indicado (default: email del admin que llama).
   * Devuelve resultado detallado para diagnóstico.
   */
  @Post("test")
  @HttpCode(HttpStatus.OK)
  async test(@Req() req: AuthRequest, @Body() body: { to?: string } = {}) {
    const to = body?.to?.trim() || req.user.email;
    const startedAt = Date.now();

    const html = this.email.layout({
      title: "Correo de prueba · Savicol Audit",
      previewText: "Test de conectividad SMTP enviado desde Configuración",
      body: `
        <p>Hola <strong>${req.user.name}</strong>,</p>
        <p>Este es un correo de prueba del sistema de notificaciones de
        <strong>Savicol Audit Platform</strong>.</p>
        <p>Si lo recibes, la integración SMTP está funcionando correctamente.</p>
        <table style="margin:16px 0;border-collapse:collapse;font-size:12px">
          <tr><td style="padding:4px 10px;color:#94A3B8">Enviado por:</td><td style="padding:4px 10px;color:#FFF">${req.user.name} (${req.user.email})</td></tr>
          <tr><td style="padding:4px 10px;color:#94A3B8">Destinatario:</td><td style="padding:4px 10px;color:#FFF">${to}</td></tr>
          <tr><td style="padding:4px 10px;color:#94A3B8">Timestamp:</td><td style="padding:4px 10px;color:#FFF">${new Date().toISOString()}</td></tr>
          <tr><td style="padding:4px 10px;color:#94A3B8">Modo:</td><td style="padding:4px 10px;color:#F59E0B">${process.env.BREVO_API_KEY ? "Brevo API" : process.env.RESEND_API_KEY ? "Resend API" : "SMTP"}</td></tr>
        </table>
        <p style="color:#94A3B8;font-size:11px;margin-top:24px">
          Si recibes este correo es porque alguien (probablemente tú) ha solicitado un test desde
          <em>Configuración → Notificaciones → Estado de correo</em>. No es spam.
        </p>`,
    });

    const result = await this.email.send({
      to,
      subject: "[TEST] Conectividad SMTP · Savicol Audit",
      html,
    });

    const elapsed = Date.now() - startedAt;

    return {
      ok: result.ok,
      mode: result.mode,
      to,
      from: process.env.SMTP_FROM ?? "Savicol Audit <noreply@savicol.com>",
      elapsedMs: elapsed,
      messageId: result.messageId ?? null,
      error: result.error ?? null,
      timestamp: new Date().toISOString(),
      hint: this.buildHint(result.mode, result.ok, result.error),
    };
  }

  // ── helpers de diagnóstico ──────────────────────────────────────────────
  private buildDiagnostics(hasBrevo: boolean, hasResend: boolean, host: string | null, smtpUser: string | null, hasPass: boolean, baseUrl: string | null): string[] {
    const issues: string[] = [];
    if (hasBrevo) {
      issues.push("✅ Modo BREVO API activo · envío via HTTP/443 · sin bloqueo Railway");
    } else if (hasResend) {
      issues.push("✅ Modo RESEND API activo · envío via HTTP/443");
    } else if (host && smtpUser && hasPass) {
      issues.push("⚠️ Modo SMTP activo · Railway puede bloquear puertos 25/465/587 · se recomienda BREVO_API_KEY");
    } else {
      issues.push("❌ Sin configuración de email · configura BREVO_API_KEY en Railway → Variables");
    }
    if (!baseUrl) issues.push("⚠️ APP_BASE_URL no configurada · los links en correos pueden fallar");
    return issues;
  }

  /**
   * POST /email/send
   * Envía un informe de auditoría al correo indicado.
   * Body: { to: string; subject: string; html: string }
   */
  @Post("send")
  @HttpCode(HttpStatus.OK)
  async sendEmail(
    @Req() req: AuthRequest,
    @Body() body: { to: string; subject: string; html: string },
  ) {
    const { to, subject, html } = body;
    if (!to?.trim())      throw new Error("Destinatario requerido");
    if (!subject?.trim()) throw new Error("Asunto requerido");
    if (!html?.trim())    throw new Error("Contenido HTML requerido");

    const result = await this.email.send({ to: to.trim(), subject: subject.trim(), html });
    return {
      ok:        result.ok,
      to:        to.trim(),
      mode:      result.mode,
      messageId: result.messageId ?? null,
      error:     result.error ?? null,
    };
  }

  private buildHint(mode: string, ok: boolean, error?: string): string {
    if (mode === "noop") {
      return "El servicio está en modo NO-OP. Configura BREVO_API_KEY en Railway → Variables y redeploya.";
    }
    if (ok) {
      return "✅ Email enviado exitosamente. Revisa la bandeja de entrada en máximo 1-2 minutos. Si no aparece, revisa spam/promociones.";
    }
    if (error?.includes("EAUTH") || error?.includes("535")) {
      return "❌ Autenticación rechazada. La App Password puede estar incorrecta o haber expirado. Regenera una nueva en myaccount.google.com → Security → App passwords y actualiza SMTP_PASS en Railway.";
    }
    if (error?.includes("ENVELOPE") || error?.includes("Invalid recipient")) {
      return "❌ Email destinatario inválido o rechazado por el servidor. Verifica que el correo exista.";
    }
    if (error?.includes("ETIMEDOUT") || error?.includes("ECONNECTION")) {
      return "❌ No se pudo conectar al servidor SMTP. Verifica SMTP_HOST y SMTP_PORT, o si tu hosting permite conexiones salientes en ese puerto.";
    }
    return `❌ Error: ${error ?? "desconocido"}. Revisa los logs del servidor Railway para más detalle.`;
  }
}
