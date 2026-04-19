import { NextResponse } from "next/server";
import { init, Pagamento } from "../../../../services/db";
import { normalizeAmount } from "../../../../services/money";
import { buildUserRateLimitKey, consumeRateLimit } from "../../../../services/rate-limit";
import { authenticateUserRequest } from "../../../../services/session-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FINAL_PAYMENT_STATUSES = new Set(["creditado", "falha", "cancelado", "concluido"]);

export async function GET(request) {
  const userId = Number(request.nextUrl.searchParams.get("userId") || 0);
  const txid = String(request.nextUrl.searchParams.get("txid") || "").trim();

  if (!userId) {
    return NextResponse.json({ error: "Usuário inválido para consulta de status PIX." }, { status: 400 });
  }

  if (!txid) {
    return NextResponse.json({ error: "txid é obrigatório para consulta de status PIX." }, { status: 400 });
  }

  const auth = authenticateUserRequest(request, userId);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const rateLimit = consumeRateLimit({
    scope: "pix:status",
    key: buildUserRateLimitKey(request, auth.userId),
    limit: 60,
    windowMs: 60 * 1000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas consultas de status PIX. Aguarde alguns instantes e tente novamente." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  await init;

  const pagamento = await Pagamento.findOne({
    where: {
      user_id: auth.userId,
      txid,
      tipo: "deposito",
      metodo: "pix"
    },
    attributes: ["txid", "status", "valor", "processado_em", "webhook_recebido_em", "created_at"],
    raw: true
  });

  if (!pagamento) {
    return NextResponse.json({ error: "Depósito PIX não encontrado." }, { status: 404 });
  }

  const status = String(pagamento.status || "pendente").toLowerCase();

  return NextResponse.json({
    txid: pagamento.txid,
    status,
    isPaid: status === "creditado",
    finalized: FINAL_PAYMENT_STATUSES.has(status),
    valor: normalizeAmount(pagamento.valor),
    processadoEm: pagamento.processado_em || null,
    webhookRecebidoEm: pagamento.webhook_recebido_em || null,
    criadoEm: pagamento.created_at || null
  });
}
