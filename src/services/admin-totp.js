import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const normalizeBase32 = (value) => String(value || "").replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();

const decodeBase32 = (value) => {
  const clean = normalizeBase32(value);
  if (!clean) {
    return Buffer.alloc(0);
  }

  let bits = "";
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) {
      return Buffer.alloc(0);
    }
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
};

const encodeBase32 = (buffer) => {
  if (!buffer || buffer.length === 0) {
    return "";
  }

  let bits = "";
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }

  let output = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    output += BASE32_ALPHABET[Number.parseInt(chunk, 2)];
  }

  return output;
};

const hotp = (secretBuffer, counter) => {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = crypto.createHmac("sha1", secretBuffer).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;

  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(code % 1000000).padStart(6, "0");
};

export const verifyAdminTotpCode = ({ code, secret, periodSeconds = 30, window = 1 }) => {
  const normalizedCode = String(code || "").replace(/\D/g, "");
  if (normalizedCode.length !== 6) {
    return false;
  }

  const secretBuffer = decodeBase32(secret);
  if (!secretBuffer.length) {
    return false;
  }

  const counter = Math.floor(Date.now() / 1000 / periodSeconds);

  for (let drift = -window; drift <= window; drift += 1) {
    const expected = hotp(secretBuffer, counter + drift);
    if (expected === normalizedCode) {
      return true;
    }
  }

  return false;
};

export const generateAdminTotpSecret = (bytes = 20) => {
  const random = crypto.randomBytes(bytes);
  return encodeBase32(random);
};
