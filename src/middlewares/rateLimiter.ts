/**
 * Rate Limiter Middleware - TypeScript version
 * Implements rate limiting with Redis store for better scalability
 */

import { Strapi } from '@strapi/strapi';
import { StrapiContext, StrapiMiddleware } from '../types';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

interface RateLimiterConfig {
  window?: number; // Time window in milliseconds
  max?: number; // Max requests per window
  message?: string | object;
  whitelist?: string[]; // Path patterns to skip
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (ctx: StrapiContext) => string;
}

interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

/**
 * Creates a rate limiting middleware with Redis backing
 */
export default (config: RateLimiterConfig, { strapi }: { strapi: Strapi }): StrapiMiddleware => {
  // Initialize Redis client
  const redisClient = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '1', 10),
    keyPrefix: 'rate_limit:',
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 3) {
        strapi.log.error('Redis connection failed for rate limiter');
        return null; // Stop retrying
      }
      return Math.min(times * 100, 3000);
    },
  });

  // Handle Redis connection events
  redisClient.on('error', (err) => {
    strapi.log.error('Redis error in rate limiter:', err);
  });

  redisClient.on('connect', () => {
    strapi.log.info('Rate limiter connected to Redis');
  });

  // Configure rate limiter
  const windowMs = config.window || 60000; // Default: 1 minute
  const max = config.max || 100; // Default: 100 requests

  const limiter = rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => (redisClient as any).call(...args),
      prefix: 'rate_limit:',
    }),
    windowMs,
    max,
    message: config.message || {
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: config.skipFailedRequests ?? false,
    skipSuccessfulRequests: config.skipSuccessfulRequests ?? false,
    // Custom key generator for better granularity
    keyGenerator: (req: any) => {
      if (config.keyGenerator) {
        return config.keyGenerator(req.ctx);
      }
      const userId = req.ctx?.state?.user?.id || 'anonymous';
      const ip = req.ctx?.ip || req.ctx?.request?.ip || 'unknown';
      return `${ip}:${userId}`;
    },
    // Skip rate limiting for whitelisted paths
    skip: (req: any) => {
      if (!config.whitelist || config.whitelist.length === 0) {
        return false;
      }
      
      const path = req.ctx?.path || req.path;
      return config.whitelist.some((pattern: string) => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(path);
      });
    },
    // Enhanced handler for rate limit exceeded
    handler: (req: any) => {
      const ctx = req.ctx as StrapiContext;
      
      // Log rate limit violation
      strapi.log.warn(`Rate limit exceeded: ${JSON.stringify({
        ip: ctx.ip,
        path: ctx.path,
        method: ctx.method,
        userId: ctx.state?.user?.id,
        userAgent: ctx.get('user-agent'),
      })}`);

      // Send structured error response
      ctx.status = 429;
      ctx.body = {
        error: {
          status: 429,
          name: 'RateLimitError',
          message: 'Too many requests, please try again later.',
          details: {
            limit: max,
            window: `${Math.ceil(windowMs / 1000)} seconds`,
            retryAfter: new Date(Date.now() + windowMs).toISOString(),
          },
        },
      };
    },
  });

  // Return Koa-style middleware
  return async (ctx: StrapiContext, next: () => Promise<void>): Promise<void> => {
    // Create Express-compatible request/response wrappers
    const expressReq: any = {
      ...ctx.request,
      ip: ctx.ip,
      path: ctx.path,
      method: ctx.method,
      headers: ctx.headers,
      ctx, // Store Koa context for access in handlers
    };

    const expressRes: any = {
      status: (code: number) => {
        ctx.status = code;
        return expressRes;
      },
      send: (body: any) => {
        ctx.body = body;
        return expressRes;
      },
      setHeader: (name: string, value: string) => {
        ctx.set(name, value);
        return expressRes;
      },
      getHeader: (name: string) => ctx.get(name),
    };

    try {
      // Apply rate limiting
      await new Promise<void>((resolve, reject) => {
        limiter(expressReq, expressRes, (err?: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Extract rate limit info from headers for logging
      const rateLimitInfo: RateLimitInfo = {
        limit: parseInt(ctx.get('X-RateLimit-Limit') || '0', 10),
        current: parseInt(ctx.get('X-RateLimit-Remaining') || '0', 10),
        remaining: parseInt(ctx.get('X-RateLimit-Remaining') || '0', 10),
        resetTime: new Date(parseInt(ctx.get('X-RateLimit-Reset') || '0', 10) * 1000),
      };

      // Add rate limit info to context state for access in controllers
      ctx.state.rateLimit = rateLimitInfo;

      // Continue to next middleware
      await next();
    } catch (error) {
      // Handle rate limiter errors
      if (error && typeof error === 'object' && 'statusCode' in error) {
        ctx.status = (error as any).statusCode || 429;
        ctx.body = {
          error: {
            status: ctx.status,
            name: 'RateLimitError',
            message: 'Rate limit error occurred',
          },
        };
      } else {
        // Log unexpected errors but don't block the request
        strapi.log.error('Unexpected error in rate limiter:', error);
        await next(); // Continue anyway to prevent service disruption
      }
    }
  };
};

// Export types for use in other files
export type { RateLimiterConfig, RateLimitInfo };