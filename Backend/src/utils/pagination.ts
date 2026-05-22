import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type Pagination = z.infer<typeof paginationQuerySchema>;

export function getPagination(query: unknown): Pagination & { skip: number; take: number } {
  const parsed = paginationQuerySchema.parse(query);
  return {
    ...parsed,
    skip: (parsed.page - 1) * parsed.limit,
    take: parsed.limit,
  };
}

export function paginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
