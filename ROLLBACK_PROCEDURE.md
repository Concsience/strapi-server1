# 🔄 TypeScript Migration Rollback Procedure

## ⚠️ When to Rollback

Initiate rollback if ANY of these occur:
- API endpoints return different responses than before
- Performance degradation > 10%
- Unexpected errors in production
- Memory leaks detected
- Database query failures

## 🚀 Quick Rollback (< 2 minutes)

### Step 1: Stop Services
```bash
# If using PM2
pm2 stop all

# If using systemd
sudo systemctl stop strapi

# If running directly
# Ctrl+C to stop the process
```

### Step 2: Preserve TypeScript Work
```bash
# Create backup of TypeScript files
mkdir -p ~/strapi-typescript-backup-$(date +%Y%m%d-%H%M%S)
cp -r src/**/*.ts ~/strapi-typescript-backup-$(date +%Y%m%d-%H%M%S)/
cp tsconfig.json ~/strapi-typescript-backup-$(date +%Y%m%d-%H%M%S)/
cp -r src/types ~/strapi-typescript-backup-$(date +%Y%m%d-%H%M%S)/
```

### Step 3: Remove TypeScript Files
```bash
# Remove all TypeScript files
find src -name "*.ts" -type f -delete

# Remove type definitions
rm -rf src/types

# Remove TypeScript config
rm -f tsconfig.json
```

### Step 4: Restore Original Configuration
```bash
# Revert package.json changes
git checkout -- package.json

# If you modified any JS files, restore them
git checkout -- src/**/*.js
```

### Step 5: Clean and Restart
```bash
# Clear any compiled files
rm -rf dist/
rm -rf .cache/
rm -rf build/

# Restart the application
npm run develop  # For development
# OR
npm run build && npm run start  # For production
```

## 🔧 Selective Rollback (For Specific Issues)

### Option 1: Rollback Specific APIs Only

If only certain APIs are problematic:

```bash
# Example: Rollback only Stripe API
rm src/api/stripe/controllers/stripe.ts
rm src/api/stripe/routes/stripe.ts
# Original JS files will be used automatically

# Restart
npm run develop
```

### Option 2: Keep Type Definitions Only

If types are helpful but runtime code is problematic:

```bash
# Remove all .ts files except type definitions
find src -name "*.ts" -not -path "*/types/*" -type f -delete

# Keep tsconfig.json for type checking
# Keep package.json scripts for type checking
```

### Option 3: Disable Enhanced Features

If enhanced features cause issues:

```bash
# Rename enhanced services to disable them
mv src/api/cart/services/cart-enhanced.ts src/api/cart/services/cart-enhanced.ts.disabled

# Original cart.js will be used
```

## 🔍 Debugging Before Full Rollback

### 1. Check Error Logs
```bash
# Check Strapi logs
tail -n 100 strapi.log | grep -i error

# Check PM2 logs if using PM2
pm2 logs --lines 100

# Check system logs
journalctl -u strapi -n 100
```

### 2. Identify Problematic Code
```bash
# Run type checker to find issues
npm run type-check

# Check for runtime errors
NODE_ENV=development npm run develop
```

### 3. Test Specific Endpoints
```bash
# Test each migrated endpoint
curl http://localhost:1337/api/stripe/create-payment-intent
curl http://localhost:1337/api/cart
# Compare responses with expected output
```

## 📊 Rollback Verification

### After rollback, verify:

1. **All APIs Working**
   ```bash
   # Run your API test suite
   npm test
   ```

2. **No TypeScript Errors**
   ```bash
   # Should show no .ts files
   find src -name "*.ts" -type f
   ```

3. **Performance Restored**
   ```bash
   # Check response times
   curl -w "@curl-format.txt" -o /dev/null -s http://localhost:1337/api/artists-work
   ```

4. **Memory Usage Normal**
   ```bash
   # Monitor memory
   ps aux | grep node | grep strapi
   ```

## 🔐 Data Safety

### Important: Rollback does NOT affect:
- ✅ Database data (no schema changes)
- ✅ Uploaded files
- ✅ User accounts
- ✅ Configuration files
- ✅ Environment variables

### Rollback ONLY affects:
- ❌ TypeScript source files
- ❌ Type definitions
- ❌ New middleware features
- ❌ Enhanced service methods

## 📝 Post-Rollback Actions

1. **Document Issues**
   ```markdown
   # Create ROLLBACK_REPORT.md
   - Date/Time of rollback
   - Reason for rollback
   - Specific errors encountered
   - Files affected
   - Steps to reproduce issue
   ```

2. **Notify Team**
   - Update PR with rollback status
   - Document in project issues
   - Schedule retrospective

3. **Plan Fix**
   - Isolate problematic code
   - Create test cases for issues
   - Plan incremental re-migration

## 🚨 Emergency Contacts

If rollback fails:
1. Check backup files in `~/strapi-typescript-backup-*`
2. Use git to restore: `git checkout HEAD~1 -- src/`
3. Restore from latest backup
4. Contact DevOps team

## ✅ Rollback Complete Checklist

- [ ] All services stopped
- [ ] TypeScript files backed up
- [ ] TypeScript files removed
- [ ] Original configs restored
- [ ] Services restarted
- [ ] APIs tested and working
- [ ] Performance verified
- [ ] Team notified
- [ ] Issues documented

---

**Remember**: Rollback is a safety net, not a failure. It's better to rollback and fix issues properly than to push forward with bugs.