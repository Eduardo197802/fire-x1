import crypto from "crypto";
import { QueryTypes } from "sequelize";
import { NextResponse } from "next/server";
import { init, sequelize, User } from "../../../../services/db";
import { consumeRateLimit, getRequestClientIp } from "../../../../services/rate-limit";
import { decodeAuthToken, extractSessionToken } from "../../../../services/session-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const parseAllowedOperatorIds = () => {
  const raw = String(process.env.PIX_TOTAL_ALLOWED_USER_IDS || "");
  const values = raw
    .split(",")
    .map((item) => Number(String(item || "").trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  return new Set(values);
};

const safeCompare = (provided, expected) => {
  const providedBuffer = Buffer.from(String(provided || ""), "utf8");
  const expectedBuffer = Buffer.from(String(expected || ""), "utf8");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
};

const unauthorized = () =>
  NextResponse.json(
    { error: "Acesso não autorizado." },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );

const forbidden = () =>
  NextResponse.json(
    { error: "Acesso negado." },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );

const serviceUnavailable = () =>
  NextResponse.json(
    { error: "Operação temporariamente indisponível." },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );

export async function GET(request) {
  const operatorToken = String(process.env.PIX_TOTAL_API_TOKEN || "");

  if (!operatorToken) {
    return serviceUnavailable();
  }

  const sessionToken = extractSessionToken(request);
  const decodedSession = decodeAuthToken(sessionToken);

  if (!decodedSession?.userId) {
    return unauthorized();
  }

  const operatorId = Number(decodedSession.userId);
  const allowedOperatorIds = parseAllowedOperatorIds();

  if (!allowedOperatorIds.has(operatorId)) {
    return forbidden();
  }

  const providedToken = request.headers.get("x-pix-total-token") || "";

  if (!safeCompare(providedToken, operatorToken)) {
    return unauthorized();
  }

  const rateLimit = consumeRateLimit({
    scope: "pix:total-recebido",
    key: `${getRequestClientIp(request)}:${operatorId}`,
    limit: 12,
    windowMs: 60 * 1000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde e tente novamente." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
          "Cache-Control": "no-store"
        }
      }
    );
  }

  await init;

  const operatorUser = await User.findByPk(operatorId, {
    attributes: ["id", "conta_liberada", "two_factor_enabled"],
    raw: true
  });

  if (!operatorUser || !operatorUser.conta_liberada || !operatorUser.two_factor_enabled) {
    return forbidden();
  }

  const rows = await sequelize.query(
    `
      SELECT COALESCE(SUM(valor), 0)::text AS total_pix_recebido
      FROM pagamentos
      WHERE tipo = :tipo
        AND metodo = :metodo
        AND status = :status
    `,
    {
      replacements: {
        tipo: "deposito",
        metodo: "pix",
        status: "creditado"
      },
      type: QueryTypes.SELECT
    }
  );

  const total = Number(rows?.[0]?.total_pix_recebido || 0);

  return NextResponse.json(
    {
      totalPixRecebido: Number.isFinite(total) ? total : 0,
      moeda: "BRL"
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
