import { NextResponse } from "next/server";
import { init, Pagamento, User, sequelize } from "../../../../services/db";
import { sendPixWithdraw } from "../../../../services/pix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let body = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido para saque PIX." }, { status: 400 });
  }

  const userId = Number(body.userId);
  const valor = Number(body.valor);
  const requestId = String(body.requestId || "").trim();

  if (!userId) {
    return NextResponse.json({ error: "Usuário inválido para saque PIX." }, { status: 400 });
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    return NextResponse.json({ error: "Valor inválido para saque PIX." }, { status: 400 });
  }

  if (!requestId) {
    return NextResponse.json({ error: "requestId é obrigatório para idempotência." }, { status: 400 });
  }

  await init;

  const existing = await Pagamento.findOne({
    where: {
      txid: requestId,
      tipo: "saque",
      metodo: "pix",
      user_id: userId,
    },
  });

  if (existing) {
    return NextResponse.json({
      requestId,
      status: existing.status,
      message: "Solicitação já processada anteriormente.",
    });
  }

  let pagamentoId;
  let chavePix;

  try {
    await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!user) {
        throw new Error("Conta não encontrada.");
      }

      if (!user.conta_liberada) {
        throw new Error("Conta não liberada para operações de saque PIX.");
      }

      if (!user.chave_pix) {
        throw new Error("Usuário sem chave PIX cadastrada.");
      }

      if (Number(user.saldo || 0) < valor) {
        throw new Error("Saldo insuficiente para saque PIX.");
      }

      chavePix = user.chave_pix;

      await User.update(
        { saldo: Number(user.saldo || 0) - valor },
        { where: { id: userId }, transaction }
      );

      const pagamento = await Pagamento.create(
        {
          user_id: userId,
          tipo: "saque",
          valor,
          status: "em_processamento",
          metodo: "pix",
          origem: "efi",
          txid: requestId,
          chave_pix_destino: chavePix,
          descricao: `Saque PIX do usuario ${userId}`,
        },
        { transaction }
      );

      pagamentoId = pagamento.id;
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    const withdraw = await sendPixWithdraw({ valor, chavePix, requestId });

    await Pagamento.update(
      {
        status: "concluido",
        efi_end_to_end_id: withdraw.endToEndId,
        processado_em: new Date().toISOString(),
      },
      { where: { id: pagamentoId } }
    );

    return NextResponse.json({
      requestId,
      status: "concluido",
      endToEndId: withdraw.endToEndId,
    });
  } catch (error) {
    await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (user) {
        await User.update(
          { saldo: Number(user.saldo || 0) + valor },
          { where: { id: userId }, transaction }
        );
      }

      await Pagamento.update(
        {
          status: "falha",
          descricao: `Falha no saque PIX: ${error.message}`,
          processado_em: new Date().toISOString(),
        },
        { where: { id: pagamentoId }, transaction }
      );
    });

    return NextResponse.json({ error: "Falha ao processar saque PIX." }, { status: 502 });
  }
}
