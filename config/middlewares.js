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
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'dl.airtable.com', 'image-artedusa.s3.rbx.io.cloud.ovh.net', process.env.STRAPI_UPLOAD_BASE_URL],
          'media-src': ["'self'", 'data:', 'blob:', 'dl.airtable.com', 'image-artedusa.s3.rbx.io.cloud.ovh.net', process.env.STRAPI_UPLOAD_BASE_URL],
          upgradeInsecureRequests: null,
        },
      },
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
