const Redis = require('ioredis');
const crypto = require('crypto');

module.exports = (config, { strapi }) => {
  // Initialize Redis client
  const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'strapi_cache_',
  });

  // Helper to generate cache key
  const generateCacheKey = (ctx) => {
    const { method, url, query } = ctx.request;
    const queryString = JSON.stringify(query);
    const hash = crypto.createHash('sha256').update(`${method}:${url}:${queryString}`).digest('hex');
    return `api:${hash}`;
  };

  // Helper to check if route should be cached
  const shouldCache = (ctx) => {
    // Only cache GET requests
    if (ctx.method !== 'GET') return false;

    // Check if route is excluded
    if (config.excludePaths?.some(pattern => {
      const regex = new RegExp(pattern.replace('*', '.*'));
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

  return async (ctx, next) => {
    // Skip if caching is disabled or shouldn't cache this request
    if (!config.enabled || !shouldCache(ctx)) {
      return next();
    }

    const cacheKey = generateCacheKey(ctx);
    
    try {
      // Try to get from cache
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        const { body, headers, status } = JSON.parse(cached);
        
        // Set cached response
        ctx.body = body;
        ctx.status = status || 200;
        
        // Set cache headers
        ctx.set('X-Cache', 'HIT');
        ctx.set('X-Cache-Key', cacheKey);
        
        // Restore original headers
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            if (!['x-cache', 'x-cache-key'].includes(key.toLowerCase())) {
              ctx.set(key, value);
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
      
      // Only cache successful responses
      if (ctx.status >= 200 && ctx.status < 300 && ctx.body) {
        // Determine TTL
        let ttl = config.ttl || 3600;
        
        // Check for model-specific TTL
        const modelMatch = ctx.path.match(/\/api\/([^\/]+)/);
        if (modelMatch && config.models?.[`api::${modelMatch[1]}`]) {
          ttl = config.models[`api::${modelMatch[1]}`].ttl || ttl;
        }
        
        // Prepare cache data
        const cacheData = {
          body: ctx.body,
          headers: ctx.headers,
          status: ctx.status,
          cachedAt: new Date().toISOString(),
        };
        
        // Compress if enabled
        let dataToCache = JSON.stringify(cacheData);
        if (config.compression && dataToCache.length > (config.compressionOptions?.threshold || 1024)) {
          // Compression would be handled by Redis if supported
        }
        
        // Store in cache
        await redis.setex(cacheKey, ttl, dataToCache);
        
        // Set cache headers
        ctx.set('X-Cache', 'MISS');
        ctx.set('X-Cache-TTL', ttl.toString());
        ctx.set('Cache-Control', `public, max-age=${ttl}`);
        
        // Log cache miss
        if (config.monitoring?.logMisses) {
          strapi.log.debug(`Cache MISS: ${ctx.path} (cached for ${ttl}s)`);
        }
      }
    } catch (error) {
      // Log error but don't fail the request
      strapi.log.error('Cache middleware error:', error);
      
      // Continue without caching
      if (!ctx.body) {
        await next();
      }
    }
  };
};