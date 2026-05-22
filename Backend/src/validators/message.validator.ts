import { z } from "zod";

export const startConversationSchema = z.object({
  userId: z.string().min(1),
});

export const sendMessageSchema = z.object({
  body: z.string().min(1).max(4000),
});
