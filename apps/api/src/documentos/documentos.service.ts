import {
  Injectable, NotFoundException, BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateDocumentoDto {
  granjaId: string;
  nombre: string;
  tipo: string;            // PDF | Excel | CSV | Word | PowerPoint | Imagen | Otro
  categoria: string;       // Cumplimiento | Sanidad | Operativo | Bioseguridad | Inventario | Veterinario | Otro
  size: number;            // bytes
  url: string;             // ruta de almacenamiento (S3 / Railway storage / external)
  ocrTexto?: string;
}

const VALID_TIPOS = ["PDF", "Excel", "CSV", "Word", "PowerPoint", "Imagen", "Otro"];
const VALID_CATEGORIAS = [
  "Cumplimiento", "Sanidad", "Operativo", "Bioseguridad",
  "Inventario", "Veterinario", "Otro",
];

@Injectable()
export class DocumentosService {
  constructor(private prisma: PrismaService) {}

  // ────────────────────────────────────────────────────────
  //  LECTURA
  // ────────────────────────────────────────────────────────
  async findAll(params: {
    granjaId?: string;
    categoria?: string;
    tipo?: string;
    search?: string;
  } = {}) {
    const where: any = {};
    if (params.granjaId)  where.granjaId  = params.granjaId;
    if (params.categoria) where.categoria = params.categoria;
    if (params.tipo)      where.tipo      = params.tipo;
    if (params.search)    where.nombre    = { contains: params.search };

    return this.prisma.documentoGranja.findMany({
      where,
      include: {
        granja: { select: { id: true, codigo: true, nombre: true, region: true } },
      },
      orderBy: { uploadedAt: "desc" },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.documentoGranja.findUnique({
      where: { id },
      include: {
        granja: { select: { id: true, codigo: true, nombre: true } },
      },
    });
    if (!doc) throw new NotFoundException("Documento no encontrado");
    return doc;
  }

  async getStatsByCategoria(granjaId?: string) {
    const where: any = {};
    if (granjaId) where.granjaId = granjaId;

    const docs = await this.prisma.documentoGranja.findMany({
      where,
      select: { categoria: true, tipo: true, size: true },
    });

    const porCategoria: Record<string, { count: number; sizeTotal: number }> = {};
    const porTipo: Record<string, number> = {};

    for (const d of docs) {
      if (!porCategoria[d.categoria]) porCategoria[d.categoria] = { count: 0, sizeTotal: 0 };
      porCategoria[d.categoria].count += 1;
      porCategoria[d.categoria].sizeTotal += d.size;
      porTipo[d.tipo] = (porTipo[d.tipo] ?? 0) + 1;
    }

    return {
      total: docs.length,
      sizeTotalBytes: docs.reduce((acc, d) => acc + d.size, 0),
      porCategoria: Object.entries(porCategoria).map(([k, v]) => ({ categoria: k, ...v })),
      porTipo: Object.entries(porTipo).map(([k, v]) => ({ tipo: k, count: v })),
    };
  }

  // ────────────────────────────────────────────────────────
  //  CREAR (registra metadata · upload real será en Sprint 4)
  // ────────────────────────────────────────────────────────
  async create(dto: CreateDocumentoDto, userId: string, userName: string) {
    if (!dto.granjaId || !dto.nombre || !dto.url)
      throw new BadRequestException("granjaId, nombre y url son obligatorios");

    if (!VALID_TIPOS.includes(dto.tipo))
      throw new BadRequestException(`Tipo inválido. Permitidos: ${VALID_TIPOS.join(", ")}`);

    if (!VALID_CATEGORIAS.includes(dto.categoria))
      throw new BadRequestException(
        `Categoría inválida. Permitidas: ${VALID_CATEGORIAS.join(", ")}`
      );

    const granja = await this.prisma.granja.findUnique({ where: { id: dto.granjaId } });
    if (!granja) throw new NotFoundException("Granja no encontrada");

    const doc = await this.prisma.documentoGranja.create({
      data: {
        granjaId: dto.granjaId,
        nombre: dto.nombre,
        tipo: dto.tipo,
        categoria: dto.categoria,
        size: dto.size,
        url: dto.url,
        ocrTexto: dto.ocrTexto,
        ocrCompletado: !!dto.ocrTexto,
        uploadedBy: userName ?? userId,
        isDemo: false,
      },
    });

    await this.logActividad(dto.granjaId, "Documento", "Cargado", doc.id, doc.nombre, userId, userName);
    return doc;
  }

  async update(id: string, dto: Partial<CreateDocumentoDto>, userId: string, userName: string) {
    const existing = await this.findOne(id);

    if (dto.tipo && !VALID_TIPOS.includes(dto.tipo))
      throw new BadRequestException(`Tipo inválido. Permitidos: ${VALID_TIPOS.join(", ")}`);

    if (dto.categoria && !VALID_CATEGORIAS.includes(dto.categoria))
      throw new BadRequestException(
        `Categoría inválida. Permitidas: ${VALID_CATEGORIAS.join(", ")}`
      );

    const updated = await this.prisma.documentoGranja.update({
      where: { id },
      data: {
        ...(dto.nombre    && { nombre: dto.nombre }),
        ...(dto.tipo      && { tipo: dto.tipo }),
        ...(dto.categoria && { categoria: dto.categoria }),
        ...(dto.size !== undefined && { size: dto.size }),
        ...(dto.url       && { url: dto.url }),
        ...(dto.ocrTexto !== undefined && { ocrTexto: dto.ocrTexto, ocrCompletado: true }),
      },
    });

    await this.logActividad(existing.granjaId, "Documento", "Actualizado", id, updated.nombre, userId, userName);
    return updated;
  }

  async remove(id: string, userId: string, userName: string) {
    const existing = await this.findOne(id);
    await this.prisma.documentoGranja.delete({ where: { id } });
    await this.logActividad(existing.granjaId, "Documento", "Eliminado", id, existing.nombre, userId, userName);
    return { message: "Documento eliminado", id };
  }

  // ────────────────────────────────────────────────────────
  //  HELPERS
  // ────────────────────────────────────────────────────────
  private async logActividad(
    granjaId: string,
    tipo: string,
    accion: string,
    recursoId: string,
    recursoNombre: string,
    userId: string,
    userName: string,
  ) {
    try {
      await this.prisma.actividadGranjaLog.create({
        data: {
          granjaId,
          tipo,
          accion,
          recursoId,
          recursoNombre,
          usuarioId: userId,
          usuarioNombre: userName ?? "Sistema",
        },
      });
    } catch {
      // Log silencioso
    }
  }
}
