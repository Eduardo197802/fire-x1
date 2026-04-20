import { NextResponse } from "next/server";
import { validateAdminAccessLink } from "../../../../services/admin-access-link";
import {
  ADMIN_PENDING_COOKIE_NAME,
  encodeAdminPendingToken,
  getAdminPendingCookieOptions,
  hasAdminSessionSecret
} from "../../../../services/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redirectToLogin = (request, errorCode) => {
  const url = new URL("/admin/login", request.url);
  if (errorCode) {
    url.searchParams.set("erro", errorCode);
  }
  return NextResponse.redirect(url);
};

export async function GET(request, { params }) {
  if (!hasAdminSessionSecret()) {
    return redirectToLogin(request, "configuracao_invalida");
  }

  const resolvedParams = await params;
  const token = String(resolvedParams?.token || "").trim();

  if (!token) {
    return redirectToLogin(request, "link_invalido");
  }

  let result;

  try {
    result = await validateAdminAccessLink(token);
  } catch {
    return redirectToLogin(request, "link_expirado");
  }

  if (!result?.ok || !result?.userId) {
    return redirectToLogin(request, "link_expirado");
  }

  const response = redirectToLogin(request);
  response.cookies.set(
    ADMIN_PENDING_COOKIE_NAME,
    encodeAdminPendingToken(result.userId),
    getAdminPendingCookieOptions()
  );

  return response;
}
