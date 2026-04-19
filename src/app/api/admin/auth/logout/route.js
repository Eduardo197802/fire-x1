import { NextResponse } from "next/server";
import {
  ADMIN_PENDING_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_NAME,
  clearAdminCookieOptions
} from "../../../../../services/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Sessão administrativa encerrada." });
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, "", clearAdminCookieOptions());
  response.cookies.set(ADMIN_PENDING_COOKIE_NAME, "", clearAdminCookieOptions());
  return response;
}
