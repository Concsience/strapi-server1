# 🔧 Manual Permissions Fix Required

## Issue Found
The bootstrap script approach for fixing permissions programmatically is complex due to Strapi 5's permission system. 

## Current Status
- ✅ Health monitoring endpoints working
- ✅ Database optimization complete
- ✅ Code cleanup done (duplicates removed)
- ⚠️ **Manual permission fix needed**

## REQUIRED: Manual Admin Panel Fix

### Steps to Secure APIs:

1. **Open Strapi Admin Panel**
   ```
   http://localhost:1337/admin
   ```

2. **Navigate to Permissions**
   ```
   Settings → Users & Permissions → Roles
   ```

3. **Edit Public Role**
   - Click on "Public" role
   - Find these APIs and **UNCHECK ALL permissions**:
     - Cart
     - Cart-item
     - Order  
     - Ordered-item
     - Stripe
     - Payment
     - Wishlist
     - Address

4. **Save Changes**
   - Click "Save" button
   - Restart may be required

### Verification
After fixing permissions, test:
```bash
# Should return 401 (Unauthorized)
curl -X GET http://localhost:1337/api/cart

# Should still return 200 (Public content)
curl -X GET http://localhost:1337/api/artists-work
```

## Alternative: Database Query Fix
If you have database access:
```sql
-- Disable public permissions for protected APIs
UPDATE up_permissions 
SET enabled = false 
WHERE action LIKE 'api::cart.%' 
   OR action LIKE 'api::order.%' 
   OR action LIKE 'api::stripe.%'
   OR action LIKE 'api::payment.%'
AND role_id = (SELECT id FROM up_roles WHERE type = 'public');
```

## For Production Deployment
Add this to deployment checklist:
- [ ] Verify all e-commerce APIs require authentication
- [ ] Public role has no access to cart/order/payment endpoints
- [ ] Authenticated role has proper permissions

---
**Note**: This manual step is required because Strapi 5's permission system stores configuration in the database, not in code files.