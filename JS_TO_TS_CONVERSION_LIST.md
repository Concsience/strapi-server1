# JavaScript to TypeScript Conversion List

## Summary

Total JavaScript files found (excluding scraping): **67 files**
- Files with duplicate TypeScript versions: **2 files** (need deletion)
- Files needing conversion: **65 files**
- High priority (with business logic): **5 files**
- Medium priority (default implementations): **60 files**

## IMMEDIATE ACTIONS REQUIRED

### 1. Delete Duplicate JavaScript Files (TypeScript versions already exist)
```bash
# These files have TypeScript equivalents and should be deleted
rm src/api/order/controllers/order.js
rm src/api/image-import/controllers/image-import.js
```

### 2. High Priority Conversions (Files with actual business logic)

#### Payment API
- `src/api/payment/routes/payment.js` → Convert to TypeScript
- `src/api/payment/services/payment.js` → Convert to TypeScript
  
#### Image Import API  
- `src/api/image-import/routes/image-import.js` → Convert to TypeScript
- `src/api/image-import/services/image-import.js` → Convert to TypeScript

### 3. Medium Priority Conversions (Default implementations)

These files use default Strapi factories but should be converted for consistency:

#### Content Type APIs (21 APIs × 3 files each = 63 files)
- activitiestimeline (controllers, routes, services)
- authorbook (routes, services only - controller already TS)
- cart (services only - controllers/routes already TS)
- five-art-page (controllers, routes, services)
- help-page (controllers, routes, services)
- homepage (routes, services only - controller already TS)
- image-job (controllers, routes, services)
- image-metadata (controllers, routes, services)
- list-collection (controllers, routes, services)
- nos-auteur (controllers, routes, services)
- onboarding (controllers, routes, services)
- product-sheet-page (controllers, routes, services)
- pyramid-level (controllers, routes, services)
- seven-art-page (controllers, routes, services)
- sign-in-page (controllers, routes, services)
- sign-up-page (controllers, routes, services)
- three-art-page (controllers, routes, services)
- tile-info (controllers, routes, services)
- tile (controllers, routes, services)
- timeline-7-art (controllers, routes, services)
- timeline1 (controllers, routes, services)

### 4. Low Priority (Can be ignored)
- `src/api/stripe_backup_disabled/*` - Backup files, not in use
- `src/api/upload/routes/upload.js` - Empty file

## Conversion Strategy

### Phase 1: Critical Path (Do immediately)
1. Delete the 2 duplicate JS files
2. Convert payment routes & services (2 files)
3. Convert image-import routes & services (2 files)

### Phase 2: Batch Conversion (Can be automated)
Convert all default implementation files using a script since they follow the same pattern:

```typescript
// Example conversion pattern for controllers
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::[name].[name]');
```

```typescript
// Example conversion pattern for services
import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::[name].[name]');
```

```typescript
// Example conversion pattern for routes
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::[name].[name]');
```

## Build Impact

The TypeScript compilation is likely failing because:
1. Mixed JS/TS files in the same project
2. Duplicate files (both .js and .ts versions)
3. Missing type definitions for some modules

Completing Phase 1 should resolve most build issues.