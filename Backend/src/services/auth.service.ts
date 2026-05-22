import bcrypt from "bcryptjs";
import { env, isProduction } from "../config/env";
import { db } from "../lib/db";
import { conflict, notFound, unauthorized } from "../utils/errors";
import { accessCookieOptions, createRefreshToken, hashToken, refreshCookieOptions, signAccessToken } from "../utils/tokens";

const publicUserSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bannerUrl: true,
  bio: true,
  role: true,
  emailVerified: true,
  provider: true,
  createdAt: true,
} as const;

type SessionInput = {
  userAgent?: string;
  ipAddress?: string;
};

async function issueSession(user: { id: string; email: string; username: string; role: "USER" | "ADMIN" }, input: SessionInput) {
  const refreshToken = createRefreshToken();
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  const session = await db.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    },
  });

  const accessToken = signAccessToken(user, session.id);
  return { accessToken, refreshToken, sessionId: session.id, expiresAt };
}

export const authService = {
  accessCookieOptions,
  refreshCookieOptions,

  async firebaseSync(input: {
    uid: string;
    email: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    provider?: string;
    emailVerified: boolean;
  }, sessionInput: SessionInput) {
    if (!input.emailVerified) {
      throw unauthorized("Email must be verified before signing in");
    }

    const existing = await db.user.findFirst({
      where: {
        OR: [
          { email: input.email },
          { username: input.username }
        ]
      },
      select: { id: true, email: true, username: true }
    });

    if (existing && existing.id !== input.uid) {
      if (existing.email === input.email) {
        throw conflict("Email is already registered by another account");
      }
      if (existing.username === input.username) {
        throw conflict("Username is already taken by another account");
      }
    }

    const user = await db.user.upsert({
      where: { id: input.uid },
      update: {
        email: input.email,
        username: input.username,
        displayName: input.displayName ?? input.username,
        avatarUrl: input.avatarUrl || null,
        provider: input.provider || null,
        emailVerified: input.emailVerified,
        lastSeenAt: new Date(),
      },
      create: {
        id: input.uid,
        email: input.email,
        username: input.username,
        displayName: input.displayName ?? input.username,
        avatarUrl: input.avatarUrl || null,
        provider: input.provider || null,
        emailVerified: input.emailVerified,
        settings: { create: {} },
      },
      select: publicUserSelect,
    });

    const tokens = await issueSession(user, sessionInput);
    return { user, ...tokens };
  },

  async signup(input: { email: string; username: string; displayName?: string; password: string }, session: SessionInput) {
    const existing = await db.user.findFirst({
      where: {
        OR: [{ email: input.email }, { username: input.username }],
      },
      select: { email: true, username: true },
    });

    if (existing?.email === input.email) throw conflict("Email is already registered");
    if (existing?.username === input.username) throw conflict("Username is already taken");

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await db.user.create({
      data: {
        email: input.email,
        username: input.username,
        displayName: input.displayName ?? input.username,
        passwordHash,
        settings: { create: {} },
      },
      select: publicUserSelect,
    });

    const tokens = await issueSession(user, session);
    return { user, ...tokens };
  },

  async login(input: { identifier: string; password: string }, session: SessionInput) {
    const identifier = input.identifier.toLowerCase();
    const user = await db.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user || !user.passwordHash) throw unauthorized("Invalid credentials");
    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) throw unauthorized("Invalid credentials");

    await db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
    const tokens = await issueSession(user, session);
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  },

  async refresh(refreshToken?: string, sessionInput?: SessionInput) {
    if (!refreshToken) throw unauthorized("Refresh token is required");
    const tokenHash = hashToken(refreshToken);
    const session = await db.session.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: {
        user: {
          select: { ...publicUserSelect, deletedAt: true },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.deletedAt) {
      throw unauthorized("Invalid refresh token");
    }

    const nextRefreshToken = createRefreshToken();
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    await db.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: hashToken(nextRefreshToken),
        expiresAt,
        rotatedAt: new Date(),
        userAgent: sessionInput?.userAgent ?? session.userAgent,
        ipAddress: sessionInput?.ipAddress ?? session.ipAddress,
      },
    });

    const { deletedAt: _deletedAt, ...safeUser } = session.user;
    const accessToken = signAccessToken(safeUser, session.id);
    return { user: safeUser, accessToken, refreshToken: nextRefreshToken, sessionId: session.id, expiresAt };
  },

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    await db.session.updateMany({
      where: { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async me(userId: string) {
    const user = await db.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: publicUserSelect,
    });
    if (!user) throw notFound("User");
    return user;
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await db.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw notFound("User");

    if (!user.passwordHash) throw unauthorized("This account does not use password authentication");
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw unauthorized("Current password is incorrect");

    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } }),
      db.session.updateMany({ where: { userId }, data: { revokedAt: new Date() } }),
    ]);
  },

  async requestPasswordReset(email: string) {
    const token = createRefreshToken();
    await db.passwordResetToken.create({
      data: {
        email,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    return {
      delivered: true,
      resetToken: isProduction ? undefined : token,
    };
  },

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashToken(token);
    const resetToken = await db.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
      throw unauthorized("Invalid or expired reset token");
    }

    const user = await db.user.findUnique({ where: { email: resetToken.email } });
    if (!user) throw notFound("User");

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(newPassword, 12) },
      }),
      db.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
      db.session.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } }),
    ]);
  },
};
