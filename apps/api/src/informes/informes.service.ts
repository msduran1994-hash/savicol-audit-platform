import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";

export interface EnviarInformeDto {
  tipo: string;                 // "General" | "Ejecutivo"
  destinatarios: string[];
  cc?: string[];
  cco?: string[];
  asunto: string;
  mensaje: string;              // cuerpo del correo (texto/plantilla)
  pdfBase64: string;            // base64 del PDF (sin prefijo data:)
  filename: string;
  adjuntos?: Array<{ name: string; content: string; type: string }>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = (v: any) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

@Injectable()
export class InformesService {
  constructor(private prisma: PrismaService, private email: EmailService) {}

  async enviar(dto: EnviarInformeDto, user: { name?: string; email?: string }) {
    const to  = (dto.destinatarios || []).map(e => e.trim()).filter(Boolean);
    const cc  = (dto.cc  || []).map(e => e.trim()).filter(Boolean);
    const bcc = (dto.cco || []).map(e => e.trim()).filter(Boolean);
    if (!to.length) throw new BadRequestException("Indica al menos un destinatario.");
    const invalidos = [...to, ...cc, ...bcc].filter(e => !EMAIL_RE.test(e));
    if (invalidos.length) throw new BadRequestException("Correo(s) con formato inválido: " + invalidos.join(", "));
    if (!dto.pdfBase64) throw new BadRequestException("No se recibió el PDF del informe.");

    const attachments = [
      { name: dto.filename || "informe.pdf", content: dto.pdfBase64, type: "application/pdf" },
      ...(dto.adjuntos || []).filter(a => a?.content && a?.name).map(a => ({ name: a.name, content: a.content, type: a.type || "application/octet-stream" })),
    ];

    let result: any;
    try {
      result = await this.email.send({
        to,
        cc:  cc.length ? cc : undefined,
        bcc: bcc.length ? bcc : undefined,
        subject: dto.asunto || "Informe · Auditoría Savicol",
        html: this.plantilla(dto.mensaje, dto.tipo, user),
        attachments,
        // Remitente = cuenta verificada de Savicol; las respuestas llegan al usuario autenticado.
        replyTo: user.email,
        fromName: user.name ? `${user.name} · Auditoría Savicol` : undefined,
      });
    } catch (e: any) {
      result = { ok: false, mode: "error", error: e?.message ?? String(e) };
    }

    const estado = result.ok ? (result.mode === "noop" ? "NO-OP" : "Enviado") : "Error";
    try {
      await this.prisma.envioInforme.create({
        data: {
          tipo: dto.tipo || "General", asunto: dto.asunto || null,
          destinatarios: to.join(", "), cc: cc.join(", ") || null, cco: bcc.join(", ") || null,
          remitente: user.name ?? null, remitenteEmail: user.email ?? null,
          estado, modo: result.mode ?? null, messageId: result.messageId ?? null,
          mensajeError: result.error ?? null, createdBy: user.name ?? user.email ?? null,
        },
      });
    } catch { /* el registro de historial no debe romper el envío */ }

    return { ok: !!result.ok, mode: result.mode, messageId: result.messageId, error: result.error, estado };
  }

  listarEnvios() {
    return this.prisma.envioInforme.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  }

  // Plantilla corporativa simple del cuerpo (el usuario puede editar el texto).
  private plantilla(mensaje: string, tipo: string, user: { name?: string }): string {
    const cuerpo = esc(mensaje).replace(/\n/g, "<br>");
    return `<div style="font-family:Arial,Helvetica,sans-serif;color:#0D1526;max-width:640px">
      <div style="background:linear-gradient(135deg,#0D1526,#1a2847);color:#fff;padding:18px 24px;border-radius:8px 8px 0 0">
        <div style="font-size:10px;letter-spacing:2px;color:#4A7AFF;text-transform:uppercase;font-weight:700">Control Interno y Auditoría</div>
        <div style="font-size:18px;font-weight:800;margin-top:4px">Informe ${esc(tipo)} · Trazabilidad Avícola</div>
        <div style="font-size:12px;color:#94A3B8;margin-top:2px">Pollos Savicol S.A.S. · NIT 860.403.972-4</div>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:20px 24px;font-size:14px;line-height:1.6">
        ${cuerpo || "Adjunto encontrará el informe en formato PDF."}
        <p style="margin-top:18px;color:#64748b;font-size:12px">Este correo fue enviado desde la plataforma de auditoría de Pollos Savicol S.A.S.${user.name ? ` por ${esc(user.name)}` : ""}. El informe va adjunto en PDF.</p>
      </div>
    </div>`;
  }
}
