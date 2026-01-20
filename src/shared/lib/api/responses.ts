import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Standard error codes for API responses
 */
export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

interface ErrorResponseOptions {
  code?: ErrorCode;
  details?: unknown;
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  status: number,
  options?: ErrorResponseOptions
) {
  return NextResponse.json(
    {
      error: message,
      code: options?.code,
      details: options?.details,
    },
    { status }
  );
}

/**
 * Create a validation error response from Zod errors
 */
export function validationError(error: ZodError) {
  return errorResponse("Validation failed", 400, {
    code: ErrorCodes.VALIDATION_ERROR,
    details: error.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    })),
  });
}

/**
 * Create a not found error response
 */
export function notFoundError(resource: string = "Resource") {
  return errorResponse(`${resource} not found`, 404, {
    code: ErrorCodes.NOT_FOUND,
  });
}

/**
 * Create a forbidden error response (user lacks permission)
 */
export function forbiddenError(message: string = "Access denied") {
  return errorResponse(message, 403, {
    code: ErrorCodes.FORBIDDEN,
  });
}

/**
 * Create an unauthorized error response (not authenticated)
 */
export function unauthorizedError(message: string = "Authentication required") {
  return errorResponse(message, 401, {
    code: ErrorCodes.UNAUTHORIZED,
  });
}

/**
 * Create a conflict error response (duplicate resource, etc.)
 */
export function conflictError(message: string) {
  return errorResponse(message, 409, {
    code: ErrorCodes.CONFLICT,
  });
}

/**
 * Create an internal server error response
 */
export function internalError(message: string = "Internal server error") {
  return errorResponse(message, 500, {
    code: ErrorCodes.INTERNAL_ERROR,
  });
}

/**
 * Create a success response with data
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Create a success response with cache headers
 */
export function cachedResponse<T>(
  data: T,
  options: {
    maxAge?: number;
    staleWhileRevalidate?: number;
    isPrivate?: boolean;
  } = {}
) {
  const { maxAge = 30, staleWhileRevalidate = 300, isPrivate = true } = options;
  const cacheControl = `${isPrivate ? "private" : "public"}, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`;

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": cacheControl,
    },
  });
}
