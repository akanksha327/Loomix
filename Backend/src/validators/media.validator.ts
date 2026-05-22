import { z } from "zod";

export const mediaKindSchema = z.object({
  kind: z.enum(["AVATAR", "BANNER", "POST"]).default("POST"),
});
