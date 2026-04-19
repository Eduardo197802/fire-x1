import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { init, User } from "../../../../../services/db";
import { parseAllowedOperatorIds } from "../../../../../services/admin-auth";
import {
  ADMIN_PENDING_COOKIE_NAME,
  encodeAdminPendingToken,
  getAdminPendingCookieOptions,
  hasAdminSessionSecret
} from "../../../../../services/admin-session";
import { consumeRateLimit, getRequestClientIp } from "../../../../../services/rate-limit";
import { sendTwoFactorVerificationEmail } from "../../../../../services/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_TTL_MINUTES = 10;

const json = (body, status = 200) => NextResponse.json(body, { status });

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());

const isStrongPassword = (value) => {
  const password = String(value || "");
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/.test(password);
};

const generateVerificationCode = () => String(Math.floor(100000 + Math.random() * 900000));

const maskEmail = (email) => {
  const normalized = String(email || "").trim().toLowerCase();
  const [local, domain] = normalized.split("@");
  if (!local || !domain) {
    return "***";
  }

  const visiblePrefix = local.slice(0, 2);
  const hiddenLength = Math.max(local.length - 2, 1);
  return `${visiblePrefix}${"*".repeat(hiddenLength)}@${domain}`;
};

export async function POST(request) {
  if (!hasAdminSessionSecret()) {
    return json({ error: "Configuração ausente de ADMIN_AUTH_SECRET para login administrativo." }, 500);
  }

  const ip = getRequestClientIp(request) || "unknown";
  const rateLimit = consumeRateLimit({
    scope: "admin-auth-login",
    key: ip,
    limit: 6,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de login. Aguarde e tente novamente." },
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

  const email = String(body.email || "").trim().toLowerCase();
  const senha = String(body.senha || "");

  if (!isValidEmail(email) || !senha) {
    return json({ error: "Informe e-mail e senha válidos." }, 400);
  }

  if (!isStrongPassword(senha)) {
    return json(
      {
        error:
          "Para acesso admin, a senha deve ser forte: mínimo de 12 caracteres com maiúscula, minúscula, número e símbolo."
      },
      400
    );
  }

  await init;

  try {
    const user = await User.findOne({
      where: { email },
      attributes: [
        "id",
        "email",
        "senha_hash",
        "conta_liberada",
        "two_factor_enabled",
        "two_factor_destination"
      ],
      raw: true
    });

    if (!user || !bcrypt.compareSync(senha, user.senha_hash || "")) {
      return json({ error: "Credenciais inválidas." }, 401);
    }

    const allowedOperatorIds = parseAllowedOperatorIds();
    if (!allowedOperatorIds.has(Number(user.id))) {
      return json({ error: "Usuário não autorizado para administração." }, 403);
    }

    if (!user.conta_liberada) {
      return json({ error: "Conta não liberada para operações administrativas." }, 403);
    }

    if (!user.two_factor_enabled) {
      return json({ error: "Autenticação de dois fatores é obrigatória para administradores." }, 403);
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();
    const destination = String(user.two_factor_destination || user.email || "").trim().toLowerCase();

    if (!destination) {
      return json({ error: "Destino de 2FA não configurado para este operador." }, 500);
    }

    await User.update(
      {
        two_factor_code: code,
        two_factor_expires_at: expiresAt
      },
      { where: { id: user.id } }
    );

    try {
      await sendTwoFactorVerificationEmail({
        to: destination,
        code,
        expiresInMinutes: CODE_TTL_MINUTES
      });
    } catch (emailError) {
      console.error("Erro ao enviar código 2FA admin:", emailError.message);
      return json({ error: "Falha ao enviar o código 2FA por e-mail." }, 502);
    }

    const response = json({
      success: true,
      message: "Código 2FA enviado. Informe o código para concluir o acesso administrativo.",
      destination: maskEmail(destination),
      previewCode: process.env.NODE_ENV === "production" ? undefined : code
    });

    response.cookies.set(
      ADMIN_PENDING_COOKIE_NAME,
      encodeAdminPendingToken(user.id),
      getAdminPendingCookieOptions()
    );

    return response;
  } catch (error) {
    console.error("Erro no login admin:", error.message);
    return json({ error: "Erro ao processar login administrativo." }, 500);
  }
}
