import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env, isProduction } from "../config/env";
import type { AuthUser, JwtPayload } from "../types/auth";

export function signAccessToken(user: AuthUser, sessionId?: string) {
  return jwt.sign(
    {
      sub: user.id,
      sid: sessionId,
      role: user.role,
    } satisfies JwtPayload,
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"] },
  );
}

export function createRefreshToken() {
  return crypto.randomBytes(64).toString("base64url");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
    path: "/api/auth",
    domain: env.COOKIE_DOMAIN || undefined,
    maxAge: env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

export function accessCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
    path: "/",
    domain: env.COOKIE_DOMAIN || undefined,
  };
}
