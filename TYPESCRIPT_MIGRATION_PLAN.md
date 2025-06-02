# 🚀 TypeScript Migration Plan for Strapi Backend

## 📊 Current State Analysis

### Project Status
- **Strapi Version**: 4.25.11
- **Current Language**: JavaScript
- **Type Checking**: Basic via jsconfig.json
- **TypeScript Status**: Not configured
- **Custom Code**: 30+ API modules with controllers, services, routes
- **Middlewares**: 4 custom global middlewares

### Code Inventory
- **API Modules**: 30+ (cart, order, artists-work, etc.)
- **Custom Middlewares**: 4 (apiCache, compression, rateLimiter, requestLogger)
- **Extensions**: users-permissions customization
- **Utils**: 8 utility modules

## 🎯 Migration Strategy

### Phase 1: TypeScript Setup (Week 1)
1. **Install Dependencies**
   ```bash
   npm install --save-dev typescript @types/node @types/koa @types/koa__router
   npm install --save-dev @strapi/typescript-utils ts-node
   npm install --save-dev @types/lodash @types/node-cron
   ```

2. **Configure TypeScript**
   - Create tsconfig.json with Strapi-optimized settings
   - Update package.json scripts
   - Configure build process

3. **Setup Type Generation**
   - Configure automatic type generation for content-types
   - Generate initial types from existing schemas

### Phase 2: Core Infrastructure (Week 2)
1. **Migrate Global Middlewares**
   - Convert all 4 middlewares to TypeScript
   - Add proper typing for Koa context
   - Implement error handling types

2. **Create Base Types**
   - API response types
   - Error types
   - Common interfaces
   - Strapi context extensions

3. **Setup Testing Infrastructure**
   - Configure Jest for TypeScript
   - Add type checking to CI/CD

### Phase 3: API Migration (Weeks 3-4)
1. **Priority 1: E-commerce Core**
   - cart & cart-item
   - order & ordered-item
   - payment & stripe integration
   - artists-work (products)

2. **Priority 2: User Management**
   - users-permissions extension
   - address
   - wishlist

3. **Priority 3: Content APIs**
   - Remaining content-types
   - Page-related APIs

### Phase 4: Advanced Types (Week 5)
1. **Database Types**
   - Query builder types
   - Relationship types
   - Population types

2. **Plugin Types**
   - Upload provider types
   - Email provider types
   - Custom plugin interfaces

## 🛠️ Implementation Details

### 1. TypeScript Configuration

```typescript
// tsconfig.json
{
  "extends": "@strapi/typescript-utils/tsconfigs/server",
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./",
    "baseUrl": "./",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "./src/**/*.ts",
    "./src/**/*.js",
    "./config/**/*.ts",
    "./config/**/*.js",
    "./database/**/*.ts",
    "./database/**/*.js"
  ],
  "exclude": [
    "node_modules",
    "build",
    "dist",
    ".cache",
    ".tmp",
    "src/admin",
    "src/plugins/**/admin",
    "**/*.test.ts"
  ]
}
```

### 2. Package.json Updates

```json
{
  "scripts": {
    "develop": "strapi develop",
    "start": "strapi start",
    "build": "strapi build",
    "build:ts": "tsc",
    "type-check": "tsc --noEmit",
    "strapi": "strapi",
    "generate:types": "strapi ts:generate-types",
    "watch:types": "strapi ts:generate-types --watch"
  }
}
```

### 3. Base Type Definitions

```typescript
// src/types/index.ts
import { Strapi } from '@strapi/strapi';

export interface ApiResponse<T = any> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface ApiError {
  error: {
    status: number;
    name: string;
    message: string;
    details?: any;
  };
}

// src/types/context.ts
import { Context } from 'koa';
import { Strapi } from '@strapi/strapi';

export interface StrapiContext extends Context {
  strapi: Strapi;
  state: {
    user?: any;
    auth?: any;
  };
}
```

### 4. Migration Examples

#### Controller Migration

```typescript
// Before: src/api/cart/controllers/cart.js
module.exports = createCoreController('api::cart.cart', ({ strapi }) => ({
  async calculateTotal(ctx) {
    const cartId = ctx.params.id;
    const total = await strapi.service('api::cart.cart').calculateTotal(cartId);
    ctx.body = { total };
  }
}));

// After: src/api/cart/controllers/cart.ts
import { factories } from '@strapi/strapi';
import { StrapiContext } from '@/types/context';

export default factories.createCoreController('api::cart.cart', ({ strapi }) => ({
  async calculateTotal(ctx: StrapiContext) {
    const cartId = ctx.params.id as string;
    const total = await strapi.service('api::cart.cart').calculateTotal(cartId);
    ctx.body = { data: { total } };
  }
}));
```

#### Service Migration

```typescript
// After: src/api/cart/services/cart.ts
import { factories } from '@strapi/strapi';
import { Cart, CartItem } from '@/types/generated/contentTypes';

export default factories.createCoreService('api::cart.cart', ({ strapi }) => ({
  async calculateTotal(cartId: string): Promise<number> {
    const cart = await strapi.documents('api::cart.cart').findOne({
      documentId: cartId,
      populate: {
        cart_items: {
          populate: ['art', 'paper_type']
        }
      }
    }) as Cart;

    if (!cart?.cart_items) return 0;

    return cart.cart_items.reduce((total: number, item: CartItem) => {
      return total + (item.quantity * item.price);
    }, 0);
  }
}));
```

#### Middleware Migration

```typescript
// After: src/middlewares/rateLimiter.ts
import { Strapi } from '@strapi/strapi';
import { Context, Next } from 'koa';
import rateLimit from 'express-rate-limit';

export default (config: any, { strapi }: { strapi: Strapi }) => {
  const limiter = rateLimit({
    windowMs: config.windowMs || 15 * 60 * 1000,
    max: config.max || 100,
    message: config.message || 'Too many requests',
    standardHeaders: true,
    legacyHeaders: false,
  });

  return async (ctx: Context, next: Next) => {
    try {
      await new Promise((resolve, reject) => {
        limiter(ctx.req, ctx.res, (err?: any) => {
          if (err) reject(err);
          else resolve(undefined);
        });
      });
      await next();
    } catch (err) {
      ctx.status = 429;
      ctx.body = { error: 'Too many requests' };
    }
  };
};
```

## 📋 Migration Checklist

### Pre-Migration
- [ ] Backup current codebase
- [ ] Create migration branch
- [ ] Document current API endpoints
- [ ] Inventory all custom code

### Phase 1 Checklist
- [ ] Install TypeScript dependencies
- [ ] Create tsconfig.json
- [ ] Update package.json scripts
- [ ] Generate initial types
- [ ] Setup type checking in CI

### Phase 2 Checklist
- [ ] Migrate rateLimiter middleware
- [ ] Migrate compression middleware
- [ ] Migrate apiCache middleware
- [ ] Migrate requestLogger middleware
- [ ] Create base type definitions
- [ ] Setup error types

### Phase 3 Checklist
- [ ] Migrate cart API
- [ ] Migrate order API
- [ ] Migrate payment/stripe API
- [ ] Migrate artists-work API
- [ ] Migrate user extensions
- [ ] Migrate remaining APIs

### Phase 4 Checklist
- [ ] Add advanced query types
- [ ] Implement relationship types
- [ ] Add plugin interface types
- [ ] Complete documentation

## 🚨 Risk Mitigation

### Potential Issues
1. **Type Generation Conflicts**
   - Solution: Use namespace isolation
   - Fallback: Manual type definitions

2. **Third-party Plugin Compatibility**
   - Solution: Create type declarations
   - Fallback: Use 'any' with // @ts-expect-error

3. **Build Time Increase**
   - Solution: Use incremental compilation
   - Fallback: Parallel build processes

4. **Runtime Errors**
   - Solution: Comprehensive testing
   - Fallback: Gradual rollout

## 📈 Benefits

### Immediate Benefits
- ✅ Catch errors at compile time
- ✅ Better IDE support and autocomplete
- ✅ Self-documenting code
- ✅ Easier refactoring

### Long-term Benefits
- ✅ Reduced runtime errors
- ✅ Faster onboarding for new developers
- ✅ Better maintainability
- ✅ Preparation for Strapi v5

## 🎯 Success Metrics

- **Type Coverage**: >95% of custom code
- **Build Time**: <2 minutes
- **Zero Runtime Type Errors**
- **100% API Compatibility**

## 📚 Resources

- [Strapi TypeScript Documentation](https://docs.strapi.io/dev-docs/typescript)
- [Generated Types Documentation](https://docs.strapi.io/dev-docs/typescript#generate-typings-for-project-schemas)
- [Koa TypeScript Guide](https://github.com/koajs/koa/blob/master/docs/guide.md)

---

**Timeline**: 5 weeks
**Effort**: ~120 hours
**Priority**: High
**ROI**: Significant reduction in bugs and development time