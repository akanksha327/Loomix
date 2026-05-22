import { z } from "zod";

export const updateSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  uiDensity: z.enum(["compact", "default", "comfortable"]).optional(),
  motionEffects: z.boolean().optional(),
  privacy: z.record(z.string(), z.boolean()).optional(),
  notifications: z.record(z.string(), z.boolean()).optional(),
  security: z.record(z.string(), z.union([z.boolean(), z.string(), z.number()])).optional(),
});
