import crypto from "crypto";

const SESSION_TTL_HOURS = 24;
export const SESSION_COOKIE_NAME = "firex1_session";

const resolveAuthSecret = () =>
  String(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "").trim();

export const hasAuthSecret = () => {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return Boolean(resolveAuthSecret());
};

const getAuthSecret = () => {
  const configuredSecret = resolveAuthSecret();
  if (configuredSecret) {
    return configuredSecret;
  }
  if (process.env.NODE_ENV === "production") {
    return "";
  }
  return "firex1-dev-secret";
};

const safeEqual = (received, expected) => {
  const receivedBuffer = Buffer.from(String(received || ""));
  const expectedBuffer = Buffer.from(String(expected || ""));

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
};

export const encodeAuthToken = (userId) => {
  const secret = getAuthSecret();
  if (!secret) {
    return "";
  }

  const normalizedUserId = Number(userId);

  if (!normalizedUserId) {
    return "";
  }

  const expiresAt = Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000;
  const payload = `${normalizedUserId}.${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
};

export const decodeAuthToken = (token) => {
  const secret = getAuthSecret();
  if (!secret) {
    return null;
  }

  const [userIdPart, expiresAtPart, signature] = String(token || "").split(".");

  if (!userIdPart || !expiresAtPart || !signature) {
    return null;
  }

  const payload = `${userIdPart}.${expiresAtPart}`;
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

export const extractBearerToken = (request) => {
  const authHeader = request.headers.get("authorization") || "";

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
};

export const extractSessionToken = (request) => {
  const bearerToken = extractBearerToken(request);

  if (bearerToken) {
    return bearerToken;
  }

  return request.cookies.get(SESSION_COOKIE_NAME)?.value || "";
};

export const getSessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_HOURS * 60 * 60,
});

export const clearSessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 0,
});

export const authenticateUserRequest = (request, requestedUserId) => {
  const token = extractSessionToken(request);

  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Sessão inválida ou expirada. Faça login novamente."
    };
  }

  const decoded = decodeAuthToken(token);

  if (!decoded) {
    return {
      ok: false,
      status: 401,
      error: "Sessão inválida ou expirada. Faça login novamente."
    };
  }

  if (Number(decoded.userId) !== Number(requestedUserId)) {
    return {
      ok: false,
      status: 403,
      error: "Acesso negado para este usuário."
    };
  }

  return {
    ok: true,
    userId: Number(decoded.userId)
  };
};
