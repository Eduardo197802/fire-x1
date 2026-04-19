import { NextResponse } from "next/server";
import { init, User } from "../../../../../services/db.js";
import { authenticateAdminRequest, parseAllowedOperatorIds } from "../../../../../services/admin-auth.js";
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
    scope: "admin-usuarios-update",
    key: `${ip}:${authResult.userId}`,
    limit: 10,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde e tente novamente." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) }
      }
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "Corpo da requisição inválido." }, 400);
  }

  const usuarioId = Number(body.usuarioId || 0);
  const contaLiberada = Boolean(body.contaLiberada);
  const twoFactorEnabled = Boolean(body.twoFactorEnabled);

  if (!usuarioId || usuarioId <= 0) {
    return json({ error: "ID de usuário inválido." }, 400);
  }

  await init;

  try {
    const usuario = await User.findByPk(usuarioId, {
      attributes: ["id", "email", "conta_liberada", "two_factor_enabled"],
      raw: true
    });

    if (!usuario) {
      return json({ error: "Usuário não encontrado." }, 404);
    }

    const updates = {};
    let alterou = false;

    if (usuario.conta_liberada !== (contaLiberada ? 1 : 0)) {
      updates.conta_liberada = contaLiberada ? 1 : 0;
      alterou = true;
    }

    if (usuario.two_factor_enabled !== (twoFactorEnabled ? 1 : 0)) {
      updates.two_factor_enabled = twoFactorEnabled ? 1 : 0;
      alterou = true;
    }

    if (!alterou) {
      return json({ success: true, message: "Nenhuma alteração foi necessária.", usuario });
    }

    await User.update(updates, { where: { id: usuarioId } });

    const usuarioAtualizado = await User.findByPk(usuarioId, {
      attributes: ["id", "email", "nome", "conta_liberada", "two_factor_enabled"],
      raw: true
    });

    return json({
      success: true,
      message: "Usuário atualizado com sucesso.",
      usuario: {
        id: Number(usuarioAtualizado.id),
        email: usuarioAtualizado.email || "",
        nome: usuarioAtualizado.nome || "",
        conta_liberada: Boolean(usuarioAtualizado.conta_liberada),
        two_factor_enabled: Boolean(usuarioAtualizado.two_factor_enabled)
      }
    });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error.message);
    return json({ error: "Erro ao atualizar usuário administrativo." }, 500);
  }
}
