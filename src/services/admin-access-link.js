import crypto from "crypto";
import { QueryTypes } from "sequelize";
import { init, sequelize, User } from "./db.js";
import { parseAllowedOperatorIds } from "./admin-auth.js";
import { sendAdminAccessLinkEmail } from "./email";

const ACCESS_LINK_TTL_MINUTES = 10;

const toLowerTrim = (value) => String(value || "").trim().toLowerCase();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toLowerTrim(value));

const hashToken = (token) => crypto.createHash("sha256").update(String(token || "")).digest("hex");

const generateRawToken = () => crypto.randomBytes(32).toString("hex");

const resolveBaseUrl = (request) => {
  const configured = String(
    process.env.ADMIN_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ""
  ).trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const host = request?.headers?.get("host") || "localhost:3000";
  const proto = request?.headers?.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
};

const ensureAuthorizedAdminByEmail = async (email) => {
  const user = await User.findOne({
    where: { email },
    attributes: ["id", "email", "nome", "conta_liberada", "two_factor_enabled"],
    raw: true
  });

  if (!user) {
    return null;
  }

  const allowedOperatorIds = parseAllowedOperatorIds();
  const isAllowed = allowedOperatorIds.has(Number(user.id));

  if (!isAllowed || !user.conta_liberada || !user.two_factor_enabled) {
    return null;
  }

  return {
    id: Number(user.id),
    email: toLowerTrim(user.email),
    nome: user.nome || user.email || "Administrador"
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

  const linkUrl = `${resolveBaseUrl(request)}/admin/acesso/${rawToken}`;

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
    return null;
  }

  await init;

  const tokenHash = hashToken(rawToken);

  const [consumed] = await sequelize.query(
    `
      WITH candidate AS (
        SELECT id, email
        FROM admin_access_links
        WHERE token_hash = :tokenHash
          AND usado = false
          AND expira_em > NOW()
        ORDER BY id DESC
        LIMIT 1
      )
      UPDATE admin_access_links a
      SET usado = true
      FROM candidate c
      WHERE a.id = c.id
      RETURNING c.email
    `,
    {
      replacements: { tokenHash },
      type: QueryTypes.SELECT
    }
  );

  const email = toLowerTrim(consumed?.email || "");
  if (!email) {
    return null;
  }

  const admin = await ensureAuthorizedAdminByEmail(email);
  if (!admin) {
    return null;
  }

  return {
    userId: admin.id,
    email: admin.email,
    nome: admin.nome
  };
};
