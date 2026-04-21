import { NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "firex1_admin_session";
const USER_SESSION_COOKIE = "firex1_session";

// Rotas admin que NÃO exigem sessão ativa
const PUBLIC_ADMIN_PATHS = [
  "/admin",
  "/admin/login",
  "/admin/2fa",
  "/admin/solicitar-link",
];

function isPublicAdminPath(pathname) {
  if (PUBLIC_ADMIN_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/admin/acesso/")) return true;
  return false;
}

function isSessionTokenValid(token) {
  if (!token) return false;

  // Formato: userId.expiresAt.nonce.signature
  const parts = token.split(".");
  if (parts.length < 4) return false;

  const expiresAt = Number(parts[1]);
  if (!expiresAt || isNaN(expiresAt)) return false;

  return Date.now() < expiresAt;
}

function isUserSessionTokenValid(token) {
  if (!token) return false;

  // Formato legacy: userId.expiresAt.signature
  // Formato atual: userId.expiresAt.sessionId.signature
  const parts = token.split(".");
  if (parts.length !== 3 && parts.length !== 4) return false;

  const expiresAt = Number(parts[1]);
  if (!expiresAt || Number.isNaN(expiresAt)) return false;

  return Date.now() < expiresAt;
}

function isProtectedUserPath(pathname) {
  return pathname === "/dashboard" || pathname.startsWith("/conta/");
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (isPublicAdminPath(pathname)) {
      return NextResponse.next();
    }

    const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE);
    const token = sessionCookie?.value;

    if (!isSessionTokenValid(token)) {
      const loginUrl = new URL("/", request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (isProtectedUserPath(pathname)) {
    const sessionCookie = request.cookies.get(USER_SESSION_COOKIE);
    const token = sessionCookie?.value;

    if (!isUserSessionTokenValid(token)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard", "/conta/:path*"],
};
