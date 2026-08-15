import {
  Injectable, NotFoundException, BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateEvidenciaDto {
  tipo: string;             // Foto | PDF | Excel | Video | Otro
  nombre: string;
  url: string;
  size: number;
  categoria?: string;
  ocrTexto?: string;
}

export interface CreateEvidenciaHallazgoDto extends CreateEvidenciaDto {
  hallazgoId: string;
}

export interface CreateEvidenciaRutaDto extends CreateEvidenciaDto {
  acompanamientoId: string;
}

export interface CreateEvidenciaCediDto extends CreateEvidenciaDto {
  cediId: string;
  auditoriaId?: string;
  hallazgoId?: string;
}

const VALID_TIPOS = ["Foto", "PDF", "Excel", "Video", "Otro"];

@Injectable()
export class EvidenciasService {
  constructor(private prisma: PrismaService) {}

  // ════════════════════════════════════════════════════════════════════════
  //  EVIDENCIAS HALLAZGO (Granjas)
  // ════════════════════════════════════════════════════════════════════════
  async findAllHallazgo(hallazgoId?: string) {
    const where: any = {};
    if (hallazgoId) where.hallazgoId = hallazgoId;
    return this.prisma.evidenciaHallazgo.findMany({
      where, orderBy: { uploadedAt: "desc" },
    });
  }

  async createHallazgo(dto: CreateEvidenciaHallazgoDto, userId: string) {
    if (!dto.hallazgoId || !dto.nombre || !dto.url)
      throw new BadRequestException("hallazgoId, nombre y url son obligatorios");

    if (!VALID_TIPOS.includes(dto.tipo))
      throw new BadRequestException(`Tipo inválido. Permitidos: ${VALID_TIPOS.join(", ")}`);

    const hallazgo = await this.prisma.hallazgo.findUnique({
      where: { id: dto.hallazgoId },
    });
    if (!hallazgo) throw new NotFoundException("Hallazgo no encontrado");

    return this.prisma.evidenciaHallazgo.create({
      data: {
        hallazgoId: dto.hallazgoId,
        tipo: dto.tipo,
        nombre: dto.nombre,
        url: dto.url,
        size: dto.size,
        categoria: dto.categoria,
        uploadedBy: userId,
      },
    });
  }

  async removeHallazgo(id: string) {
    const ev = await this.prisma.evidenciaHallazgo.findUnique({ where: { id } });
    if (!ev) throw new NotFoundException("Evidencia no encontrada");
    await this.prisma.evidenciaHallazgo.delete({ where: { id } });
    return { message: "Evidencia eliminada", id };
  }

  // ════════════════════════════════════════════════════════════════════════
  //  EVIDENCIAS RUTA (Acompañamientos)
  // ════════════════════════════════════════════════════════════════════════
  async findAllRuta(acompanamientoId?: string) {
    const where: any = {};
    if (acompanamientoId) where.acompanamientoId = acompanamientoId;
    return this.prisma.evidenciaRuta.findMany({
      where, orderBy: { uploadedAt: "desc" },
    });
  }

  async createRuta(dto: CreateEvidenciaRutaDto, userId: string) {
    if (!dto.acompanamientoId || !dto.nombre || !dto.url)
      throw new BadRequestException(
        "acompanamientoId, nombre y url son obligatorios",
      );

    if (!VALID_TIPOS.includes(dto.tipo))
      throw new BadRequestException(`Tipo inválido. Permitidos: ${VALID_TIPOS.join(", ")}`);

    const acomp = await this.prisma.acompanamiento.findUnique({
      where: { id: dto.acompanamientoId },
    });
    if (!acomp) throw new NotFoundException("Acompañamiento no encontrado");

    return this.prisma.evidenciaRuta.create({
      data: {
        acompanamientoId: dto.acompanamientoId,
        tipo: dto.tipo,
        nombre: dto.nombre,
        url: dto.url,
        size: dto.size,
        categoria: dto.categoria,
        ocrTexto: dto.ocrTexto,
        ocrCompletado: !!dto.ocrTexto,
        uploadedBy: userId,
      },
    });
  }

  async removeRuta(id: string) {
    const ev = await this.prisma.evidenciaRuta.findUnique({ where: { id } });
    if (!ev) throw new NotFoundException("Evidencia no encontrada");
    await this.prisma.evidenciaRuta.delete({ where: { id } });
    return { message: "Evidencia eliminada", id };
  }

  // ════════════════════════════════════════════════════════════════════════
  //  EVIDENCIAS CEDI
  // ════════════════════════════════════════════════════════════════════════
  async findAllCedi(filters: { cediId?: string; auditoriaId?: string; hallazgoId?: string } = {}) {
    const where: any = {};
    if (filters.cediId)      where.cediId      = filters.cediId;
    if (filters.auditoriaId) where.auditoriaId = filters.auditoriaId;
    if (filters.hallazgoId)  where.hallazgoId  = filters.hallazgoId;

    return this.prisma.evidenciaCedi.findMany({
      where, orderBy: { uploadedAt: "desc" },
    });
  }

  async createCedi(dto: CreateEvidenciaCediDto, userId: string) {
    if (!dto.cediId || !dto.nombre || !dto.url)
      throw new BadRequestException("cediId, nombre y url son obligatorios");

    if (!VALID_TIPOS.includes(dto.tipo))
      throw new BadRequestException(`Tipo inválido. Permitidos: ${VALID_TIPOS.join(", ")}`);

    const cedi = await this.prisma.cedi.findUnique({ where: { id: dto.cediId } });
    if (!cedi) throw new NotFoundException("CEDI no encontrado");

    return this.prisma.evidenciaCedi.create({
      data: {
        cediId: dto.cediId,
        auditoriaId: dto.auditoriaId,
        hallazgoId: dto.hallazgoId,
        tipo: dto.tipo,
        nombre: dto.nombre,
        url: dto.url,
        size: dto.size,
        categoria: dto.categoria,
        ocrTexto: dto.ocrTexto,
        ocrCompletado: !!dto.ocrTexto,
        uploadedBy: userId,
      },
    });
  }

  async removeCedi(id: string) {
    const ev = await this.prisma.evidenciaCedi.findUnique({ where: { id } });
    if (!ev) throw new NotFoundException("Evidencia no encontrada");
    await this.prisma.evidenciaCedi.delete({ where: { id } });
    return { message: "Evidencia eliminada", id };
  }

  // ════════════════════════════════════════════════════════════════════════
  //  STATS UNIFICADAS
  // ════════════════════════════════════════════════════════════════════════
  async getStats() {
    const [hg, rt, cd] = await Promise.all([
      this.prisma.evidenciaHallazgo.count(),
      this.prisma.evidenciaRuta.count(),
      this.prisma.evidenciaCedi.count(),
    ]);
    return {
      total: hg + rt + cd,
      porModulo: {
        hallazgosGranjas: hg,
        acompanamientosRutas: rt,
        auditoriasCedis: cd,
      },
    };
  }
}
