import { NextResponse } from "next/server";
import { init, Pagamento, User, sequelize } from "../../../../services/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractPixValue(pix, fallback) {
  const direct = Number(pix?.valor);

  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  const original = Number(pix?.valor?.original);

  if (Number.isFinite(original) && original > 0) {
    return original;
  }

  const safeFallback = Number(fallback);
  return Number.isFinite(safeFallback) && safeFallback > 0 ? safeFallback : 0;
}

export async function POST(request) {
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

        if (valorCredito <= 0) {
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
          { saldo: Number(user.saldo || 0) + valorCredito },
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
