import { NextResponse } from "next/server";
import { init } from "../../../../../services/db";
import { authenticateAdminRequest } from "../../../../../services/admin-auth";
import { syncPendingPixWithdrawals } from "../../../../../services/pix-withdraw-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const auth = await authenticateAdminRequest(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await init;

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const requestedLimit = Number(body.limit || 20);
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 20, 1), 50);

  try {
    const result = await syncPendingPixWithdrawals({ limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error(`[Admin PIX] Erro ao sincronizar saques: ${error.message}`);
    return NextResponse.json(
      { error: "Erro ao sincronizar saques PIX." },
      { status: 500 }
    );
  }
}
