// /home/user/bluemoon/src/shared/lib/security/rate-limit.ts
import { NextRequest, NextResponse } from "next/server";

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

// In-memory store - works for single instance
// For multi-instance, replace with Redis (Upstash)
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

/**
 * Get a unique identifier for the request
 */
function getIdentifier(req: NextRequest): string {
  // Use IP address as identifier
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return ip;
}

/**
 * Check rate limit for a request
 * Returns null if allowed, or a NextResponse if rate limited
 */
export function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  keyPrefix: string = ""
): NextResponse | null {
  cleanup();

  const identifier = getIdentifier(req);
  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // First request or window expired
    store.set(key, {
      count: 1,
      resetAt: now + config.windowSizeInSeconds * 1000,
    });
    return null; // Allowed
  }

  if (entry.count >= config.maxRequests) {
    // Rate limited
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
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
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    );
  }

  // Increment counter
  entry.count++;
  return null; // Allowed
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
 * Higher-order function to add rate limiting to an API route handler
 * @example
 * export const POST = withRateLimit(handler, rateLimits.contact, "contact");
 */
export function withRateLimit(
  handler: (req: NextRequest, context: { params: Promise<Record<string, unknown>> }) => Promise<NextResponse | Response>,
  config: RateLimitConfig,
  keyPrefix: string
) {
  return async (req: NextRequest, context: { params: Promise<Record<string, unknown>> }) => {
    const rateLimitResponse = checkRateLimit(req, config, keyPrefix);
    if (rateLimitResponse) return rateLimitResponse;
    return handler(req, context);
  };
}
