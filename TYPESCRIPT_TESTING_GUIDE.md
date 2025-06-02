# 🧪 TypeScript Migration Testing Guide

## Critical: Test Everything Before PR

This guide ensures the TypeScript migration introduces **zero bugs** and maintains 100% backward compatibility.

## 🔴 Pre-PR Checklist (MUST COMPLETE ALL)

### 1. **Environment Setup Tests**
```bash
# Test 1: Verify TypeScript files don't break startup
NODE_ENV=development npm run develop
# Expected: Strapi starts normally, no TypeScript errors

# Test 2: Check production mode
NODE_ENV=production npm run build
NODE_ENV=production npm run start
# Expected: Builds and starts without errors

# Test 3: Verify environment validation
unset STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY
npm run develop
# Expected: Warning in dev, but continues. Would fail in production.
```

### 2. **API Endpoint Testing**

#### Stripe Payment Tests
```bash
# Test 1: Create payment intent (original behavior)
curl -X POST http://localhost:1337/api/stripe/create-payment-intent \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "eur", "orderId": "test-123"}'
# Expected: Same response as before migration

# Test 2: Test error handling (no amount)
curl -X POST http://localhost:1337/api/stripe/create-payment-intent \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currency": "eur"}'
# Expected: 400 Bad Request with "Valid amount is required"

# Test 3: Test without auth
curl -X POST http://localhost:1337/api/stripe/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'
# Expected: 401 Unauthorized "You are not authorized!"
```

#### Cart API Tests
```bash
# Test 1: Get user cart
curl -X GET http://localhost:1337/api/cart \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Expected: Returns cart or creates new one

# Test 2: Add item to cart
curl -X POST http://localhost:1337/api/cart/items \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"artId": 1, "quantity": 2}'
# Expected: Item added successfully

# Test 3: Update item quantity
curl -X PUT http://localhost:1337/api/cart/items/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 3}'
# Expected: Quantity updated

# Test 4: Remove item
curl -X DELETE http://localhost:1337/api/cart/items/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Expected: Item removed
```

### 3. **Middleware Testing**

#### Rate Limiter Test
```bash
# Test rate limiting
for i in {1..101}; do
  curl -X GET http://localhost:1337/api/artists-work
done
# Expected: After 100 requests, get 429 Too Many Requests
```

#### Cache Middleware Test
```bash
# Test 1: First request (cache miss)
curl -I http://localhost:1337/api/artists-work
# Expected: X-Cache: MISS

# Test 2: Second request (cache hit)
curl -I http://localhost:1337/api/artists-work
# Expected: X-Cache: HIT

# Test 3: Authenticated requests not cached
curl -I http://localhost:1337/api/artists-work \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Expected: No X-Cache header (unless configured to cache auth requests)
```

#### Request Logger Test
```bash
# Check logs for request tracking
tail -f strapi.log | grep request_
# Expected: See request_start and request_complete logs with request IDs
```

### 4. **Type Safety Verification**
```bash
# Run type checking
npm run type-check
# Expected: No errors

# Check for any type errors in watch mode
npm run type-check:watch
# Expected: No errors as you make changes
```

### 5. **Backward Compatibility Tests**

#### JavaScript Interoperability
```javascript
// Test: Can JS files still use the migrated code?
// Create test-compatibility.js
const cartService = strapi.service('api::cart.cart');
console.log(typeof cartService.calculateTotal); // Should work if enhanced

// Original service should still work
const coreCart = require('./src/api/cart/services/cart.js');
console.log(typeof coreCart); // Should be function
```

#### Database Queries
```sql
-- Verify no schema changes
SELECT * FROM information_schema.tables WHERE table_schema = 'public';
-- Expected: Same tables as before

-- Check cart functionality
SELECT * FROM carts WHERE status = 'active' LIMIT 5;
-- Expected: Normal data structure
```

### 6. **Performance Tests**

```bash
# Test 1: Response time comparison
time curl http://localhost:1337/api/artists-work
# Expected: Similar or better than before migration

# Test 2: Memory usage
ps aux | grep node | grep strapi
# Expected: No significant increase in memory usage

# Test 3: Concurrent requests
ab -n 1000 -c 10 http://localhost:1337/api/artists-work
# Expected: Similar performance metrics
```

## 🔍 Deep Testing Scenarios

### Error Path Testing
1. **Missing Environment Variables**
   - Remove each required env var and test startup
   - Verify appropriate errors/warnings

2. **Database Connection Issues**
   - Stop PostgreSQL and test error handling
   - Verify graceful degradation

3. **Redis Unavailable**
   - Stop Redis and test middleware behavior
   - Should continue without caching/rate limiting

4. **Invalid Data Types**
   - Send wrong data types to endpoints
   - Verify validation catches them

### Edge Cases
1. **Mixed ID Types**
   ```bash
   # Test with string ID
   curl -X DELETE http://localhost:1337/api/cart/items/"1"
   
   # Test with number ID
   curl -X DELETE http://localhost:1337/api/cart/items/1
   # Both should work
   ```

2. **Null/Undefined Handling**
   - Test with missing optional fields
   - Test with null values where allowed

3. **Large Payloads**
   - Test with very large cart (100+ items)
   - Test with large payment amounts

## 🚨 Rollback Plan

If ANY test fails:

### Immediate Rollback
```bash
# 1. Stop the server
pm2 stop all

# 2. Remove TypeScript files (keep for reference)
mkdir typescript-backup
mv src/**/*.ts typescript-backup/
mv tsconfig.json typescript-backup/

# 3. Restore package.json
git checkout -- package.json

# 4. Restart with original JS files
npm run develop
```

### Gradual Rollback
For specific issues:
1. Keep TypeScript infrastructure
2. Revert only problematic files to JS
3. Fix issues in isolated environment
4. Re-test thoroughly

## 📋 Final Pre-PR Verification

### Must Pass 100%:
- [ ] All curl tests return expected responses
- [ ] No TypeScript errors in console
- [ ] Original JS files still work
- [ ] No performance degradation
- [ ] All middlewares function correctly
- [ ] Error messages match exactly
- [ ] Status codes unchanged
- [ ] Database queries unaffected
- [ ] Memory usage stable
- [ ] No new npm audit vulnerabilities

### Documentation Check:
- [ ] All new TS files have JSDoc comments
- [ ] Migration plan updated with progress
- [ ] Known issues documented
- [ ] Rollback procedure tested

## 🎯 PR Readiness Criteria

**DO NOT CREATE PR UNTIL:**

1. ✅ All tests pass (100% success rate)
2. ✅ No behavioral changes detected
3. ✅ Performance metrics equal or better
4. ✅ Zero TypeScript errors
5. ✅ Rollback plan tested and working

## 🔬 Production Deployment Testing

Before deploying to production:

1. **Staging Environment**
   ```bash
   # Full test suite on staging
   npm run test:integration
   npm run test:e2e
   ```

2. **Load Testing**
   ```bash
   # Simulate production load
   artillery quick -d 300 -r 10 http://staging-api.com/api/artists-work
   ```

3. **Monitoring Setup**
   - Error tracking configured
   - Performance monitoring active
   - Alerts configured for anomalies

---

**Remember**: The goal is ZERO bugs, 100% compatibility. If unsure about ANY test result, investigate thoroughly before proceeding.