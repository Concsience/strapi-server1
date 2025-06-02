/**
 * API Cache Middleware - TypeScript version
 * Implements Redis-based caching for GET requests with careful error handling
 */

import { Strapi } from '@strapi/strapi';
import { StrapiContext, StrapiMiddleware } from '@/types';
import Redis from 'ioredis';
import crypto from 'crypto';

interface CacheConfig {
  enabled?: boolean;
  ttl?: number; // Default TTL in seconds
  excludePaths?: string[]; // Path patterns to exclude from caching
  cacheAuthenticatedRequests?: boolean;
  compression?: boolean;
  compressionOptions?: {
    threshold?: number;
  };
  models?: {
    [key: string]: {
      ttl?: number;
    };
  };
  monitoring?: {
    logHits?: boolean;
    logMisses?: boolean;
  };
}

interface CacheData {
  body: any;
  headers: Record<string, string>;
  status: number;
  cachedAt: string;
}

/**
 * Creates a Redis-based caching middleware
 * Carefully preserves original behavior while adding type safety
 */
export default (config: CacheConfig = {}, { strapi }: { strapi: Strapi }): StrapiMiddleware => {
  // Initialize Redis client with error handling
  let redis: Redis | null = null;
  
  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'strapi_cache_',
      enableOfflineQueue: false,
      retryStrategy: (times: number) => {
        if (times > 3) {
          strapi.log.warn('Redis connection failed for cache middleware - caching disabled');
          return null; // Stop retrying
        }
        return Math.min(times * 100, 3000);
      },
    });

    redis.on('error', (err) => {
      strapi.log.error('Redis error in cache middleware:', err);
    });

    redis.on('connect', () => {
      strapi.log.info('Cache middleware connected to Redis');
    });
  } catch (error) {
    strapi.log.error('Failed to initialize Redis for cache middleware:', error);
  }

  /**
   * Generate cache key from request
   * Maintains exact same hashing as original
   */
  const generateCacheKey = (ctx: StrapiContext): string => {
    const { method, url, query } = ctx.request;
    const queryString = JSON.stringify(query);
    const hash = crypto.createHash('sha256').update(`${method}:${url}:${queryString}`).digest('hex');
    return `api:${hash}`;
  };

  /**
   * Check if route should be cached
   * Preserves original logic exactly
   */
  const shouldCache = (ctx: StrapiContext): boolean => {
    // Only cache GET requests
    if (ctx.method !== 'GET') return false;

    // Check if route is excluded
    if (config.excludePaths?.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(ctx.path);
    })) {
      return false;
    }

    // Don't cache authenticated requests by default
    if (ctx.state.user && !config.cacheAuthenticatedRequests) {
      return false;
    }

    return true;
  };

  // Return middleware function
  return async (ctx: StrapiContext, next: () => Promise<void>): Promise<void> => {
    // Skip if caching is disabled, Redis not available, or shouldn't cache this request
    if (!config.enabled || !redis || !shouldCache(ctx)) {
      return next();
    }

    const cacheKey = generateCacheKey(ctx);
    
    try {
      // Try to get from cache
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        // Parse cached data with error handling
        let cacheData: CacheData;
        try {
          cacheData = JSON.parse(cached);
        } catch (parseError) {
          strapi.log.error('Failed to parse cached data:', parseError);
          await next();
          return;
        }

        const { body, headers, status } = cacheData;
        
        // Set cached response
        ctx.body = body;
        ctx.status = status || 200;
        
        // Set cache headers
        ctx.set('X-Cache', 'HIT');
        ctx.set('X-Cache-Key', cacheKey);
        
        // Restore original headers (preserving exact original logic)
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            if (!['x-cache', 'x-cache-key'].includes(key.toLowerCase())) {
              ctx.set(key, String(value));
            }
          });
        }
        
        // Log cache hit
        if (config.monitoring?.logHits) {
          strapi.log.debug(`Cache HIT: ${ctx.path}`);
        }
        
        return;
      }
      
      // Cache miss - continue with request
      await next();
      
      // Only cache successful responses (exact same condition as original)
      if (ctx.status >= 200 && ctx.status < 300 && ctx.body) {
        // Determine TTL (preserving original logic)
        let ttl = config.ttl || 3600;
        
        // Check for model-specific TTL (exact same regex and logic)
        const modelMatch = ctx.path.match(/\/api\/([^\/]+)/);
        if (modelMatch && config.models?.[`api::${modelMatch[1]}`]) {
          ttl = config.models[`api::${modelMatch[1]}`].ttl || ttl;
        }
        
        // Prepare cache data (exact same structure)
        const cacheData: CacheData = {
          body: ctx.body,
          headers: ctx.headers as Record<string, string>,
          status: ctx.status,
          cachedAt: new Date().toISOString(),
        };
        
        // Compress if enabled (preserving comment about Redis compression)
        let dataToCache = JSON.stringify(cacheData);
        if (config.compression && dataToCache.length > (config.compressionOptions?.threshold || 1024)) {
          // Compression would be handled by Redis if supported
        }
        
        // Store in cache with TTL
        await redis.setex(cacheKey, ttl, dataToCache);
        
        // Set cache headers (exact same headers)
        ctx.set('X-Cache', 'MISS');
        ctx.set('X-Cache-TTL', ttl.toString());
        ctx.set('Cache-Control', `public, max-age=${ttl}`);
        
        // Log cache miss
        if (config.monitoring?.logMisses) {
          strapi.log.debug(`Cache MISS: ${ctx.path} (cached for ${ttl}s)`);
        }
      }
    } catch (error) {
      // Log error but don't fail the request (preserving original behavior)
      strapi.log.error('Cache middleware error:', error);
      
      // Continue without caching if body not set
      if (!ctx.body) {
        await next();
      }
    }
  };
};

// Export type for configuration
export type { CacheConfig };