import { NextResponse } from "next/server";
import {
  decodeAdminLoginToken,
  decodeAdminPendingToken,
  extractAdminLoginToken,
  extractAdminPendingToken
} from "../../../../../services/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const pending = decodeAdminPendingToken(extractAdminPendingToken(request));
  const login = decodeAdminLoginToken(extractAdminLoginToken(request));

  return NextResponse.json(
    {
      success: true,
      pending: Boolean(pending?.userId),
      login: Boolean(login?.userId),
      sameUser: Boolean(pending?.userId && login?.userId && pending.userId === login.userId)
    },
    { status: 200 }
  );
}
