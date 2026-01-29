/**
 * API Client utilities for safe fetch operations
 * Provides type-safe response parsing and consistent error handling
 */

import { ErrorCodes, type ErrorCode } from "./responses";

/**
 * Standard API error response structure
 */
export interface APIErrorResponse {
  error: string;
  code?: ErrorCode;
  details?: unknown;
}

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  public readonly status: number;
  public readonly code?: ErrorCode;
  public readonly details?: unknown;

  constructor(message: string, status: number, code?: ErrorCode, details?: unknown) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /**
   * Check if error is a specific error code
   */
  is(code: ErrorCode): boolean {
    return this.code === code;
  }

  /**
   * Check if error is a validation error
   */
  isValidation(): boolean {
    return this.code === ErrorCodes.VALIDATION_ERROR;
  }

  /**
   * Check if error is unauthorized
   */
  isUnauthorized(): boolean {
    return this.code === ErrorCodes.UNAUTHORIZED;
  }

  /**
   * Check if error is forbidden
   */
  isForbidden(): boolean {
    return this.code === ErrorCodes.FORBIDDEN;
  }

  /**
   * Check if error is not found
   */
  isNotFound(): boolean {
    return this.code === ErrorCodes.NOT_FOUND;
  }
}

/**
 * Result type for API operations
 */
export type APIResult<T> =
  | { success: true; data: T }
  | { success: false; error: APIError };

/**
 * Safely parse JSON from a response
 * Returns null if parsing fails instead of throwing
 */
export async function safeParseJSON<T = unknown>(
  response: Response
): Promise<T | null> {
  try {
    const text = await response.text();
    if (!text || text.trim() === "") {
      return null;
    }
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Parse API response and handle errors consistently
 * Throws APIError for non-ok responses
 */
export async function parseAPIResponse<T>(response: Response): Promise<T> {
  const data = await safeParseJSON<T | APIErrorResponse>(response);

  if (!response.ok) {
    const errorData = data as APIErrorResponse | null;
    throw new APIError(
      errorData?.error || `Request failed with status ${response.status}`,
      response.status,
      errorData?.code,
      errorData?.details
    );
  }

  if (data === null) {
    throw new APIError("Invalid JSON response", 500);
  }

  return data as T;
}

/**
 * Safe API call wrapper that returns a Result type instead of throwing
 */
export async function safeAPICall<T>(
  fetchFn: () => Promise<Response>
): Promise<APIResult<T>> {
  try {
    const response = await fetchFn();
    const data = await parseAPIResponse<T>(response);
    return { success: true, data };
  } catch (error) {
    if (error instanceof APIError) {
      return { success: false, error };
    }
    // Network or other errors
    return {
      success: false,
      error: new APIError(
        error instanceof Error ? error.message : "Unknown error",
        0
      ),
    };
  }
}

/**
 * Fetch wrapper with automatic JSON parsing and error handling
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  return parseAPIResponse<T>(response);
}

/**
 * Safe fetch wrapper that returns a Result type
 */
export async function safeApiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<APIResult<T>> {
  return safeAPICall<T>(() =>
    fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    })
  );
}

/**
 * Helper to extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}
