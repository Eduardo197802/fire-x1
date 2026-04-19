import crypto from "crypto";
import { init, User } from "../../services/db";
import { extractSessionToken, decodeAuthToken } from "../../services/session-auth";

export const parseAllowedOperatorIds = () => {
  const raw = String(process.env.ADMIN_FINANCEIRO_ALLOWED_USER_IDS || "");
  const values = raw
    .split(",")
    .map((item) => Number(String(item || "").trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
  return new Set(values);
};

export const getAdminToken = () => {
  return String(process.env.ADMIN_FINANCEIRO_API_TOKEN || "");
};

function safeCompare(provided, expected) {
  const providedBuffer = Buffer.from(String(provided || ""), "utf8");
  const expectedBuffer = Buffer.from(String(expected || ""), "utf8");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export const authenticateAdminRequest = async (request) => {
  // Validar sessão
  const sessionToken = extractSessionToken(request);

  if (!sessionToken) {
    return {
      ok: false,
      status: 401,
      error: "Sessão inválida ou expirada. Faça login novamente."
    };
  }

  const decodedSession = decodeAuthToken(sessionToken);

  if (!decodedSession?.userId) {
    return {
      ok: false,
      status: 401,
      error: "Sessão inválida ou expirada. Faça login novamente."
    };
  }

  // Validar ID na allowlist
  const operatorId = Number(decodedSession.userId);
  const allowedOperatorIds = parseAllowedOperatorIds();

  if (!allowedOperatorIds.has(operatorId)) {
    return {
      ok: false,
      status: 403,
      error: "Acesso negado. Usuário não autorizado para operações administrativas."
    };
  }

  // Validar token operacional
  const adminToken = getAdminToken();

  if (!adminToken) {
    return {
      ok: false,
      status: 500,
      error: "Configuração de segurança de admin ausente."
    };
  }

  const providedToken =
    request.headers.get("x-admin-financeiro-token") ||
    request.headers.get("x-admin-token") ||
    "";

  if (!safeCompare(providedToken, adminToken)) {
    return {
      ok: false,
      status: 401,
      error: "Token de administrador inválido."
    };
  }

  // Validar atributos do usuário
  await init;

  const operatorUser = await User.findByPk(operatorId, {
    attributes: ["id", "conta_liberada", "two_factor_enabled"],
    raw: true
  });

  if (!operatorUser) {
    return {
      ok: false,
      status: 403,
      error: "Usuário não encontrado."
    };
  }

  if (!operatorUser.conta_liberada) {
    return {
      ok: false,
      status: 403,
      error: "Conta não liberada para operações administrativas."
    };
  }

  if (!operatorUser.two_factor_enabled) {
    return {
      ok: false,
      status: 403,
      error: "Autenticação de dois fatores é obrigatória para administradores."
    };
  }

  return {
    ok: true,
    userId: operatorId
  };
};
