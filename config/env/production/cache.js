module.exports = ({ env }) => ({
  enabled: true,
  type: 'redis',
  // Redis Connection Configuration
  redis: {
    host: env('REDIS_HOST', '127.0.0.1'),
    port: env.int('REDIS_PORT', 6379),
    password: env('REDIS_PASSWORD'),
    db: env.int('REDIS_DB', 0),
    keyPrefix: env('REDIS_KEY_PREFIX', 'strapi_cache_'),
    // Connection Options
    lazyConnect: true,
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    // Connection Pool
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,
  },
  // Cache Settings
  ttl: env.int('CACHE_TTL', 3600), // 1 hour default
  max: env.int('CACHE_MAX_SIZE', 1000), // Max items in cache
  // Cache Key Settings
  generateKey: (ctx) => {
    // Generate cache key based on URL and query params
    const { url, query } = ctx.request;
    const queryString = Object.keys(query).sort().map(key => `${key}=${query[key]}`).join('&');
    return `${url}${queryString ? `?${queryString}` : ''}`;
  },
  // Cache Rules
  models: {
    // Cache specific models with custom TTL
    'api::artists-work': {
      ttl: 7200, // 2 hours for art products
      maxAge: 7200,
    },
    'api::artist': {
      ttl: 86400, // 24 hours for artist profiles
      maxAge: 86400,
    },
    'api::productsheet1': {
      ttl: 3600, // 1 hour for product sheets
      maxAge: 3600,
    },
    'api::homepage': {
      ttl: 1800, // 30 minutes for homepage content
      maxAge: 1800,
    },
  },
  // Exclude specific routes from caching
  excludedRoutes: [
    '/api/auth/*',
    '/api/users/*',
    '/api/orders/*',
    '/api/cart*',
    '/api/stripe/*',
    '/api/upload',
    '/admin/*',
  ],
  // Cache invalidation patterns
  invalidateOnUpdate: true,
  invalidateOnCreate: true,
  invalidateOnDelete: true,
  // Performance settings
  compression: true,
  compressionOptions: {
    threshold: 1024, // Compress if larger than 1KB
  },
  // Cache warming
  warmup: {
    enabled: true,
    routes: [
      '/api/artists-work',
      '/api/artist',
      '/api/homepage',
      '/api/productsheet1',
    ],
    interval: 3600000, // Warm cache every hour
  },
  // Monitoring
  monitoring: {
    enabled: true,
    logHits: false,
    logMisses: true,
    alertOnHighMissRate: true,
    missRateThreshold: 0.5,
  },
});