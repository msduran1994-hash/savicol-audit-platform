import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// SQLite: no hay enums tipados, usamos string literal unions
export type AuditStatus = "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" | "OVERDUE";

export interface CreateActivityDto {
  area: string;
  auditorId: string;
  auditorName: string;
  activity: string;
  activityType: string;
  startDate: string;
  endDate: string;
  status?: AuditStatus;
  notes?: string;
  year?: number;
}

export interface UpdateActivityDto extends Partial<CreateActivityDto> {}

@Injectable()
export class AuditActivitiesService {
  constructor(private prisma: PrismaService) {}

  /* ── List / filter ────────────────────────────────────── */
  async findAll(filters: {
    year?: number;
    auditorId?: string;
    status?: AuditStatus;
    area?: string;
    search?: string;
  }) {
    const { year = 2026, auditorId, status, area, search } = filters;

    const where: any = { year };
    if (auditorId) where.auditorId = auditorId;
    if (status)    where.status    = status;
    if (area)      where.area      = area;
    if (search)    where.activity  = { contains: search };  // SQLite: LIKE es case-insensitive ASCII

    const activities = await this.prisma.auditActivity.findMany({
      where,
      orderBy: [{ startDate: "asc" }, { item: "asc" }],
    });

    return activities;
  }

  /* ── Single ───────────────────────────────────────────── */
  async findOne(id: string) {
    const a = await this.prisma.auditActivity.findUnique({ where: { id } });
    if (!a) throw new NotFoundException(`Actividad ${id} no encontrada`);
    return a;
  }

  /* ── Create ───────────────────────────────────────────── */
  async create(dto: CreateActivityDto, createdBy: string) {
    const count = await this.prisma.auditActivity.count({
      where: { year: dto.year ?? 2026 },
    });

    const activity = await this.prisma.auditActivity.create({
      data: {
        item:         count + 1,
        area:         dto.area,
        auditorId:    dto.auditorId,
        auditorName:  dto.auditorName,
        activity:     dto.activity,
        activityType: dto.activityType,
        startDate:    new Date(dto.startDate),
        endDate:      new Date(dto.endDate),
        status:       dto.status ?? "NOT_STARTED",
        notes:        dto.notes,
        year:         dto.year ?? 2026,
      },
    });

    await this.prisma.auditActivityLog.create({
      data: {
        activityId: activity.id,
        userId:     createdBy,
        action:     "CREATED",
        newValues:  JSON.stringify(activity),
      },
    });

    return activity;
  }

  /* ── Update ───────────────────────────────────────────── */
  async update(id: string, dto: UpdateActivityDto, updatedBy: string) {
    const existing = await this.findOne(id);

    const updated = await this.prisma.auditActivity.update({
      where: { id },
      data: {
        ...(dto.area         && { area: dto.area }),
        ...(dto.auditorId    && { auditorId: dto.auditorId }),
        ...(dto.auditorName  && { auditorName: dto.auditorName }),
        ...(dto.activity     && { activity: dto.activity }),
        ...(dto.activityType && { activityType: dto.activityType }),
        ...(dto.startDate    && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate      && { endDate: new Date(dto.endDate) }),
        ...(dto.status       && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    await this.prisma.auditActivityLog.create({
      data: {
        activityId: id,
        userId:     updatedBy,
        action:     "UPDATED",
        oldValues:  JSON.stringify(existing),
        newValues:  JSON.stringify(updated),
      },
    });

    return updated;
  }

  /* ── Delete ───────────────────────────────────────────── */
  async remove(id: string, deletedBy: string) {
    const existing = await this.findOne(id);

    await this.prisma.auditActivityLog.create({
      data: {
        activityId: id,
        userId:     deletedBy,
        action:     "DELETED",
        oldValues:  JSON.stringify(existing),
      },
    });

    await this.prisma.auditActivity.delete({ where: { id } });
    return { message: "Actividad eliminada" };
  }

  /* ── Stats ────────────────────────────────────────────── */
  async getStats(year: number = 2026) {
    const [total, completed, inProgress, notStarted, overdue] = await Promise.all([
      this.prisma.auditActivity.count({ where: { year } }),
      this.prisma.auditActivity.count({ where: { year, status: "COMPLETED" } }),
      this.prisma.auditActivity.count({ where: { year, status: "IN_PROGRESS" } }),
      this.prisma.auditActivity.count({ where: { year, status: "NOT_STARTED" } }),
      this.prisma.auditActivity.count({ where: { year, status: "OVERDUE" } }),
    ]);

    const byAuditor = await this.prisma.auditActivity.groupBy({
      by: ["auditorId", "auditorName", "status"],
      where: { year },
      _count: { _all: true },
    });

    const byArea = await this.prisma.auditActivity.groupBy({
      by: ["area", "status"],
      where: { year },
      _count: { _all: true },
    });

    return {
      total,
      completed,
      inProgress,
      notStarted,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      byAuditor,
      byArea,
    };
  }
}
