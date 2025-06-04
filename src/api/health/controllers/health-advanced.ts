/**
 * Advanced Health Check Controller
 * Provides comprehensive system health monitoring for production environments
 */

import { Context } from 'koa';
import * as os from 'os';
import { performance } from 'perf_hooks';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: {
    strapi: string;
    node: string;
    app: string;
  };
  system: {
    memory: {
      used: string;
      available: string;
      percentage: number;
    };
    cpu: {
      usage: number;
      cores: number;
    };
    load: number[];
  };
  services: {
    database: HealthStatus;
    redis?: HealthStatus;
    s3?: HealthStatus;
    stripe?: HealthStatus;
  };
  performance: {
    responseTime: number;
    requestsPerMinute?: number;
  };
}

interface HealthStatus {
  status: 'ok' | 'error' | 'timeout';
  responseTime?: number;
  message?: string;
  details?: any;
}

export default ({ strapi }) => ({
  /**
   * Comprehensive health check endpoint
   * GET /api/health/advanced
   */
  async index(ctx: Context) {
    const startTime = performance.now();
    const healthCheck: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: {
        strapi: strapi.config.get('info.strapi') || '5.14.0',
        node: process.version,
        app: process.env.npm_package_version || '0.1.0'
      },
      system: {
        memory: {
          used: '0 MB',
          available: '0 MB',
          percentage: 0
        },
        cpu: {
          usage: 0,
          cores: os.cpus().length
        },
        load: os.loadavg()
      },
      services: {
        database: { status: 'ok' }
      },
      performance: {
        responseTime: 0
      }
    };

    // System metrics
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    healthCheck.system.memory = {
      used: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      available: `${Math.round(freeMem / 1024 / 1024)} MB`,
      percentage: Math.round((usedMem / totalMem) * 100)
    };

    // CPU usage (simplified)
    const cpus = os.cpus();
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTick = cpus.reduce((acc, cpu) => 
      acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq, 0
    );
    healthCheck.system.cpu.usage = Math.round(100 - ((totalIdle / totalTick) * 100));

    // Check services
    const services = await this.checkServices();
    healthCheck.services = services;

    // Determine overall health
    const hasErrors = Object.values(services).some(s => (s as any).status === 'error');
    const hasTimeouts = Object.values(services).some(s => (s as any).status === 'timeout');
    
    if (hasErrors) {
      healthCheck.status = 'unhealthy';
      ctx.status = 503;
    } else if (hasTimeouts) {
      healthCheck.status = 'degraded';
      ctx.status = 200;
    }

    // Calculate response time
    healthCheck.performance.responseTime = Math.round(performance.now() - startTime);

    ctx.body = healthCheck;
  },

  /**
   * Detailed health check with individual service checks
   * GET /api/health/detailed
   */
  async detailed(ctx: Context) {
    const startTime = performance.now();
    
    // Perform comprehensive health checks
    const [dbHealth, redisHealth, s3Health, stripeHealth] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkS3(),
      this.checkStripe()
    ]);

    const resolveHealthCheck = (result: PromiseSettledResult<HealthStatus>): HealthStatus => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        status: 'error',
        message: result.reason?.message || 'Check failed'
      };
    };

    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: resolveHealthCheck(dbHealth),
        redis: resolveHealthCheck(redisHealth),
        s3: resolveHealthCheck(s3Health),
        stripe: resolveHealthCheck(stripeHealth)
      },
      metrics: {
        memory: process.memoryUsage(),
        cpu: os.loadavg(),
        uptime: process.uptime(),
        responseTime: Math.round(performance.now() - startTime)
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        host: process.env.HOST
      }
    };

    // Determine overall status
    const hasErrors = Object.values(response.checks).some(c => c.status === 'error');
    if (hasErrors) {
      response.status = 'unhealthy';
      ctx.status = 503;
    }

    ctx.body = response;
  },

  /**
   * Check all services
   */
  async checkServices() {
    const services: any = {};
    
    // Database check
    try {
      const dbStart = performance.now();
      await strapi.db.connection.raw('SELECT 1');
      services.database = {
        status: 'ok' as const,
        responseTime: Math.round(performance.now() - dbStart)
      };
    } catch (error: any) {
      services.database = {
        status: 'error' as const,
        message: error.message
      };
    }

    // Redis check (if configured)
    if (process.env.REDIS_HOST) {
      try {
        const Redis = require('ioredis');
        const redis = new Redis({
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          lazyConnect: true,
          connectTimeout: 5000
        });
        
        const redisStart = performance.now();
        await redis.connect();
        await redis.ping();
        await redis.disconnect();
        
        services.redis = {
          status: 'ok' as const,
          responseTime: Math.round(performance.now() - redisStart)
        };
      } catch (error: any) {
        services.redis = {
          status: 'error' as const,
          message: error.message
        };
      }
    }

    return services;
  },

  /**
   * Check database health
   */
  async checkDatabase(): Promise<HealthStatus> {
    try {
      const start = performance.now();
      const result = await strapi.db.connection.raw('SELECT version()');
      
      return {
        status: 'ok',
        responseTime: Math.round(performance.now() - start),
        details: {
          version: result.rows?.[0]?.version || 'unknown'
        }
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message
      };
    }
  },

  /**
   * Check Redis health
   */
  async checkRedis(): Promise<HealthStatus> {
    if (!process.env.REDIS_HOST) {
      return {
        status: 'ok',
        message: 'Redis not configured'
      };
    }

    try {
      const Redis = require('ioredis');
      const redis = new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 5000,
        lazyConnect: true
      });

      const start = performance.now();
      await redis.connect();
      const info = await redis.info();
      await redis.disconnect();

      return {
        status: 'ok',
        responseTime: Math.round(performance.now() - start),
        details: {
          connected: true,
          version: info.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown'
        }
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message
      };
    }
  },

  /**
   * Check S3 health
   */
  async checkS3(): Promise<HealthStatus> {
    if (!process.env.STRAPI_UPLOAD_ACCESS_KEY_ID) {
      return {
        status: 'ok',
        message: 'S3 not configured'
      };
    }

    try {
      const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
      const client = new S3Client({
        endpoint: process.env.STRAPI_UPLOAD_ENDPOINT,
        region: process.env.STRAPI_UPLOAD_REGION,
        credentials: {
          accessKeyId: process.env.STRAPI_UPLOAD_ACCESS_KEY_ID,
          secretAccessKey: process.env.STRAPI_UPLOAD_SECRET_ACCESS_KEY
        }
      });

      const start = performance.now();
      await client.send(new ListBucketsCommand({}));

      return {
        status: 'ok',
        responseTime: Math.round(performance.now() - start),
        details: {
          bucket: process.env.STRAPI_UPLOAD_BUCKET
        }
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message
      };
    }
  },

  /**
   * Check Stripe health
   */
  async checkStripe(): Promise<HealthStatus> {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        status: 'ok',
        message: 'Stripe not configured'
      };
    }

    try {
      const Stripe = require('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-12-18.acacia'
      });

      const start = performance.now();
      await stripe.accounts.retrieve();

      return {
        status: 'ok',
        responseTime: Math.round(performance.now() - start),
        details: {
          mode: process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'test' : 'live'
        }
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }
});