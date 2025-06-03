# Production Deployment Checklist

## Pre-Deployment Security Audit

### 1. Environment Variables
- [ ] Create `.env.production` from `.env.example` template
- [ ] Generate new secure secrets (never reuse development secrets)
- [ ] Verify all sensitive values are populated
- [ ] Ensure `.env` files are in `.gitignore`
- [ ] Use environment variable manager (AWS Secrets Manager, HashiCorp Vault)

### 2. Database Security
- [ ] Create production database with strong password
- [ ] Enable SSL/TLS for database connections
- [ ] Configure connection pooling limits
- [ ] Set up automated backups
- [ ] Test backup restoration process
- [ ] Enable query logging for monitoring

### 3. API Security
- [ ] Enable rate limiting on all endpoints
- [ ] Configure CORS for production domains only
- [ ] Set up API key authentication where needed
- [ ] Enable request validation
- [ ] Configure security headers (HSTS, CSP, etc.)
- [ ] Disable unnecessary endpoints

### 4. Infrastructure Setup
- [ ] Install and configure Redis
- [ ] Set up SSL certificates (Let's Encrypt)
- [ ] Configure reverse proxy (Nginx/Apache)
- [ ] Set up firewall rules
- [ ] Configure DDoS protection
- [ ] Enable server monitoring

## Deployment Steps

### 1. Server Preparation
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required dependencies
sudo apt install -y postgresql postgresql-contrib redis-server nginx certbot python3-certbot-nginx

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Create application directory
sudo mkdir -p /var/www/artedusa-strapi
sudo chown -R $USER:$USER /var/www/artedusa-strapi
```

### 2. Database Setup
```bash
# Create production database
sudo -u postgres psql -c "CREATE DATABASE strapi_conscience_prod;"
sudo -u postgres psql -c "CREATE USER strapi_prod WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE strapi_conscience_prod TO strapi_prod;"

# Enable SSL for PostgreSQL
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: ssl = on

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 3. Redis Setup
```bash
# Configure Redis password
sudo nano /etc/redis/redis.conf
# Set: requirepass YOUR_REDIS_PASSWORD
# Set: maxmemory 1gb
# Set: maxmemory-policy allkeys-lru

# Enable Redis persistence
# Set: save 900 1
# Set: save 300 10
# Set: save 60 10000

# Restart Redis
sudo systemctl restart redis-server
```

### 4. Application Deployment
```bash
# Clone repository
cd /var/www/artedusa-strapi
git clone https://github.com/YOUR_REPO/strapi-server1.git .

# Copy production environment file
cp config/env/production/.env.example .env.production
# Edit .env.production with actual values

# Install dependencies
npm ci --production

# Build admin panel
NODE_ENV=production npm run build

# Run database migrations
NODE_ENV=production npm run strapi migration:run

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 5. Nginx Configuration
```nginx
# /etc/nginx/sites-available/artedusa-strapi
server {
    listen 80;
    server_name api.artedusa.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.artedusa.com;

    ssl_certificate /etc/letsencrypt/live/api.artedusa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.artedusa.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://localhost:1337;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /_health {
        access_log off;
        proxy_pass http://localhost:1337/_health;
    }
}
```

### 6. SSL Setup
```bash
# Obtain SSL certificate
sudo certbot --nginx -d api.artedusa.com -d admin.artedusa.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Post-Deployment Verification

### 1. Security Tests
- [ ] Run SSL Labs test (should get A+ rating)
- [ ] Test rate limiting with load testing tool
- [ ] Verify CORS headers with different origins
- [ ] Check security headers with securityheaders.com
- [ ] Test authentication flows
- [ ] Verify webhook signatures

### 2. Performance Tests
- [ ] Load test with expected traffic (use k6 or Artillery)
- [ ] Monitor response times under load
- [ ] Check database query performance
- [ ] Verify Redis cache hit rates
- [ ] Test image upload and CDN delivery
- [ ] Monitor memory usage patterns

### 3. Functionality Tests
- [ ] Create test order through full flow
- [ ] Test Stripe webhook processing
- [ ] Verify email notifications
- [ ] Check admin panel access
- [ ] Test API endpoints
- [ ] Verify backup automation

### 4. Monitoring Setup
- [ ] Configure Sentry error tracking
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure log aggregation
- [ ] Set up performance monitoring
- [ ] Create custom dashboards
- [ ] Configure alerts

## Maintenance Tasks

### Daily
- [ ] Check error logs
- [ ] Monitor API response times
- [ ] Review security alerts

### Weekly
- [ ] Review performance metrics
- [ ] Check disk usage
- [ ] Verify backup integrity
- [ ] Update dependencies (security patches)

### Monthly
- [ ] Full security audit
- [ ] Performance optimization review
- [ ] Database maintenance (VACUUM, ANALYZE)
- [ ] Review and rotate API keys
- [ ] Update SSL certificates if needed

## Emergency Procedures

### High Load
1. Enable additional rate limiting
2. Scale Redis cache
3. Add read replicas for database
4. Enable CDN for more endpoints

### Security Incident
1. Enable maintenance mode
2. Rotate all secrets immediately
3. Review access logs
4. Patch vulnerabilities
5. Notify affected users

### Database Issues
1. Switch to read-only mode
2. Use backup database
3. Investigate root cause
4. Restore from backup if needed

## Rollback Plan
```bash
# Tag current release
git tag -a v1.0.0 -m "Production release"

# If rollback needed
pm2 stop all
git checkout previous-tag
npm ci --production
NODE_ENV=production npm run build
pm2 restart all
```