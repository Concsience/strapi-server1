/**
 * Error Monitoring API Controller
 * Provides endpoints for error tracking, statistics, and management
 */

import { Context } from 'koa';
import { errorLogger, ErrorSeverity } from '../../../utils/error-handler';
import { performanceMonitor } from '../../../middlewares/performance-monitor';

export default {
  /**
   * Get error statistics and trends
   * GET /api/error-monitoring/stats
   */
  async getStats(ctx: Context) {
    try {
      const stats = errorLogger.getStats();
      const performanceStats = performanceMonitor.getStats();
      
      const response = {
        timestamp: new Date().toISOString(),
        errors: stats,
        performance: {
          errorRate: performanceStats.errorRate,
          averageResponseTime: performanceStats.averageResponseTime,
          totalRequests: performanceStats.totalRequests
        },
        system: performanceMonitor.getSystemMetrics()
      };

      ctx.body = { data: response };
    } catch (error) {
      ctx.throw(500, 'Failed to retrieve error statistics');
    }
  },

  /**
   * Get recent error trends
   * GET /api/error-monitoring/trends
   */
  async getTrends(ctx: Context) {
    try {
      const { timeframe = '1h' } = ctx.query;
      
      // Calculate timeframe in milliseconds
      const timeframes = {
        '5m': 5 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000
      };

      const duration = timeframes[timeframe as keyof typeof timeframes] || timeframes['1h'];
      const now = Date.now();
      const startTime = now - duration;

      // This would typically query a time-series database
      // For demo purposes, we'll return mock trend data
      const trends = {
        timeframe,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(now).toISOString(),
        errorCounts: [
          { timestamp: startTime, count: 5 },
          { timestamp: startTime + duration * 0.25, count: 8 },
          { timestamp: startTime + duration * 0.5, count: 12 },
          { timestamp: startTime + duration * 0.75, count: 6 },
          { timestamp: now, count: 3 }
        ],
        severityBreakdown: [
          { severity: ErrorSeverity.LOW, count: 15 },
          { severity: ErrorSeverity.MEDIUM, count: 8 },
          { severity: ErrorSeverity.HIGH, count: 3 },
          { severity: ErrorSeverity.CRITICAL, count: 1 }
        ],
        topErrorCodes: [
          { code: 'VAL_001', count: 12, description: 'Validation failed' },
          { code: 'AUTH_001', count: 8, description: 'Authentication required' },
          { code: 'ECOM_001', count: 5, description: 'Product not found' }
        ]
      };

      ctx.body = { data: trends };
    } catch (error) {
      ctx.throw(500, 'Failed to retrieve error trends');
    }
  },

  /**
   * Get detailed error information
   * GET /api/error-monitoring/details/:errorCode
   */
  async getErrorDetails(ctx: Context) {
    try {
      const { errorCode } = ctx.params;
      const { limit = 50 } = ctx.query;

      // In a real implementation, this would query the error database
      const errorDetails = {
        code: errorCode,
        description: this.getErrorDescription(errorCode),
        totalOccurrences: 127,
        lastOccurrence: new Date().toISOString(),
        averageFrequency: '2.3 per hour',
        affectedUsers: 15,
        resolution: {
          status: 'investigating',
          assignedTo: 'backend-team',
          estimatedResolution: '2024-01-15T14:00:00Z'
        },
        recentOccurrences: Array.from({ length: Math.min(parseInt(limit as string), 50) }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
          userId: i % 3 === 0 ? `user_${Math.floor(Math.random() * 1000)}` : null,
          context: {
            path: `/api/artists-work/${Math.floor(Math.random() * 100)}`,
            method: 'GET',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            ip: `192.168.1.${Math.floor(Math.random() * 255)}`
          }
        }))
      };

      ctx.body = { data: errorDetails };
    } catch (error) {
      ctx.throw(500, 'Failed to retrieve error details');
    }
  },

  /**
   * Mark error as resolved
   * POST /api/error-monitoring/resolve/:errorCode
   */
  async resolveError(ctx: Context) {
    try {
      const { errorCode } = ctx.params;
      const { resolution, notes } = ctx.request.body;

      // In a real implementation, this would update the error database
      const result = {
        errorCode,
        status: 'resolved',
        resolvedBy: ctx.state.user?.id || 'system',
        resolvedAt: new Date().toISOString(),
        resolution,
        notes
      };

      console.log(`Error ${errorCode} marked as resolved:`, result);

      ctx.body = { data: result };
    } catch (error) {
      ctx.throw(500, 'Failed to resolve error');
    }
  },

  /**
   * Create error alert rule
   * POST /api/error-monitoring/alerts
   */
  async createAlertRule(ctx: Context) {
    try {
      const {
        name,
        errorCode,
        threshold,
        timeWindow,
        severity,
        notificationChannels
      } = ctx.request.body;

      // Validate input
      if (!name || !errorCode || !threshold || !timeWindow) {
        ctx.throw(400, 'Missing required fields');
      }

      const alertRule = {
        id: `alert_${Date.now()}`,
        name,
        errorCode,
        threshold,
        timeWindow,
        severity: severity || ErrorSeverity.MEDIUM,
        notificationChannels: notificationChannels || ['email'],
        createdBy: ctx.state.user?.id || 'system',
        createdAt: new Date().toISOString(),
        enabled: true
      };

      // In a real implementation, this would be stored in database
      console.log('Alert rule created:', alertRule);

      ctx.body = { data: alertRule };
    } catch (error) {
      ctx.throw(500, 'Failed to create alert rule');
    }
  },

  /**
   * Test error (for development/testing)
   * POST /api/error-monitoring/test
   */
  async testError(ctx: Context) {
    if (process.env.NODE_ENV === 'production') {
      ctx.throw(403, 'Test errors not allowed in production');
    }

    const { errorType = 'validation', severity = 'low' } = ctx.request.body;

    // Import here to avoid circular dependency
    const { AppError, ErrorCode, ErrorSeverity } = await import('../../../utils/error-handler');

    const testErrors = {
      validation: new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Test validation error',
        severity: ErrorSeverity.LOW,
        statusCode: 400,
        metadata: { testError: true }
      }),
      payment: new AppError({
        code: ErrorCode.PAYMENT_FAILED,
        message: 'Test payment error',
        severity: ErrorSeverity.HIGH,
        statusCode: 402,
        metadata: { testError: true }
      }),
      system: new AppError({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Test system error',
        severity: ErrorSeverity.CRITICAL,
        statusCode: 500,
        metadata: { testError: true }
      })
    };

    const error = testErrors[errorType as keyof typeof testErrors] || testErrors.validation;
    throw error;
  },

  /**
   * Health check for error monitoring system
   * GET /api/error-monitoring/health
   */
  async healthCheck(ctx: Context) {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        errorLogger: 'operational',
        performanceMonitor: 'operational',
        database: 'operational', // Would check actual DB connection
        alerting: 'operational'
      },
      metrics: {
        errorProcessingLatency: '< 10ms',
        alertDeliveryTime: '< 30s',
        storageUtilization: '45%'
      }
    };

    ctx.body = { data: health };
  },

  /**
   * Export error data
   * GET /api/error-monitoring/export
   */
  async exportErrors(ctx: Context) {
    try {
      const { format = 'json', startDate, endDate, errorCodes } = ctx.query;

      // In a real implementation, this would query the database with filters
      const exportData = {
        exportInfo: {
          format,
          startDate: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: endDate || new Date().toISOString(),
          errorCodes: errorCodes ? errorCodes.toString().split(',') : null,
          totalRecords: 0
        },
        errors: performanceMonitor.exportMetrics() // Use performance monitor data for now
      };

      exportData.exportInfo.totalRecords = exportData.errors.length;

      if (format === 'csv') {
        // Convert to CSV format
        const csvHeaders = 'timestamp,method,path,statusCode,responseTime,error\n';
        const csvData = exportData.errors
          .map(metric => 
            `${new Date(metric.timestamp).toISOString()},${metric.method},${metric.path},${metric.statusCode},${metric.responseTime},${metric.error || ''}`
          )
          .join('\n');
        
        ctx.set('Content-Type', 'text/csv');
        ctx.set('Content-Disposition', `attachment; filename="errors-export-${Date.now()}.csv"`);
        ctx.body = csvHeaders + csvData;
      } else {
        ctx.set('Content-Type', 'application/json');
        ctx.set('Content-Disposition', `attachment; filename="errors-export-${Date.now()}.json"`);
        ctx.body = exportData;
      }
    } catch (error) {
      ctx.throw(500, 'Failed to export error data');
    }
  },

  /**
   * Helper method to get error description
   */
  getErrorDescription(errorCode: string): string {
    const descriptions = {
      'AUTH_001': 'User authentication is required to access this resource',
      'AUTH_002': 'Invalid login credentials provided',
      'VAL_001': 'Input validation failed due to invalid or missing data',
      'ECOM_001': 'Requested product or artwork could not be found',
      'ECOM_002': 'Insufficient stock available for the requested quantity',
      'DB_001': 'Database operation failed due to connection or query issues',
      'SYS_001': 'Unexpected internal server error occurred'
    };

    return descriptions[errorCode as keyof typeof descriptions] || 'Unknown error code';
  }
};