// Tiny in-memory rate limiter. Good enough for a single-node open-source
// deployment; if the platform ever scales horizontally, swap for Redis.

type Bucket = {
  tokens: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
let nextPruneAt = 0;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
};

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  if (now >= nextPruneAt) {
    pruneExpiredBuckets(now);
    nextPruneAt = now + Math.min(opts.windowMs, 60_000);
  }

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { tokens: opts.limit - 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, retryAfterMs: 0 };
  }

  if (bucket.tokens <= 0) {
    return { ok: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }

  bucket.tokens -= 1;
  return { ok: true, remaining: bucket.tokens, retryAfterMs: 0 };
}

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function clientKeyFromRequest(req: Request, prefix: string) {
  const xff = req.headers.get("x-forwarded-for");
  const ip =
    req.headers.get("cf-connecting-ip") ||
    xff?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `${prefix}:${ip}`;
}
