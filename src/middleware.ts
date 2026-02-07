import { NextRequest, NextResponse } from "next/server";

/**
 * Centralized security middleware
 * Handles: security headers, request validation, basic request logging
 * Does NOT handle: authentication (done per-route via withAuthRequired)
 */
export function middleware(req: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = req.nextUrl;

  // 1. Add request ID for tracing
  const requestId = crypto.randomUUID();
  response.headers.set("X-Request-Id", requestId);

  // 2. Add timing header for API routes
  if (pathname.startsWith("/api/")) {
    response.headers.set("X-Request-Start", String(Date.now()));
  }

  // 3. Block suspicious patterns in query strings
  const url = req.nextUrl.toString();
  if (hasSuspiciousPattern(url)) {
    return NextResponse.json(
      { error: "Bad Request", code: "BLOCKED" },
      { status: 400 }
    );
  }

  // 4. Prevent clickjacking on API routes
  if (pathname.startsWith("/api/")) {
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
  }

  return response;
}

/**
 * Detect common attack patterns in URLs
 */
function hasSuspiciousPattern(url: string): boolean {
  const decoded = decodeURIComponent(url).toLowerCase();
  const patterns = [
    // SQL injection
    /(\bunion\b.*\bselect\b|\bdrop\b.*\btable\b|\binsert\b.*\binto\b)/i,
    // Script injection
    /<script[\s>]/i,
    // Path traversal
    /\.\.\//,
    // Null bytes
    /%00/,
  ];
  return patterns.some((pattern) => pattern.test(decoded));
}

/**
 * Matcher configuration - run middleware on these paths
 * Excludes static files and images for performance
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
