import { Redis } from "@upstash/redis";

// Initialize Redis client lazily to prevent startup crashes
let redisInstance: Redis | null = null;

function getRedis(): Redis {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    throw new Error("UPSTASH_REDIS_REST_URL is not defined. Please set it in your environment variables.");
  }

  if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error("UPSTASH_REDIS_REST_TOKEN is not defined. Please set it in your environment variables.");
  }

  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  return redisInstance;
}

// Create a proxy that lazily initializes Redis
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const client = getRedis();
    const value = client[prop as keyof Redis];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
}) as Redis;

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

  try {
    // Add timeout protection for Redis calls
    const timeoutPromise = new Promise<{ success: boolean; remaining: number; reset: number }>((resolve) => {
      setTimeout(() => {
        // On timeout, allow the request but log the issue
        console.warn(`Redis timeout for rate limit key: ${key}`);
        resolve({
          success: true, // Allow request on timeout to prevent blocking
          remaining: limit,
          reset: now + windowMs,
        });
      }, 3000); // 3 second timeout
    });

    const redisPromise = (async () => {
      try {
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
      } catch (redisError) {
        // If Redis is not configured or fails, allow the request
        console.warn("Redis operation failed, allowing request:", redisError);
        return {
          success: true,
          remaining: limit,
          reset: now + windowMs,
        };
      }
    })();

    return await Promise.race([redisPromise, timeoutPromise]);
  } catch (error) {
    console.error("Rate limit error:", error);
    // On error, allow the request to prevent blocking
    return {
      success: true,
      remaining: limit,
      reset: now + windowMs,
    };
  }
}
