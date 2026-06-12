import type { ErrorRequestHandler, Request, Response } from "express";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export function badRequest(message: string, details?: unknown): ApiError {
  return new ApiError(400, "BAD_REQUEST", message, details);
}

export function unauthorized(message = "Staff authorization required."): ApiError {
  return new ApiError(401, "UNAUTHORIZED", message);
}

export function forbidden(message: string): ApiError {
  return new ApiError(403, "FORBIDDEN", message);
}

export function tooManyRequests(message: string): ApiError {
  return new ApiError(429, "TOO_MANY_REQUESTS", message);
}

export function notFound(message = "Resource not found."): ApiError {
  return new ApiError(404, "NOT_FOUND", message);
}

export function conflict(message: string, details?: unknown): ApiError {
  return new ApiError(409, "CONFLICT", message, details);
}

export function sendApiError(response: Response, error: ApiError): void {
  response.status(error.statusCode).json({
    code: error.code,
    message: error.message,
    ...(error.details === undefined ? {} : { details: error.details })
  });
}

export function notImplementedHandler(_request: Request, response: Response): void {
  response.status(501).json({
    code: "NOT_IMPLEMENTED",
    message: "This route is planned for a later implementation phase."
  });
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  void _next;

  if (typeof error === "object" && error !== null && "code" in error) {
    const csrfError = error as { code?: unknown };

    if (csrfError.code === "EBADCSRFTOKEN") {
      sendApiError(response, forbidden("Invalid or missing CSRF token."));
      return;
    }
  }

  if (error instanceof ApiError) {
    sendApiError(response, error);
    return;
  }

  if (error instanceof ZodError) {
    sendApiError(response, badRequest("Request validation failed.", error.flatten()));
    return;
  }

  console.error(error);
  response.status(500).json({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unexpected server error."
  });
};
