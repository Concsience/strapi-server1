#!/usr/bin/env node

/**
 * ArtEdusa Strapi Performance Diagnostics Tool
 * Comprehensive health check and performance analysis
 */

const Redis = require('ioredis');
const { Client } = require('pg');

class StrapiDiagnostics {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {},
      performance: {},
      recommendations: []
    };
  }

  async runAllDiagnostics() {
    console.log('🚀 Starting ArtEdusa Strapi Diagnostics...\n');
    
    try {
      await this.checkDatabase();
      await this.checkRedis();
      await this.checkEnvironment();
      await this.checkMemory();
      await this.checkDiskSpace();
      await this.checkAPIPerformance();
      await this.checkContentTypes();
      
      this.generateReport();
      return this.results;
    } catch (error) {
      console.error('❌ Diagnostics failed:', error.message);
      this.results.status = 'error';
      this.results.error = error.message;
      return this.results;
    }
  }

  async checkDatabase() {
    console.log('🔍 Checking PostgreSQL connection...');
    
    const dbConfig = {
      host: process.env.DATABASE_HOST || '127.0.0.1',
      port: process.env.DATABASE_PORT || 5432,
      database: process.env.DATABASE_NAME || 'strapi_conscience',
      user: process.env.DATABASE_USERNAME || 'strapi',
      password: process.env.DATABASE_PASSWORD || 'strapi123'
    };

    const client = new Client(dbConfig);
    
    try {
      const startTime = Date.now();
      await client.connect();
      
      // Test query
      const result = await client.query('SELECT NOW() as server_time, version()');
      const connectionTime = Date.now() - startTime;
      
      // Check database size
      const sizeQuery = `
        SELECT pg_size_pretty(pg_database_size('${dbConfig.database}')) as db_size,
               pg_database_size('${dbConfig.database}') as db_size_bytes
      `;
      const sizeResult = await client.query(sizeQuery);
      
      // Check active connections
      const connQuery = `
        SELECT count(*) as active_connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `;
      const connResult = await client.query(connQuery);
      
      // Check for missing indexes (common performance issue)
      const indexQuery = `
        SELECT schemaname, tablename, attname, n_distinct, correlation 
        FROM pg_stats 
        WHERE schemaname = 'public' 
        AND n_distinct > 100 
        ORDER BY n_distinct DESC 
        LIMIT 10
      `;
      const indexResult = await client.query(indexQuery);
      
      this.results.checks.database = {
        status: 'healthy',
        connection_time: `${connectionTime}ms`,
        server_time: result.rows[0].server_time,
        version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1],
        database_size: sizeResult.rows[0].db_size,
        database_size_bytes: parseInt(sizeResult.rows[0].db_size_bytes),
        active_connections: parseInt(connResult.rows[0].active_connections),
        potential_index_candidates: indexResult.rows
      };
      
      // Performance recommendations
      if (connectionTime > 100) {
        this.results.recommendations.push('Database connection time > 100ms - check network latency');
      }
      if (parseInt(connResult.rows[0].active_connections) > 20) {
        this.results.recommendations.push('High number of active database connections - consider connection pooling');
      }
      if (indexResult.rows.length > 0) {
        this.results.recommendations.push('Consider adding indexes for high-cardinality columns');
      }
      
      console.log('✅ Database: Healthy');
      
    } catch (error) {
      this.results.checks.database = {
        status: 'error',
        error: error.message
      };
      this.results.status = 'warning';
      console.log('❌ Database: Error -', error.message);
    } finally {
      await client.end();
    }
  }

  async checkRedis() {
    console.log('🔍 Checking Redis connection...');
    
    const redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true
    });

    try {
      const startTime = Date.now();
      await redis.connect();
      
      // Test basic operations
      await redis.set('diagnostic_test', 'ok', 'EX', 10);
      const testValue = await redis.get('diagnostic_test');
      const connectionTime = Date.now() - startTime;
      
      // Get Redis info
      const info = await redis.info();
      const memory = await redis.info('memory');
      
      // Check cache keys
      const cacheKeys = await redis.keys('strapi_cache_*');
      const rateLimitKeys = await redis.keys('rate_limit:*');
      
      // Parse memory info
      const memoryMatch = memory.match(/used_memory_human:(.+)/);
      const memoryUsed = memoryMatch ? memoryMatch[1].trim() : 'unknown';
      
      this.results.checks.redis = {
        status: 'healthy',
        connection_time: `${connectionTime}ms`,
        memory_used: memoryUsed,
        cache_keys_count: cacheKeys.length,
        rate_limit_keys_count: rateLimitKeys.length,
        test_operation: testValue === 'ok' ? 'success' : 'failed'
      };
      
      if (connectionTime > 50) {
        this.results.recommendations.push('Redis connection time > 50ms - check Redis server performance');
      }
      if (cacheKeys.length === 0) {
        this.results.recommendations.push('No cache keys found - API caching may not be working');
      }
      
      console.log('✅ Redis: Healthy');
      
    } catch (error) {
      this.results.checks.redis = {
        status: 'error',
        error: error.message
      };
      this.results.status = 'warning';
      console.log('❌ Redis: Error -', error.message);
    } finally {
      redis.disconnect();
    }
  }

  async checkEnvironment() {
    console.log('🔍 Checking environment configuration...');
    
    const requiredVars = [
      'DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USERNAME', 'DATABASE_PASSWORD',
      'JWT_SECRET', 'ADMIN_JWT_SECRET',
      'STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY'
    ];
    
    const optionalVars = [
      'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD',
      'OVH_ACCESS_KEY', 'OVH_SECRET_KEY', 'OVH_BUCKET'
    ];
    
    const missing = requiredVars.filter(varName => !process.env[varName]);
    const optional = optionalVars.filter(varName => !process.env[varName]);
    
    // Check secret strength
    const jwtSecret = process.env.JWT_SECRET || '';
    const adminSecret = process.env.ADMIN_JWT_SECRET || '';
    const stripeKey = process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY || '';
    
    const weakSecrets = [];
    if (jwtSecret.length < 32) weakSecrets.push('JWT_SECRET too short');
    if (adminSecret.length < 32) weakSecrets.push('ADMIN_JWT_SECRET too short');
    if (jwtSecret === 'tobemodified' || adminSecret === 'tobemodified') {
      weakSecrets.push('Default secrets detected');
    }
    if (!stripeKey.startsWith('sk_')) weakSecrets.push('Invalid Stripe key format');
    
    this.results.checks.environment = {
      status: missing.length === 0 ? 'healthy' : 'warning',
      missing_required: missing,
      missing_optional: optional,
      weak_secrets: weakSecrets,
      node_version: process.version,
      environment: process.env.NODE_ENV || 'development'
    };
    
    if (missing.length > 0) {
      this.results.recommendations.push(`Missing required environment variables: ${missing.join(', ')}`);
      this.results.status = 'warning';
    }
    if (weakSecrets.length > 0) {
      this.results.recommendations.push('Security: Update weak or default secrets');
    }
    
    console.log(missing.length === 0 ? '✅ Environment: Healthy' : '⚠️ Environment: Missing variables');
  }

  async checkMemory() {
    console.log('🔍 Checking memory usage...');
    
    const usage = process.memoryUsage();
    const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const externalMB = Math.round(usage.external / 1024 / 1024);
    
    this.results.checks.memory = {
      status: usedMB < 800 ? 'healthy' : 'warning',
      heap_total: `${totalMB}MB`,
      heap_used: `${usedMB}MB`,
      heap_used_percentage: Math.round((usedMB / totalMB) * 100),
      external: `${externalMB}MB`,
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`
    };
    
    if (usedMB > 800) {
      this.results.recommendations.push('High memory usage detected - consider PM2 restart or optimization');
      this.results.status = 'warning';
    }
    
    console.log(usedMB < 800 ? '✅ Memory: Healthy' : '⚠️ Memory: High usage');
  }

  async checkDiskSpace() {
    console.log('🔍 Checking disk space...');
    
    try {
      const { execSync } = require('child_process');
      
      // Check current directory disk usage
      const dfOutput = execSync('df -h .', { encoding: 'utf8' });
      const lines = dfOutput.trim().split('\n');
      const dataLine = lines[1].split(/\s+/);
      
      const diskInfo = {
        filesystem: dataLine[0],
        size: dataLine[1],
        used: dataLine[2],
        available: dataLine[3],
        use_percentage: dataLine[4],
        mount_point: dataLine[5]
      };
      
      const usePercent = parseInt(diskInfo.use_percentage.replace('%', ''));
      
      this.results.checks.disk = {
        status: usePercent < 85 ? 'healthy' : 'warning',
        ...diskInfo
      };
      
      if (usePercent > 85) {
        this.results.recommendations.push('Disk usage > 85% - clean up logs and temporary files');
        this.results.status = 'warning';
      }
      
      console.log(usePercent < 85 ? '✅ Disk: Healthy' : '⚠️ Disk: High usage');
      
    } catch (error) {
      this.results.checks.disk = {
        status: 'error',
        error: 'Could not check disk usage (Windows/WSL limitation)'
      };
    }
  }

  async checkAPIPerformance() {
    console.log('🔍 Checking API performance...');
    
    const testEndpoints = [
      { url: 'http://localhost:1337/api/artists-works?pagination[limit]=1', name: 'artists-work' },
      { url: 'http://localhost:1337/api/artists?pagination[limit]=1', name: 'artists' },
      { url: 'http://localhost:1337/_health', name: 'health' }
    ];
    
    const results = [];
    
    for (const endpoint of testEndpoints) {
      try {
        const startTime = Date.now();
        const response = await fetch(endpoint.url);
        const responseTime = Date.now() - startTime;
        
        results.push({
          endpoint: endpoint.name,
          status: response.status,
          response_time: `${responseTime}ms`,
          healthy: response.status === 200 && responseTime < 500
        });
        
        if (responseTime > 500) {
          this.results.recommendations.push(`Slow API response: ${endpoint.name} (${responseTime}ms)`);
        }
        
      } catch (error) {
        results.push({
          endpoint: endpoint.name,
          status: 'error',
          error: error.message,
          healthy: false
        });
      }
    }
    
    this.results.checks.api_performance = {
      status: results.every(r => r.healthy) ? 'healthy' : 'warning',
      endpoints: results
    };
    
    const healthyCount = results.filter(r => r.healthy).length;
    console.log(`${healthyCount === results.length ? '✅' : '⚠️'} API Performance: ${healthyCount}/${results.length} endpoints healthy`);
  }

  async checkContentTypes() {
    console.log('🔍 Checking content-type schemas...');
    
    const fs = require('fs');
    const path = require('path');
    
    const issues = [];
    
    // Check for known relationship issues
    const cartItemSchema = path.join(process.cwd(), 'src/api/cart-item/content-types/cart-item/schema.json');
    const orderedItemSchema = path.join(process.cwd(), 'src/api/ordered-item/content-types/ordered-item/schema.json');
    
    try {
      if (fs.existsSync(cartItemSchema)) {
        const cartItem = JSON.parse(fs.readFileSync(cartItemSchema, 'utf8'));
        if (cartItem.attributes.cart?.relation === 'manyToMany') {
          issues.push('cart-item uses manyToMany instead of manyToOne with cart');
        }
      }
      
      if (fs.existsSync(orderedItemSchema)) {
        const orderedItem = JSON.parse(fs.readFileSync(orderedItemSchema, 'utf8'));
        if (orderedItem.attributes.order?.relation === 'manyToMany') {
          issues.push('ordered-item uses manyToMany instead of manyToOne with order');
        }
      }
      
      // Count content types
      const apiDir = path.join(process.cwd(), 'src/api');
      const contentTypes = fs.readdirSync(apiDir).filter(dir => {
        const schemaPath = path.join(apiDir, dir, 'content-types', dir, 'schema.json');
        return fs.existsSync(schemaPath);
      });
      
      this.results.checks.content_types = {
        status: issues.length === 0 ? 'healthy' : 'error',
        total_content_types: contentTypes.length,
        schema_issues: issues
      };
      
      if (issues.length > 0) {
        this.results.recommendations.push('Fix content-type relationship issues to prevent data integrity problems');
        this.results.status = 'warning';
      }
      
      console.log(issues.length === 0 ? '✅ Content Types: Healthy' : '❌ Content Types: Schema issues found');
      
    } catch (error) {
      this.results.checks.content_types = {
        status: 'error',
        error: error.message
      };
    }
  }

  generateReport() {
    console.log('\n📊 DIAGNOSTIC REPORT');
    console.log('='.repeat(50));
    console.log(`Status: ${this.results.status.toUpperCase()}`);
    console.log(`Timestamp: ${this.results.timestamp}`);
    console.log();
    
    // Summary
    const checks = Object.values(this.results.checks);
    const healthy = checks.filter(c => c.status === 'healthy').length;
    const warning = checks.filter(c => c.status === 'warning').length;
    const error = checks.filter(c => c.status === 'error').length;
    
    console.log(`Health Summary: ${healthy} healthy, ${warning} warnings, ${error} errors`);
    console.log();
    
    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log('🔧 RECOMMENDATIONS:');
      this.results.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
      console.log();
    }
    
    // Details
    console.log('📋 DETAILED RESULTS:');
    Object.entries(this.results.checks).forEach(([check, result]) => {
      const icon = result.status === 'healthy' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      console.log(`${icon} ${check.toUpperCase()}: ${result.status}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log('\n💾 Full report saved to ./diagnostics-report.json');
    
    // Save detailed report
    const fs = require('fs');
    fs.writeFileSync('./diagnostics-report.json', JSON.stringify(this.results, null, 2));
  }
}

// CLI usage
if (require.main === module) {
  const diagnostics = new StrapiDiagnostics();
  diagnostics.runAllDiagnostics().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = StrapiDiagnostics;