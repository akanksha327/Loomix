export class AppError extends Error {
  statusCode: number;
  code?: string;
  details?: unknown;

  constructor(statusCode: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message: string, details?: unknown) {
  return new AppError(400, message, "BAD_REQUEST", details);
}

export function unauthorized(message = "Authentication required") {
  return new AppError(401, message, "UNAUTHORIZED");
}

export function forbidden(message = "You do not have permission to perform this action") {
  return new AppError(403, message, "FORBIDDEN");
}

export function notFound(resource = "Resource") {
  return new AppError(404, `${resource} not found`, "NOT_FOUND");
}

export function conflict(message: string, details?: unknown) {
  return new AppError(409, message, "CONFLICT", details);
}
