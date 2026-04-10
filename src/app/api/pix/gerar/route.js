import { NextResponse } from "next/server";
import { init, User, Pagamento } from "../../../../services/db";
import { createPixDepositCharge } from "../../../../services/pix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let body = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const userId = Number(body.userId);
  const valor = Number(body.valor);

  if (!userId) {
    return NextResponse.json({ error: "Usuário inválido para gerar Pix." }, { status: 400 });
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    return NextResponse.json({ error: "Valor inválido para gerar Pix." }, { status: 400 });
  }

  try {
    await init;

    const user = await User.findByPk(userId, {
      attributes: ["conta_liberada"],
      raw: true
    });

    if (!user) {
      return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    }

    if (!user.conta_liberada) {
      return NextResponse.json(
        { error: "Confirme sua conta por e-mail ou SMS antes de liberar o uso total da plataforma." },
        { status: 403 }
      );
    }

    const charge = await createPixDepositCharge({ valor, userId });

    await Pagamento.create({
      user_id: userId,
      tipo: "deposito",
      valor,
      status: "pendente",
      metodo: "pix",
      origem: "efi",
      txid: charge.txid,
      payload_br_code: charge.brCode,
      qr_code_imagem: charge.qrCodeImage,
      descricao: `Deposito PIX do usuario ${userId}`,
    });

    return NextResponse.json({
      txid: charge.txid,
      brCode: charge.brCode,
      imagem: charge.qrCodeImage,
      qrCodeImagem: charge.qrCodeImage,
      status: "pendente",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Erro ao validar a conta para o Pix." },
      { status: 500 }
    );
  }
}
