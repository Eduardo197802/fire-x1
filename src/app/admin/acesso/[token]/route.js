import { NextResponse } from "next/server";
import {
  ADMIN_PENDING_COOKIE_NAME,
  encodeAdminPendingToken,
  getAdminPendingCookieOptions
} from "../../../../services/admin-session";
import { consumeAdminAccessLinkToken } from "../../../../services/admin-access-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const buildRedirect = (request, status) => {
  const url = new URL("/admin/login", request.url);
  url.searchParams.set("link", status);
  return url;
};

export async function GET(request, context) {
  const token = context?.params?.token;

  try {
    const consumed = await consumeAdminAccessLinkToken(token);
    if (!consumed?.userId) {
      return NextResponse.redirect(buildRedirect(request, "invalido"));
    }

    const response = NextResponse.redirect(buildRedirect(request, "ok"));
    response.cookies.set(
      ADMIN_PENDING_COOKIE_NAME,
      encodeAdminPendingToken(consumed.userId),
      getAdminPendingCookieOptions()
    );

    return response;
  } catch (error) {
    console.error("Erro ao consumir link admin:", error.message);
    return NextResponse.redirect(buildRedirect(request, "erro"));
  }
}
