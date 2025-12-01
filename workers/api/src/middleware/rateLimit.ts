/**
 * Rate Limiting Middleware for ZORA CORE
 * 
 * Provides in-memory rate limiting for critical endpoints.
 * Uses a Map-based approach for v1 (can be upgraded to KV in future).
 * 
 * Configuration via environment variables:
 * - AUTH_LOGIN_RATE_LIMIT: Max requests per minute for /api/auth/login (default: 10)
 * - AUTH_REGISTER_RATE_LIMIT: Max requests per minute for /api/auth/register (default: 5)
 * - AUTH_PASSWORD_FORGOT_RATE_LIMIT: Max requests per hour for /api/auth/password/forgot (default: 5)
 * - AGENT_COMMANDS_RATE_LIMIT: Max requests per minute for /api/agents/commands (default: 60)
 * - SHOP_ORDERS_RATE_LIMIT: Max requests per minute for /api/shop/orders (default: 10)
 * - BILLING_WEBHOOKS_RATE_LIMIT: Max requests per minute for /api/billing/webhooks/* (default: 100)
 */

import { Context, Next } from 'hono';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory rate limit store
// Note: This resets on worker restart. For production, consider using KV or Durable Objects.
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically (every 100 requests)
let requestCounter = 0;
const CLEANUP_INTERVAL = 100;

function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Key prefix for this rate limiter (e.g., 'auth_login') */
  keyPrefix: string;
  /** Optional: Use IP address as key (default: true) */
  useIp?: boolean;
  /** Optional: Use user ID as key if authenticated */
  useUserId?: boolean;
}

/**
 * Create a rate limiting middleware with the given configuration
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (c: Context, next: Next) => {
    // Periodic cleanup
    requestCounter++;
    if (requestCounter >= CLEANUP_INTERVAL) {
      requestCounter = 0;
      cleanupExpiredEntries();
    }

    // Build the rate limit key
    let key = config.keyPrefix;
    
    if (config.useIp !== false) {
      // Get client IP from various headers (Cloudflare, proxies, etc.)
      const ip = c.req.header('cf-connecting-ip') 
        || c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
        || c.req.header('x-real-ip')
        || 'unknown';
      key += `:ip:${ip}`;
    }
    
    if (config.useUserId) {
      // Try to get user ID from auth context if available
      const userId = c.get('userId');
      if (userId) {
        key += `:user:${userId}`;
      }
    }

    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (entry) {
      if (entry.resetAt > now) {
        // Window is still active
        if (entry.count >= config.maxRequests) {
          // Rate limit exceeded
          const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
          
          return new Response(
            JSON.stringify({
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: `Too many requests. Please try again in ${retryAfterSeconds} second(s).`,
              },
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(retryAfterSeconds),
                'X-RateLimit-Limit': String(config.maxRequests),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
              },
            }
          );
        }
        
        // Increment counter
        entry.count++;
        rateLimitStore.set(key, entry);
      } else {
        // Window has expired, start a new one
        rateLimitStore.set(key, {
          count: 1,
          resetAt: now + config.windowMs,
        });
      }
    } else {
      // First request, create new entry
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      });
    }

    // Add rate limit headers to response
    const currentEntry = rateLimitStore.get(key)!;
    c.header('X-RateLimit-Limit', String(config.maxRequests));
    c.header('X-RateLimit-Remaining', String(Math.max(0, config.maxRequests - currentEntry.count)));
    c.header('X-RateLimit-Reset', String(Math.ceil(currentEntry.resetAt / 1000)));

    await next();
  };
}

// Pre-configured rate limiters for common endpoints

/** Rate limiter for /api/auth/login - 10 requests per minute by default */
export function loginRateLimiter(env: { AUTH_LOGIN_RATE_LIMIT?: string }) {
  const maxRequests = parseInt(env.AUTH_LOGIN_RATE_LIMIT || '10', 10);
  return createRateLimiter({
    maxRequests,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'auth_login',
  });
}

/** Rate limiter for /api/auth/register - 5 requests per minute by default */
export function registerRateLimiter(env: { AUTH_REGISTER_RATE_LIMIT?: string }) {
  const maxRequests = parseInt(env.AUTH_REGISTER_RATE_LIMIT || '5', 10);
  return createRateLimiter({
    maxRequests,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'auth_register',
  });
}

/** Rate limiter for /api/auth/password/forgot - 5 requests per hour by default */
export function passwordForgotRateLimiter(env: { AUTH_PASSWORD_FORGOT_RATE_LIMIT?: string }) {
  const maxRequests = parseInt(env.AUTH_PASSWORD_FORGOT_RATE_LIMIT || '5', 10);
  return createRateLimiter({
    maxRequests,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'auth_password_forgot',
  });
}

/** Rate limiter for /api/agents/commands - 60 requests per minute by default */
export function agentCommandsRateLimiter(env: { AGENT_COMMANDS_RATE_LIMIT?: string }) {
  const maxRequests = parseInt(env.AGENT_COMMANDS_RATE_LIMIT || '60', 10);
  return createRateLimiter({
    maxRequests,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'agent_commands',
    useUserId: true,
  });
}

/** Rate limiter for /api/shop/orders - 10 requests per minute by default */
export function shopOrdersRateLimiter(env: { SHOP_ORDERS_RATE_LIMIT?: string }) {
  const maxRequests = parseInt(env.SHOP_ORDERS_RATE_LIMIT || '10', 10);
  return createRateLimiter({
    maxRequests,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'shop_orders',
    useUserId: true,
  });
}

/** Rate limiter for /api/billing/webhooks/* - 100 requests per minute by default */
export function billingWebhooksRateLimiter(env: { BILLING_WEBHOOKS_RATE_LIMIT?: string }) {
  const maxRequests = parseInt(env.BILLING_WEBHOOKS_RATE_LIMIT || '100', 10);
  return createRateLimiter({
    maxRequests,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'billing_webhooks',
  });
}

/**
 * Get current rate limit status for debugging
 */
export function getRateLimitStatus(): { entries: number; keys: string[] } {
  return {
    entries: rateLimitStore.size,
    keys: Array.from(rateLimitStore.keys()),
  };
}

/**
 * Clear all rate limit entries (for testing)
 */
export function clearRateLimits(): void {
  rateLimitStore.clear();
}
