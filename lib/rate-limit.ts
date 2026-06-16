import { Redis } from "ioredis";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }
  return redis;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // seconds
}

/**
 * Sliding window rate limiter using Redis.
 * key: unique identifier (e.g. "ratelimit:webhook:1.2.3.4")
 * limit: max requests allowed in the window
 * windowSeconds: window duration in seconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const client = getRedis();
    const current = await client.incr(key);
    if (current === 1) {
      await client.expire(key, windowSeconds);
    }
    const ttl = await client.ttl(key);
    const remaining = Math.max(0, limit - current);
    return {
      allowed: current <= limit,
      remaining,
      resetIn: ttl > 0 ? ttl : windowSeconds,
    };
  } catch {
    // If Redis is unavailable, fail open (allow the request)
    return { allowed: true, remaining: limit, resetIn: windowSeconds };
  }
}
