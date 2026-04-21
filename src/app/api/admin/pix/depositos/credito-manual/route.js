import { NextResponse } from "next/server";
import { init } from "../../../../../../services/db";
import { authenticateAdminRequest } from "../../../../../../services/admin-auth";
import { creditManualDeposit } from "../../../../../../services/operational-support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const auth = await authenticateAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  await init;
  try {
    const result = await creditManualDeposit({
      adminId: auth.userId,
      userId: body.userId,
      valor: body.valor,
      referencia: body.referencia,
      motivo: body.motivo,
    });
    return NextResponse.json({ success: true, credito: result });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Erro ao creditar deposito manual." }, { status: 400 });
  }
}
