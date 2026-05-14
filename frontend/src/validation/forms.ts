import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .transform((value) => value.toLowerCase());

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name is too long"),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export const twoFactorFormSchema = z.object({
  code: z.string().trim().min(6, "Enter a valid code"),
});

export const recoveryRegenerationFormSchema = z.object({
  secondFactorMethod: z.enum(["totp", "recovery"]),
  secondFactorCode: z.string().trim().min(6, "Enter a valid verification code"),
  password: z.string().optional(),
});

export const recoveryRegenerationBaseSchema = recoveryRegenerationFormSchema;
export const recoveryRegenerationLocalSchema = recoveryRegenerationFormSchema.refine(
  (values) => Boolean(values.password && values.password.trim().length > 0),
  {
    path: ["password"],
    message: "Password is required",
  },
);

export const disableTwoFactorSchema = z.object({
  code: z.string().trim().min(6, "Enter a valid authenticator code"),
});

export const enableTwoFactorSchema = z.object({
  code: z.string().trim().min(6, "Enter a valid authenticator code"),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type TwoFactorFormValues = z.infer<typeof twoFactorFormSchema>;
export type RecoveryRegenerationFormValues = z.infer<
  typeof recoveryRegenerationFormSchema
>;
export type DisableTwoFactorValues = z.infer<typeof disableTwoFactorSchema>;
export type EnableTwoFactorValues = z.infer<typeof enableTwoFactorSchema>;
