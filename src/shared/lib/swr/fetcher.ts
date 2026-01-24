/**
 * SWR Fetcher
 * Global fetcher for SWR with standardized error handling
 */

/**
 * Custom error class for API fetch errors
 */
export class FetchError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type FetcherParams = string | [string, string];

/**
 * Universal fetcher for SWR
 * Supports both simple URLs and [url, queryString] tuples
 *
 * @example
 * // Simple usage
 * useSWR('/api/app/accounts', fetcher)
 *
 * // With query string
 * useSWR(['/api/app/accounts', 'budgetId=123'], fetcher)
 */
export const fetcher = async <T>(
  params: FetcherParams,
  ...args: RequestInit[]
): Promise<T> => {
  // Parse params
  let url: string;
  let queryString: string | undefined;

  if (typeof params === 'string') {
    url = params;
  } else {
    url = params[0];
    queryString = params[1] || undefined;
  }

  // Build full URL
  const fullUrl = queryString ? `${url}?${queryString}` : url;

  // Execute fetch
  const response = await fetch(fullUrl, ...args);

  // Handle non-OK responses
  if (!response.ok) {
    let errorData: { message?: string; code?: string; details?: unknown } = {};

    try {
      errorData = await response.json();
    } catch {
      // If JSON parsing fails, use status text
      errorData = { message: response.statusText };
    }

    throw new FetchError(
      errorData.message || 'An error occurred',
      response.status,
      errorData.code,
      errorData.details
    );
  }

  // Parse and return JSON response
  return response.json() as Promise<T>;
};

/**
 * POST fetcher for mutations
 * Use this when you need to POST data via SWR
 */
export const postFetcher = async <T, D = unknown>(
  url: string,
  data: D
): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorData: { message?: string; code?: string; details?: unknown } = {};

    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    throw new FetchError(
      errorData.message || 'An error occurred',
      response.status,
      errorData.code,
      errorData.details
    );
  }

  return response.json() as Promise<T>;
};

/**
 * Type guard to check if error is a FetchError
 */
export function isFetchError(error: unknown): error is FetchError {
  return error instanceof FetchError;
}

/**
 * Helper to get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (isFetchError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocorreu um erro inesperado';
}
