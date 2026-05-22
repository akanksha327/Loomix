import { db } from "../lib/db";

export const settingsService = {
  async get(userId: string) {
    return db.userSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  },

  async update(userId: string, input: {
    theme?: string;
    accentColor?: string;
    uiDensity?: string;
    motionEffects?: boolean;
    privacy?: Record<string, boolean>;
    notifications?: Record<string, boolean>;
    security?: Record<string, boolean | string | number>;
  }) {
    // Build data object, only including defined fields
    const data: Record<string, unknown> = {};
    if (input.theme !== undefined) data.theme = input.theme;
    if (input.accentColor !== undefined) data.accentColor = input.accentColor;
    if (input.uiDensity !== undefined) data.uiDensity = input.uiDensity;
    if (input.motionEffects !== undefined) data.motionEffects = input.motionEffects;
    if (input.privacy !== undefined) data.privacy = input.privacy;
    if (input.notifications !== undefined) data.notifications = input.notifications;
    if (input.security !== undefined) data.security = input.security;

    return db.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: data,
    });
  },
};
