import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * PowerBI Service · transforma datos de la DB en arrays planos
 * sin objetos anidados para que Power BI Desktop los ingiera limpio.
 */
@Injectable()
export class PowerbiService {
  constructor(private prisma: PrismaService) {}

  // ────────────────────────────────────────────────────────
  // DATASETS
  // ────────────────────────────────────────────────────────

  async granjas() {
    const g = await this.prisma.granja.findMany({
      include: { veterinario: { select: { nombre: true } } },
    });
    return g.map(x => ({
      id: x.id,
      codigo: x.codigo,
      nombre: x.nombre,
      estado: x.estado,
      region: x.region,
      vereda: x.vereda,
      administrador: x.administrador,
      responsable: x.responsable,
      tecnicoVeterinario: x.tecnicoVeterinarioNombre ?? x.veterinario?.nombre ?? "",
      telefono: x.telefono,
      tipoGranja: x.tipoGranja,
      tipoOperativo: x.tipoOperativo,
      nivelRiesgo: x.nivelRiesgo,
      capacidadAves: x.capacidadAves,
      estadoSanitario: x.estadoSanitario,
      isDemo: x.isDemo,
      createdAt: x.createdAt.toISOString(),
      updatedAt: x.updatedAt.toISOString(),
    }));
  }

  async rutas() {
    const acomp = await this.prisma.acompanamiento.findMany({
      include: {
        cliente: true, ruta: true, vehiculo: true,
        conductor: true, auxiliar: true,
      },
    });
    return acomp.map(a => ({
      id: a.id,
      fecha: a.fecha.toISOString().slice(0,10),
      anio: a.fecha.getFullYear(),
      mes: a.fecha.getMonth() + 1,
      auditorId: a.auditorId,
      auditorNombre: a.auditorNombre,
      clienteId: a.clienteId,
      clienteNombre: a.cliente?.nombre ?? "",
      clienteTipo: a.cliente?.tipo ?? "",
      clienteCiudad: a.cliente?.ciudad ?? "",
      rutaCodigo: a.ruta?.codigo ?? "",
      rutaNombre: a.ruta?.nombre ?? "",
      rutaRegion: a.ruta?.region ?? "",
      vehiculoPlaca: a.vehiculo?.placa ?? "",
      vehiculoTipo: a.vehiculo?.tipo ?? "",
      conductorNombre: a.conductor?.nombre ?? "",
      auxiliarNombre: a.auxiliar?.nombre ?? "",
      motivo: a.motivo,
      valorDevueltoCOP: a.valorDevueltoCOP,
      cantidadKgDevueltos: a.cantidadKgDevueltos,
      criticidad: a.criticidad,
      estado: a.estado,
      observacionAuditor: a.observacionAuditor,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  async cedis() {
    const c = await this.prisma.cedi.findMany();
    return c.map(x => ({
      id: x.id,
      codigo: x.codigo,
      nombre: x.nombre,
      ciudad: x.ciudad,
      region: x.region,
      administrador: x.administrador,
      telefono: x.telefono,
      direccion: x.direccion,
      capacidad: x.capacidad,
      activo: x.activo,
      isDemo: x.isDemo,
      createdAt: x.createdAt.toISOString(),
    }));
  }

  async hallazgosGranjas() {
    const h = await this.prisma.hallazgo.findMany({
      include: { granja: { select: { nombre: true, codigo: true, region: true } } },
    });
    return h.map(x => ({
      id: x.id,
      fechaVisita: x.fechaVisita.toISOString().slice(0,10),
      anio: x.fechaVisita.getFullYear(),
      mes: x.fechaVisita.getMonth() + 1,
      granjaId: x.granjaId,
      granjaCodigo: x.granja?.codigo ?? "",
      granjaNombre: x.granja?.nombre ?? "",
      granjaRegion: x.granja?.region ?? "",
      auditorId: x.auditorId,
      auditorNombre: x.auditorNombre,
      titulo: x.titulo,
      categoria: x.categoria,
      criticidad: x.criticidad,
      estado: x.estado,
      tiposRiesgo: x.tiposRiesgo,
      descripcion: x.descripcion,
      tipoGranja: x.tipoGranja,
      tipoOperativo: x.tipoOperativo,
      createdAt: x.createdAt.toISOString(),
      updatedAt: x.updatedAt.toISOString(),
    }));
  }

  async hallazgosCedis() {
    const h = await this.prisma.hallazgoCedi.findMany({
      include: { cedi: { select: { nombre: true, codigo: true, region: true } } },
    });
    return h.map(x => ({
      id: x.id,
      cediId: x.cediId,
      cediCodigo: x.cedi?.codigo ?? "",
      cediNombre: x.cedi?.nombre ?? "",
      cediRegion: x.cedi?.region ?? "",
      titulo: x.titulo,
      categoria: x.categoria,
      subItem: x.subItem,
      descripcion: x.descripcion,
      tipoRiesgo: x.tipoRiesgo,
      criticidad: x.criticidad,
      estado: x.estado,
      responsable: x.responsable,
      fechaCompromiso: x.fechaCompromiso?.toISOString().slice(0,10) ?? "",
      fechaCierre:     x.fechaCierre?.toISOString().slice(0,10)     ?? "",
      porcentajeAvance: x.porcentajeAvance,
      reincidente: x.reincidente,
      createdAt: x.createdAt.toISOString(),
    }));
  }

  async kpis() {
    const k = await this.prisma.kPI.findMany({
      include: { granja: { select: { nombre: true } }, hallazgo: { select: { titulo: true, categoria: true } } },
    });
    return k.map(x => ({
      id: x.id,
      granjaId: x.granjaId,
      granjaNombre: x.granja?.nombre ?? "",
      hallazgoId: x.hallazgoId,
      hallazgoTitulo: x.hallazgo?.titulo ?? "",
      hallazgoCategoria: x.hallazgo?.categoria ?? "",
      accion: x.accion,
      seguimiento: x.seguimiento,
      fechaCompromiso: x.fechaCompromiso.toISOString().slice(0,10),
      fechaCumplimiento: x.fechaCumplimiento?.toISOString().slice(0,10) ?? "",
      planAccionVeterinario: x.planAccionVeterinario,
      estado: x.estado,
      responsable: x.responsable,
      porcentajeAvance: x.porcentajeAvance,
      createdAt: x.createdAt.toISOString(),
    }));
  }

  async cronograma() {
    const a = await this.prisma.auditActivity.findMany();
    return a.map(x => ({
      id: x.id,
      item: x.item,
      area: x.area,
      auditorId: x.auditorId,
      auditorNombre: x.auditorName,
      activity: x.activity,
      activityType: x.activityType,
      startDate: x.startDate.toISOString().slice(0,10),
      endDate: x.endDate.toISOString().slice(0,10),
      mesInicio: x.startDate.getMonth() + 1,
      status: x.status,
      year: x.year,
      notes: x.notes,
      createdAt: x.createdAt.toISOString(),
    }));
  }

  /**
   * Dataset agregado · 1 fila resumen con KPIs ejecutivos.
   * Power BI lo usa como tabla de cards.
   */
  async summary() {
    const [
      totalGranjas, totalRutas, totalCedis,
      totalHallazgosG, totalHallazgosC,
      hallazgosCriticosG, hallazgosCriticosC,
      kpisCompletados, kpisActivos,
      activitiesTotal, activitiesCompleted,
      acompanamientosTotal, acompCriticos,
    ] = await Promise.all([
      this.prisma.granja.count(),
      this.prisma.ruta.count({ where: { activa: true } }),
      this.prisma.cedi.count({ where: { activo: true } }),
      this.prisma.hallazgo.count(),
      this.prisma.hallazgoCedi.count(),
      this.prisma.hallazgo.count({ where: { criticidad: "CRITICA" } }),
      this.prisma.hallazgoCedi.count({ where: { criticidad: "Crítica" } }),
      this.prisma.kPI.count({ where: { estado: "COMPLETADO" } }),
      this.prisma.kPI.count({ where: { estado: { in: ["EN_CURSO", "NO_INICIADO"] } } }),
      this.prisma.auditActivity.count(),
      this.prisma.auditActivity.count({ where: { status: "COMPLETED" } }),
      this.prisma.acompanamiento.count(),
      this.prisma.acompanamiento.count({ where: { criticidad: "CRITICO" } }),
    ]);

    return [{
      timestamp: new Date().toISOString(),
      totalGranjas, totalRutas, totalCedis,
      totalHallazgos: totalHallazgosG + totalHallazgosC,
      hallazgosCriticos: hallazgosCriticosG + hallazgosCriticosC,
      hallazgosGranjas: totalHallazgosG,
      hallazgosCedis:   totalHallazgosC,
      kpisCompletados,
      kpisActivos,
      cumplimientoKPI: (kpisCompletados + kpisActivos) > 0
        ? Math.round((kpisCompletados / (kpisCompletados + kpisActivos)) * 100)
        : 0,
      cronogramaTotal: activitiesTotal,
      cronogramaCompletadas: activitiesCompleted,
      cronogramaProgreso: activitiesTotal > 0
        ? Math.round((activitiesCompleted / activitiesTotal) * 100)
        : 0,
      acompanamientosTotal,
      acompanamientosCriticos: acompCriticos,
    }];
  }

  /**
   * Metadata · lista de datasets disponibles + sus columnas.
   * Power BI puede consultarlo para discovery.
   */
  async metadata() {
    return {
      datasets: [
        { name: "granjas",           endpoint: "/api/v1/powerbi/granjas",           description: "Granjas con veterinario asociado" },
        { name: "rutas",             endpoint: "/api/v1/powerbi/rutas",             description: "Acompañamientos con cliente/ruta/vehículo aplanados" },
        { name: "cedis",             endpoint: "/api/v1/powerbi/cedis",             description: "Centros de distribución" },
        { name: "hallazgos-granjas", endpoint: "/api/v1/powerbi/hallazgos-granjas", description: "Hallazgos del módulo granjas" },
        { name: "hallazgos-cedis",   endpoint: "/api/v1/powerbi/hallazgos-cedis",   description: "Hallazgos del módulo CEDIS" },
        { name: "kpis",              endpoint: "/api/v1/powerbi/kpis",              description: "KPIs de cumplimiento granjas" },
        { name: "cronograma",        endpoint: "/api/v1/powerbi/cronograma",        description: "Actividades cronograma 2026" },
        { name: "summary",           endpoint: "/api/v1/powerbi/summary",           description: "Resumen ejecutivo · 1 fila con KPIs" },
      ],
      version: "1.0",
      lastUpdated: new Date().toISOString(),
    };
  }
}
