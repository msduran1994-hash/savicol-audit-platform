import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// DTO de creación/edición de un ítem de inventario (motor genérico por módulo).
export interface CreateInventarioItemDto {
  modulo: string;                 // PRODUCTO | TINAS | INSUMOS | MANTENIMIENTO | ACTIVOS | OTROS
  nombre: string;
  descripcion?: string;
  categoria?: string;
  ubicacion?: string;
  cediId?: string;
  cediNombre?: string;
  granjaId?: string;
  granjaNombre?: string;
  unidadMedida?: string;
  cantidad?: number;
  cantidadContada?: number;
  costoUnitario?: number;
  valorTotal?: number;
  estado?: string;
  responsable?: string;
  auditor?: string;
  fecha?: string;
  observaciones?: string;
  datosJSON?: string;
}

// Prefijos de consecutivo por módulo (folio: INV-<prefijo>-<año>-<seq>).
const MODULO_PREFIJO: Record<string, string> = {
  PRODUCTO: "PROD", TINAS: "TINA", INSUMOS: "INS",
  MANTENIMIENTO: "MANT", ACTIVOS: "ACT", OTROS: "OTRO",
};

// Whitelist de columnas escribibles (evita inyectar id/consecutivo/saldo/timestamps).
const ALLOWED = [
  "modulo", "nombre", "descripcion", "categoria", "ubicacion",
  "cediId", "cediNombre", "granjaId", "granjaNombre",
  "unidadMedida", "cantidad", "cantidadContada", "costoUnitario", "valorTotal",
  "estado", "responsable", "auditor", "fecha", "observaciones", "datosJSON",
];

function sanitize(dto: any): any {
  const out: any = {};
  for (const k of ALLOWED) if (dto[k] !== undefined) out[k] = dto[k];
  if (out.fecha === "" || out.fecha == null) delete out.fecha;
  else out.fecha = new Date(out.fecha);
  // Valor total consistente (cantidad × costo) si no viene o viene en 0.
  if ((out.valorTotal == null || out.valorTotal === 0) && out.cantidad && out.costoUnitario) {
    out.valorTotal = Math.round(out.cantidad * out.costoUnitario * 100) / 100;
  }
  // Diferencia de inventario = cantidad (teórica) − cantidad contada (física).
  if (out.cantidadContada != null && out.cantidad != null) {
    out.diferencia = Math.round((out.cantidad - out.cantidadContada) * 100) / 100;
  }
  return out;
}

@Injectable()
export class InventariosService {
  constructor(private prisma: PrismaService) {}

  findAll(filters: { modulo?: string; estado?: string; categoria?: string; cediId?: string; granjaId?: string } = {}) {
    const where: any = {};
    if (filters.modulo)    where.modulo = filters.modulo;
    if (filters.estado)    where.estado = filters.estado;
    if (filters.categoria) where.categoria = filters.categoria;
    if (filters.cediId)    where.cediId = filters.cediId;
    if (filters.granjaId)  where.granjaId = filters.granjaId;
    return this.prisma.inventarioAuditado.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  findOne(id: string) {
    return this.prisma.inventarioAuditado.findUnique({ where: { id } });
  }

  // Folio automático por módulo/año: INV-<prefijo>-<año>-<seq de 4 dígitos>.
  private async generarConsecutivo(modulo: string): Promise<string> {
    const prefijo = MODULO_PREFIJO[modulo] ?? "INV";
    const base = `INV-${prefijo}-${new Date().getFullYear()}-`;
    const n = await this.prisma.inventarioAuditado.count({ where: { consecutivo: { startsWith: base } } });
    return `${base}${String(n + 1).padStart(4, "0")}`;
  }

  async create(dto: CreateInventarioItemDto, userName?: string) {
    const data = sanitize(dto);
    const saldo = data.cantidad ?? 0; // saldo inicial = cantidad de referencia
    // Reintento por si el consecutivo colisiona (unique) en creaciones concurrentes.
    for (let intento = 0; intento < 4; intento++) {
      const consecutivo = await this.generarConsecutivo(data.modulo);
      try {
        return await this.prisma.inventarioAuditado.create({
          data: { ...data, consecutivo, saldo, createdBy: userName ?? null, updatedBy: userName ?? null },
        });
      } catch (e: any) {
        if (e?.code === "P2002" && intento < 3) continue;
        throw e;
      }
    }
  }

  async update(id: string, dto: Partial<CreateInventarioItemDto>, userName?: string) {
    const data = sanitize(dto);
    return this.prisma.inventarioAuditado.update({
      where: { id },
      data: { ...data, updatedBy: userName ?? null },
    });
  }

  remove(id: string) {
    return this.prisma.inventarioAuditado.delete({ where: { id } });
  }
}
