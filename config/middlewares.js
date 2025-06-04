module.exports = [
  'strapi::logger',
  {
    name: 'global::requestLogger',
    config: {
      enabled: true,
      monitoring: {
        logHits: true,
        logMisses: true,
      }
    }
  },
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          'style-src': ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
          'font-src': ["'self'", 'fonts.gstatic.com', 'data:'],
          'connect-src': ["'self'", 'https:', 'wss:', 'ws:'],
          'img-src': [
            "'self'", 
            'data:', 
            'blob:', 
            'dl.airtable.com', 
            'image-artedusa.s3.rbx.io.cloud.ovh.net',
            process.env.STRAPI_UPLOAD_BASE_URL,
            'https://*.stripe.com'
          ],
          'media-src': [
            "'self'", 
            'data:', 
            'blob:', 
            'dl.airtable.com', 
            'image-artedusa.s3.rbx.io.cloud.ovh.net',
            process.env.STRAPI_UPLOAD_BASE_URL
          ],
          'frame-src': ["'self'", 'https://*.stripe.com'],
          'frame-ancestors': ["'none'"],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'manifest-src': ["'self'"],
          'worker-src': ["'self'", 'blob:'],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'deny',
      },
      xssFilter: true,
      noSniff: true,
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      permittedCrossDomainPolicies: false,
    },
  },
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      headers: '*',
      origin: ['http://localhost:3000', 'http://localhost:1337', 'https://artedusa.com', 'https://staging-strapi.artedusa.com'],
    }
  },
  'strapi::poweredBy',
  {
    name: 'global::compression',
    config: {
      enabled: true,
      compressionOptions: {
        threshold: 1024, // Only compress responses larger than 1KB
      }
    }
  },
  'strapi::query',
  {
    name: 'global::rateLimiter',
    config: {
      enabled: true,
      max: 100, // 100 requests
      window: 60000, // per minute
      whitelist: [
        '/api/auth/.*',
        '/_health',
        '/admin/.*'
      ]
    }
  },
  {
    name: 'strapi::body',
    config: {
      enable: true,
      multipart: true,
      formidable: true,
      includeUnparsed: true,
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  {
    name: 'global::apiCache',
    config: {
      enabled: true,
      ttl: 3600, // 1 hour default
      excludePaths: [
        '/api/auth/.*',
        '/api/orders/.*',
        '/api/cart.*',
        '/api/stripe/.*',
        '/admin/.*'
      ],
      models: {
        'api::artists-work': { ttl: 1800 }, // 30 minutes
        'api::artist': { ttl: 3600 }, // 1 hour
        'api::paper-type': { ttl: 86400 }, // 24 hours
      }
    }
  },
];
