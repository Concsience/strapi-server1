module.exports = [
  'strapi::logger',
  'strapi::errors',
  'global::healthCheck',
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
            'https://*.stripe.com'
          ],
          'media-src': [
            "'self'", 
            'data:', 
            'blob:', 
            'dl.airtable.com', 
            'image-artedusa.s3.rbx.io.cloud.ovh.net'
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
      headers: '*',
      origin: ['http://localhost:3000', 'http://localhost:1337', 'https://artedusa.com', 'https://staging-strapi.artedusa.com'],
    }
  },
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'global::jsonErrorHandler',
    config: {
      enabled: true
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
];
