import { z } from "zod";

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  unreadOnly: z.coerce.boolean().default(false),
  type: z.enum(["UPVOTE", "REPLY", "MENTION", "FOLLOW", "COMMUNITY_INVITE", "MODERATION"]).optional(),
});
