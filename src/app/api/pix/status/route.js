import { NextResponse } from "next/server";
import { init, Pagamento, User, sequelize } from "../../../../services/db";
import { addMoney, normalizeAmount } from "../../../../services/money";
import { buildUserRateLimitKey, consumeRateLimit } from "../../../../services/rate-limit";
import { authenticateUserRequest } from "../../../../services/session-auth";
import { getPixChargeStatus } from "../../../../services/pix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FINAL_PAYMENT_STATUSES = new Set(["creditado", "falha", "cancelado", "concluido"]);
const MOCK_TXID_PREFIX = "mock-";

const toBool = (value) => String(value || "").trim().toLowerCase() === "true";

const isPixMockEnabled = () => {
  if (typeof process.env.PIX_MOCK_MODE !== "undefined") {
    return toBool(process.env.PIX_MOCK_MODE);
  }

  return process.env.NODE_ENV !== "production";
};

const getMockAutoConfirmMs = () => {
  const parsed = Number(process.env.PIX_MOCK_AUTO_CONFIRM_SECONDS || 8);
  const seconds = Number.isFinite(parsed) && parsed > 0 ? parsed : 8;
  return seconds * 1000;
};

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
    attributes: [
      "id",
      "txid",
      "status",
      "valor",
      "processado_em",
      "webhook_recebido_em",
      "created_at"
    ],
    raw: true
  });

  if (!pagamento) {
    return NextResponse.json({ error: "Depósito PIX não encontrado." }, { status: 404 });
  }

  let status = String(pagamento.status || "pendente").toLowerCase();
  let processadoEm = pagamento.processado_em || null;
  let webhookRecebidoEm = pagamento.webhook_recebido_em || null;

  // Em ambiente de desenvolvimento, confirma automaticamente os PIX mockados
  // apos alguns segundos para permitir teste ponta a ponta sem transacao real.
  if (isPixMockEnabled() && txid.startsWith(MOCK_TXID_PREFIX) && status === "pendente") {
    const createdAtRaw = pagamento.created_at || null;
    const createdAtMs = createdAtRaw ? new Date(createdAtRaw).getTime() : NaN;
    const elapsedMs = Number.isFinite(createdAtMs) ? Date.now() - createdAtMs : getMockAutoConfirmMs();

    if (elapsedMs >= getMockAutoConfirmMs()) {
      try {
        await sequelize.transaction(async (transaction) => {
          const lockedPagamento = await Pagamento.findOne({
            where: { id: pagamento.id },
            transaction,
            lock: transaction.LOCK.UPDATE
          });

          if (!lockedPagamento || String(lockedPagamento.status || "").toLowerCase() !== "pendente") {
            return;
          }

          const user = await User.findByPk(auth.userId, {
            transaction,
            lock: transaction.LOCK.UPDATE
          });

          if (!user) {
            return;
          }

          const valorCredito = normalizeAmount(lockedPagamento.valor);
          const nowIso = new Date().toISOString();

          await User.update(
            { saldo: addMoney(user.saldo, valorCredito) },
            { where: { id: user.id }, transaction }
          );

          await Pagamento.update(
            {
              status: "creditado",
              processado_em: nowIso,
              webhook_recebido_em: nowIso
            },
            { where: { id: lockedPagamento.id }, transaction }
          );

          status = "creditado";
          processadoEm = nowIso;
          webhookRecebidoEm = nowIso;
        });
      } catch {
        // Se falhar, mantem o status pendente para nova tentativa no proximo poll.
      }
    }
  }

  // Fallback em producao: se o webhook nao chegou ainda, consulta o status direto na EFI.
  if (!isPixMockEnabled() && status === "pendente") {
    try {
      const efiStatus = await getPixChargeStatus({ txid: pagamento.txid });

      if (efiStatus.paid) {
        await sequelize.transaction(async (transaction) => {
          const lockedPagamento = await Pagamento.findOne({
            where: { id: pagamento.id },
            transaction,
            lock: transaction.LOCK.UPDATE
          });

          if (!lockedPagamento || String(lockedPagamento.status || "").toLowerCase() !== "pendente") {
            return;
          }

          const user = await User.findByPk(auth.userId, {
            transaction,
            lock: transaction.LOCK.UPDATE
          });

          if (!user) {
            return;
          }

          const valorCredito = normalizeAmount(efiStatus.amount || lockedPagamento.valor);
          const nowIso = new Date().toISOString();

          await User.update(
            { saldo: addMoney(user.saldo, valorCredito) },
            { where: { id: user.id }, transaction }
          );

          await Pagamento.update(
            {
              status: "creditado",
              valor: valorCredito,
              processado_em: nowIso,
              webhook_recebido_em: nowIso
            },
            { where: { id: lockedPagamento.id }, transaction }
          );

          status = "creditado";
          processadoEm = nowIso;
          webhookRecebidoEm = nowIso;
        });
      }
    } catch {
      // Se a consulta externa falhar, mantem pendente para nova tentativa no proximo poll.
    }
  }

  return NextResponse.json({
    txid: pagamento.txid,
    status,
    isPaid: status === "creditado",
    finalized: FINAL_PAYMENT_STATUSES.has(status),
    valor: normalizeAmount(pagamento.valor),
    processadoEm,
    webhookRecebidoEm,
    criadoEm: pagamento.created_at || null
  });
}
