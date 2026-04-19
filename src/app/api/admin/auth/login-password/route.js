import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { init, User } from "../../../../../services/db";
import {
  ADMIN_LOGIN_COOKIE_NAME,
  encodeAdminLoginToken,
  extractAdminPendingToken,
  decodeAdminPendingToken,
  getAdminLoginCookieOptions
} from "../../../../../services/admin-session";
import { findActiveAdminById, recordAdminAccessLog } from "../../../../../services/admin-users";
import { consumeRateLimit, getRequestClientIp } from "../../../../../services/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body, status = 200) => NextResponse.json(body, { status });

const isStrongPassword = (value) => {
  const password = String(value || "");
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/.test(password);
};

export async function POST(request) {
  const pendingToken = extractAdminPendingToken(request);
  const pending = decodeAdminPendingToken(pendingToken);
  if (!pending?.userId) {
    return json({ error: "Sessão temporária inválida. Solicite novo link de acesso." }, 401);
  }

  const ip = getRequestClientIp(request) || "unknown";
  const rateLimit = consumeRateLimit({
    scope: "admin-login-password",
    key: `${ip}:${pending.userId}`,
    limit: 6,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de login. Aguarde e tente novamente." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const senha = String(body.senha || "");
  if (!isStrongPassword(senha)) {
    return json(
      {
        error:
          "Senha inválida para admin. Use no mínimo 12 caracteres com maiúscula, minúscula, número e símbolo."
      },
      400
    );
  }

  await init;

  const admin = await findActiveAdminById(pending.userId);
  if (!admin) {
    return json({ error: "Administrador não encontrado ou inativo." }, 403);
  }

  const user = await User.findOne({
    where: { email: String(admin.email || "").trim().toLowerCase() },
    attributes: ["id", "email", "senha_hash"],
    raw: true
  });

  if (!user || !bcrypt.compareSync(senha, user.senha_hash || "")) {
    await recordAdminAccessLog({
      adminId: admin.id,
      acao: "login.senha_falha",
      detalhe: "Senha inválida no fluxo de login administrativo.",
      ip
    }).catch(() => {});

    return json({ error: "Credenciais inválidas." }, 401);
  }

  await recordAdminAccessLog({
    adminId: admin.id,
    acao: "login.senha_ok",
    detalhe: "Senha validada para etapa de 2FA.",
    ip
  }).catch(() => {});

  const response = json({ success: true, message: "Senha validada. Informe o código 2FA." });
  response.cookies.set(ADMIN_LOGIN_COOKIE_NAME, encodeAdminLoginToken(admin.id), getAdminLoginCookieOptions());

  return response;
}
