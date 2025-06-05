# ArtEdusa Strapi Troubleshooting Playbook

This playbook provides step-by-step solutions for common issues in the ArtEdusa Strapi art e-commerce platform.

## 🚨 Emergency Quick Fixes

### Server Won't Start
```bash
# 1. Check if port is in use
lsof -i :1337
# Kill process if found: kill -9 <PID>

# 2. Clear cache and rebuild
rm -rf .cache build .tmp
npm run build

# 3. Check environment variables
node -e "console.log('DB:', !!process.env.DATABASE_PASSWORD, 'JWT:', !!process.env.JWT_SECRET)"

# 4. Test database connection
npm run strapi console
# In console: strapi.db.connection.raw('SELECT 1')
```

### Database Connection Failed
```bash
# 1. Check PostgreSQL service
sudo systemctl status postgresql
sudo systemctl start postgresql

# 2. Test connection manually
psql -h 127.0.0.1 -U strapi -d strapi_conscience
# Password: strapi123

# 3. Check environment variables
echo $DATABASE_HOST $DATABASE_PORT $DATABASE_NAME $DATABASE_USERNAME

# 4. Verify pg driver installed
npm list pg
# If missing: npm install pg
```

### Redis Connection Issues
```bash
# 1. Check Redis service
redis-cli ping
# Expected: PONG

# 2. Check Redis configuration
redis-cli info server

# 3. Clear Redis cache if corrupted
redis-cli FLUSHALL

# 4. Restart Redis
sudo systemctl restart redis-server
```

## 🔧 Performance Issues

### High Memory Usage (>800MB)
```bash
# 1. Check current memory
node scripts/diagnostics.js | grep Memory

# 2. Restart PM2 process
pm2 restart artedusa-strapi

# 3. Check for memory leaks
npm install -g clinic
clinic doctor -- npm start

# 4. Enable garbage collection logs
node --expose-gc --trace-gc server.js
```

### Slow API Responses (>500ms)
```bash
# 1. Run performance diagnostics
node scripts/performance-monitor.js

# 2. Check database slow queries
psql -d strapi_conscience -c "
SELECT query, query_start, state, wait_event 
FROM pg_stat_activity 
WHERE state = 'active' 
AND query_start < now() - interval '5 seconds';"

# 3. Analyze API endpoint performance
curl -w "Time: %{time_total}s\n" http://localhost:1337/api/artists-works

# 4. Enable query debugging
DEBUG=strapi:database npm run develop
```

### Database Performance Issues
```bash
# 1. Check missing indexes
psql -d strapi_conscience -c "
SELECT schemaname, tablename, attname, n_distinct 
FROM pg_stats 
WHERE schemaname = 'public' 
AND n_distinct > 100 
ORDER BY n_distinct DESC;"

# 2. Add critical indexes (BACKUP FIRST!)
psql -d strapi_conscience -c "
CREATE INDEX CONCURRENTLY idx_artists_works_artist 
ON artists_works(artist);

CREATE INDEX CONCURRENTLY idx_cart_items_cart 
ON cart_items(cart);

CREATE INDEX CONCURRENTLY idx_orders_user 
ON orders(user_id);"

# 3. Update table statistics
psql -d strapi_conscience -c "ANALYZE;"

# 4. Check connection pooling
psql -d strapi_conscience -c "
SELECT count(*), state 
FROM pg_stat_activity 
GROUP BY state;"
```

## 💳 Payment & Stripe Issues

### Payment Intent Creation Fails
```bash
# 1. Check Stripe key format
echo $STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY | head -c 7
# Should output: sk_test

# 2. Test Stripe connection
curl -X POST http://localhost:1337/api/stripe/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{"amount": 10.99}'

# 3. Check Stripe webhook configuration
curl -X GET "https://api.stripe.com/v1/webhook_endpoints" \
  -u $STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY:

# 4. Validate webhook signatures (if implemented)
# Check logs for webhook signature validation errors
```

### Order Status Not Updating
```bash
# 1. Check if webhook endpoint exists
curl -X POST http://localhost:1337/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"type": "payment_intent.succeeded", "data": {"object": {"id": "pi_test"}}}'

# 2. Verify order update logic
npm run strapi console
# In console:
# const order = await strapi.entityService.findMany('api::order.order', {
#   filters: { stripe_payment_intent: 'pi_test' }
# });

# 3. Check Stripe dashboard for webhook delivery
# Go to Stripe Dashboard > Webhooks > View logs
```

## 🖼️ Image Upload Issues

### OVH S3 Upload Failures
```bash
# 1. Check OVH S3 credentials
echo $OVH_ACCESS_KEY $OVH_SECRET_KEY $OVH_BUCKET

# 2. Test S3 connection manually
npm install aws-sdk
node -e "
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  accessKeyId: process.env.OVH_ACCESS_KEY,
  secretAccessKey: process.env.OVH_SECRET_KEY,
  endpoint: 's3.rbx.io.cloud.ovh.net',
  region: 'rbx'
});
s3.listBuckets((err, data) => console.log(err || data));
"

# 3. Check bucket permissions
# Verify bucket policy allows uploads from your IP

# 4. Test image processing
node -e "
const sharp = require('sharp');
sharp('test-image.jpg')
  .resize(400, 400)
  .toBuffer()
  .then(buffer => console.log('Sharp working, buffer size:', buffer.length))
  .catch(err => console.error('Sharp error:', err));
"
```

### Image Processing Errors
```bash
# 1. Check Sharp installation
npm list sharp
# If issues: npm rebuild sharp

# 2. Test different image formats
# PNG: sharp().png()
# JPEG: sharp().jpeg({ quality: 90 })
# WebP: sharp().webp({ quality: 85 })

# 3. Check file size limits
# Default Strapi limit: 1GB
# Check config/middlewares.js for custom limits

# 4. Memory issues with large images
node --max-old-space-size=4096 server.js
```

## 🔐 Authentication & Authorization Issues

### JWT Token Issues
```bash
# 1. Check JWT secret strength
echo $JWT_SECRET | wc -c
# Should be >32 characters

# 2. Decode JWT token for debugging
node -e "
const jwt = require('jsonwebtoken');
const token = 'YOUR_TOKEN_HERE';
console.log(jwt.decode(token));
"

# 3. Verify token generation
curl -X POST http://localhost:1337/api/auth/local \
  -H "Content-Type: application/json" \
  -d '{"identifier": "test@example.com", "password": "password"}'

# 4. Check token expiration
# Default: 30 days (configurable in plugins.js)
```

### User Registration/Login Failures
```bash
# 1. Check user-permissions plugin
npm run strapi console
# strapi.plugin('users-permissions').service('user').fetch()

# 2. Verify email uniqueness
psql -d strapi_conscience -c "
SELECT email, count(*) 
FROM up_users 
GROUP BY email 
HAVING count(*) > 1;"

# 3. Check password hashing
# Strapi uses bcrypt by default
# Verify in user creation: password should be hashed

# 4. Test registration endpoint
curl -X POST http://localhost:1337/api/auth/local/register \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "email": "test@test.com", "password": "password123"}'
```

## 🏗️ Schema & Content-Type Issues

### Relationship Errors (Cart/Order)
```bash
# 1. Check current relationship configuration
cat src/api/cart-item/content-types/cart-item/schema.json | grep -A 5 -B 5 "cart"

# 2. Identify manyToMany issues
# WRONG: cart: { relation: "manyToMany" }
# CORRECT: cart: { relation: "manyToOne" }

# 3. Fix relationships (DANGEROUS - BACKUP FIRST!)
# Edit schema.json files:
# cart-item/schema.json: cart relation → manyToOne
# ordered-item/schema.json: order relation → manyToOne

# 4. Regenerate types after schema changes
npm run strapi ts:generate-types
```

### Data Type Conversion Issues
```bash
# 1. Check price field types
psql -d strapi_conscience -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'artists_works' 
AND column_name LIKE '%price%';"

# 2. Convert string prices to decimal (BACKUP FIRST!)
psql -d strapi_conscience -c "
ALTER TABLE artists_works 
ADD COLUMN price_decimal DECIMAL(10,2);

UPDATE artists_works 
SET price_decimal = CAST(price AS DECIMAL(10,2)) 
WHERE price ~ '^[0-9]+\.?[0-9]*$';

-- After verification:
-- ALTER TABLE artists_works DROP COLUMN price;
-- ALTER TABLE artists_works RENAME COLUMN price_decimal TO price;
"

# 3. Update schema.json to use decimal type
# "price": { "type": "decimal", "required": true }
```

## 🚀 Production Deployment Issues

### PM2 Process Management
```bash
# 1. Check PM2 status
pm2 status
pm2 logs artedusa-strapi --lines 50

# 2. Memory limit exceeded
pm2 restart artedusa-strapi
# Or increase limit in ecosystem.config.js: max_memory_restart: '2G'

# 3. Process not starting
pm2 delete artedusa-strapi
pm2 start ecosystem.config.js --env production

# 4. Zero-downtime deployment
pm2 reload artedusa-strapi
```

### Build Failures
```bash
# 1. Clear all caches
rm -rf .cache build .tmp node_modules/.cache

# 2. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 3. Check Node.js version compatibility
node --version
# Should be 18.x or 20.x (as per package.json)

# 4. Build with verbose output
NODE_ENV=production npm run build --verbose
```

### Environment Configuration Issues
```bash
# 1. Validate all environment variables
node scripts/diagnostics.js

# 2. Check production vs development configs
ls -la config/env/production/
cat config/env/production/database.js

# 3. SSL certificate issues
curl -I https://api.artedusa.com
# Check SSL status

# 4. Nginx configuration
sudo nginx -t
sudo systemctl reload nginx
```

## 📊 Monitoring & Debugging

### Enable Debug Logging
```bash
# 1. Full Strapi debugging
DEBUG=strapi:* npm run develop

# 2. Database queries only
DEBUG=strapi:database npm run develop

# 3. API requests only
DEBUG=strapi:api npm run develop

# 4. Custom middleware debugging
DEBUG=strapi:middleware npm run develop
```

### Performance Monitoring
```bash
# 1. Real-time monitoring
node scripts/performance-monitor.js

# 2. One-time diagnostics
node scripts/diagnostics.js

# 3. Database query analysis
ENABLE_QUERY_LOGGING=true npm run develop

# 4. Memory profiling
node --inspect server.js
# Open chrome://inspect in Chrome
```

### Log Analysis
```bash
# 1. PM2 logs
pm2 logs artedusa-strapi --lines 100 --raw

# 2. Error patterns
pm2 logs artedusa-strapi --err --lines 50

# 3. Database logs (if enabled)
sudo tail -f /var/log/postgresql/postgresql-*.log

# 4. Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## 🆘 Emergency Recovery

### Complete System Recovery
```bash
# 1. Stop all services
pm2 stop all
sudo systemctl stop nginx

# 2. Database backup and restore
pg_dump strapi_conscience > backup_$(date +%Y%m%d_%H%M%S).sql
# If needed: psql strapi_conscience < backup_file.sql

# 3. Redis backup and restore
redis-cli BGSAVE
# Backup file: /var/lib/redis/dump.rdb

# 4. Full application restore
git stash
git checkout HEAD~1  # Go back to last working commit
npm ci --production
npm run build
pm2 start ecosystem.config.js --env production
sudo systemctl start nginx
```

### Rollback Deployment
```bash
# 1. Quick rollback using PM2
pm2 stop artedusa-strapi
git checkout previous-working-commit
npm ci --production
npm run build
pm2 restart artedusa-strapi

# 2. Database rollback (if schema changed)
psql strapi_conscience < pre_deployment_backup.sql

# 3. Verify rollback
curl http://localhost:1337/_health
```

## 📞 Getting Help

### Information to Collect
```bash
# 1. System information
node scripts/diagnostics.js > debug_report.json

# 2. Logs
pm2 logs artedusa-strapi --lines 100 > pm2_logs.txt

# 3. Environment (sanitized)
env | grep -E "(NODE_ENV|DATABASE_|REDIS_|STRIPE_)" > env_vars.txt

# 4. Git status
git status > git_status.txt
git log --oneline -10 > recent_commits.txt
```

### Emergency Contacts & Resources
- **Strapi Documentation**: https://docs.strapi.io/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Redis Docs**: https://redis.io/documentation
- **Stripe API Reference**: https://stripe.com/docs/api
- **PM2 Docs**: https://pm2.keymetrics.io/docs/

Remember: **Always backup before making changes to production!**