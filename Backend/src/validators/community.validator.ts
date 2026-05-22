import { z } from "zod";

export const createCommunitySchema = z.object({
  name: z.string().min(3).max(40),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  visibility: z.enum(["PUBLIC", "RESTRICTED", "PRIVATE"]).default("PUBLIC"),
});

export const updateCommunitySchema = createCommunitySchema.partial();

export const communityQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(80).optional(),
  sort: z.enum(["new", "top", "trending"]).default("top"),
});
