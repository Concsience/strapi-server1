# ✅ Strapi 5 Migration Checklist

## 🔧 Pre-Migration Setup

### Environment Preparation
- [x] Database backup created (`database_backup_20250603_161240.sql`)
- [x] Git backup created (tag: `pre-v5-migration`)
- [ ] Clean npm environment
  ```bash
  rm -rf node_modules package-lock.json
  npm cache clean --force
  ```
- [ ] Update to Strapi 4.25.22
  ```bash
  npm install
  npm run build
  ```

## 🚀 Migration Process

### Step 1: Run Upgrade Tool
- [ ] Execute upgrade command
  ```bash
  npx @strapi/upgrade major
  ```
- [ ] Review codemod changes
- [ ] Check for `__TODO__` comments

### Step 2: Manual Code Updates

#### Controllers (Entity Service → Document Service)
- [ ] **Cart Controller** (`src/api/cart/controllers/cart.ts`)
  - [ ] Replace with `src/migrations/cart-controller-v5.ts`
  - [ ] Update imports
  - [ ] Test all methods

- [ ] **Payment Controller** (`src/api/payment/controllers/payment.js`)
  - [ ] Replace with `src/migrations/payment-controller-v5.js`
  - [ ] Update routes if needed
  - [ ] Test Stripe integration

- [ ] **Order Controller** (`src/api/order/controllers/order.ts`)
  - [ ] Update Entity Service calls
  - [ ] Fix webhook handler
  - [ ] Test order creation

- [ ] **Image Import Controller** (`src/api/image-import/controllers/image-import.js`)
  - [ ] Update findMany calls
  - [ ] Update create calls
  - [ ] Test batch operations

#### Utilities
- [ ] **uploadImageFromUrl.js**
  - [ ] Replace entityService.create with documents().create
  - [ ] Test image upload

- [ ] **uploadTiles.js**
  - [ ] Update all Entity Service calls
  - [ ] Test tile generation

#### Cron Jobs
- [ ] **src/cron/index.js**
  - [ ] Update job queries
  - [ ] Test cron execution

### Step 3: TypeScript Updates

#### Update Type Definitions
- [ ] Create new types file:
```typescript
// src/types/strapi-v5.d.ts
interface StrapiDocumentResponse<T> {
  documentId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  locale?: string;
} & T;

interface StrapiCollectionResponse<T> {
  data: StrapiDocumentResponse<T>[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}
```

#### Update Controller Types
- [ ] Update all controller response types
- [ ] Fix relation type definitions
- [ ] Update service layer types

### Step 4: Middleware Updates
- [ ] Test `requestLogger.ts`
- [ ] Test `compression.ts`
- [ ] Test `rateLimiter.ts`
- [ ] Test `apiCache.ts`

### Step 5: Configuration Updates
- [ ] Update `config/server.js` for v5
- [ ] Update `config/middlewares.js`
- [ ] Update plugin configurations
- [ ] Test environment variables

## 🧪 Testing Phase

### API Testing
- [ ] **Authentication**
  - [ ] User login
  - [ ] User registration
  - [ ] JWT validation

- [ ] **Cart Operations**
  - [ ] Get cart
  - [ ] Add item
  - [ ] Update quantity
  - [ ] Remove item
  - [ ] Clear cart

- [ ] **Order Management**
  - [ ] Create order
  - [ ] List orders
  - [ ] Get order details
  - [ ] Update order status

- [ ] **Payment Processing**
  - [ ] Create setup intent
  - [ ] Create payment intent
  - [ ] Confirm payment
  - [ ] Webhook handling

- [ ] **Content Management**
  - [ ] Artist CRUD
  - [ ] Artwork CRUD
  - [ ] File uploads

### Performance Testing
- [ ] API response times
- [ ] Database query optimization
- [ ] Memory usage
- [ ] Concurrent user handling

### Security Testing
- [ ] Authentication flows
- [ ] Authorization checks
- [ ] Input validation
- [ ] SQL injection prevention

## 📱 Frontend Updates

### Response Format Changes
- [ ] Remove `attributes` destructuring
- [ ] Update `id` to `documentId`
- [ ] Update type interfaces
- [ ] Test all API calls

### Compatibility Mode
- [ ] Add header for gradual migration:
```javascript
headers: {
  'Strapi-Response-Format': 'v4'
}
```

## 🚨 Rollback Plan

If critical issues occur:
1. [ ] Stop Strapi server
2. [ ] Restore database:
   ```bash
   psql -U strapi strapi_conscience < database_backup_20250603_161240.sql
   ```
3. [ ] Checkout pre-migration code:
   ```bash
   git checkout pre-v5-migration
   ```
4. [ ] Reinstall v4 dependencies:
   ```bash
   npm ci
   ```

## 📊 Post-Migration

### Documentation
- [ ] Update API documentation
- [ ] Update deployment guides
- [ ] Update developer onboarding

### Monitoring
- [ ] Set up error tracking
- [ ] Monitor performance metrics
- [ ] Track API usage patterns
- [ ] Review security logs

### Team Communication
- [ ] Notify frontend team
- [ ] Update deployment team
- [ ] Schedule training session
- [ ] Create troubleshooting guide

## ✅ Sign-off Criteria

- [ ] All tests passing
- [ ] Zero TypeScript errors
- [ ] API performance maintained
- [ ] Frontend working correctly
- [ ] Payment processing functional
- [ ] File uploads working
- [ ] Admin panel accessible
- [ ] Production deployment ready

---

**Migration Status**: 🔄 In Progress

**Last Updated**: 2025-06-03

**Responsible**: Development Team