# CLAUDE-STRAPI.md

This file provides Strapi 4 backend-specific guidance for working with this art e-commerce platform.

## STRAPI 4.25.11 BACKEND ARCHITECTURE

### Core Content-Types Structure

#### E-commerce Collections
```
src/api/
├── artists-work/        # Main artwork catalog
├── artist/             # Artist profiles & commission rates
├── cart/ + cart-item/  # Shopping cart system
├── order/ + ordered-item/  # Order management
├── paper-type/         # Print material options
├── productsheet1/      # Detailed product sheets
├── wishlist/          # User wishlist functionality
└── favorite/          # User favorites (legacy)
```

#### User & Content Management
```
├── address/           # Shipping addresses
├── homepage/          # CMS homepage content
├── sign-in-page/      # Auth page content
├── sign-up-page/      # Registration page content
├── onboarding/        # User onboarding flows
├── activitiestimeline/ # Activity tracking
├── timeline1/         # Timeline components
├── list-collection/   # Curated collections
└── nos-auteur/        # Featured authors
```

### Custom Middleware Stack

#### Performance & Caching
```javascript
// src/middlewares/apiCache.js - Redis caching
{
  redis: 'ioredis',
  keyPrefix: 'strapi_cache_',
  ttl: 3600, // 1 hour default
  models: {
    'api::artists-work': { ttl: 1800 },
    'api::artist': { ttl: 3600 }
  }
}

// src/middlewares/compression.js - Response compression
// src/middlewares/rateLimiter.js - API rate limiting
// src/middlewares/requestLogger.js - Structured logging
```

### Payment Integration (Stripe)

#### Controller Implementation
```javascript
// src/api/stripe/controllers/stripe.js
{
  createPaymentIntent: {
    currency: 'EUR',
    key: 'STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY',
    validation: 'amount > 0',
    metadata: { source: 'strapi_backend' }
  }
}
```

#### Custom Order Flow
```javascript
// Artist commission splits
// Platform rate: 5%
// Stripe fee: 2.9%
// Artist receives: ~92.1%
```

### Database Configuration

#### PostgreSQL Setup
```javascript
// config/env/production/database.js
{
  client: 'postgres',
  connection: {
    host: env('DATABASE_HOST'),
    port: 5432,
    database: 'strapi_conscience_prod',
    ssl: true
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000
  }
}
```

### Production Configuration

#### PM2 Ecosystem
```javascript
// ecosystem.config.js
{
  name: 'artedusa-strapi',
  instances: 2,
  exec_mode: 'cluster',
  max_memory_restart: '1G',
  env_production: {
    NODE_ENV: 'production',
    PORT: 1337
  }
}
```

### Essential Commands

#### Development Workflow
```bash
npm run develop               # Hot reload dev server
npm run strapi console       # Interactive Strapi console
npm run strapi generate:api  # Create new content-type
DEBUG=strapi:* npm run develop  # Verbose logging
```

#### Production Deployment
```bash
npm ci --production          # Install prod dependencies
NODE_ENV=production npm run build  # Build admin
pm2 start ecosystem.config.js --env production
pm2 save && pm2 startup      # Auto-restart on boot
```

#### Database Operations
```bash
npm run strapi migration:run    # Run migrations
npm run strapi db:seed         # Seed database
npm run strapi export          # Export data
npm run strapi import          # Import data
```

### Performance Optimizations

#### Redis Caching Strategy
```javascript
const cacheRules = {
  'GET /api/artists-work': '30m',      // Artwork catalog
  'GET /api/artist': '1h',             // Artist profiles  
  'GET /api/paper-type': '24h',        # Static data
  'GET /api/homepage': '15m',          # Homepage content
  'POST /api/*': 'no-cache'            # Never cache mutations
};
```

#### Image Handling
- **Storage**: OVH S3 bucket `image-artedusa`
- **Processing**: Sharp for resizing/optimization
- **CDN**: S3 endpoint with caching headers
- **Formats**: Support for multiple sizes/formats

### Security Configuration

#### CORS & Headers
```javascript
// config/middlewares.js
{
  'strapi::cors': {
    origin: ['http://localhost:3000', 'https://artedusa.com'],
    credentials: true
  },
  'strapi::security': {
    contentSecurityPolicy: {
      'img-src': ['self', 'data:', 'blob:', 'image-artedusa.s3.rbx.io.cloud.ovh.net']
    }
  }
}
```

#### Rate Limiting
```javascript
// Production rate limits
{
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 1000,                 // requests per window
  skipSuccessfulRequests: false
}
```

### Content-Type Relationships

#### Core E-commerce Flow
```
Artist (1) → (n) ArtistsWork
ArtistsWork (n) → (n) CartItem
CartItem (n) → (1) Cart → (1) User
Cart → Order → OrderedItem
Artist → Address (shipping)
ArtistsWork → PaperType (print options)
```

#### Component Architecture
```javascript
// Reusable components in src/components/
{
  'shared.seo': 'SEO metadata',
  'shared.dimensions': 'Artwork dimensions', 
  'cartproductcard': 'Cart UI component',
  'productcard': 'Product display',
  'header/footer': 'Layout components'
}
```

### Debugging & Monitoring

#### Log Analysis
```bash
# PM2 logs
pm2 logs artedusa-strapi --lines 100

# Error tracking
tail -f /var/log/pm2/artedusa-strapi-error.log

# Performance monitoring
pm2 monit
```

#### Health Checks
```bash
# API health
curl http://localhost:1337/_health

# Database connection
npm run strapi console
> strapi.db.connection.raw('SELECT 1')

# Redis connection  
redis-cli ping
```

### Common Issues & Solutions

#### Build Problems
```bash
# Clear Strapi cache
rm -rf .cache build .tmp
npm run build
```

#### Database Issues
```bash
# Reset migrations
npm run strapi migration:reset
npm run strapi migration:run
```

#### Redis Issues
```bash
# Clear cache
redis-cli FLUSHALL
# Or specific prefix
redis-cli --scan --pattern "strapi_cache_*" | xargs redis-cli DEL
```

### API Testing

#### Endpoints Testing
```bash
# Create payment intent
curl -X POST http://localhost:1337/api/stripe/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{"amount": 99.99}'

# Get artworks
curl "http://localhost:1337/api/artists-works?populate=*"

# Auth test
curl -X POST http://localhost:1337/api/auth/local \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@test.com","password":"password"}'
```

### Environment Variables

#### Critical Configuration
```bash
# Database
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=strapi_conscience
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=strapi123

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Stripe
STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY=sk_test_...

# JWT
JWT_SECRET=<64-char-secret>
ADMIN_JWT_SECRET=<64-char-secret>

# OVH S3
OVH_ACCESS_KEY=
OVH_SECRET_KEY=
OVH_BUCKET=image-artedusa
OVH_ENDPOINT=s3.rbx.io.cloud.ovh.net
```

### Migration Notes

#### From Strapi v4 to v5 (Future)
- Entity Service API → Document Service API
- `data.attributes` → flat structure
- `id` → `documentId` 
- Built-in draft/publish system
- TypeScript-first approach
- Performance improvements with Vite