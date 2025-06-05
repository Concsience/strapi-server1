# 🚀 STRAPI 5 MIGRATION PLAN

## 📅 Migration Overview
- **Current Version**: Strapi 4.25.11
- **Target Version**: Strapi 5.x
- **Project**: ArtEdusa E-commerce Backend
- **Database**: PostgreSQL (strapi_conscience)
- **Migration Date**: 2025-06-03

## ✅ Pre-Migration Checklist
- [x] Backup code (git tag: pre-v5-migration)
- [ ] Backup database
- [ ] Document current API endpoints
- [ ] Notify frontend team about breaking changes

## 🔄 Breaking Changes to Address

### 1. **Entity Service → Document Service**
Files requiring updates:
- `src/api/cart/controllers/cart.ts` (lines 85, 98)
- `src/api/payment/controllers/payment.js`
- `src/api/image-import/controllers/image-import.js`
- `src/utils/uploadImageFromUrl.js`
- `src/utils/uploadTiles.js`
- `src/cron/index.js`

### 2. **Response Format Changes**
- Remove `attributes` wrapper from all API responses
- Change `id` to `documentId` in all references
- Update `publicationState` to `status`

### 3. **Database Changes**
- SQLite → better-sqlite3 (not applicable - using PostgreSQL)
- MySQL 5 → MySQL 8+ (not applicable - using PostgreSQL)

### 4. **Dependencies to Update**
```json
{
  "@strapi/strapi": "5.x",
  "@strapi/plugin-cloud": "5.x",
  "@strapi/plugin-i18n": "5.x",
  "@strapi/plugin-users-permissions": "5.x"
}
```

## 📋 Migration Steps

### Phase 1: Preparation
1. **Backup Database**
   ```bash
   pg_dump -U strapi -h localhost strapi_conscience > backup_$(date +%Y%m%d).sql
   ```

2. **Create Migration Branch**
   ```bash
   git checkout -b feature/strapi-5-migration
   ```

### Phase 2: Run Upgrade Tool
```bash
npx @strapi/upgrade major
```

### Phase 3: Manual Updates

#### 3.1 Update Entity Service Calls
```typescript
// Before (Strapi 4)
const cart = await strapi.entityService.findOne('api::cart.cart', cartId, {
  populate: { cart_items: true }
});

// After (Strapi 5)
const cart = await strapi.documents('api::cart.cart').findOne({
  documentId: cartId,
  populate: { cart_items: true }
});
```

#### 3.2 Update Controllers
Key controllers to update:
- Cart management
- Order processing
- Stripe payments
- User authentication

#### 3.3 Update TypeScript Types
- Install new types: `@strapi/types@5.x`
- Update custom type definitions
- Fix Document Service interfaces

### Phase 4: Testing

1. **Unit Tests**
   - Test all custom controllers
   - Verify middleware functionality
   - Check service layer

2. **Integration Tests**
   - Cart operations
   - Order creation
   - Payment processing
   - User authentication

3. **API Testing**
   - Verify response format changes
   - Test pagination
   - Check filtering and sorting

### Phase 5: Frontend Updates
- Update API client to handle new response format
- Change `id` references to `documentId`
- Remove `attributes` destructuring

## 🚨 Critical Areas

### 1. **E-commerce Flow**
- Cart → Cart Items relationships
- Order → Ordered Items relationships
- Stripe webhook handling

### 2. **Authentication**
- JWT token handling
- User permissions
- Protected routes

### 3. **File Uploads**
- OVH S3 integration
- Image processing
- Upload permissions

## 📊 Rollback Plan

If issues arise:
1. Restore database: `psql -U strapi strapi_conscience < backup_YYYYMMDD.sql`
2. Checkout previous version: `git checkout pre-v5-migration`
3. Reinstall dependencies: `npm ci`
4. Restart services

## 🎯 Success Criteria

- [ ] All API endpoints functional
- [ ] No TypeScript errors
- [ ] All tests passing
- [ ] Frontend integration working
- [ ] Performance metrics maintained
- [ ] Zero data loss

## 📝 Post-Migration Tasks

1. Update documentation
2. Performance benchmarking
3. Monitor error logs
4. Update CI/CD pipelines
5. Team training on new features

---

**Note**: This is a living document. Update as migration progresses.