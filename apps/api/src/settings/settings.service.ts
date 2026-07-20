import {
  Injectable, BadRequestException, NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface UpsertSettingDto {
  key: string;
  value: string;
  type?: string;
  category?: string;
  label?: string;
  description?: string;
  isPublic?: boolean;
}

const VALID_TYPES = ["STRING", "BOOLEAN", "NUMBER", "JSON", "IMAGE_URL"];

const DEFAULT_SETTINGS: Array<{ key: string; value: string; type: string; category: string; label: string; isPublic: boolean }> = [
  // Branding
  { key: "brand.name",          value: "Savicol Audit Platform", type: "STRING",    category: "branding", label: "Nombre institución",      isPublic: true },
  { key: "brand.logoUrl",       value: "",                       type: "IMAGE_URL", category: "branding", label: "URL del logo",            isPublic: true },
  { key: "brand.primaryColor",  value: "#F59E0B",                type: "STRING",    category: "branding", label: "Color primario",          isPublic: true },
  { key: "brand.accentColor",   value: "#3B82F6",                type: "STRING",    category: "branding", label: "Color de acento",         isPublic: true },
  // General
  { key: "general.defaultTheme",  value: "dark",                 type: "STRING",    category: "general",  label: "Tema por defecto",        isPublic: true },
  { key: "general.locale",        value: "es-CO",                type: "STRING",    category: "general",  label: "Idioma/región",           isPublic: true },
  { key: "general.timezone",      value: "America/Bogota",       type: "STRING",    category: "general",  label: "Zona horaria",            isPublic: true },
  // Notifications
  { key: "notifications.emailEnabled",        value: "false", type: "BOOLEAN", category: "notifications", label: "Correos automáticos habilitados", isPublic: false },
  { key: "notifications.emailFrom",           value: "",      type: "STRING",  category: "notifications", label: "Remitente de correos",             isPublic: false },
  { key: "notifications.criticalHallazgos",   value: "true",  type: "BOOLEAN", category: "notifications", label: "Notificar hallazgos críticos",     isPublic: false },
  // Integrations
  { key: "integrations.powerBiEmbedUrl",      value: "",      type: "STRING",  category: "integrations",  label: "URL embed Power BI",     isPublic: false },
  { key: "integrations.googleAnalyticsId",    value: "",      type: "STRING",  category: "integrations",  label: "Google Analytics ID",    isPublic: true },
];

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /** Conteos públicos para la portada/landing (sin autenticación): granjas, hallazgos, KPIs. */
  async publicStats() {
    const [granjas, hallazgos, kpis] = await Promise.all([
      this.prisma.granja.count().catch(() => 0),
      this.prisma.hallazgo.count().catch(() => 0),
      this.prisma.kPI.count().catch(() => 0),
    ]);
    return { granjas, hallazgos, kpis };
  }

  /**
   * Devuelve TODOS los settings.
   * Si scope='public' filtra solo los marcados isPublic (para uso sin auth).
   */
  async findAll(scope: "all" | "public" = "all") {
    await this.ensureDefaults();
    const where = scope === "public" ? { isPublic: true } : {};
    return this.prisma.setting.findMany({
      where,
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });
  }

  async findOne(key: string) {
    const s = await this.prisma.setting.findUnique({ where: { key } });
    if (!s) throw new NotFoundException(`Setting ${key} no encontrado`);
    return s;
  }

  async findByCategory(category: string) {
    await this.ensureDefaults();
    return this.prisma.setting.findMany({
      where: { category },
      orderBy: { key: "asc" },
    });
  }

  /**
   * Upsert (create-or-update). Solo ADMIN puede llamar este endpoint.
   */
  async upsert(dto: UpsertSettingDto, userId: string, userRole: string) {
    if (userRole !== "ADMIN")
      throw new BadRequestException("Solo ADMIN puede modificar settings");

    if (!dto.key)
      throw new BadRequestException("key es obligatoria");

    const type = (dto.type ?? "STRING").toUpperCase();
    if (!VALID_TYPES.includes(type))
      throw new BadRequestException(`Tipo inválido. Permitidos: ${VALID_TYPES.join(", ")}`);

    // Si type es BOOLEAN / NUMBER / JSON validamos parseabilidad
    if (type === "BOOLEAN" && !["true", "false"].includes(dto.value.toLowerCase()))
      throw new BadRequestException("BOOLEAN debe ser 'true' o 'false'");
    if (type === "NUMBER" && isNaN(Number(dto.value)))
      throw new BadRequestException("NUMBER debe ser numérico parseable");
    if (type === "JSON") {
      try { JSON.parse(dto.value); }
      catch { throw new BadRequestException("JSON inválido"); }
    }

    return this.prisma.setting.upsert({
      where: { key: dto.key },
      update: {
        value: dto.value,
        type,
        ...(dto.category    && { category: dto.category }),
        ...(dto.label       && { label: dto.label }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
        updatedBy: userId,
      },
      create: {
        key: dto.key,
        value: dto.value,
        type,
        category: dto.category ?? "general",
        label: dto.label,
        description: dto.description,
        isPublic: dto.isPublic ?? false,
        updatedBy: userId,
      },
    });
  }

  async upsertMany(dtos: UpsertSettingDto[], userId: string, userRole: string) {
    if (userRole !== "ADMIN")
      throw new BadRequestException("Solo ADMIN puede modificar settings");

    const results = await Promise.all(
      dtos.map(d => this.upsert(d, userId, userRole))
    );
    return { updated: results.length, settings: results };
  }

  async remove(key: string, userRole: string) {
    if (userRole !== "ADMIN")
      throw new BadRequestException("Solo ADMIN puede eliminar settings");

    await this.findOne(key);
    await this.prisma.setting.delete({ where: { key } });
    return { message: "Setting eliminado", key };
  }

  /**
   * Inserta los defaults si la tabla está vacía (idempotente).
   */
  private async ensureDefaults() {
    const count = await this.prisma.setting.count();
    if (count > 0) return;

    await this.prisma.setting.createMany({
      data: DEFAULT_SETTINGS.map(s => ({
        ...s,
        description: undefined,
      })),
    });
  }
}
