import { init } from "./db.js";
import { extractAdminSessionToken, decodeAdminSessionToken } from "./admin-session.js";
import { findActiveAdminById } from "./admin-users.js";

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

export const authenticateAdminRequest = async (request) => {
  const adminSessionToken = extractAdminSessionToken(request);
  const decodedAdminSession = decodeAdminSessionToken(adminSessionToken);
  const operatorId = Number(decodedAdminSession?.userId || 0);

  if (!operatorId) {
    return {
      ok: false,
      status: 401,
      error: "Sessão administrativa inválida ou expirada."
    };
  }

  await init;

  const operatorUser = await findActiveAdminById(operatorId);

  if (!operatorUser) {
    return {
      ok: false,
      status: 403,
      error: "Administrador não encontrado ou inativo."
    };
  }

  if (!operatorUser.twofa_ativo) {
    return {
      ok: false,
      status: 403,
      error: "Administrador sem 2FA ativo."
    };
  }

  return {
    ok: true,
    userId: operatorId
  };
};
