import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const path = request.nextUrl.pathname;

  // Dashboard subdomain — only allow /admin, /login, /api, /_next, /logo.png, /favicon.ico
  if (host.startsWith("dashboard.")) {
    if (path === "/") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (!path.startsWith("/admin") && !path.startsWith("/login") && !path.startsWith("/api") && !path.startsWith("/_next") && !path.startsWith("/logo") && !path.startsWith("/favicon")) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
