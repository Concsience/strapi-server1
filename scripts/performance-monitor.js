#!/usr/bin/env node

/**
 * ArtEdusa Strapi Real-time Performance Monitor
 * Continuous monitoring with alerts and optimization suggestions
 */

const EventEmitter = require('events');
const Redis = require('ioredis');
const { Client } = require('pg');

class PerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.interval = options.interval || 30000; // 30 seconds
    this.alertThresholds = {
      memory: options.memoryThreshold || 800, // MB
      database: options.dbThreshold || 200, // ms
      redis: options.redisThreshold || 50, // ms
      api: options.apiThreshold || 500, // ms
      disk: options.diskThreshold || 85 // %
    };
    this.isRunning = false;
    this.metrics = [];
    this.alerts = [];
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ Monitor already running');
      return;
    }

    console.log('🚀 Starting ArtEdusa Performance Monitor...');
    console.log(`📊 Monitoring interval: ${this.interval / 1000}s`);
    console.log('📈 Thresholds:', this.alertThresholds);
    console.log('=' .repeat(60));

    this.isRunning = true;
    this.monitorLoop();
  }

  stop() {
    console.log('🛑 Stopping Performance Monitor...');
    this.isRunning = false;
  }

  async monitorLoop() {
    while (this.isRunning) {
      try {
        const metrics = await this.collectMetrics();
        this.analyzeMetrics(metrics);
        this.displayMetrics(metrics);
        
        // Store metrics for trend analysis
        this.metrics.push(metrics);
        if (this.metrics.length > 100) {
          this.metrics.shift(); // Keep last 100 measurements
        }
        
        await this.sleep(this.interval);
      } catch (error) {
        console.error('❌ Monitor error:', error.message);
        await this.sleep(5000); // Wait 5s before retry
      }
    }
  }

  async collectMetrics() {
    const timestamp = new Date();
    const metrics = { timestamp };

    // Collect all metrics in parallel
    const [
      memoryMetrics,
      databaseMetrics,
      redisMetrics,
      apiMetrics,
      systemMetrics
    ] = await Promise.allSettled([
      this.getMemoryMetrics(),
      this.getDatabaseMetrics(),
      this.getRedisMetrics(),
      this.getAPIMetrics(),
      this.getSystemMetrics()
    ]);

    metrics.memory = memoryMetrics.status === 'fulfilled' ? memoryMetrics.value : { error: memoryMetrics.reason };
    metrics.database = databaseMetrics.status === 'fulfilled' ? databaseMetrics.value : { error: databaseMetrics.reason };
    metrics.redis = redisMetrics.status === 'fulfilled' ? redisMetrics.value : { error: redisMetrics.reason };
    metrics.api = apiMetrics.status === 'fulfilled' ? apiMetrics.value : { error: apiMetrics.reason };
    metrics.system = systemMetrics.status === 'fulfilled' ? systemMetrics.value : { error: systemMetrics.reason };

    return metrics;
  }

  async getMemoryMetrics() {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapUsedPercent: Math.round((usage.heapUsed / usage.heapTotal) * 100)
    };
  }

  async getDatabaseMetrics() {
    const client = new Client({
      host: process.env.DATABASE_HOST || '127.0.0.1',
      port: process.env.DATABASE_PORT || 5432,
      database: process.env.DATABASE_NAME || 'strapi_conscience',
      user: process.env.DATABASE_USERNAME || 'strapi',
      password: process.env.DATABASE_PASSWORD || 'strapi123'
    });

    try {
      const startTime = Date.now();
      await client.connect();
      
      // Simple test query
      await client.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      
      // Get connection count
      const connResult = await client.query(`
        SELECT count(*) as active_connections,
               max(query_start) as oldest_query
        FROM pg_stat_activity 
        WHERE state = 'active'
      `);
      
      // Get slow queries (if any)
      const slowQueries = await client.query(`
        SELECT query, query_start, state, wait_event_type, wait_event
        FROM pg_stat_activity 
        WHERE state = 'active' 
        AND query_start < now() - interval '5 seconds'
        AND query NOT LIKE '%pg_stat_activity%'
        LIMIT 5
      `);

      return {
        responseTime,
        activeConnections: parseInt(connResult.rows[0].active_connections),
        slowQueries: slowQueries.rows.length,
        oldestQuery: connResult.rows[0].oldest_query
      };
    } finally {
      await client.end();
    }
  }

  async getRedisMetrics() {
    const redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true
    });

    try {
      const startTime = Date.now();
      await redis.connect();
      
      // Test operation
      await redis.ping();
      const responseTime = Date.now() - startTime;
      
      // Get key counts
      const cacheKeys = await redis.keys('strapi_cache_*');
      const rateLimitKeys = await redis.keys('rate_limit:*');
      
      // Get memory info
      const info = await redis.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryBytes = memoryMatch ? parseInt(memoryMatch[1]) : 0;
      const memoryMB = Math.round(memoryBytes / 1024 / 1024);

      return {
        responseTime,
        memoryUsed: memoryMB,
        cacheKeys: cacheKeys.length,
        rateLimitKeys: rateLimitKeys.length
      };
    } finally {
      redis.disconnect();
    }
  }

  async getAPIMetrics() {
    const endpoints = [
      { url: 'http://localhost:1337/_health', name: 'health' },
      { url: 'http://localhost:1337/api/artists-works?pagination[limit]=1', name: 'artists-work' }
    ];

    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await fetch(endpoint.url, { 
          timeout: 10000,
          headers: { 'User-Agent': 'ArtEdusa-Monitor' }
        });
        const responseTime = Date.now() - startTime;
        
        results[endpoint.name] = {
          responseTime,
          status: response.status,
          success: response.status === 200
        };
      } catch (error) {
        results[endpoint.name] = {
          responseTime: null,
          status: 'error',
          error: error.message,
          success: false
        };
      }
    }

    return results;
  }

  async getSystemMetrics() {
    try {
      const { execSync } = require('child_process');
      
      // Get load average (Unix-like systems)
      let loadAvg = null;
      try {
        const loadOutput = execSync('uptime', { encoding: 'utf8' });
        const loadMatch = loadOutput.match(/load average: ([0-9.]+)/);
        loadAvg = loadMatch ? parseFloat(loadMatch[1]) : null;
      } catch (e) {
        // Windows/WSL might not have uptime
      }
      
      // Get disk usage
      let diskUsage = null;
      try {
        const dfOutput = execSync('df -h .', { encoding: 'utf8' });
        const lines = dfOutput.trim().split('\n');
        const dataLine = lines[1].split(/\s+/);
        diskUsage = {
          used: dataLine[2],
          available: dataLine[3],
          usePercent: parseInt(dataLine[4].replace('%', ''))
        };
      } catch (e) {
        // Fallback for Windows
      }

      return {
        loadAverage: loadAvg,
        diskUsage,
        nodeVersion: process.version,
        uptime: Math.round(process.uptime())
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  analyzeMetrics(metrics) {
    const alerts = [];

    // Memory alerts
    if (metrics.memory.heapUsed > this.alertThresholds.memory) {
      alerts.push({
        type: 'memory',
        level: 'warning',
        message: `High memory usage: ${metrics.memory.heapUsed}MB`,
        value: metrics.memory.heapUsed,
        threshold: this.alertThresholds.memory
      });
    }

    // Database alerts
    if (metrics.database.responseTime > this.alertThresholds.database) {
      alerts.push({
        type: 'database',
        level: 'warning',
        message: `Slow database response: ${metrics.database.responseTime}ms`,
        value: metrics.database.responseTime,
        threshold: this.alertThresholds.database
      });
    }

    if (metrics.database.slowQueries > 0) {
      alerts.push({
        type: 'database',
        level: 'info',
        message: `${metrics.database.slowQueries} slow queries detected`,
        value: metrics.database.slowQueries
      });
    }

    // Redis alerts
    if (metrics.redis.responseTime > this.alertThresholds.redis) {
      alerts.push({
        type: 'redis',
        level: 'warning',
        message: `Slow Redis response: ${metrics.redis.responseTime}ms`,
        value: metrics.redis.responseTime,
        threshold: this.alertThresholds.redis
      });
    }

    // API alerts
    Object.entries(metrics.api).forEach(([endpoint, data]) => {
      if (data.responseTime && data.responseTime > this.alertThresholds.api) {
        alerts.push({
          type: 'api',
          level: 'warning',
          message: `Slow API endpoint ${endpoint}: ${data.responseTime}ms`,
          value: data.responseTime,
          threshold: this.alertThresholds.api
        });
      }
      if (!data.success) {
        alerts.push({
          type: 'api',
          level: 'error',
          message: `API endpoint ${endpoint} failed: ${data.error || data.status}`,
          value: data.status
        });
      }
    });

    // Disk alerts
    if (metrics.system.diskUsage && metrics.system.diskUsage.usePercent > this.alertThresholds.disk) {
      alerts.push({
        type: 'disk',
        level: 'warning',
        message: `High disk usage: ${metrics.system.diskUsage.usePercent}%`,
        value: metrics.system.diskUsage.usePercent,
        threshold: this.alertThresholds.disk
      });
    }

    // Add new alerts
    alerts.forEach(alert => {
      alert.timestamp = metrics.timestamp;
      this.alerts.push(alert);
      this.emit('alert', alert);
    });

    // Keep only recent alerts
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => alert.timestamp > oneHourAgo);
  }

  displayMetrics(metrics) {
    const now = metrics.timestamp.toLocaleTimeString();
    
    // Clear screen and show header
    console.clear();
    console.log('🎨 ArtEdusa Strapi Performance Monitor');
    console.log('=' .repeat(60));
    console.log(`📅 ${now} | Status: ${this.getOverallStatus()}`);
    console.log();

    // Memory
    const memIcon = metrics.memory.heapUsed > this.alertThresholds.memory ? '🔴' : '🟢';
    console.log(`${memIcon} Memory: ${metrics.memory.heapUsed}MB / ${metrics.memory.heapTotal}MB (${metrics.memory.heapUsedPercent}%)`);

    // Database
    const dbIcon = metrics.database.responseTime > this.alertThresholds.database ? '🔴' : '🟢';
    console.log(`${dbIcon} Database: ${metrics.database.responseTime}ms | Connections: ${metrics.database.activeConnections}`);

    // Redis
    const redisIcon = metrics.redis.responseTime > this.alertThresholds.redis ? '🔴' : '🟢';
    console.log(`${redisIcon} Redis: ${metrics.redis.responseTime}ms | Cache Keys: ${metrics.redis.cacheKeys} | Memory: ${metrics.redis.memoryUsed}MB`);

    // API
    console.log('🌐 API Endpoints:');
    Object.entries(metrics.api).forEach(([endpoint, data]) => {
      const icon = data.success ? '🟢' : '🔴';
      const time = data.responseTime ? `${data.responseTime}ms` : 'failed';
      console.log(`   ${icon} ${endpoint}: ${time}`);
    });

    // System
    if (metrics.system.diskUsage) {
      const diskIcon = metrics.system.diskUsage.usePercent > this.alertThresholds.disk ? '🔴' : '🟢';
      console.log(`${diskIcon} Disk: ${metrics.system.diskUsage.usePercent}% used (${metrics.system.diskUsage.available} free)`);
    }

    // Recent alerts
    if (this.alerts.length > 0) {
      console.log();
      console.log('🚨 Recent Alerts:');
      this.alerts.slice(-5).forEach(alert => {
        const icon = alert.level === 'error' ? '🔴' : alert.level === 'warning' ? '🟡' : 'ℹ️';
        const time = alert.timestamp.toLocaleTimeString();
        console.log(`   ${icon} ${time} - ${alert.message}`);
      });
    }

    // Performance trends
    if (this.metrics.length > 10) {
      console.log();
      console.log('📈 Trends (last 10 measurements):');
      this.showTrends();
    }

    console.log();
    console.log('Press Ctrl+C to stop monitoring...');
  }

  showTrends() {
    const recentMetrics = this.metrics.slice(-10);
    
    // Memory trend
    const memoryTrend = recentMetrics.map(m => m.memory.heapUsed);
    const memoryChange = memoryTrend[memoryTrend.length - 1] - memoryTrend[0];
    const memoryIcon = memoryChange > 50 ? '📈' : memoryChange < -50 ? '📉' : '➡️';
    console.log(`   ${memoryIcon} Memory: ${memoryChange > 0 ? '+' : ''}${memoryChange}MB over last 10 checks`);

    // Database trend
    const dbTrend = recentMetrics.map(m => m.database.responseTime);
    const avgDbTime = Math.round(dbTrend.reduce((a, b) => a + b, 0) / dbTrend.length);
    const dbIcon = avgDbTime > this.alertThresholds.database ? '📈' : '📉';
    console.log(`   ${dbIcon} Database: ${avgDbTime}ms average response time`);

    // API trend
    const apiHealthTrend = recentMetrics.map(m => 
      Object.values(m.api).filter(endpoint => endpoint.success).length / Object.keys(m.api).length
    );
    const avgApiHealth = Math.round(apiHealthTrend.reduce((a, b) => a + b, 0) / apiHealthTrend.length * 100);
    const apiIcon = avgApiHealth < 90 ? '🔴' : avgApiHealth < 98 ? '🟡' : '🟢';
    console.log(`   ${apiIcon} API Health: ${avgApiHealth}% average success rate`);
  }

  getOverallStatus() {
    const recentAlerts = this.alerts.filter(alert => 
      alert.timestamp > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
    );
    
    const errorAlerts = recentAlerts.filter(alert => alert.level === 'error');
    const warningAlerts = recentAlerts.filter(alert => alert.level === 'warning');
    
    if (errorAlerts.length > 0) return '🔴 ERROR';
    if (warningAlerts.length > 0) return '🟡 WARNING';
    return '🟢 HEALTHY';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Export metrics for external tools
  exportMetrics() {
    return {
      current: this.metrics[this.metrics.length - 1],
      history: this.metrics,
      alerts: this.alerts,
      summary: this.generateSummary()
    };
  }

  generateSummary() {
    if (this.metrics.length === 0) return null;

    const recent = this.metrics.slice(-10);
    return {
      averageMemory: Math.round(recent.reduce((sum, m) => sum + m.memory.heapUsed, 0) / recent.length),
      averageDbTime: Math.round(recent.reduce((sum, m) => sum + m.database.responseTime, 0) / recent.length),
      averageRedisTime: Math.round(recent.reduce((sum, m) => sum + m.redis.responseTime, 0) / recent.length),
      alertsCount: this.alerts.length,
      uptime: Math.round(process.uptime()),
      status: this.getOverallStatus()
    };
  }
}

// CLI usage
if (require.main === module) {
  const monitor = new PerformanceMonitor();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down monitor...');
    monitor.stop();
    
    // Generate final report
    const summary = monitor.generateSummary();
    if (summary) {
      console.log('\n📊 Final Summary:');
      console.log(`   Average Memory: ${summary.averageMemory}MB`);
      console.log(`   Average DB Time: ${summary.averageDbTime}ms`);
      console.log(`   Average Redis Time: ${summary.averageRedisTime}ms`);
      console.log(`   Total Alerts: ${summary.alertsCount}`);
      console.log(`   Uptime: ${summary.uptime}s`);
    }
    
    process.exit(0);
  });

  // Log alerts to console
  monitor.on('alert', (alert) => {
    const icon = alert.level === 'error' ? '🔴' : alert.level === 'warning' ? '🟡' : 'ℹ️';
    console.log(`\n${icon} ALERT: ${alert.message}`);
  });

  monitor.start();
}

module.exports = PerformanceMonitor;