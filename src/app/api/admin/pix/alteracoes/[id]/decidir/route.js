import { NextResponse } from "next/server";
import { init } from "../../../../../../../services/db";
import { authenticateAdminRequest } from "../../../../../../../services/admin-auth";
import { decidePixChangeRequest } from "../../../../../../../services/operational-support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, context) {
  const auth = await authenticateAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const params = await context.params;
  const body = await request.json().catch(() => ({}));

  await init;
  try {
    const result = await decidePixChangeRequest({
      requestId: Number(params?.id || 0),
      adminId: auth.userId,
      action: body.action,
      observacao: body.observacao,
    });
    return NextResponse.json({ success: true, solicitacao: result });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Erro ao processar solicitacao." }, { status: 400 });
  }
}
