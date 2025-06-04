module.exports = ({ env }) => [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'image-artedusa.s3.rbx.io.cloud.ovh.net', env('CDN_URL', 'https://cdn.artedusa.com')],
          'media-src': ["'self'", 'data:', 'blob:', 'image-artedusa.s3.rbx.io.cloud.ovh.net', env('CDN_URL', 'https://cdn.artedusa.com')],
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'font-src': ["'self'"],
          'frame-ancestors': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
        },
      },
      // Security Headers
      frameguard: {
        action: 'deny',
      },
      hsts: {
        enabled: env.bool('SECURITY_HSTS_ENABLED', true),
        maxAge: env.int('SECURITY_HSTS_MAX_AGE', 31536000),
        includeSubDomains: env.bool('SECURITY_HSTS_INCLUDE_SUBDOMAINS', true),
        preload: env.bool('SECURITY_HSTS_PRELOAD', true),
      },
      xssFilter: env.bool('SECURITY_BROWSER_XSS_FILTER', true),
      noSniff: env.bool('SECURITY_CONTENT_TYPE_NOSNIFF', true),
      noOpen: true,
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      enabled: env.bool('CORS_ENABLED', true),
      origin: env.array('CORS_ORIGIN', ['https://artedusa.com', 'https://www.artedusa.com']),
      credentials: env.bool('CORS_CREDENTIALS', true),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
      maxAge: 86400,
    },
  },
  {
    name: 'strapi::poweredBy',
    config: {
      enabled: false, // Hide X-Powered-By header
    },
  },
  {
    name: 'strapi::query',
    config: {
      settings: {
        defaultLimit: env.int('API_REST_DEFAULT_LIMIT', 25),
        maxLimit: env.int('API_REST_MAX_LIMIT', 100),
      },
    },
  },
  {
    name: 'strapi::body',
    config: {
      jsonLimit: '10mb',
      textLimit: '10mb',
      formLimit: '10mb',
      encoding: 'utf-8',
    },
  },
  'strapi::session',
  'strapi::favicon',
  {
    name: 'strapi::public',
    config: {
      defaultIndex: false,
      maxAge: env.int('STATIC_FILES_MAX_AGE', 31536000),
    },
  },
  // Rate Limiting
  {
    name: 'global::rateLimiter',
    config: {
      enabled: true,
      max: env.int('RATE_LIMIT_MAX', 100),
      window: env.int('RATE_LIMIT_WINDOW', 60000),
      delay: env.int('RATE_LIMIT_DELAY', 1000),
      skipSuccessfulRequests: env.bool('RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS', false),
      skipFailedRequests: env.bool('RATE_LIMIT_SKIP_FAILED_REQUESTS', false),
      // Whitelist admin and webhook endpoints
      whitelist: [
        '/admin/*',
        '/api/stripe/webhook',
        '/_health',
      ],
    },
  },
  // Response Compression
  {
    name: 'global::compression',
    config: {
      enabled: env.bool('API_RESPONSE_COMPRESSION', true),
      br: true,
      gzip: true,
      deflate: true,
    },
  },
  // Request Logging
  {
    name: 'global::requestLogger',
    config: {
      enabled: true,
      excludePaths: [
        '/_health',
        '/admin/_health',
        '/favicon.ico',
        '/robots.txt',
      ],
      includeResponseTime: true,
      includeRequestId: true,
    },
  },
  // API Cache
  {
    name: 'global::apiCache',
    config: {
      enabled: env.bool('API_REST_CACHE_ENABLED', true),
      ttl: env.int('API_REST_CACHE_TTL', 3600),
      max: env.int('API_REST_CACHE_MAX_SIZE', 500),
      excludePaths: [
        '/api/auth/*',
        '/api/users/*',
        '/api/orders/*',
        '/api/cart*',
        '/api/stripe/*',
      ],
    },
  },
];