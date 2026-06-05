# Arquitectura de Correos, Notificaciones y Alertas Automáticas
## Audit Software Savicol SAS

Documento técnico · Sprint UM-10 · Comunicaciones

---

## 1. Diagnóstico actual

### Componentes activos en producción

```
┌──────────────────────────────────────────────────────────────────┐
│ Browser (Next.js 14 · Vercel)                                    │
│   - NotificationBell (header) · campana con badge no-leídas      │
│   - Modal de invitación / reset / activación                     │
│   - /configuracion → Notificaciones (preferencias por canal)     │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ NestJS API (Railway · Docker single-stage)                       │
│   - EmailService     · nodemailer + templates HTML                │
│   - NotificationsService · in-app + opcional email                │
│   - InvitationsService · token + correo                           │
│   - PasswordResetService · token + correo                         │
│   - AuditLogsService · logAccess() on every email event           │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ SMTP (Gmail Workspace · pendiente configurar)                    │
│   - Modo NO-OP actual: logs en lugar de envío                    │
│   - Activación: setear SMTP_HOST/USER/PASS en Railway env        │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ PostgreSQL (Railway)                                             │
│   - Notification (in-app + emailSent flag)                       │
│   - UserInvitation (tokens · 24h TTL)                            │
│   - PasswordResetToken (1h TTL + IP/UA)                          │
│   - AccessLog (audit trail completo)                             │
└──────────────────────────────────────────────────────────────────┘
```

### Métricas verificables del código

| Métrica | Valor | Fuente |
|---------|-------|--------|
| Templates HTML | 5 | `email.service.ts` lines 89-180 |
| Eventos que envían email | 9 | INVITATION, TEMP_PWD, RESET, ROLE_CHANGED, HALLAZGO_ASSIGNED, KPI_REMINDER, KPI_ALERT, USER_CREATED, PASSWORD_RESET |
| Endpoints `/notifications` | 5 | GET, GET count, POST /:id/read, POST read-all, DELETE /:id |
| Tipos de notificación in-app | 9 | USER_CREATED, ROLE_CHANGED, PASSWORD_RESET, INVITATION_SENT, HALLAZGO_ASSIGNED, KPI_ASSIGNED, ALERT_CRITICAL, ACCESS_GRANTED, SYSTEM |
| Audit log actions trackeadas | 14 | LOGIN_SUCCESS/FAILED, MFA_*, LOGOUT, USER_*, ROLE_CHANGED, INVITATION_*, PASSWORD_RESET_*, ACCOUNT_DEACTIVATED |

### Estado del envío real

**Modo actual: NO-OP** (Email service en `EmailService` constructor logs warning si no hay `SMTP_HOST/USER/PASS`).

Esto significa que:
- ✅ Toda la lógica de generación, templates, tokens, notif in-app funciona end-to-end
- ✅ Los endpoints reportan `emailMode: "noop"` y devuelven `activationUrl` para uso manual
- ⚠️ Los correos físicos NO se entregan hasta configurar SMTP

---

## 2. Análisis comparativo · 3 opciones de proveedor

### Opción 1: Gmail API (OAuth 2.0)

**Pros**
- Sin límite de tamaño de adjunto adicional (25 MB nativo Gmail)
- Tracking nativo de envío en bandeja "Enviados"
- Auditable desde Google Admin Console

**Contras**
- Requiere flujo OAuth2 con refresh token persistido en backend
- Setup más complejo: GCP project + OAuth Consent Screen + scope `https://www.googleapis.com/auth/gmail.send`
- Rate limit: 250 emails/día por cuenta sin verificación, 2000/día verificada
- Tokens OAuth pueden expirar y requieren manejo de refresh
- Si la cuenta cambia password → todos los tokens invalidados

**Cuándo elegir**: app que envía desde la cuenta personal del usuario (no aplica a Savicol).

### Opción 2: Google Workspace SMTP (App Password) ⭐ RECOMENDADO

**Pros**
- Setup en 5 minutos: crear App Password en `myaccount.google.com`
- Sin OAuth complexity · solo `SMTP_USER` + `SMTP_PASS` (16 chars)
- Rate limit: 2000 emails/día por cuenta Workspace (suficiente para auditoría)
- Deliverability excelente (Google reputation)
- Funciona con nodemailer (ya instalado)
- Recovery: si pass se compromete, revocar app password y crear nueva
- Cero costo adicional si ya tienes Workspace

**Contras**
- Sin webhook de eventos (no podemos saber si fue "abierto" o "rebotado")
- Requiere que la cuenta tenga 2FA activado para generar App Password
- Rate limit más bajo que servicios transaccionales

**Cuándo elegir**: organizaciones con Google Workspace activo (caso Savicol).

### Opción 3: Servicio transaccional (Resend / SendGrid / Mailgun)

**Pros**
- Webhooks de delivery / open / click / bounce
- Plantillas gestionadas desde dashboard
- Reputation de IP dedicada
- Soporte de DKIM/SPF/DMARC out-of-the-box
- Mejor para alto volumen (>10K emails/día)
- Resend: plan gratis 100 emails/día / 3000/mes
- SendGrid: plan gratis 100 emails/día permanente

**Contras**
- Requiere dominio verificado (DNS records DKIM/SPF)
- Costo escala con volumen: SendGrid $19.95/mes desde 40K, Resend $20/mes desde 5K
- Vendor lock-in (cada uno tiene su API)
- Si la cuenta es suspendida (false positive), todo el envío se detiene
- Trabajo extra: setup DNS + verificación dominio

**Cuándo elegir**: producto SaaS con alto volumen (>5K emails/mes) o necesidad de tracking detallado.

### Matriz de decisión

| Criterio | Gmail API | Workspace SMTP | Transactional |
|----------|:--------:|:--------------:|:-------------:|
| Setup time | 2 horas | **5 min** | 1 hora |
| Costo mensual | $0 | $0 (Workspace existente) | $0-20 (free tier suficiente) |
| Deliverability | Excelente | **Excelente** | Excelente |
| Rate limit/día | 250-2000 | **2000** | 100-100K |
| Tracking open/click | No | No | **Sí** |
| Webhooks bounce | No | No | **Sí** |
| Mantenimiento | Alto (OAuth refresh) | **Bajo** (App Password) | Bajo |
| Riesgo proveedor | Bajo | **Bajo** (cuenta corporativa) | Medio |

### 🏆 Recomendación final

**Workspace SMTP** para fase actual (auditoría corporativa, <500 emails/día estimado).

**Migración futura a Resend** si:
- El volumen pasa de 1000 emails/día sostenidos
- Se necesita tracking de apertura/click (ej. para campañas)
- Se quiere multi-dominio (savicol.com + otros)

La capa `EmailService` está abstraída detrás de una interfaz, así que migrar provider es solo cambiar el `transporter` interno sin tocar callers.

---

## 3. Eventos cubiertos · estado actual

### Gestión de usuarios

| Evento | Notif in-app | Email | Audit log | Estado |
|--------|:------------:|:-----:|:---------:|:-------|
| Creación usuario | ✅ | ✅ (temp password) | ✅ | OK |
| Cambio de rol | ✅ | ✅ (template con diff) | ✅ | OK |
| Restablecimiento contraseña | ✅ | ✅ (template) | ✅ | OK |
| Token temporal | ✅ | ✅ (invitation) | ✅ | OK |
| Activación de cuenta | ✅ | — | ✅ | OK |
| Desactivación | ⚠️ pendiente | ⚠️ pendiente | ✅ | Parcial |

### Hallazgos

| Evento | Notif | Email | Estado |
|--------|:-----:|:-----:|:-------|
| Nuevo hallazgo asignado | ⚠️ template existe, falta wire | ⚠️ | Pendiente: integrar en `createHallazgo` |
| Actualización hallazgo | — | — | Pendiente |
| Cambio criticidad | — | — | Pendiente |
| Cierre hallazgo | — | — | Pendiente |

### KPIs (este sprint)

| Evento | Notif | Email | Estado |
|--------|:-----:|:-----:|:-------|
| KPI vencido | 🆕 este sprint | 🆕 este sprint | UM-10 |
| KPI próximo a vencer (3 días) | 🆕 este sprint | 🆕 este sprint | UM-10 |
| Recordatorio manual (botón) | 🆕 este sprint | 🆕 este sprint | UM-10 |

### Reportes

| Evento | Estado |
|--------|:-------|
| Generación automática | Pendiente (cron + Resend digest mensual) |
| Disponibilidad de descarga | Excel/CSV ya descargables · email no implementado |

---

## 4. Reintentos y manejo de errores

### Política actual

`EmailService.send()` **nunca lanza excepción**. Devuelve `{ ok: false, error }` para que el caller decida.

### Mejora propuesta (este sprint)

- Reintento exponential backoff: 0s, 30s, 2min (3 intentos máximo)
- Si los 3 fallan, marcar `Notification.emailError` con el último error
- Loggear todos los intentos en `AccessLog` con action `EMAIL_RETRY`
- Endpoint admin `POST /notifications/:id/resend` para reintento manual

### Casos de error conocidos

| Error SMTP | Significado | Acción |
|------------|-------------|--------|
| `EAUTH 535` | App Password inválida o cambió | Reportar al admin, no reintentar |
| `EENVELOPE` | Email destinatario inválido | No reintentar, marcar usuario.email para revisión |
| `ETIMEDOUT` | Red lenta o Gmail rate-limit | Reintentar con backoff |
| `EMESSAGE` | Mensaje rechazado por contenido | Loggear y notificar al admin |

---

## 5. Seguridad

### Implementado

- TLS implícito en puerto 465 / STARTTLS en 587
- Tokens de invitación con bcrypt (no hay token raw en DB)
- Throttle 5/15min en `/password-reset/request` (UM-8)
- IP + UA loggeados en cada envío (audit-logs)
- App Password (no contraseña principal) en SMTP

### Pendiente (no bloquea producción)

- DKIM + SPF + DMARC para dominio corporativo (requiere DNS)
- Domain verification en Gmail Workspace Admin Console
- Lista negra de dominios free (gmail.com, hotmail.com) si solo se quieren cuentas corporativas

---

## 6. Variables de entorno requeridas en Railway

```bash
# ── SMTP Gmail Workspace ──
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@savicol.com
SMTP_PASS=xxxx xxxx xxxx xxxx           # App Password (16 chars · espacios opcionales)
SMTP_FROM="Savicol Audit <noreply@savicol.com>"

# ── App base URL para links en correos ──
APP_BASE_URL=https://savicol-audit-platform.vercel.app

# ── TTLs (opcionales, tienen default) ──
INVITATION_TTL_HOURS=24
PASSWORD_RESET_TTL_HOURS=1

# ── Configuración alertas KPI (opcionales) ──
KPI_REMINDER_DAYS_BEFORE=3              # Días antes de vencimiento para alerta
KPI_REMINDER_ESCALATE_HOURS=24          # Re-enviar a supervisor si no respondida
```

### Generar App Password (paso a paso)

1. Login en `myaccount.google.com` con la cuenta corporativa
2. Security → 2-Step Verification (debe estar **activado**)
3. Bajo "Signing in to Google" → "App passwords"
4. Select app: "Mail" · Select device: "Other (Custom name)" → "Savicol Audit Platform"
5. Click Generate · copia los 16 caracteres (espacios incluidos)
6. Pega en Railway → Variables → `SMTP_PASS`
7. Redeploy el servicio API · el log debería mostrar `[EmailService] SMTP listo · smtp.gmail.com:587`

---

## 7. Plan de finalización

| Sprint | Entregable | Estado |
|--------|------------|:------:|
| UM-1 | EmailService + 5 templates + Modules | ✅ |
| UM-2 | NotificationBell + dropdown | ✅ |
| UM-3 | Invitations modal + flujo público /activar | ✅ |
| UM-4 | Password reset /restablecer + /olvide | ✅ |
| UM-5 | Wire UsersService side-effects | ✅ |
| UM-6 | Audit log viewer | ✅ |
| UM-7 | Notification preferences | ✅ |
| UM-8 | Throttle anti-bruteforce | ✅ |
| UM-9 | Session timeout policy | ✅ |
| **UM-10** | **KPI alerts + recordatorios + comm dashboard** | **🚧 ESTE SPRINT** |
| UM-11 | Wire hallazgo-assigned email + criticidad change | Próximo |
| UM-12 | Retry logic + email logs query | Próximo |
| UM-13 | Cron job recordatorios diarios (Railway cron) | Próximo |

---

## 8. Endpoints añadidos en UM-10

```
POST   /granjas/kpi/alerts/scan      · Genera notif + email para KPIs en riesgo (admin)
POST   /granjas/kpi/alerts/remind    · Envía recordatorio manual a responsables (admin)
GET    /granjas/kpi/alerts           · Lista KPIs en estado de alerta (cualquier rol)
```

---

## 9. Métricas a exponer en Dashboard de Comunicaciones

Cada métrica viene de un query sobre tablas existentes (no nuevas):

| Métrica | Query base | Tabla |
|---------|------------|-------|
| Correos enviados | `count(notifications where emailSent=true)` | Notification |
| Correos fallidos | `count(notifications where emailError IS NOT NULL)` | Notification |
| Recordatorios enviados | `count(notifications where kind=KPI_ASSIGNED)` | Notification |
| Alertas activas | `count(KPI where estado in ('EN_CURSO','EN_ESPERA') and fechaCompromiso < NOW()+3d)` | KPI |
| Usuarios notificados último 30d | `count(distinct userId in notifications last 30d)` | Notification |
| Tiempo promedio entrega | N/A sin webhook (Workspace SMTP no devuelve callback) | — |

---

_Última actualización: este commit · próximos pasos en UM-11+_
