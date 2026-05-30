import { z } from "zod";

export const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

export const MfaVerifySchema = z.object({
  tempToken: z.string(),
  code:      z.string().length(6),
});

export const RegisterSchema = z.object({
  email:    z.string().email(),
  name:     z.string().min(2),
  password: z.string().min(8),
  role:     z.enum(["ADMIN","AUDITOR","SUPERVISOR","AUDITEE","VIEWER"]).default("VIEWER"),
});

export type LoginDto    = z.infer<typeof LoginSchema>;
export type MfaDto      = z.infer<typeof MfaVerifySchema>;
export type RegisterDto = z.infer<typeof RegisterSchema>;
