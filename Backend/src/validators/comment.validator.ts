import { z } from "zod";

export const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  postId: z.string().min(1),
  parentId: z.string().min(1).optional(),
});

export const updateCommentSchema = z.object({
  body: z.string().min(1).max(5000),
});

export const commentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});
