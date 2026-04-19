import { NextResponse } from "next/server";
import { init, User } from "../../../../../services/db";
import { parseAllowedOperatorIds } from "../../../../../services/admin-auth";
import {
  decodeAdminSessionToken,
  extractAdminSessionToken
} from "../../../../../services/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body, status = 200) => NextResponse.json(body, { status });

export async function GET(request) {
  const sessionToken = extractAdminSessionToken(request);
  const decoded = decodeAdminSessionToken(sessionToken);

  if (!decoded?.userId) {
    return json({ error: "Sessão administrativa inválida ou expirada." }, 401);
  }

  await init;

  const user = await User.findByPk(Number(decoded.userId), {
    attributes: ["id", "nome", "email", "conta_liberada", "two_factor_enabled"],
    raw: true
  });

  if (!user) {
    return json({ error: "Usuário administrativo não encontrado." }, 404);
  }

  const allowedOperatorIds = parseAllowedOperatorIds();
  if (!allowedOperatorIds.has(Number(user.id))) {
    return json({ error: "Usuário não autorizado para administração." }, 403);
  }

  if (!user.conta_liberada || !user.two_factor_enabled) {
    return json({ error: "Conta sem requisitos de segurança para acesso administrativo." }, 403);
  }

  return json({
    success: true,
    user: {
      id: Number(user.id),
      nome: user.nome || user.email || "Administrador",
      email: user.email
    }
  });
}
