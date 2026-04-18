const buckets = new Map();

const now = () => Date.now();

const compactBucket = (bucket, windowMs) => {
  const threshold = now() - windowMs;
  while (bucket.length > 0 && bucket[0] <= threshold) {
    bucket.shift();
  }
};

export const getRequestClientIp = (request) => {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const firstIp = forwarded.split(",")[0]?.trim();
  return firstIp || request.headers.get("x-real-ip") || "unknown";
};

export const consumeRateLimit = ({ scope, key, limit, windowMs }) => {
  const bucketKey = `${scope}:${key}`;
  const bucket = buckets.get(bucketKey) || [];

  compactBucket(bucket, windowMs);

  if (bucket.length >= limit) {
    const retryAfterMs = Math.max(windowMs - (now() - bucket[0]), 0);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000))
    };
  }

  bucket.push(now());
  buckets.set(bucketKey, bucket);

  return {
    allowed: true,
    retryAfterSeconds: 0
  };
};

export const buildUserRateLimitKey = (request, userId) => `${getRequestClientIp(request)}:${Number(userId) || 0}`;
