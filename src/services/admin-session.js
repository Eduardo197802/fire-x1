import crypto from "crypto";

const ADMIN_PENDING_TTL_MINUTES = 10;
const ADMIN_LOGIN_TTL_MINUTES = 10;
const ADMIN_SESSION_TTL_MINUTES = 30;

export const ADMIN_PENDING_COOKIE_NAME = "firex1_admin_pending";
export const ADMIN_LOGIN_COOKIE_NAME = "firex1_admin_login";
export const ADMIN_SESSION_COOKIE_NAME = "firex1_admin_session";

const resolveAdminSessionSecret = () =>
  String(
    process.env.ADMIN_AUTH_SECRET ||
      process.env.AUTH_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      process.env.JWT_SECRET ||
      ""
  ).trim();

export const hasAdminSessionSecret = () => {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return Boolean(resolveAdminSessionSecret());
};

const getAdminSessionSecret = () => {
  const configuredSecret = resolveAdminSessionSecret();
  if (configuredSecret) {
    return configuredSecret;
  }
  if (process.env.NODE_ENV === "production") {
    return "";
  }
  return "firex1-admin-dev-secret";
};

const safeEqual = (received, expected) => {
  const receivedBuffer = Buffer.from(String(received || ""));
  const expectedBuffer = Buffer.from(String(expected || ""));

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
};

const encodeToken = (userId, ttlMinutes) => {
  const secret = getAdminSessionSecret();
  if (!secret) {
    return "";
  }

  const normalizedUserId = Number(userId);
  if (!normalizedUserId) {
    return "";
  }

  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  const nonce = crypto.randomBytes(12).toString("hex");
  const payload = `${normalizedUserId}.${expiresAt}.${nonce}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
};

const decodeToken = (token) => {
  const secret = getAdminSessionSecret();
  if (!secret) {
    return null;
  }

  const [userIdPart, expiresAtPart, nonce, signature] = String(token || "").split(".");

  if (!userIdPart || !expiresAtPart || !nonce || !signature) {
    return null;
  }

  const payload = `${userIdPart}.${expiresAtPart}.${nonce}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  const userId = Number(userIdPart);
  const expiresAt = Number(expiresAtPart);

  if (!userId || !expiresAt || Date.now() > expiresAt) {
    return null;
  }

  return {
    userId,
    expiresAt
  };
};

const buildCookieOptions = (maxAgeSeconds) => ({
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: maxAgeSeconds
});

export const encodeAdminPendingToken = (userId) => encodeToken(userId, ADMIN_PENDING_TTL_MINUTES);
export const decodeAdminPendingToken = (token) => decodeToken(token);

export const encodeAdminLoginToken = (userId) => encodeToken(userId, ADMIN_LOGIN_TTL_MINUTES);
export const decodeAdminLoginToken = (token) => decodeToken(token);

export const encodeAdminSessionToken = (userId) => encodeToken(userId, ADMIN_SESSION_TTL_MINUTES);
export const decodeAdminSessionToken = (token) => decodeToken(token);

export const extractAdminSessionToken = (request) =>
  request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value || "";

export const extractAdminPendingToken = (request) =>
  request.cookies.get(ADMIN_PENDING_COOKIE_NAME)?.value || "";

export const extractAdminLoginToken = (request) =>
  request.cookies.get(ADMIN_LOGIN_COOKIE_NAME)?.value || "";

export const getAdminPendingCookieOptions = () => buildCookieOptions(ADMIN_PENDING_TTL_MINUTES * 60);
export const getAdminLoginCookieOptions = () => buildCookieOptions(ADMIN_LOGIN_TTL_MINUTES * 60);
export const getAdminSessionCookieOptions = () => buildCookieOptions(ADMIN_SESSION_TTL_MINUTES * 60);

export const clearAdminCookieOptions = () => buildCookieOptions(0);
