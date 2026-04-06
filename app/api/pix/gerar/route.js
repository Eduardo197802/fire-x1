import { NextResponse } from "next/server";
import db from "../../../../db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });

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
    const user = await dbGet("SELECT conta_liberada FROM users WHERE id = ?", [userId]);

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
