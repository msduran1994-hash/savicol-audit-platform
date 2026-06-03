import {
  Injectable, NotFoundException, BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateInventarioDto {
  granjaId: string;
  categoria: string;       // ALIMENTO_CONCENTRADO | INSUMOS_VETERINARIOS | MEDICAMENTOS | EQUIPOS | BIOSEGURIDAD_INV | INFRAESTRUCTURA_INV
  producto: string;
  unidad: string;
  stock: number;
  stockMinimo: number;
  fechaVencimiento?: string;   // ISO date
  ubicacion?: string;
  notas?: string;
}

const VALID_CATEGORIAS = [
  "ALIMENTO_CONCENTRADO", "INSUMOS_VETERINARIOS", "MEDICAMENTOS",
  "EQUIPOS", "BIOSEGURIDAD_INV", "INFRAESTRUCTURA_INV",
];

const DIAS_ALERTA_VENCIMIENTO = 30;

@Injectable()
export class InventarioService {
  constructor(private prisma: PrismaService) {}

  // ────────────────────────────────────────────────────────
  //  LISTAR (con filtros + estado calculado)
  // ────────────────────────────────────────────────────────
  async findAll(params: {
    granjaId?: string;
    categoria?: string;
    estado?: string;
    search?: string;
  } = {}) {
    const where: any = {};
    if (params.granjaId)  where.granjaId  = params.granjaId;
    if (params.categoria) where.categoria = params.categoria;
    if (params.search)    where.producto  = { contains: params.search };

    const items = await this.prisma.inventarioItem.findMany({
      where,
      include: {
        granja: { select: { id: true, codigo: true, nombre: true, region: true } },
      },
      orderBy: [{ categoria: "asc" }, { producto: "asc" }],
    });

    // Recalcular estado en tiempo real basado en stock + fecha vencimiento
    const itemsConEstado = items.map(item => ({
      ...item,
      estado: this.calcularEstado(item.stock, item.stockMinimo, item.fechaVencimiento),
    }));

    // Filtro post-cálculo por estado (si solicitado)
    if (params.estado) {
      return itemsConEstado.filter(i => i.estado === params.estado);
    }
    return itemsConEstado;
  }

  async findOne(id: string) {
    const item = await this.prisma.inventarioItem.findUnique({
      where: { id },
      include: {
        granja: { select: { id: true, codigo: true, nombre: true } },
      },
    });
    if (!item) throw new NotFoundException("Ítem de inventario no encontrado");
    return {
      ...item,
      estado: this.calcularEstado(item.stock, item.stockMinimo, item.fechaVencimiento),
    };
  }

  // ────────────────────────────────────────────────────────
  //  ALERTAS (vista agregada para dashboard)
  // ────────────────────────────────────────────────────────
  async getAlerts(granjaId?: string) {
    const items = await this.findAll({ granjaId });
    return {
      stockBajo:   items.filter(i => i.estado === "STOCK_BAJO"),
      agotado:     items.filter(i => i.estado === "AGOTADO"),
      vencido:     items.filter(i => i.estado === "VENCIDO"),
      porVencer:   items.filter(i => i.estado === "POR_VENCER"),
      totalItems:  items.length,
      conAlerta:   items.filter(i =>
        ["STOCK_BAJO", "AGOTADO", "VENCIDO", "POR_VENCER"].includes(i.estado)
      ).length,
    };
  }

  async getStatsByCategoria(granjaId?: string) {
    const items = await this.findAll({ granjaId });
    const agg: Record<string, { count: number; stockTotal: number; valor: number }> = {};
    for (const item of items) {
      const cat = item.categoria;
      if (!agg[cat]) agg[cat] = { count: 0, stockTotal: 0, valor: 0 };
      agg[cat].count += 1;
      agg[cat].stockTotal += item.stock;
    }
    return Object.entries(agg).map(([categoria, stats]) => ({ categoria, ...stats }));
  }

  // ────────────────────────────────────────────────────────
  //  CRUD
  // ────────────────────────────────────────────────────────
  async create(dto: CreateInventarioDto, userId: string) {
    if (!dto.granjaId || !dto.producto)
      throw new BadRequestException("granjaId y producto son obligatorios");

    if (!VALID_CATEGORIAS.includes(dto.categoria))
      throw new BadRequestException(
        `Categoría inválida. Permitidas: ${VALID_CATEGORIAS.join(", ")}`
      );

    const granja = await this.prisma.granja.findUnique({ where: { id: dto.granjaId } });
    if (!granja) throw new NotFoundException("Granja no encontrada");

    const estado = this.calcularEstado(
      dto.stock,
      dto.stockMinimo,
      dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : null,
    );

    const item = await this.prisma.inventarioItem.create({
      data: {
        granjaId: dto.granjaId,
        categoria: dto.categoria,
        producto: dto.producto,
        unidad: dto.unidad,
        stock: dto.stock,
        stockMinimo: dto.stockMinimo,
        fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : null,
        estado,
        ubicacion: dto.ubicacion,
        notas: dto.notas,
        isDemo: false,
      },
    });

    await this.logActividad(dto.granjaId, "Inventario", "Creado", item.id, item.producto, userId);
    return item;
  }

  async update(id: string, dto: Partial<CreateInventarioDto>, userId: string) {
    const existing = await this.findOne(id);

    if (dto.categoria && !VALID_CATEGORIAS.includes(dto.categoria))
      throw new BadRequestException(
        `Categoría inválida. Permitidas: ${VALID_CATEGORIAS.join(", ")}`
      );

    const newStock        = dto.stock        ?? existing.stock;
    const newStockMinimo  = dto.stockMinimo  ?? existing.stockMinimo;
    const newVenc         = dto.fechaVencimiento
      ? new Date(dto.fechaVencimiento)
      : existing.fechaVencimiento;

    const estado = this.calcularEstado(newStock, newStockMinimo, newVenc);

    const updated = await this.prisma.inventarioItem.update({
      where: { id },
      data: {
        ...(dto.categoria        && { categoria: dto.categoria }),
        ...(dto.producto         && { producto: dto.producto }),
        ...(dto.unidad           && { unidad: dto.unidad }),
        ...(dto.stock !== undefined        && { stock: dto.stock }),
        ...(dto.stockMinimo !== undefined  && { stockMinimo: dto.stockMinimo }),
        ...(dto.fechaVencimiento && { fechaVencimiento: new Date(dto.fechaVencimiento) }),
        ...(dto.ubicacion !== undefined    && { ubicacion: dto.ubicacion }),
        ...(dto.notas !== undefined        && { notas: dto.notas }),
        estado,
      },
    });

    await this.logActividad(existing.granjaId, "Inventario", "Actualizado", id, updated.producto, userId);
    return updated;
  }

  async remove(id: string, userId: string) {
    const existing = await this.findOne(id);
    await this.prisma.inventarioItem.delete({ where: { id } });
    await this.logActividad(existing.granjaId, "Inventario", "Eliminado", id, existing.producto, userId);
    return { message: "Ítem eliminado", id };
  }

  // ────────────────────────────────────────────────────────
  //  HELPERS
  // ────────────────────────────────────────────────────────
  private calcularEstado(
    stock: number,
    stockMinimo: number,
    fechaVencimiento: Date | null,
  ): string {
    // Vencimiento tiene prioridad sobre stock
    if (fechaVencimiento) {
      const hoy   = new Date();
      const venc  = new Date(fechaVencimiento);
      const diff  = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      if (diff < 0)                          return "VENCIDO";
      if (diff <= DIAS_ALERTA_VENCIMIENTO)   return "POR_VENCER";
    }
    if (stock <= 0)                  return "AGOTADO";
    if (stock < stockMinimo)         return "STOCK_BAJO";
    return "DISPONIBLE";
  }

  private async logActividad(
    granjaId: string,
    tipo: string,
    accion: string,
    recursoId: string,
    recursoNombre: string,
    userId: string,
  ) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      await this.prisma.actividadGranjaLog.create({
        data: {
          granjaId,
          tipo,
          accion,
          recursoId,
          recursoNombre,
          usuarioId: userId,
          usuarioNombre: user?.name ?? "Sistema",
        },
      });
    } catch {
      // Log no es crítico · si falla, no rompemos la operación
    }
  }
}
