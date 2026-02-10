// Route Protection Middleware
// Protects all routes except "/" (landing page)
// Redirects unauthenticated users to home

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes (no auth required)
  const publicRoutes = ["/", "/.auth/login/github", "/.auth/login/google", "/.auth/logout"];

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for Azure SWA auth header
  const authHeader = request.headers.get("x-ms-client-principal");

  // Development mode: always allow (dev user mock in auth.ts handles this)
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  // Production: redirect to home if no auth header
  if (!authHeader) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Decode and validate auth header
  try {
    const decoded = Buffer.from(authHeader, "base64").toString("ascii");
    const principal = JSON.parse(decoded);

    if (!principal.userRoles?.includes("authenticated")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Apply middleware to all routes except static assets and API routes
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
