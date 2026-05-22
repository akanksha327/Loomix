import type { NextFunction, Request, Response } from "express";
import { db } from "../lib/db";
import { forbidden, unauthorized } from "../utils/errors";
import { verifyAccessToken } from "../utils/tokens";

function extractToken(req: Request) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return req.cookies?.accessToken as string | undefined;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) throw unauthorized();

    const payload = verifyAccessToken(token);
    const user = await db.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, email: true, username: true, role: true },
    });

    if (!user) throw unauthorized("Invalid or expired session");
    req.user = user;
    next();
  } catch (error) {
    next(unauthorized("Invalid or expired token"));
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) return next();

    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: "", username: "", role: payload.role };
    next();
  } catch {
    next();
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") return next(forbidden("Admin access required"));
  next();
}
