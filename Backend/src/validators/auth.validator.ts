import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

export const signupSchema = z.object({
  email: z.string().email().max(255).transform((value) => value.toLowerCase()),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores")
    .transform((value) => value.toLowerCase()),
  displayName: z.string().min(1).max(80).optional(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  identifier: z.string().min(3).max(255),
  password: z.string().min(1).max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email().max(255).transform((value) => value.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  newPassword: passwordSchema,
});

export const firebaseSyncSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores")
    .transform((value) => value.toLowerCase()),
  displayName: z.string().min(1).max(80).optional(),
  avatarUrl: z.string().url().or(z.string().length(0)).optional().nullable(),
  provider: z.string().optional(),
  emailVerified: z.boolean(),
});
