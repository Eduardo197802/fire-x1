import { NextResponse } from "next/server";
import { init, Pagamento, User, sequelize } from "../../../../services/db";
import { addMoney, isPositiveAmount, normalizeAmount } from "../../../../services/money";
import { consumeRateLimit, getRequestClientIp } from "../../../../services/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validateWebhookAuth(request) {
  const expectedToken =
    process.env.EFI_PIX_WEBHOOK_TOKEN || process.env.PIX_WEBHOOK_TOKEN || "";

  if (!expectedToken) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        status: 500,
        error: "Configuração de segurança do webhook PIX ausente."
      };
    }

    return { ok: true };
  }

  const tokenFromHeader =
    request.headers.get("x-efi-webhook-token") ||
    request.headers.get("x-pix-webhook-token") ||
    request.headers.get("x-webhook-token") ||
    "";

  if (!tokenFromHeader || tokenFromHeader !== expectedToken) {
    return {
      ok: false,
      status: 401,
      error: "Webhook PIX não autorizado."
    };
  }

  return { ok: true };
}

function extractPixValue(pix, fallback) {
  const direct = normalizeAmount(pix?.valor);

  if (isPositiveAmount(direct)) {
    return direct;
  }

  const original = normalizeAmount(pix?.valor?.original);

  if (isPositiveAmount(original)) {
    return original;
  }

  const safeFallback = normalizeAmount(fallback);
  return isPositiveAmount(safeFallback) ? safeFallback : 0;
}

export async function POST(request) {
  const auth = validateWebhookAuth(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const rateLimit = consumeRateLimit({
    scope: "pix:webhook",
    key: getRequestClientIp(request),
    limit: 120,
    windowMs: 60 * 1000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Limite de eventos de webhook excedido temporariamente." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  let body = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload de webhook inválido." }, { status: 400 });
  }

  const events = Array.isArray(body?.pix) ? body.pix : [];

  if (events.length === 0) {
    return NextResponse.json({ processed: 0, ignored: 0 });
  }

  await init;

  let processed = 0;
  let ignored = 0;

  for (const pixEvent of events) {
    const txid = pixEvent?.txid;

    if (!txid) {
      ignored += 1;
      continue;
    }

    const pagamento = await Pagamento.findOne({
      where: {
        txid,
        tipo: "deposito",
        metodo: "pix",
      },
    });

    if (!pagamento) {
      ignored += 1;
      continue;
    }

    try {
      const state = await sequelize.transaction(async (transaction) => {
        const lockedPagamento = await Pagamento.findOne({
          where: { id: pagamento.id },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!lockedPagamento) {
          return "ignored";
        }

        if (lockedPagamento.status === "creditado") {
          return "ignored";
        }

        const user = await User.findByPk(lockedPagamento.user_id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!user) {
          await Pagamento.update(
            {
              status: "falha",
              webhook_recebido_em: new Date().toISOString(),
            },
            { where: { id: lockedPagamento.id }, transaction }
          );

          return "ignored";
        }

        const valorCredito = extractPixValue(pixEvent, lockedPagamento.valor);

        if (!isPositiveAmount(valorCredito)) {
          await Pagamento.update(
            {
              status: "falha",
              webhook_recebido_em: new Date().toISOString(),
            },
            { where: { id: lockedPagamento.id }, transaction }
          );

          return "ignored";
        }

        await User.update(
          { saldo: addMoney(user.saldo, valorCredito) },
          { where: { id: user.id }, transaction }
        );

        await Pagamento.update(
          {
            status: "creditado",
            valor: valorCredito,
            efi_end_to_end_id: pixEvent?.endToEndId || lockedPagamento.efi_end_to_end_id || null,
            webhook_recebido_em: new Date().toISOString(),
            processado_em: new Date().toISOString(),
          },
          { where: { id: lockedPagamento.id }, transaction }
        );

        return "processed";
      });

      if (state === "processed") {
        processed += 1;
      } else {
        ignored += 1;
      }
    } catch {
      ignored += 1;
    }
  }

  return NextResponse.json({ processed, ignored });
}
