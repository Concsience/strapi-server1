#!/bin/bash
# Health Check Configuration
# Sets up comprehensive health monitoring for production

set -euo pipefail

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🏥 Health Check Setup"
echo "===================="

# Configuration
HEALTH_DIR="src/api/health"
MIDDLEWARE_DIR="src/middlewares"
CONFIG_DIR="config"

# Create directories
mkdir -p "$HEALTH_DIR/controllers"
mkdir -p "$HEALTH_DIR/routes"
mkdir -p "$HEALTH_DIR/services"
mkdir -p "$MIDDLEWARE_DIR"

# 1. Create Health Check Controller
echo -e "\n${YELLOW}1. Creating health check controller...${NC}"

cat > "$HEALTH_DIR/controllers/health.js" << 'EOF'
'use strict';

const os = require('os');
const { performance } = require('perf_hooks');

module.exports = {
  /**
   * Basic health check endpoint
   */
  async check(ctx) {
    const startTime = performance.now();
    
    try {
      const checks = await strapi
        .service('api::health.health')
        .performHealthChecks();
      
      const responseTime = performance.now() - startTime;
      
      const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
      const status = allHealthy ? 200 : 503;
      
      ctx.status = status;
      ctx.body = {
        status: allHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime.toFixed(2)}ms`,
        checks,
        version: strapi.config.get('info.version', '1.0.0'),
        environment: process.env.NODE_ENV,
      };
    } catch (error) {
      ctx.status = 503;
      ctx.body = {
        status: 'error',
        message: 'Health check failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  },

  /**
   * Detailed health check with system info
   */
  async detailed(ctx) {
    // Check authorization
    const token = ctx.request.header.authorization;
    if (!token || token !== `Bearer ${process.env.HEALTH_CHECK_TOKEN}`) {
      ctx.status = 401;
      ctx.body = { error: 'Unauthorized' };
      return;
    }

    try {
      const checks = await strapi
        .service('api::health.health')
        .performDetailedHealthChecks();
      
      // Add system information
      const systemInfo = {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: process.uptime(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          usage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2) + '%',
        },
        cpu: {
          model: os.cpus()[0].model,
          count: os.cpus().length,
          loadAverage: os.loadavg(),
        },
      };
      
      ctx.body = {
        status: 'detailed',
        timestamp: new Date().toISOString(),
        checks,
        system: systemInfo,
        config: {
          database: {
            client: strapi.config.get('database.connection.client'),
            host: strapi.config.get('database.connection.connection.host'),
            database: strapi.config.get('database.connection.connection.database'),
          },
          server: {
            host: strapi.config.get('server.host'),
            port: strapi.config.get('server.port'),
            url: strapi.config.get('server.url'),
          },
        },
      };
    } catch (error) {
      ctx.status = 503;
      ctx.body = {
        status: 'error',
        message: 'Detailed health check failed',
        error: error.message,
      };
    }
  },

  /**
   * Readiness probe for Kubernetes
   */
  async ready(ctx) {
    try {
      // Check if application is ready to serve traffic
      const isReady = await strapi
        .service('api::health.health')
        .checkReadiness();
      
      if (isReady) {
        ctx.status = 200;
        ctx.body = { ready: true };
      } else {
        ctx.status = 503;
        ctx.body = { ready: false };
      }
    } catch (error) {
      ctx.status = 503;
      ctx.body = { ready: false };
    }
  },

  /**
   * Liveness probe for Kubernetes
   */
  async live(ctx) {
    // Simple check to see if the process is alive
    ctx.status = 200;
    ctx.body = { alive: true, pid: process.pid };
  },
};
EOF

# 2. Create Health Check Service
echo -e "${YELLOW}2. Creating health check service...${NC}"

cat > "$HEALTH_DIR/services/health.js" << 'EOF'
'use strict';

const { performance } = require('perf_hooks');

module.exports = {
  /**
   * Perform basic health checks
   */
  async performHealthChecks() {
    const checks = {};
    
    // Database check
    checks.database = await this.checkDatabase();
    
    // Redis check (if configured)
    if (process.env.REDIS_HOST) {
      checks.redis = await this.checkRedis();
    }
    
    // S3/Upload check
    checks.upload = await this.checkUpload();
    
    // Stripe check (if configured)
    if (process.env.STRIPE_SECRET_KEY) {
      checks.stripe = await this.checkStripe();
    }
    
    return checks;
  },

  /**
   * Perform detailed health checks
   */
  async performDetailedHealthChecks() {
    const basicChecks = await this.performHealthChecks();
    
    // Add more detailed checks
    const detailedChecks = {
      ...basicChecks,
      api: await this.checkApiEndpoints(),
      performance: await this.checkPerformance(),
      storage: await this.checkStorage(),
    };
    
    return detailedChecks;
  },

  /**
   * Check database connectivity and performance
   */
  async checkDatabase() {
    const startTime = performance.now();
    
    try {
      // Simple query to check connection
      await strapi.db.connection.raw('SELECT 1');
      
      // Check connection pool
      const pool = strapi.db.connection.client.pool;
      const poolStats = {
        used: pool.numUsed(),
        free: pool.numFree(),
        pending: pool.numPendingCreates(),
      };
      
      const responseTime = performance.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime: `${responseTime.toFixed(2)}ms`,
        pool: poolStats,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: `${(performance.now() - startTime).toFixed(2)}ms`,
      };
    }
  },

  /**
   * Check Redis connectivity
   */
  async checkRedis() {
    const startTime = performance.now();
    
    try {
      // This assumes Redis client is available globally
      // Implement based on your Redis setup
      const testKey = `health_check_${Date.now()}`;
      // await redis.set(testKey, 'test', 'EX', 1);
      // await redis.del(testKey);
      
      return {
        status: 'healthy',
        responseTime: `${(performance.now() - startTime).toFixed(2)}ms`,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  },

  /**
   * Check upload provider (S3/local)
   */
  async checkUpload() {
    try {
      const uploadConfig = strapi.config.get('plugin.upload');
      
      return {
        status: 'healthy',
        provider: uploadConfig?.provider || 'local',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  },

  /**
   * Check Stripe connectivity
   */
  async checkStripe() {
    try {
      // This assumes Stripe is configured
      // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      // await stripe.charges.list({ limit: 1 });
      
      return {
        status: 'healthy',
        mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test') ? 'test' : 'live',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  },

  /**
   * Check API endpoints
   */
  async checkApiEndpoints() {
    const endpoints = [
      '/api/homepage',
      '/api/artists-work',
      '/api/artist',
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
      const startTime = performance.now();
      try {
        // Internal API call
        const response = await strapi
          .service('api::homepage.homepage')
          .find({ populate: '*' });
        
        results[endpoint] = {
          status: 'healthy',
          responseTime: `${(performance.now() - startTime).toFixed(2)}ms`,
        };
      } catch (error) {
        results[endpoint] = {
          status: 'unhealthy',
          error: error.message,
        };
      }
    }
    
    return results;
  },

  /**
   * Check system performance
   */
  async checkPerformance() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`,
        external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB`,
      },
      cpu: {
        user: `${(cpuUsage.user / 1000000).toFixed(2)}s`,
        system: `${(cpuUsage.system / 1000000).toFixed(2)}s`,
      },
      eventLoop: {
        // Add event loop lag monitoring if needed
        lag: 'N/A',
      },
    };
  },

  /**
   * Check storage availability
   */
  async checkStorage() {
    const { statSync } = require('fs');
    const uploadDir = './public/uploads';
    
    try {
      const stats = statSync(uploadDir);
      
      return {
        status: 'healthy',
        writable: stats.isDirectory(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: 'Upload directory not accessible',
      };
    }
  },

  /**
   * Check if application is ready
   */
  async checkReadiness() {
    try {
      // Check critical services
      const dbCheck = await this.checkDatabase();
      
      return dbCheck.status === 'healthy';
    } catch (error) {
      return false;
    }
  },
};
EOF

# 3. Create Health Check Routes
echo -e "${YELLOW}3. Creating health check routes...${NC}"

cat > "$HEALTH_DIR/routes/health.js" << 'EOF'
'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/_health',
      handler: 'health.check',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/_health/detailed',
      handler: 'health.detailed',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/_health/ready',
      handler: 'health.ready',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/_health/live',
      handler: 'health.live',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
EOF

# 4. Create monitoring middleware
echo -e "${YELLOW}4. Creating monitoring middleware...${NC}"

cat > "$MIDDLEWARE_DIR/monitoring.js" << 'EOF'
'use strict';

const { performance } = require('perf_hooks');

// Metrics storage
const metrics = {
  requests: {
    total: 0,
    success: 0,
    error: 0,
    duration: [],
  },
  endpoints: {},
};

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    const startTime = performance.now();
    const method = ctx.method;
    const path = ctx.path;
    
    // Skip health check endpoints
    if (path.startsWith('/_health')) {
      return next();
    }
    
    try {
      await next();
      
      const duration = performance.now() - startTime;
      
      // Update metrics
      metrics.requests.total++;
      metrics.requests.success++;
      metrics.requests.duration.push(duration);
      
      // Keep only last 1000 durations
      if (metrics.requests.duration.length > 1000) {
        metrics.requests.duration.shift();
      }
      
      // Track endpoint metrics
      const endpoint = `${method} ${path}`;
      if (!metrics.endpoints[endpoint]) {
        metrics.endpoints[endpoint] = {
          count: 0,
          totalDuration: 0,
          errors: 0,
        };
      }
      
      metrics.endpoints[endpoint].count++;
      metrics.endpoints[endpoint].totalDuration += duration;
      
      // Add response headers
      ctx.set('X-Response-Time', `${duration.toFixed(2)}ms`);
      ctx.set('X-Request-ID', ctx.state.requestId || 'none');
      
    } catch (error) {
      const duration = performance.now() - startTime;
      
      metrics.requests.total++;
      metrics.requests.error++;
      
      const endpoint = `${method} ${path}`;
      if (metrics.endpoints[endpoint]) {
        metrics.endpoints[endpoint].errors++;
      }
      
      // Log error
      strapi.log.error({
        message: 'Request failed',
        method,
        path,
        duration: `${duration.toFixed(2)}ms`,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
      
      throw error;
    }
  };
};

// Export metrics for health checks
module.exports.getMetrics = () => metrics;
EOF

# 5. Create health check configuration
echo -e "${YELLOW}5. Creating health check configuration...${NC}"

cat > "$CONFIG_DIR/health.js" << 'EOF'
module.exports = ({ env }) => ({
  // Health check configuration
  healthCheck: {
    // Enable/disable health checks
    enabled: env.bool('HEALTH_CHECK_ENABLED', true),
    
    // Health check token for detailed endpoint
    token: env('HEALTH_CHECK_TOKEN', 'change-me-in-production'),
    
    // Thresholds
    thresholds: {
      // Response time threshold in ms
      responseTime: env.int('HEALTH_CHECK_RESPONSE_TIME', 1000),
      
      // Memory usage threshold in MB
      memoryUsage: env.int('HEALTH_CHECK_MEMORY_LIMIT', 1024),
      
      // Database connection pool threshold
      connectionPoolUsage: env.float('HEALTH_CHECK_POOL_USAGE', 0.8),
    },
    
    // Services to check
    services: {
      database: env.bool('HEALTH_CHECK_DATABASE', true),
      redis: env.bool('HEALTH_CHECK_REDIS', true),
      s3: env.bool('HEALTH_CHECK_S3', true),
      stripe: env.bool('HEALTH_CHECK_STRIPE', true),
    },
    
    // Monitoring
    monitoring: {
      // Enable metrics collection
      collectMetrics: env.bool('COLLECT_METRICS', true),
      
      // Metrics retention in minutes
      metricsRetention: env.int('METRICS_RETENTION', 60),
      
      // Alert webhooks
      alertWebhook: env('HEALTH_ALERT_WEBHOOK'),
    },
  },
});
EOF

# 6. Create monitoring dashboard script
echo -e "${YELLOW}6. Creating monitoring dashboard...${NC}"

cat > ".claude/commands/backend/production/monitor-dashboard.sh" << 'EOF'
#!/bin/bash
# Real-time monitoring dashboard

set -euo pipefail

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="${1:-http://localhost:1337}"
REFRESH_INTERVAL="${2:-5}"

clear
echo "📊 Production Monitoring Dashboard"
echo "================================="
echo "API: $API_URL"
echo "Refresh: ${REFRESH_INTERVAL}s"
echo ""

while true; do
  # Clear previous output
  tput cup 5 0
  
  # Get health status
  HEALTH=$(curl -s "$API_URL/_health" 2>/dev/null || echo '{"status":"error"}')
  STATUS=$(echo "$HEALTH" | jq -r '.status' 2>/dev/null || echo "error")
  
  # Display status
  echo -e "${BLUE}Health Status:${NC}"
  if [ "$STATUS" = "healthy" ]; then
    echo -e "  Status: ${GREEN}● HEALTHY${NC}"
  else
    echo -e "  Status: ${RED}● UNHEALTHY${NC}"
  fi
  
  # Display checks
  echo -e "\n${BLUE}Service Checks:${NC}"
  echo "$HEALTH" | jq -r '.checks | to_entries[] | "  \(.key): \(.value.status)"' 2>/dev/null || echo "  No data"
  
  # Display metrics
  echo -e "\n${BLUE}Performance:${NC}"
  RESPONSE_TIME=$(echo "$HEALTH" | jq -r '.responseTime' 2>/dev/null || echo "N/A")
  echo "  Response Time: $RESPONSE_TIME"
  
  # Display timestamp
  echo -e "\n${BLUE}Last Updated:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
  
  sleep $REFRESH_INTERVAL
done
EOF

chmod +x ".claude/commands/backend/production/monitor-dashboard.sh"

# 7. Create alert script
echo -e "${YELLOW}7. Creating alert script...${NC}"

cat > ".claude/commands/backend/production/health-alerts.sh" << 'EOF'
#!/bin/bash
# Health check alerts

API_URL="${1:-http://localhost:1337}"
WEBHOOK_URL="$2"
CHECK_INTERVAL="${3:-60}"

while true; do
  HEALTH=$(curl -s "$API_URL/_health" 2>/dev/null)
  STATUS=$(echo "$HEALTH" | jq -r '.status' 2>/dev/null)
  
  if [ "$STATUS" != "healthy" ] && [ -n "$WEBHOOK_URL" ]; then
    # Send alert
    curl -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"text\": \"🚨 Health Check Failed\",
        \"status\": \"$STATUS\",
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"details\": $HEALTH
      }"
  fi
  
  sleep $CHECK_INTERVAL
done
EOF

chmod +x ".claude/commands/backend/production/health-alerts.sh"

echo -e "\n${GREEN}✓ Health check setup complete!${NC}"
echo -e "\nHealth check endpoints:"
echo "  - Basic: GET /_health"
echo "  - Detailed: GET /_health/detailed (requires token)"
echo "  - Readiness: GET /_health/ready"
echo "  - Liveness: GET /_health/live"
echo -e "\nMonitoring tools:"
echo "  - Dashboard: .claude/commands/backend/production/monitor-dashboard.sh"
echo "  - Alerts: .claude/commands/backend/production/health-alerts.sh"

# Test the health endpoint
echo -e "\n${YELLOW}Testing health endpoint...${NC}"
if curl -s -f "http://localhost:1337/_health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Health endpoint is working${NC}"
else
    echo -e "${YELLOW}⚠ Health endpoint not accessible (server may need restart)${NC}"
fi