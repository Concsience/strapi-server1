/**
 * Request Logger Middleware - TypeScript version
 * Logs all HTTP requests with detailed metrics and error tracking
 * Preserves exact original behavior while adding type safety
 */

import { Strapi } from '@strapi/strapi';
import { StrapiContext, StrapiMiddleware } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface RequestLoggerConfig {
  excludePaths?: string[];
  includeResponseTime?: boolean;
  includeRequestId?: boolean;
}

interface RequestLog {
  requestId: string;
  method: string;
  path: string;
  query: any;
  ip: string;
  userAgent?: string;
  userId?: number;
  timestamp: string;
}

// Response log interface is used internally in the log objects

/**
 * Creates a request logging middleware
 * Logs all requests with unique IDs and timing information
 */
export default (config: RequestLoggerConfig = {}, { strapi }: { strapi: Strapi }): StrapiMiddleware => {
  return async (ctx: StrapiContext, next: () => Promise<void>): Promise<void> => {
    // Skip logging for excluded paths (exact same logic as original)
    if (config.excludePaths?.some(path => ctx.path.includes(path))) {
      return next();
    }

    const requestId = uuidv4();
    const startTime = Date.now();

    // Add request ID to context (preserving original structure)
    ctx.state.requestId = requestId;
    ctx.set('X-Request-ID', requestId);

    // Build request log object (exact same fields)
    const requestLog: RequestLog = {
      requestId,
      method: ctx.method,
      path: ctx.path,
      query: ctx.query,
      ip: ctx.ip,
      userAgent: ctx.get('user-agent'),
      userId: ctx.state?.user?.id,
      timestamp: new Date().toISOString(),
    };

    // Log request start (preserving exact log structure)
    strapi.log.info({
      type: 'request_start',
      ...requestLog,
    });

    try {
      await next();
      
      const responseTime = Date.now() - startTime;
      
      // Log successful response (exact same structure)
      strapi.log.info({
        type: 'request_complete',
        ...requestLog,
        status: ctx.status,
        responseTime,
        responseSize: ctx.response.length,
      });

      // Add response headers (preserving original conditions)
      if (config.includeResponseTime) {
        ctx.set('X-Response-Time', `${responseTime}ms`);
      }
      if (config.includeRequestId) {
        ctx.set('X-Request-ID', requestId);
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      // Log error response (preserving exact structure and logic)
      strapi.log.error({
        type: 'request_error',
        ...requestLog,
        status: error.status || 500,
        responseTime,
        error: {
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
      });

      // Re-throw error for Strapi to handle (preserving original behavior)
      throw error;
    }
  };
};

// Export configuration type
export type { RequestLoggerConfig };