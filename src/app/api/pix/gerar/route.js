import { NextResponse } from "next/server";
import { init, User, Pagamento } from "../../../../services/db";
import { isPositiveAmount, normalizeAmount } from "../../../../services/money";
import { createPixDepositCharge } from "../../../../services/pix";
import { buildUserRateLimitKey, consumeRateLimit } from "../../../../services/rate-limit";
import { authenticateUserRequest } from "../../../../services/session-auth";

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
  const valor = normalizeAmount(body.valor);

  if (!userId) {
    return NextResponse.json({ error: "Usuário inválido para gerar Pix." }, { status: 400 });
  }

  const auth = authenticateUserRequest(request, userId);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isPositiveAmount(valor)) {
    return NextResponse.json({ error: "Valor inválido para gerar Pix." }, { status: 400 });
  }

  const rateLimit = consumeRateLimit({
    scope: "pix:gerar",
    key: buildUserRateLimitKey(request, auth.userId),
    limit: 10,
    windowMs: 60 * 1000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas para gerar PIX. Aguarde alguns instantes e tente novamente." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  try {
    await init;

    const user = await User.findByPk(auth.userId, {
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

    const charge = await createPixDepositCharge({ valor, userId: auth.userId });

    await Pagamento.create({
      user_id: auth.userId,
      tipo: "deposito",
      amount: valor,
      valor,
      status: "pendente",
      metodo: "pix",
      gateway: "efi",
      origem: "efi",
      txid: charge.txid,
      payload_br_code: charge.brCode,
      qr_code_imagem: charge.qrCodeImage,
      descricao: `Deposito PIX do usuario ${auth.userId}`,
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
