import { NextResponse } from "next/server";
import { init, User } from "../../../../../services/db.js";
import { authenticateAdminRequest } from "../../../../../services/admin-auth.js";
import { consumeRateLimit, getRequestClientIp } from "../../../../../services/rate-limit.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body, status = 200) => NextResponse.json(body, { status });

export async function POST(request) {
  const authResult = await authenticateAdminRequest(request);
  if (!authResult.ok) {
    return json({ error: authResult.error }, authResult.status);
  }

  const ip = getRequestClientIp(request) || "unknown";
  const rateLimit = consumeRateLimit({
    scope: "admin-usuarios-excluir",
    key: `${ip}:${authResult.userId}`,
    limit: 10,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde e tente novamente." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "Corpo da requisição inválido." }, 400);
  }

  const usuarioId = Number(body.usuarioId || 0);
  if (!usuarioId || usuarioId <= 0) {
    return json({ error: "ID de usuário inválido." }, 400);
  }

  await init;

  const usuario = await User.findByPk(usuarioId, {
    attributes: ["id", "email"],
    raw: true
  });

  if (!usuario) {
    return json({ error: "Usuário não encontrado." }, 404);
  }

  await User.destroy({ where: { id: usuarioId } });

  return json({ success: true, message: `Usuário ${usuario.email} excluído com sucesso.` });
}
