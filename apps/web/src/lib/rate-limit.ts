import { Redis } from "ioredis";
import { NextRequest, NextResponse } from "next/server";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL);
  }
  return redis;
}

interface RateLimitConfig {
  limit: number;      // Max requests
  window: number;     // Time window in seconds
}

const DEFAULT_CONFIG: RateLimitConfig = {
  limit: 60,          // 60 requests
  window: 60,         // per 60 seconds (1 minute)
};

/**
 * Get client IP from request
 */
function getClientIp(request: NextRequest): string {
  // Check various headers for real IP (behind proxy/nginx)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback
  return "unknown";
}

/**
 * Check rate limit for a request
 * Returns null if allowed, or a Response if rate limited
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<NextResponse | null> {
  try {
    const ip = getClientIp(request);
    const key = `ratelimit:${ip}`;

    const client = getRedis();

    // Get current count
    const current = await client.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= config.limit) {
      // Rate limited
      const ttl = await client.ttl(key);

      return NextResponse.json(
        {
          error: "Too many requests",
          retryAfter: ttl > 0 ? ttl : config.window
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(ttl > 0 ? ttl : config.window),
            "X-RateLimit-Limit": String(config.limit),
            "X-RateLimit-Remaining": "0",
          }
        }
      );
    }

    // Increment counter
    if (count === 0) {
      // First request - set with expiry
      await client.setex(key, config.window, "1");
    } else {
      await client.incr(key);
    }

    return null; // Allowed

  } catch (error) {
    // If Redis fails, allow the request (fail open)
    console.error("[RateLimit] Redis error:", error);
    return null;
  }
}

/**
 * Rate limit configs for different endpoints
 */
export const RATE_LIMITS = {
  // General API - 60 req/min
  default: { limit: 60, window: 60 },

  // Stats endpoint (called frequently by homepage) - 120 req/min
  stats: { limit: 120, window: 60 },

  // Miner lookup - 60 req/min
  miner: { limit: 60, window: 60 },
};
