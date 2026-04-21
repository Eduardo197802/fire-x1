import crypto from "crypto";
import { QueryTypes } from "sequelize";
import { init, sequelize } from "./db.js";
import { findActiveAdminByEmail } from "./admin-users.js";
import { sendAdminAccessLinkEmail } from "./email";

const ACCESS_LINK_TTL_MINUTES = 10;

const toLowerTrim = (value) => String(value || "").trim().toLowerCase();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toLowerTrim(value));

const hashToken = (token) => crypto.createHash("sha256").update(String(token || "")).digest("hex");

const generateRawToken = () => crypto.randomBytes(32).toString("hex");

const PUBLIC_PRODUCTION_BASE_URL = "https://firex1play.com.br";

const normalizeBaseUrl = (value) =>
  String(value || "").trim().replace(/\/$/, "").replace(/^https?:\/\/www\./i, "https://");

const isLocalHost = (host) => /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(String(host || ""));

const isLocalBaseUrl = (value) => {
  try {
    return isLocalHost(new URL(value).host);
  } catch {
    return false;
  }
};

export const resolveAdminAccessBaseUrl = (request) => {
  const host = request?.headers?.get("host") || "localhost:3000";
  const proto = request?.headers?.get("x-forwarded-proto") || "http";
  const requestBaseUrl = normalizeBaseUrl(`${proto}://${host}`);

  const configured = normalizeBaseUrl(
    process.env.ADMIN_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ""
  );

  if (configured) {
    if (process.env.NODE_ENV === "production" && isLocalBaseUrl(configured)) {
      return PUBLIC_PRODUCTION_BASE_URL;
    }

    return configured;
  }

  if (isLocalHost(host)) {
    if (process.env.NODE_ENV === "production") {
      return PUBLIC_PRODUCTION_BASE_URL;
    }

    return requestBaseUrl;
  }

  return requestBaseUrl;
};

const ensureAuthorizedAdminByEmail = async (email) => {
  const admin = await findActiveAdminByEmail(email);
  if (!admin) {
    return null;
  }

  return {
    id: Number(admin.id),
    email: toLowerTrim(admin.email),
    nome: admin.nome || admin.email || "Administrador"
  };
};

export const requestAdminAccessLink = async ({ email, request }) => {
  const normalizedEmail = toLowerTrim(email);

  if (!isValidEmail(normalizedEmail)) {
    return { ok: true, sent: false };
  }

  await init;

  const authorizedAdmin = await ensureAuthorizedAdminByEmail(normalizedEmail);
  if (!authorizedAdmin) {
    return { ok: true, sent: false };
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);

  await sequelize.query(
    `
      INSERT INTO admin_access_links (email, token_hash, expira_em, usado, criado_em)
      VALUES (:email, :tokenHash, NOW() + (:ttl || ' minutes')::interval, false, NOW())
    `,
    {
      replacements: {
        email: authorizedAdmin.email,
        tokenHash,
        ttl: String(ACCESS_LINK_TTL_MINUTES)
      }
    }
  );

  console.warn(
    `Admin access link criado email=${authorizedAdmin.email} hash=${tokenHash.slice(0, 12)}... ttl=${ACCESS_LINK_TTL_MINUTES}m`
  );

  const linkUrl = `${resolveAdminAccessBaseUrl(request)}/admin/acesso/${rawToken}`;

  if (process.env.NODE_ENV !== "production") {
    console.warn(`Admin access link dev url=${linkUrl}`);
  }

  await sendAdminAccessLinkEmail({
    to: authorizedAdmin.email,
    name: authorizedAdmin.nome,
    linkUrl,
    expiresInMinutes: ACCESS_LINK_TTL_MINUTES
  });

  return {
    ok: true,
    sent: true,
    expiresInMinutes: ACCESS_LINK_TTL_MINUTES
  };
};

export const consumeAdminAccessLinkToken = async (token) => {
  const rawToken = String(token || "").trim();
  if (!rawToken) {
    console.warn("Admin access link vazio ou ausente.");
    return null;
  }

  await init;

  const tokenHash = hashToken(rawToken);

  // Nao marcamos o link como usado aqui para evitar invalidez causada
  // por prefetch/scanners de e-mail que acessam o link automaticamente.
  const [consumed] = await sequelize.query(
    `
      SELECT email
      FROM admin_access_links
      WHERE token_hash = :tokenHash
        AND expira_em > NOW()
      ORDER BY id DESC
      LIMIT 1
    `,
    {
      replacements: { tokenHash },
      type: QueryTypes.SELECT
    }
  );

  if (!consumed?.email) {
    const [existingToken] = await sequelize.query(
      `
        SELECT id, email, expira_em, usado
        FROM admin_access_links
        WHERE token_hash = :tokenHash
        ORDER BY id DESC
        LIMIT 1
      `,
      {
        replacements: { tokenHash },
        type: QueryTypes.SELECT
      }
    );

    if (!existingToken) {
      console.warn(`Admin access link nao encontrado para hash ${tokenHash.slice(0, 12)}...`);
    } else {
      const expired = Number(new Date(existingToken.expira_em)) <= Date.now();
      console.warn(
        `Admin access link rejeitado id=${existingToken.id} expired=${expired} usado=${Boolean(existingToken.usado)}`
      );
    }
    return null;
  }

  const email = toLowerTrim(consumed?.email || "");
  if (!email) {
    return null;
  }

  const admin = await findActiveAdminByEmail(email);
  if (!admin) {
    console.warn(`Admin access link sem admin ativo para email=${email}`);
    return null;
  }

  console.warn(`Admin access link aceito email=${email} hash=${tokenHash.slice(0, 12)}...`);

  return {
    userId: admin.id,
    email: admin.email,
    nome: admin.nome
  };
};

export const validateAdminAccessLink = async (token) => {
  const consumed = await consumeAdminAccessLinkToken(token);

  if (!consumed?.userId) {
    return { ok: false };
  }

  return {
    ok: true,
    userId: consumed.userId,
    email: consumed.email,
    nome: consumed.nome
  };
};
