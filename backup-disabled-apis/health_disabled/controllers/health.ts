/**
 * Health check controller
 * Provides system health status for monitoring
 */

import { Context } from 'koa';

interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  environment: string;
  database: 'connected' | 'disconnected';
  redis?: 'connected' | 'disconnected';
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

export default ({ strapi }) => ({
  /**
   * Health check endpoint for monitoring
   * GET /api/health
   */
  async check(ctx: Context) {
    try {
      const healthStatus: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: strapi.config.info.strapi,
        environment: process.env.NODE_ENV || 'development',
        database: 'disconnected',
        uptime: process.uptime(),
        memory: {
          used: 0,
          total: 0,
          percentage: 0
        }
      };

      // Check database connection
      try {
        await strapi.db.connection.raw('SELECT 1');
        healthStatus.database = 'connected';
      } catch (dbError) {
        strapi.log.error('Database health check failed:', dbError);
        healthStatus.status = 'error';
      }

      // Check Redis if available
      if ((strapi as any).redis) {
        try {
          await (strapi as any).redis.ping();
          healthStatus.redis = 'connected';
        } catch (redisError) {
          strapi.log.error('Redis health check failed:', redisError);
          healthStatus.redis = 'disconnected';
        }
      }

      // Memory usage
      const memUsage = process.memoryUsage();
      healthStatus.memory = {
        used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      };

      // Set appropriate status code
      ctx.status = healthStatus.status === 'ok' ? 200 : 503;
      ctx.body = healthStatus;
    } catch (error) {
      strapi.log.error('Health check error:', error);
      ctx.status = 503;
      ctx.body = {
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Health check failed'
      };
    }
  },

  /**
   * Simple ping endpoint
   * GET /api/health/ping
   */
  async ping(ctx: Context) {
    ctx.body = { pong: true, timestamp: new Date().toISOString() };
  }
});