// frontend/src/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROTECTED_ROUTES = ["/orders", "/admin"];
const AUTH_ROUTES = ["/login", "/register"];

export function middleware(request: NextRequest): NextResponse {
  const token = request.cookies.get("access_token")?.value;
  const { pathname, search } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtected && !token) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/products", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/orders/:path*", "/admin/:path*", "/login", "/register"],
};
