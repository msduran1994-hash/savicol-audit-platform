import { z } from "zod";

export const AuditStatusEnum = z.enum(["COMPLETED","IN_PROGRESS","NOT_STARTED","OVERDUE"]);
export type AuditStatusType = z.infer<typeof AuditStatusEnum>;

export const CreateAuditActivitySchema = z.object({
  area:         z.string().min(1),
  auditorId:    z.string().min(1),
  auditorName:  z.string().min(1),
  activity:     z.string().min(3),
  activityType: z.string().min(1),
  startDate:    z.string().datetime(),
  endDate:      z.string().datetime(),
  status:       AuditStatusEnum.default("NOT_STARTED"),
  notes:        z.string().optional(),
  year:         z.number().int().default(2026),
});

export const UpdateAuditActivitySchema = CreateAuditActivitySchema.partial();

export type CreateAuditActivityDto = z.infer<typeof CreateAuditActivitySchema>;
export type UpdateAuditActivityDto = z.infer<typeof UpdateAuditActivitySchema>;
