import { Redis } from "@upstash/redis";

if (!process.env.UPSTASH_REDIS_REST_URL) {
  throw new Error("UPSTASH_REDIS_REST_URL is not defined");
}

if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error("UPSTASH_REDIS_REST_TOKEN is not defined");
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Rate limiting helper
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param limit - Maximum number of requests
 * @param window - Time window in seconds
 */
export async function rateLimit(
  identifier: string,
  limit: number = 10,
  window: number = 60
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const key = `rate_limit:${identifier}`;
  const now = Date.now();
  const windowMs = window * 1000;

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, window);
  }

  const ttl = await redis.ttl(key);
  const reset = now + (ttl * 1000);

  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
    reset,
  };
}
