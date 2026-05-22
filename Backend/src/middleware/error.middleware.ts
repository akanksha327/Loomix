import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { isProduction } from "../config/env";
import { AppError } from "../utils/errors";
import { sendError } from "../utils/api-response";

export function notFoundHandler(req: Request, res: Response) {
  return sendError(res, 404, `Route ${req.method} ${req.originalUrl} not found`);
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (!isProduction) {
    console.error(error);
  }

  if (error instanceof ZodError) {
    return sendError(res, 422, "Validation failed", error.flatten());
  }

  if (error instanceof AppError) {
    return sendError(res, error.statusCode, error.message, error.details);
  }

  if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
    return sendError(res, 409, "A record with this unique value already exists");
  }

  const details = isProduction ? undefined : error instanceof Error ? error.message : error;
  return sendError(res, 500, "Internal server error", details);
}
