import { NextResponse } from "next/server";
import {
  decodeAdminSessionToken,
  extractAdminSessionToken
} from "../../../../../services/admin-session";
import { findActiveAdminById, recordAdminAccessLog } from "../../../../../services/admin-users";
import { getRequestClientIp } from "../../../../../services/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body, status = 200) => NextResponse.json(body, { status });

export async function GET(request) {
  const sessionToken = extractAdminSessionToken(request);
  const decoded = decodeAdminSessionToken(sessionToken);

  if (!decoded?.userId) {
    return json({ error: "Sessão administrativa inválida ou expirada." }, 401);
  }

  const user = await findActiveAdminById(Number(decoded.userId));

  if (!user) {
    return json({ error: "Administrador não encontrado ou inativo." }, 403);
  }

  if (!user.twofa_ativo) {
    return json({ error: "Conta sem requisitos de segurança para acesso administrativo." }, 403);
  }

  await recordAdminAccessLog({
    adminId: user.id,
    acao: "sessao.validar",
    detalhe: "Sessão administrativa validada.",
    ip: getRequestClientIp(request)
  }).catch(() => {});

  return json({
    success: true,
    user: {
      id: Number(user.id),
      nome: user.nome || user.email || "Administrador",
      email: user.email
    }
  });
}
