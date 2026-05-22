import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const slugParamSchema = z.object({
  slug: z.string().min(1).max(100),
});

export const usernameParamSchema = z.object({
  username: z.string().min(3).max(30),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const sortQuerySchema = paginationSchema.extend({
  sort: z.enum(["new", "top", "trending"]).default("new"),
});
