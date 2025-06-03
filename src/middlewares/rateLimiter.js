const RateLimiter = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

module.exports = (config, { strapi }) => {
  const redisClient = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 1,
    keyPrefix: 'rate_limit:',
  });

  const limiter = RateLimiter({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rate_limit:',
    }),
    windowMs: config.window || 60000, // 1 minute default
    max: config.max || 100, // 100 requests per window
    message: {
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: config.window / 1000,
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for whitelisted paths
    skip: (req) => {
      if (config.whitelist) {
        return config.whitelist.some(pattern => {
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(req.path);
        });
      }
      return false;
    },
    // Custom key generator (by IP + user ID if authenticated)
    keyGenerator: (req) => {
      const userId = req.state?.user?.id || 'anonymous';
      const ip = req.ip || req.connection.remoteAddress;
      return `${ip}:${userId}`;
    },
    // Handler for when rate limit is exceeded
    handler: async (req, res) => {
      // Log rate limit violations
      strapi.log.warn({
        message: 'Rate limit exceeded',
        ip: req.ip,
        path: req.path,
        userId: req.state?.user?.id,
      });

      res.status(429).send({
        error: {
          status: 429,
          name: 'RateLimitError',
          message: 'Too many requests, please try again later.',
          details: {
            limit: config.max,
            window: `${config.window / 1000} seconds`,
            retryAfter: new Date(Date.now() + config.window).toISOString(),
          },
        },
      });
    },
  });

  return async (ctx, next) => {
    // Convert Koa context to Express-like req/res for rate limiter
    const req = ctx.request;
    const res = ctx.response;
    
    req.ip = ctx.ip;
    req.path = ctx.path;
    req.state = ctx.state;
    
    await new Promise((resolve, reject) => {
      limiter(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await next();
  };
};