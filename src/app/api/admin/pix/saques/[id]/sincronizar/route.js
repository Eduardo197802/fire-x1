import { NextResponse } from "next/server";
import { init } from "../../../../../../../services/db";
import { authenticateAdminRequest } from "../../../../../../../services/admin-auth";
import { syncPixWithdrawById } from "../../../../../../../services/pix-withdraw-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, context) {
  const auth = await authenticateAdminRequest(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const params = await context.params;
  const id = Number(params?.id || 0);

  await init;

  try {
    const result = await syncPixWithdrawById({
      pagamentoId: id,
      adminId: auth.userId,
    });

    return NextResponse.json({
      success: true,
      saque: result,
    });
  } catch (error) {
    const message = error?.message || "Erro ao sincronizar saque PIX.";
    const status = /nao encontrado|não encontrado/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
