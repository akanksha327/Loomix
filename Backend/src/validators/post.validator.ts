import { z } from "zod";

type PostTypePayload = {
  type?: "TEXT" | "IMAGE" | "LINK" | "MEDIA";
  url?: string;
  mediaUrl?: string;
};

const postPayloadSchema = z.object({
  title: z.string().min(3).max(300),
  content: z.string().max(10000).optional(),
  type: z.enum(["TEXT", "IMAGE", "LINK", "MEDIA"]).default("TEXT"),
  url: z.string().url().optional(),
  mediaUrl: z.string().min(1).optional(),
  communityId: z.string().min(1).optional(),
  tags: z.array(z.string().min(1).max(32)).max(10).default([]),
});

const withPostTypeRequirements = <T extends z.ZodType<PostTypePayload>>(schema: T) =>
  schema
    .refine((data) => data.type !== "LINK" || data.url, {
    message: "Link posts require a valid url",
    path: ["url"],
  })
    .refine((data) => (data.type !== "IMAGE" && data.type !== "MEDIA") || data.mediaUrl, {
    message: "Image and media posts require a mediaUrl",
    path: ["mediaUrl"],
  });

export const createPostSchema = withPostTypeRequirements(postPayloadSchema);

export const updatePostSchema = withPostTypeRequirements(postPayloadSchema.partial());

export const postFeedQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(["new", "top", "trending"]).default("new"),
  community: z.string().optional(),
  author: z.string().optional(),
  tag: z.string().optional(),
});
