import { NextResponse } from "next/server";
import { init } from "../../../../../services/db";
import { authenticateAdminRequest } from "../../../../../services/admin-auth";
import { listPixChangeRequests } from "../../../../../services/operational-support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await authenticateAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await init;
  const status = request.nextUrl.searchParams.get("status") || "pendente";
  const limit = Number(request.nextUrl.searchParams.get("limite") || 50);
  const solicitacoes = await listPixChangeRequests({ status, limit });
  return NextResponse.json({ success: true, solicitacoes });
}
