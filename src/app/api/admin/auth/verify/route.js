import { NextResponse } from "next/server";
import { init, User } from "../../../../../services/db";
import { parseAllowedOperatorIds } from "../../../../../services/admin-auth";
import {
  ADMIN_PENDING_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_NAME,
  clearAdminCookieOptions,
  decodeAdminPendingToken,
  encodeAdminSessionToken,
  extractAdminPendingToken,
  getAdminSessionCookieOptions
} from "../../../../../services/admin-session";
import { consumeRateLimit, getRequestClientIp } from "../../../../../services/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body, status = 200) => NextResponse.json(body, { status });

export async function POST(request) {
  const ip = getRequestClientIp(request) || "unknown";
  const rateLimit = consumeRateLimit({
    scope: "admin-auth-verify",
    key: ip,
    limit: 10,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de verificação. Aguarde e tente novamente." },
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
    body = {};
  }

  const code = String(body.code || "").replace(/\D/g, "");
  if (code.length !== 6) {
    return json({ error: "Informe um código de 6 dígitos." }, 400);
  }

  const pendingToken = extractAdminPendingToken(request);
  const pendingSession = decodeAdminPendingToken(pendingToken);

  if (!pendingSession?.userId) {
    return json({ error: "Sessão de validação expirada. Faça login novamente." }, 401);
  }

  await init;

  try {
    const user = await User.findByPk(pendingSession.userId, {
      attributes: [
        "id",
        "nome",
        "email",
        "conta_liberada",
        "two_factor_enabled",
        "two_factor_code",
        "two_factor_expires_at"
      ],
      raw: true
    });

    if (!user) {
      return json({ error: "Usuário não encontrado." }, 404);
    }

    const allowedOperatorIds = parseAllowedOperatorIds();
    if (!allowedOperatorIds.has(Number(user.id))) {
      return json({ error: "Usuário não autorizado para administração." }, 403);
    }

    if (!user.conta_liberada || !user.two_factor_enabled) {
      return json({ error: "Conta sem os requisitos de segurança para acesso admin." }, 403);
    }

    const expiresAt = user.two_factor_expires_at ? new Date(user.two_factor_expires_at).getTime() : 0;
    if (!user.two_factor_code || !expiresAt || Date.now() > expiresAt) {
      return json({ error: "Código expirado. Solicite um novo login." }, 400);
    }

    if (String(user.two_factor_code) !== code) {
      return json({ error: "Código 2FA inválido." }, 401);
    }

    await User.update(
      {
        two_factor_code: null,
        two_factor_expires_at: null
      },
      { where: { id: user.id } }
    );

    const response = json({
      success: true,
      message: "Acesso administrativo liberado.",
      user: {
        id: Number(user.id),
        nome: user.nome || user.email || "Administrador",
        email: user.email
      }
    });

    response.cookies.set(
      ADMIN_SESSION_COOKIE_NAME,
      encodeAdminSessionToken(user.id),
      getAdminSessionCookieOptions()
    );

    response.cookies.set(ADMIN_PENDING_COOKIE_NAME, "", clearAdminCookieOptions());

    return response;
  } catch (error) {
    console.error("Erro ao verificar 2FA admin:", error.message);
    return json({ error: "Erro ao validar código 2FA." }, 500);
  }
}
