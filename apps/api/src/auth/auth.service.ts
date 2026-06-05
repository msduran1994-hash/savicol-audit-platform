import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import * as bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import * as qrcode from "qrcode";

export interface AccessMeta { ip?: string; ua?: string }

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditLogsService,
  ) {}

  /* ── Register ─────────────────────────────────────────── */
  async register(dto: { email: string; name: string; password: string; role?: string }) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException("El correo ya está registrado");

    const hash = await bcrypt.hash(dto.password, 12);
    const secret = authenticator.generateSecret();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash: hash,
        role: (dto.role as any) ?? "VIEWER",
        mfaSecret: secret,
      },
    });

    const otpAuthUrl = authenticator.keyuri(
      user.email,
      this.config.get<string>("MFA_APP_NAME", "Audit Platform Savicol"),
      secret,
    );
    const qrDataUrl = await qrcode.toDataURL(otpAuthUrl);

    return { userId: user.id, email: user.email, qrDataUrl, otpAuthUrl };
  }

  /* ── Login ────────────────────────────────────────────── */
  async login(dto: { email: string; password: string }, meta: AccessMeta = {}) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      // No podemos loggear sin userId · loggeamos solo si llegó a la búsqueda
      throw new UnauthorizedException("Credenciales inválidas");
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.audit.logAccess({
        userId: user.id, action: "LOGIN_FAILED",
        ip: meta.ip, ua: meta.ua,
        metadata: { reason: "invalid_password" },
      });
      throw new UnauthorizedException("Credenciales inválidas");
    }

    if (!user.isActive) {
      await this.audit.logAccess({
        userId: user.id, action: "LOGIN_FAILED",
        ip: meta.ip, ua: meta.ua,
        metadata: { reason: "account_inactive" },
      });
      throw new ForbiddenException("Cuenta inactiva");
    }

    // Si MFA NO está habilitado, devolvemos los tokens directamente
    if (!user.mfaEnabled || !user.mfaSecret) {
      const tokens = await this.signTokens(user.id, user.email, user.role);
      await this.audit.logAccess({
        userId: user.id, action: "LOGIN_SUCCESS",
        ip: meta.ip, ua: meta.ua,
        metadata: { mfa: false },
      });
      return {
        mfaRequired: false,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        ...tokens,
      };
    }

    // Issue short-lived temp token for MFA step
    const tempToken = this.jwt.sign(
      { sub: user.id, phase: "mfa" },
      { expiresIn: "5m" },
    );

    return { mfaRequired: true, tempToken };
  }

  /* ── MFA Verify ───────────────────────────────────────── */
  async mfaVerify(dto: { tempToken: string; code: string }, meta: AccessMeta = {}) {
    let payload: any;
    try {
      payload = this.jwt.verify(dto.tempToken);
    } catch {
      throw new UnauthorizedException("Token expirado o inválido");
    }

    if (payload.phase !== "mfa") throw new UnauthorizedException("Fase de token incorrecta");

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException("Usuario no encontrado");

    if (!user.mfaSecret) throw new UnauthorizedException("Usuario sin MFA configurado");
    const isValid = authenticator.verify({ token: dto.code, secret: user.mfaSecret });
    if (!isValid) {
      await this.audit.logAccess({
        userId: user.id, action: "MFA_FAILED",
        ip: meta.ip, ua: meta.ua,
      });
      throw new UnauthorizedException("Código MFA incorrecto");
    }

    // Update last login (no field in schema → solo updatedAt automático)
    await this.prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    const tokens = await this.signTokens(user.id, user.email, user.role);
    await this.audit.logAccess({
      userId: user.id, action: "MFA_SUCCESS",
      ip: meta.ip, ua: meta.ua,
    });
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      ...tokens,
    };
  }

  /* ── Refresh ──────────────────────────────────────────── */
  async refresh(userId: string, refreshToken: string) {
    // SQLite schema: Session no tiene isActive. Buscar la sesión más reciente no expirada.
    const session = await this.prisma.session.findFirst({
      where:   { userId, expiresAt: { gt: new Date() } },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
    if (!session) throw new UnauthorizedException("Sesión no encontrada o expirada");

    const tokenValid = await bcrypt.compare(refreshToken, session.refreshToken);
    if (!tokenValid) throw new UnauthorizedException("Refresh token inválido");

    const tokens = await this.signTokens(session.user.id, session.user.email, session.user.role);
    return tokens;
  }

  /* ── Logout ───────────────────────────────────────────── */
  async logout(userId: string, meta: AccessMeta = {}) {
    // SQLite: borrar las sesiones del usuario (no hay flag isActive)
    await this.prisma.session.deleteMany({ where: { userId } });
    await this.audit.logAccess({ userId, action: "LOGOUT", ip: meta.ip, ua: meta.ua });
    return { message: "Sesión cerrada" };
  }

  /* ── Helpers ──────────────────────────────────────────── */
  private async signTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>("JWT_ACCESS_SECRET"),
      expiresIn: "15m",
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>("JWT_REFRESH_SECRET"),
      expiresIn: "7d",
    });

    // Store hashed refresh token (schema usa refreshToken como único)
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.session.create({
      data: {
        userId,
        refreshToken: hash,
        expiresAt:    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
