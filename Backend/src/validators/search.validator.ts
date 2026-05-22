import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  type: z.enum(["all", "communities", "posts", "users", "tags"]).default("all"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
