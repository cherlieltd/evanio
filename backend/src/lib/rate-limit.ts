import { getRedisConnection } from "./redis.js";

type MemoryBucket = { count: number; resetAt: number };

const memory = new Map<string, MemoryBucket>();

export class RateLimitError extends Error {
  retryAfterSec: number;

  constructor(retryAfterSec: number) {
    super("Rate limit exceeded");
    this.name = "RateLimitError";
    this.retryAfterSec = retryAfterSec;
  }
}

/**
 * Sliding fixed-window rate limit. Prefers Redis; falls back to process memory.
 */
export async function assertRateLimit(input: {
  key: string;
  limit: number;
  windowSec: number;
}): Promise<void> {
  const { key, limit, windowSec } = input;

  try {
    const redis = getRedisConnection();
    const redisKey = `rl:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSec);
    }
    if (count > limit) {
      const ttl = await redis.ttl(redisKey);
      throw new RateLimitError(ttl > 0 ? ttl : windowSec);
    }
    return;
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    // Redis unavailable — memory fallback
  }

  const now = Date.now();
  const bucket = memory.get(key);
  if (!bucket || bucket.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    throw new RateLimitError(Math.ceil((bucket.resetAt - now) / 1000));
  }
}
