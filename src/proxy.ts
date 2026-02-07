import { NextResponse } from "next/server";
import { auth } from "./auth";
import type { NextRequest } from "next/server";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
const { rewrite: rewriteLLM } = rewritePath("/docs/*path", "/llms.mdx/*path");

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
 * Add security headers to the response:
 * - X-Request-Id for tracing
 * - X-Request-Start for API latency measurement
 * - X-Content-Type-Options and X-Frame-Options for API routes
 */
function addSecurityHeaders(response: NextResponse, pathname: string): NextResponse {
  response.headers.set("X-Request-Id", crypto.randomUUID());

  if (pathname.startsWith("/api/")) {
    response.headers.set("X-Request-Start", String(Date.now()));
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
  }

  return response;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Security: Block suspicious patterns in URLs
  const url = req.nextUrl.toString();
  if (hasSuspiciousPattern(url)) {
    return NextResponse.json(
      { error: "Bad Request", code: "BLOCKED" },
      { status: 400 }
    );
  }

  // 2. Fumadocs LLM rewrite
  if (isMarkdownPreferred(req)) {
    const result = rewriteLLM(pathname);
    if (result) {
      return NextResponse.rewrite(new URL(result, req.nextUrl));
    }
  }

  const session = await auth();
  const isAuth = !!session?.user;

  const isAPI = pathname.startsWith("/api/app");

  const isAuthPage =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/sign-out");

  if (isAuthPage) {
    if (isAuth && !pathname.startsWith("/sign-out")) {
      return NextResponse.redirect(new URL("/app", req.url));
    }
    return addSecurityHeaders(NextResponse.next(), pathname);
  }

  if (isAPI) {
    if (!isAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return addSecurityHeaders(NextResponse.next(), pathname);
  }

  if (!isAuth && pathname.startsWith("/app")) {
    let callbackUrl = pathname;
    if (req.nextUrl.search) {
      callbackUrl += req.nextUrl.search;
    }

    return NextResponse.redirect(
      new URL(
        `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        req.url
      )
    );
  }

  if (pathname.startsWith("/super-admin")) {
    const adminEmails = process.env.SUPER_ADMIN_EMAILS?.split(",");
    const currentUserEmail = session?.user?.email;
    if (!currentUserEmail || !adminEmails?.includes(currentUserEmail)) {
      return NextResponse.redirect(
        new URL("/sign-in?error=unauthorized", req.url)
      );
    }
    return addSecurityHeaders(NextResponse.next(), pathname);
  }

  return addSecurityHeaders(NextResponse.next(), pathname);
}

export const config = {
  matcher: [
    "/docs/:path*",
    "/api/app/:path*",
    "/app/:path*",
    "/sign-in",
    "/sign-up",
    "/sign-out",
    "/super-admin/:path*",
  ],
};
