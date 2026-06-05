// ═══════════════════════════════════════════════════════════════════════════════
// KPI ALERTS · scan + notificación + recordatorio masivo
// ═══════════════════════════════════════════════════════════════════════════════
// Funciones:
//  - scanAlerts() · clasifica los KPIs activos según riesgo de vencimiento
//  - sendReminders() · envía notif in-app + correo a responsables
//  - listActiveAlerts() · devuelve KPIs en estado de alerta para UI
//
// Política de alerta:
//  - VENCIDO        · fechaCompromiso < HOY y estado != COMPLETADO
//  - PROXIMO        · fechaCompromiso entre HOY y HOY + REMINDER_DAYS
//  - RIESGO_CRITICO · vencido + porcentajeAvance < 50 + vinculado a hallazgo CRITICA
//
// Buscamos al "responsable" en el campo KPI.responsable (string). Si coincide
// con User.name o User.email del directorio, le enviamos correo + notif.
// Si no, queda solo en la lista (sin email) pero igual aparece en alertas activas.
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";

const REMINDER_DAYS_BEFORE = Number(process.env.KPI_REMINDER_DAYS_BEFORE ?? 3);

export type KpiAlertSeverity = "VENCIDO" | "PROXIMO" | "RIESGO_CRITICO";

export interface KpiAlert {
  id:               string;
  granjaId:         string;
  granjaNombre:     string;
  granjaCodigo:     string;
  accion:           string;
  estado:           string;
  porcentajeAvance: number;
  fechaCompromiso:  string;            // ISO
  responsable:      string;
  diasDeAtraso:     number;            // negativo = aún no vence
  severity:         KpiAlertSeverity;
}

export interface AlertScanResult {
  scannedAt:   string;
  totalActive: number;
  alerts: {
    vencidos:        KpiAlert[];
    proximos:        KpiAlert[];
    riesgo_critico:  KpiAlert[];
  };
  summary: {
    totalAlertas:     number;
    porSeveridad:     Record<KpiAlertSeverity, number>;
    responsablesUnicos: number;
  };
}

export interface ReminderResult {
  scannedAt:        string;
  remindersSent:    number;
  emailsAttempted:  number;
  emailsSucceeded:  number;
  emailsFailed:     number;
  errors:           Array<{ kpiId: string; responsable: string; error: string }>;
}

@Injectable()
export class KpiAlertsService {
  private readonly logger = new Logger(KpiAlertsService.name);

  constructor(
    private prisma: PrismaService,
    private email:  EmailService,
    private notif:  NotificationsService,
    private audit:  AuditLogsService,
  ) {}

  // ────────────────────────────────────────────────────────────────────────
  // SCAN · clasifica todos los KPIs activos
  // ────────────────────────────────────────────────────────────────────────
  async scanAlerts(filters: { granjaId?: string } = {}): Promise<AlertScanResult> {
    const now = new Date();
    const proxLimit = new Date(now.getTime() + REMINDER_DAYS_BEFORE * 86400_000);

    const where: any = {
      estado: { in: ["NO_INICIADO", "EN_CURSO", "EN_ESPERA"] },
    };
    if (filters.granjaId) where.granjaId = filters.granjaId;

    const kpis = await this.prisma.kPI.findMany({
      where,
      include: {
        granja: { select: { nombre: true, codigo: true } },
        hallazgo: { select: { criticidad: true, titulo: true } },
      },
      orderBy: { fechaCompromiso: "asc" },
    });

    const vencidos:  KpiAlert[] = [];
    const proximos:  KpiAlert[] = [];
    const criticos:  KpiAlert[] = [];
    const responsables = new Set<string>();

    for (const k of kpis) {
      const dias = Math.floor((now.getTime() - k.fechaCompromiso.getTime()) / 86400_000);
      const isVencido = k.fechaCompromiso.getTime() < now.getTime();
      const isProximo = !isVencido && k.fechaCompromiso.getTime() <= proxLimit.getTime();
      const hallazgoEsCritico = k.hallazgo?.criticidad === "CRITICA";
      const lowAvance = (k.porcentajeAvance ?? 0) < 50;

      const base: KpiAlert = {
        id: k.id,
        granjaId: k.granjaId,
        granjaNombre: k.granja?.nombre ?? "—",
        granjaCodigo: k.granja?.codigo ?? "—",
        accion: k.accion,
        estado: k.estado,
        porcentajeAvance: k.porcentajeAvance ?? 0,
        fechaCompromiso: k.fechaCompromiso.toISOString(),
        responsable: k.responsable ?? "—",
        diasDeAtraso: dias,
        severity: "PROXIMO",
      };
      if (k.responsable) responsables.add(k.responsable.toLowerCase());

      if (isVencido && hallazgoEsCritico && lowAvance) {
        criticos.push({ ...base, severity: "RIESGO_CRITICO" });
      } else if (isVencido) {
        vencidos.push({ ...base, severity: "VENCIDO" });
      } else if (isProximo) {
        proximos.push({ ...base, severity: "PROXIMO" });
      }
    }

    return {
      scannedAt:   now.toISOString(),
      totalActive: kpis.length,
      alerts:      { vencidos, proximos, riesgo_critico: criticos },
      summary: {
        totalAlertas: vencidos.length + proximos.length + criticos.length,
        porSeveridad: {
          VENCIDO: vencidos.length,
          PROXIMO: proximos.length,
          RIESGO_CRITICO: criticos.length,
        },
        responsablesUnicos: responsables.size,
      },
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // LIST · solo lectura para UI · sin side-effects
  // ────────────────────────────────────────────────────────────────────────
  async listActiveAlerts(granjaId?: string): Promise<KpiAlert[]> {
    const r = await this.scanAlerts({ granjaId });
    // Ordenar: críticos primero, vencidos por días, próximos por fecha
    return [
      ...r.alerts.riesgo_critico,
      ...r.alerts.vencidos.sort((a, b) => b.diasDeAtraso - a.diasDeAtraso),
      ...r.alerts.proximos.sort((a, b) => a.diasDeAtraso - b.diasDeAtraso),
    ];
  }

  // ────────────────────────────────────────────────────────────────────────
  // SEND REMINDERS · genera notif in-app + email a todos los responsables
  // ────────────────────────────────────────────────────────────────────────
  async sendReminders(actor: { id: string; name: string }, filters: { granjaId?: string } = {}): Promise<ReminderResult> {
    const scan = await this.scanAlerts(filters);
    const allAlerts = [
      ...scan.alerts.riesgo_critico,
      ...scan.alerts.vencidos,
      ...scan.alerts.proximos,
    ];

    // Buscar usuarios cuyo name/email coincide con el responsable de cada KPI
    // (case-insensitive, contains)
    const allResponsables = [...new Set(allAlerts.map(a => a.responsable.toLowerCase()).filter(r => r && r !== "—"))];
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { email: { in: allResponsables } },
          ...allResponsables.map(r => ({ name: { contains: r } } as any)),
        ],
        isActive: true,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    const userByKey = new Map<string, typeof users[0]>();
    for (const u of users) {
      userByKey.set(u.email.toLowerCase(), u);
      userByKey.set(u.name.toLowerCase(), u);
    }

    const baseUrl = process.env.APP_BASE_URL ?? "https://savicol-audit-platform.vercel.app";
    const result: ReminderResult = {
      scannedAt: scan.scannedAt,
      remindersSent: 0,
      emailsAttempted: 0,
      emailsSucceeded: 0,
      emailsFailed: 0,
      errors: [],
    };

    for (const alert of allAlerts) {
      const key = alert.responsable.toLowerCase();
      const user = userByKey.get(key);
      if (!user) {
        // Sin usuario asociable · no podemos enviar correo/notif individualizada
        continue;
      }

      try {
        const colorBySeverity = {
          RIESGO_CRITICO: "#EF4444",
          VENCIDO:        "#F59E0B",
          PROXIMO:        "#3B82F6",
        } as const;
        const labelBySeverity = {
          RIESGO_CRITICO: "RIESGO CRÍTICO",
          VENCIDO:        "VENCIDO",
          PROXIMO:        "PRÓXIMO A VENCER",
        } as const;

        await this.notif.create({
          userId: user.id,
          kind: "KPI_ASSIGNED",
          severity: alert.severity === "RIESGO_CRITICO" ? "CRITICAL"
                  : alert.severity === "VENCIDO"        ? "WARNING"
                  : "INFO",
          title: `Recordatorio KPI · ${labelBySeverity[alert.severity]}`,
          message: `${alert.accion} · ${alert.granjaNombre} · ${alert.diasDeAtraso >= 0 ? `vencido hace ${alert.diasDeAtraso}d` : `vence en ${-alert.diasDeAtraso}d`}`,
          metadata: {
            kpiId: alert.id,
            granjaId: alert.granjaId,
            severity: alert.severity,
            sentBy: actor.id,
          },
          email: {
            to: user.email,
            subject: `[Savicol Audit] ${labelBySeverity[alert.severity]} · ${alert.accion}`,
            html: this.email.layout({
              title: `KPI ${labelBySeverity[alert.severity].toLowerCase()}`,
              previewText: `${alert.accion} en ${alert.granjaNombre}`,
              body: `
                <p>Hola <strong>${this.escapeHtml(user.name)}</strong>,</p>
                <p>El siguiente KPI requiere tu atención:</p>
                <div style="margin:16px 0;padding:16px;background:#0A111F;border-left:4px solid ${colorBySeverity[alert.severity]};border-radius:6px">
                  <p style="margin:0 0 6px"><span style="display:inline-block;padding:2px 8px;background:${colorBySeverity[alert.severity]}30;color:${colorBySeverity[alert.severity]};font-size:10px;font-weight:700;border-radius:10px">${labelBySeverity[alert.severity]}</span></p>
                  <p style="margin:0;color:#FFFFFF;font-size:15px;font-weight:600">${this.escapeHtml(alert.accion)}</p>
                  <p style="margin:6px 0 0;color:#94A3B8;font-size:12px">
                    Granja: ${this.escapeHtml(alert.granjaNombre)} · ${this.escapeHtml(alert.granjaCodigo)}<br>
                    Avance actual: ${alert.porcentajeAvance}% · Estado: ${alert.estado}<br>
                    Fecha compromiso: ${new Date(alert.fechaCompromiso).toLocaleDateString("es-CO")}
                    ${alert.diasDeAtraso > 0 ? ` · <strong style="color:${colorBySeverity[alert.severity]}">vencido hace ${alert.diasDeAtraso} días</strong>` : ""}
                    ${alert.diasDeAtraso < 0 ? ` · vence en ${-alert.diasDeAtraso} días` : ""}
                  </p>
                </div>
                <p style="color:#94A3B8;font-size:12px;margin-top:24px">
                  Este recordatorio fue enviado por ${this.escapeHtml(actor.name)} desde el módulo Cumplimiento KPI.
                </p>`,
              ctaText: "Ver KPI en la plataforma",
              ctaUrl: `${baseUrl}/granjas/kpi`,
            }),
          },
        });
        result.remindersSent++;
        result.emailsAttempted++;
        result.emailsSucceeded++;
      } catch (e: any) {
        result.emailsFailed++;
        result.errors.push({
          kpiId: alert.id,
          responsable: alert.responsable,
          error: e?.message ?? "unknown",
        });
        this.logger.error(`Falla enviando recordatorio KPI ${alert.id}: ${e?.message}`);
      }
    }

    // Audit log resumen
    await this.audit.logAccess({
      userId: actor.id,
      action: "SYSTEM",
      resource: "kpi-alerts",
      metadata: {
        action: "SEND_REMINDERS",
        scope: filters,
        scanSummary: scan.summary,
        remindersSent: result.remindersSent,
        emailsAttempted: result.emailsAttempted,
        emailsSucceeded: result.emailsSucceeded,
        emailsFailed: result.emailsFailed,
      },
    });

    return result;
  }

  private escapeHtml(s: string): string {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]!));
  }
}
