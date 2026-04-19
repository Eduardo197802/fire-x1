import { NextResponse } from "next/server";
import { consumeRateLimit, getRequestClientIp } from "../../../services/rate-limit";
import { requestAdminAccessLink } from "../../../services/admin-access-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NEUTRAL_RESPONSE = {
  ok: true,
  mensagem: "Se o e-mail estiver autorizado, você receberá um link de acesso."
};

export async function POST(request) {
  const ip = getRequestClientIp(request) || "unknown";
  const rateLimit = consumeRateLimit({
    scope: "admin-request-link",
    key: ip,
    limit: 3,
    windowMs: 60 * 1000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(NEUTRAL_RESPONSE, {
      status: 200,
      headers: { "Retry-After": String(rateLimit.retryAfterSeconds) }
    });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const email = String(body.email || "").trim().toLowerCase();

  try {
    await requestAdminAccessLink({ email, request });
  } catch (error) {
    console.error("Erro ao solicitar link /admin/solicitar-link:", error.message);
  }

  return NextResponse.json(NEUTRAL_RESPONSE, { status: 200 });
}
