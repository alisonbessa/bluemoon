import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Protect in-app routes
  if (pathname.startsWith("/app") || pathname.startsWith("/super-admin")) {
    if (!req.auth) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Protect super-admin routes
  if (pathname.startsWith("/super-admin")) {
    const adminEmails =
      process.env.SUPER_ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];
    if (!adminEmails.includes(req.auth?.user?.email || "")) {
      return NextResponse.redirect(new URL("/app", req.url));
    }
  }
});

export const config = {
  matcher: ["/app/:path*", "/super-admin/:path*"],
};
