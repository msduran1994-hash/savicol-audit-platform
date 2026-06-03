import {
  Injectable, BadRequestException, NotFoundException, ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export interface CreateApiTokenDto {
  name: string;
  scopes?: string[];     // ej. ["powerbi:read", "reports:read"]
  expiresInDays?: number;
}

const VALID_SCOPES = [
  "powerbi:read",
  "reports:read",
  "dashboards:read",
  "granjas:read",
  "rutas:read",
  "cedis:read",
  "hallazgos:read",
  "all:read",
];

@Injectable()
export class ApiTokensService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.apiToken.findMany({
      select: {
        id: true, name: true, tokenPrefix: true, scopes: true,
        isActive: true, expiresAt: true, lastUsedAt: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(dto: CreateApiTokenDto, userId: string, userRole: string) {
    if (userRole !== "ADMIN")
      throw new ForbiddenException("Solo ADMIN puede generar API tokens");

    if (!dto.name || dto.name.trim().length < 3)
      throw new BadRequestException("name debe tener al menos 3 caracteres");

    // Validar scopes
    const scopes = dto.scopes ?? ["all:read"];
    for (const s of scopes) {
      if (!VALID_SCOPES.includes(s))
        throw new BadRequestException(`Scope inválido: ${s}. Permitidos: ${VALID_SCOPES.join(", ")}`);
    }

    // Generar token plano · formato: savicol_pk_<48 chars>
    const rawToken = "savicol_pk_" + randomBytes(36).toString("base64url").replace(/[-_]/g, "").slice(0, 48);
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const tokenPrefix = rawToken.slice(0, 16);  // "savicol_pk_XXXX"

    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const created = await this.prisma.apiToken.create({
      data: {
        name: dto.name.trim(),
        tokenHash,
        tokenPrefix,
        scopes: JSON.stringify(scopes),
        expiresAt,
        createdById: userId,
      },
      select: {
        id: true, name: true, tokenPrefix: true, scopes: true,
        expiresAt: true, createdAt: true,
      },
    });

    // Devolvemos el token plano SOLO esta vez
    return {
      ...created,
      token: rawToken,
      _warning: "Esta es la ÚNICA vez que verás este token. Guárdalo de forma segura.",
    };
  }

  async revoke(id: string, userRole: string) {
    if (userRole !== "ADMIN")
      throw new ForbiddenException("Solo ADMIN puede revocar tokens");

    const existing = await this.prisma.apiToken.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Token no encontrado");

    await this.prisma.apiToken.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: "Token revocado" };
  }

  async remove(id: string, userRole: string) {
    if (userRole !== "ADMIN")
      throw new ForbiddenException("Solo ADMIN puede eliminar tokens");

    const existing = await this.prisma.apiToken.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Token no encontrado");

    await this.prisma.apiToken.delete({ where: { id } });
    return { message: "Token eliminado", id };
  }

  // ─────────────────────────────────────────────────────────────────────
  // VALIDACIÓN · usado por ApiTokenGuard
  // ─────────────────────────────────────────────────────────────────────
  async validateToken(rawToken: string): Promise<{
    valid: boolean;
    tokenId?: string;
    scopes?: string[];
    name?: string;
  }> {
    if (!rawToken || !rawToken.startsWith("savicol_pk_"))
      return { valid: false };

    const prefix = rawToken.slice(0, 16);
    const candidates = await this.prisma.apiToken.findMany({
      where: { tokenPrefix: prefix, isActive: true },
    });

    for (const c of candidates) {
      // Verificar expiración
      if (c.expiresAt && c.expiresAt < new Date()) continue;
      // Verificar hash
      const ok = await bcrypt.compare(rawToken, c.tokenHash);
      if (ok) {
        // Update lastUsedAt (fire-and-forget)
        this.prisma.apiToken.update({
          where: { id: c.id },
          data: { lastUsedAt: new Date() },
        }).catch(() => {});

        const scopes = JSON.parse(c.scopes || "[]") as string[];
        return { valid: true, tokenId: c.id, scopes, name: c.name };
      }
    }

    return { valid: false };
  }
}
