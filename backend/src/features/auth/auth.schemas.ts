import { z } from "zod";

const emailSchema = z.string().trim().email().toLowerCase();

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const recoveryCodeSecondFactorSchema = z.object({
  secondFactorMethod: z.enum(["totp", "recovery"]),
  secondFactorCode: z.string().trim().min(6),
});

export const regenerateRecoveryCodesSchema = recoveryCodeSecondFactorSchema.extend({
  password: z.string().optional(),
});
