import { NextResponse } from "next/server";
import { init, User } from "../../../../services/db";

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

  if (!userId) {
    return NextResponse.json({ error: "Usuário inválido para gerar Pix." }, { status: 400 });
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

    return NextResponse.json({
      imagem: "https://via.placeholder.com/200"
    });
  } catch {
    return NextResponse.json({ error: "Erro ao validar a conta para o Pix." }, { status: 500 });
  }
}
