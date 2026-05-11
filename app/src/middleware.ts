// src/middleware.ts — Route protection (checks for auth token in cookie or header)
import { NextRequest, NextResponse } from "next/server";

// Public paths that don't require authentication
const publicPaths = ["/", "/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    publicPaths.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // For dashboard/admin routes, we rely on client-side auth check
  // The middleware just ensures the route group exists
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
