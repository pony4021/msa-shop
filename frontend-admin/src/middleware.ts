// frontend-admin/src/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ADMIN_PATH = "/admin";
const ADMIN_LOGIN_PATH = "/admin/login";

async function isAdminTokenValid(token: string): Promise<boolean> {
  const internalApiBase = process.env.ADMIN_API_INTERNAL_URL ?? "http://nginx";

  try {
    const response = await fetch(`${internalApiBase}/api/users/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as { is_admin?: boolean };
    return payload.is_admin === true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get("admin_access_token")?.value;
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/_next/") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const isAdminRoute = pathname.startsWith(ADMIN_PATH);
  const isAdminLoginRoute = pathname.startsWith(ADMIN_LOGIN_PATH);

  if (!isAdminRoute) {
    return NextResponse.next();
  }

  if (!token) {
    if (isAdminLoginRoute) {
      return NextResponse.next();
    }
    const redirectUrl = new URL(ADMIN_LOGIN_PATH, request.url);
    redirectUrl.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(redirectUrl);
  }

  const isAdmin = await isAdminTokenValid(token);

  if (!isAdmin) {
    const response = NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
    response.cookies.set("admin_access_token", "", { path: "/", maxAge: 0 });
    return response;
  }

  if (isAdminLoginRoute) {
    return NextResponse.redirect(new URL(ADMIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
