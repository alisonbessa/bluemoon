import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Suspicious patterns to block
const SUSPICIOUS_PATTERNS = [
  // SQL Injection
  /(\bunion\b.*\bselect\b|\bselect\b.*\bfrom\b.*\bwhere\b)/i,
  /(\bdrop\b.*\btable\b|\bdelete\b.*\bfrom\b)/i,
  /(\binsert\b.*\binto\b|\bupdate\b.*\bset\b)/i,
  /(--|\/\*|\*\/|;.*--|'.*or.*'.*=)/i,

  // XSS / Script Injection
  /<script[\s\S]*?>[\s\S]*?<\/script>/i,
  /<iframe[\s\S]*?>/i,
  /javascript:/i,
  /on\w+\s*=/i,

  // Path Traversal
  /\.\.\//,
  /\.\.\\/,
  /%2e%2e%2f/i,
  /%2e%2e\//i,
  /\.\.%2f/i,

  // Null bytes
  /%00/,
  /\x00/,
];

function containsSuspiciousPattern(value: string): boolean {
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(value));
}

function checkRequestForSuspiciousPatterns(request: NextRequest): boolean {
  const url = request.nextUrl;

  // Check pathname
  if (containsSuspiciousPattern(url.pathname)) {
    return true;
  }

  // Check query parameters
  for (const [, value] of url.searchParams) {
    if (containsSuspiciousPattern(value)) {
      return true;
    }
  }

  return false;
}

export function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestStart = Date.now();
  const { pathname } = request.nextUrl;

  // Check for suspicious patterns in API routes
  if (pathname.startsWith("/api/")) {
    if (checkRequestForSuspiciousPatterns(request)) {
      return NextResponse.json(
        { error: "Bad Request", code: "SUSPICIOUS_REQUEST" },
        {
          status: 400,
          headers: {
            "X-Request-Id": requestId,
          }
        }
      );
    }
  }

  // Continue with the request
  const response = NextResponse.next();

  // Add request tracking headers
  response.headers.set("X-Request-Id", requestId);

  // Add timing header for API routes
  if (pathname.startsWith("/api/")) {
    response.headers.set("X-Request-Start", requestStart.toString());
  }

  // Add security headers for API routes
  if (pathname.startsWith("/api/")) {
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }

  return response;
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
    // Match app routes (but not static files)
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
