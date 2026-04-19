import { NextResponse } from "next/server";
import {
  findActiveAdminById,
  recordAdminAccessLog,
  reserveAdminTotpStep
} from "../../../../../services/admin-users";
import {
  ADMIN_LOGIN_COOKIE_NAME,
  ADMIN_PENDING_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_NAME,
  clearAdminCookieOptions,
  decodeAdminLoginToken,
  decodeAdminPendingToken,
  encodeAdminSessionToken,
  extractAdminLoginToken,
  extractAdminPendingToken,
  getAdminSessionCookieOptions
} from "../../../../../services/admin-session";
import { verifyAdminTotpCodeWithStep } from "../../../../../services/admin-totp";
import { consumeRateLimit, getRequestClientIp } from "../../../../../services/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body, status = 200) => NextResponse.json(body, { status });

export async function POST(request) {
  const pending = decodeAdminPendingToken(extractAdminPendingToken(request));
  const login = decodeAdminLoginToken(extractAdminLoginToken(request));

  if (!pending?.userId || !login?.userId || Number(pending.userId) !== Number(login.userId)) {
    return json({ error: "Fluxo de autenticação inválido. Refaça o acesso administrativo." }, 401);
  }

  const ip = getRequestClientIp(request) || "unknown";
  const rateLimit = consumeRateLimit({
    scope: "admin-2fa-verify",
    key: `${ip}:${pending.userId}`,
    limit: 10,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de 2FA. Aguarde e tente novamente." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
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
    return json({ error: "Informe um código TOTP de 6 dígitos." }, 400);
  }

  const admin = await findActiveAdminById(pending.userId);
  if (!admin) {
    return json({ error: "Administrador não encontrado ou inativo." }, 403);
  }

  if (!admin.twofa_ativo || !admin.twofa_segredo) {
    return json({ error: "2FA TOTP não configurado para este administrador." }, 403);
  }

  const verification = verifyAdminTotpCodeWithStep({
    code,
    secret: admin.twofa_segredo,
    periodSeconds: 30,
    window: 1
  });

  if (!verification.valid) {
    await recordAdminAccessLog({
      adminId: admin.id,
      acao: "2fa.falha",
      detalhe: "Código TOTP inválido.",
      ip
    }).catch(() => {});

    return json({ error: "Código 2FA inválido." }, 401);
  }

  const reservedStep = await reserveAdminTotpStep({
    adminId: admin.id,
    step: verification.step,
    ip
  });

  if (!reservedStep) {
    await recordAdminAccessLog({
      adminId: admin.id,
      acao: "2fa.replay",
      detalhe: "Tentativa de reutilização de código TOTP.",
      ip
    }).catch(() => {});

    return json({ error: "Código 2FA inválido." }, 401);
  }

  await recordAdminAccessLog({
    adminId: admin.id,
    acao: "login.sucesso",
    detalhe: "Acesso administrativo concluído com 2FA.",
    ip
  }).catch(() => {});

  const response = json({ success: true, message: "Acesso administrativo liberado." });

  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, encodeAdminSessionToken(admin.id), getAdminSessionCookieOptions());
  response.cookies.set(ADMIN_PENDING_COOKIE_NAME, "", clearAdminCookieOptions());
  response.cookies.set(ADMIN_LOGIN_COOKIE_NAME, "", clearAdminCookieOptions());

  return response;
}
