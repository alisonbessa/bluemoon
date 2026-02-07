// /home/user/bluemoon/src/shared/lib/security/rate-limit.ts
//
// In-memory rate limiter (works for single-instance deployments).
//
// To upgrade to distributed rate limiting with Upstash Redis:
//   1. Install: pnpm add @upstash/ratelimit @upstash/redis
//   2. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
//   3. Replace the checkInMemory logic with Upstash's Ratelimit.slidingWindow()
//      See: https://github.com/upstash/ratelimit-js

import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateLimitConfig {
  /** Max number of requests in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSizeInSeconds: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return ip;
}

function buildRateLimitResponse(params: {
  retryAfter: number;
  limit: number;
  remaining: number;
  resetEpochSeconds: number;
}): NextResponse {
  const { retryAfter, limit, remaining, resetEpochSeconds } = params;
  return NextResponse.json(
    {
      error: "Too many requests",
      code: "RATE_LIMITED",
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(resetEpochSeconds),
      },
    }
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check rate limit for a request.
 * Returns `null` if allowed, or a 429 `NextResponse` if rate limited.
 */
export async function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  keyPrefix: string = ""
): Promise<NextResponse | null> {
  cleanup();

  const identifier = getIdentifier(req);
  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowSizeInSeconds * 1000,
    });
    return null;
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return buildRateLimitResponse({
      retryAfter,
      limit: config.maxRequests,
      remaining: 0,
      resetEpochSeconds: Math.ceil(entry.resetAt / 1000),
    });
  }

  entry.count++;
  return null;
}

// Pre-configured rate limiters for common use cases
export const rateLimits = {
  /** Public API endpoints: 20 requests per minute */
  public: { maxRequests: 20, windowSizeInSeconds: 60 },
  /** Auth endpoints: 5 requests per minute */
  auth: { maxRequests: 5, windowSizeInSeconds: 60 },
  /** Contact form: 3 requests per 10 minutes */
  contact: { maxRequests: 3, windowSizeInSeconds: 600 },
  /** Webhooks: 100 requests per minute */
  webhook: { maxRequests: 100, windowSizeInSeconds: 60 },
  /** Admin endpoints: 30 requests per minute */
  admin: { maxRequests: 30, windowSizeInSeconds: 60 },
  /** General API: 60 requests per minute */
  api: { maxRequests: 60, windowSizeInSeconds: 60 },
} as const;

/**
 * Higher-order function to add rate limiting to an API route handler.
 * @example
 * export const POST = withRateLimit(handler, rateLimits.contact, "contact");
 */
export function withRateLimit(
  handler: (req: NextRequest, context: { params: Promise<Record<string, unknown>> }) => Promise<NextResponse | Response>,
  config: RateLimitConfig,
  keyPrefix: string
) {
  return async (req: NextRequest, context: { params: Promise<Record<string, unknown>> }) => {
    const rateLimitResponse = await checkRateLimit(req, config, keyPrefix);
    if (rateLimitResponse) return rateLimitResponse;
    return handler(req, context);
  };
}
