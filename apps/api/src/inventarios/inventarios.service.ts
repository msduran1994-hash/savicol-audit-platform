import { Injectable, NotFoundException } from "@nestjs/common";
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

// DTO de movimiento del kardex (Entrada | Salida | Ajuste | Conteo).
export interface CreateMovimientoDto {
  itemId: string;
  tipo: string;
  cantidad: number;
  motivo?: string;
  referencia?: string;
  responsable?: string;
  observaciones?: string;
  fecha?: string;
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

  // ── Kardex de movimientos ──
  findMovimientos(itemId: string) {
    return this.prisma.movimientoInventario.findMany({ where: { itemId }, orderBy: { createdAt: "desc" } });
  }

  private aplicarDelta(tipo: string, saldoAnterior: number, cantidad: number): number {
    let r = saldoAnterior;
    if (tipo === "Entrada")      r = saldoAnterior + cantidad;
    else if (tipo === "Salida")  r = saldoAnterior - cantidad;
    else if (tipo === "Ajuste")  r = saldoAnterior + cantidad; // cantidad con signo
    else if (tipo === "Conteo")  r = cantidad;                 // el conteo fija el saldo
    return Math.round(r * 100) / 100;
  }

  async createMovimiento(dto: CreateMovimientoDto, userName?: string) {
    const item = await this.prisma.inventarioAuditado.findUnique({ where: { id: dto.itemId } });
    if (!item) throw new NotFoundException("Ítem de inventario no encontrado");
    const cantidad = Number(dto.cantidad) || 0;
    const saldoAnterior = item.saldo ?? 0;
    const saldoResultante = this.aplicarDelta(dto.tipo, saldoAnterior, cantidad);

    const mov = await this.prisma.movimientoInventario.create({
      data: {
        itemId: dto.itemId, tipo: dto.tipo, cantidad,
        saldoAnterior, saldoResultante,
        fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
        motivo: dto.motivo ?? null, referencia: dto.referencia ?? null,
        responsable: dto.responsable ?? null, observaciones: dto.observaciones ?? null,
        createdBy: userName ?? null,
      },
    });

    // Actualiza el saldo del ítem (y conteo/diferencia si el movimiento es un Conteo).
    const patch: any = { saldo: saldoResultante, updatedBy: userName ?? null };
    if (dto.tipo === "Conteo") {
      patch.cantidadContada = cantidad;
      patch.diferencia = Math.round((saldoAnterior - cantidad) * 100) / 100;
    }
    await this.prisma.inventarioAuditado.update({ where: { id: dto.itemId }, data: patch });
    return mov;
  }

  async removeMovimiento(id: string, userName?: string) {
    const mov = await this.prisma.movimientoInventario.findUnique({ where: { id } });
    const res = await this.prisma.movimientoInventario.delete({ where: { id } });
    if (mov) await this.recomputeSaldo(mov.itemId, userName);
    return res;
  }

  // Recalcula el saldo del ítem y los saldos de cada movimiento reproduciendo el
  // kardex desde la cantidad inicial (base). Mantiene la cadena consistente aunque
  // se elimine un movimiento intermedio.
  private async recomputeSaldo(itemId: string, userName?: string) {
    const item = await this.prisma.inventarioAuditado.findUnique({ where: { id: itemId } });
    if (!item) return;
    const base = item.cantidad ?? 0;
    const movs = await this.prisma.movimientoInventario.findMany({ where: { itemId }, orderBy: { createdAt: "asc" } });
    let saldo = base;
    let ultimoConteo: number | null = null, difConteo: number | null = null;
    for (const m of movs) {
      const saldoAnterior = saldo;
      const saldoResultante = this.aplicarDelta(m.tipo, saldoAnterior, m.cantidad ?? 0);
      if (m.saldoAnterior !== saldoAnterior || m.saldoResultante !== saldoResultante) {
        await this.prisma.movimientoInventario.update({ where: { id: m.id }, data: { saldoAnterior, saldoResultante } });
      }
      if (m.tipo === "Conteo") { ultimoConteo = m.cantidad ?? 0; difConteo = Math.round((saldoAnterior - (m.cantidad ?? 0)) * 100) / 100; }
      saldo = saldoResultante;
    }
    const patch: any = { saldo, updatedBy: userName ?? null };
    if (ultimoConteo != null) { patch.cantidadContada = ultimoConteo; patch.diferencia = difConteo; }
    await this.prisma.inventarioAuditado.update({ where: { id: itemId }, data: patch });
  }
}
