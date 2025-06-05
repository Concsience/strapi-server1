/**
 * Centralized Error Handling System
 * Advanced error management, logging, alerting, and user-friendly responses
 */

import { Context } from 'koa';
import { performance } from 'perf_hooks';

export enum ErrorCode {
  // Authentication & Authorization
  AUTHENTICATION_REQUIRED = 'AUTH_001',
  INVALID_CREDENTIALS = 'AUTH_002',
  TOKEN_EXPIRED = 'AUTH_003',
  INSUFFICIENT_PERMISSIONS = 'AUTH_004',
  
  // Validation
  VALIDATION_FAILED = 'VAL_001',
  INVALID_INPUT = 'VAL_002',
  MISSING_REQUIRED_FIELD = 'VAL_003',
  
  // E-commerce Specific
  PRODUCT_NOT_FOUND = 'ECOM_001',
  INSUFFICIENT_STOCK = 'ECOM_002',
  CART_NOT_FOUND = 'ECOM_003',
  ORDER_NOT_FOUND = 'ECOM_004',
  PAYMENT_FAILED = 'ECOM_005',
  SHIPPING_UNAVAILABLE = 'ECOM_006',
  
  // External Services
  DATABASE_ERROR = 'DB_001',
  REDIS_ERROR = 'CACHE_001',
  S3_ERROR = 'STORAGE_001',
  STRIPE_ERROR = 'PAYMENT_001',
  EMAIL_ERROR = 'EMAIL_001',
  
  // System
  INTERNAL_ERROR = 'SYS_001',
  SERVICE_UNAVAILABLE = 'SYS_002',
  RATE_LIMIT_EXCEEDED = 'SYS_003',
  TIMEOUT = 'SYS_004'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  userMessage?: string;
  severity: ErrorSeverity;
  statusCode: number;
  retryable?: boolean;
  metadata?: Record<string, any>;
  suggestions?: string[];
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly userMessage: string;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly metadata: Record<string, any>;
  public readonly suggestions: string[];
  public readonly timestamp: number;
  public readonly requestId?: string;

  constructor(details: ErrorDetails, originalError?: Error) {
    super(details.message);
    
    this.name = 'AppError';
    this.code = details.code;
    this.userMessage = details.userMessage || this.getDefaultUserMessage(details.code);
    this.severity = details.severity;
    this.statusCode = details.statusCode;
    this.retryable = details.retryable || false;
    this.metadata = details.metadata || {};
    this.suggestions = details.suggestions || [];
    this.timestamp = Date.now();

    // Capture stack trace
    if (originalError) {
      this.stack = originalError.stack;
      this.metadata.originalError = {
        name: originalError.name,
        message: originalError.message
      };
    } else {
      Error.captureStackTrace(this, AppError);
    }
  }

  private getDefaultUserMessage(code: ErrorCode): string {
    const messages: Record<ErrorCode, string> = {
      [ErrorCode.AUTHENTICATION_REQUIRED]: 'Please log in to continue.',
      [ErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password.',
      [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
      [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action.',
      
      [ErrorCode.VALIDATION_FAILED]: 'The information provided is invalid.',
      [ErrorCode.INVALID_INPUT]: 'Please check your input and try again.',
      [ErrorCode.MISSING_REQUIRED_FIELD]: 'Please fill in all required fields.',
      
      [ErrorCode.PRODUCT_NOT_FOUND]: 'The requested artwork was not found.',
      [ErrorCode.INSUFFICIENT_STOCK]: 'This item is currently out of stock.',
      [ErrorCode.CART_NOT_FOUND]: 'Your cart could not be found.',
      [ErrorCode.ORDER_NOT_FOUND]: 'The order could not be found.',
      [ErrorCode.PAYMENT_FAILED]: 'Payment processing failed. Please try again.',
      [ErrorCode.SHIPPING_UNAVAILABLE]: 'Shipping is not available to your location.',
      
      [ErrorCode.DATABASE_ERROR]: 'A database error occurred. Please try again.',
      [ErrorCode.REDIS_ERROR]: 'A caching error occurred. Please try again.',
      [ErrorCode.S3_ERROR]: 'File upload failed. Please try again.',
      [ErrorCode.STRIPE_ERROR]: 'Payment processing is currently unavailable.',
      [ErrorCode.EMAIL_ERROR]: 'Email could not be sent. Please try again.',
      
      [ErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again.',
      [ErrorCode.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable.',
      [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait and try again.',
      [ErrorCode.TIMEOUT]: 'The request timed out. Please try again.'
    };

    return messages[code] || 'An error occurred. Please try again.';
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.userMessage,
        severity: this.severity,
        timestamp: this.timestamp,
        requestId: this.requestId,
        retryable: this.retryable,
        suggestions: this.suggestions,
        ...(process.env.NODE_ENV === 'development' && {
          details: {
            internalMessage: this.message,
            metadata: this.metadata,
            stack: this.stack
          }
        })
      }
    };
  }
}

export class ErrorLogger {
  private errorCounts: Map<ErrorCode, number> = new Map();
  private recentErrors: AppError[] = [];

  log(error: AppError, context?: Context): void {
    // Update error counts
    const currentCount = this.errorCounts.get(error.code) || 0;
    this.errorCounts.set(error.code, currentCount + 1);

    // Store recent errors (last 100)
    this.recentErrors.push(error);
    if (this.recentErrors.length > 100) {
      this.recentErrors = this.recentErrors.slice(-100);
    }

    // Log based on severity
    const logData = {
      timestamp: new Date().toISOString(),
      code: error.code,
      message: error.message,
      severity: error.severity,
      statusCode: error.statusCode,
      requestId: context?.state?.requestId,
      userId: context?.state?.user?.id,
      ip: context?.ip,
      userAgent: context?.get('User-Agent'),
      path: context?.path,
      method: context?.method,
      metadata: error.metadata
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🚨 CRITICAL ERROR:', logData);
        this.sendAlert(error, context);
        break;
      case ErrorSeverity.HIGH:
        console.error('🔴 HIGH SEVERITY ERROR:', logData);
        this.sendAlert(error, context);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('🟡 MEDIUM SEVERITY ERROR:', logData);
        break;
      case ErrorSeverity.LOW:
        console.log('🟢 LOW SEVERITY ERROR:', logData);
        break;
    }

    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLogger(error, context);
    }
  }

  private async sendAlert(error: AppError, context?: Context): Promise<void> {
    // Check if this error type is happening frequently
    const errorCount = this.errorCounts.get(error.code) || 0;
    const recentCount = this.recentErrors
      .filter(e => e.code === error.code && Date.now() - e.timestamp < 300000) // Last 5 minutes
      .length;

    const alert = {
      type: 'ERROR_ALERT',
      severity: error.severity,
      error: {
        code: error.code,
        message: error.message,
        count: errorCount,
        recentCount
      },
      context: context ? {
        path: context.path,
        method: context.method,
        userId: context.state?.user?.id,
        ip: context.ip
      } : null,
      timestamp: new Date().toISOString()
    };

    console.error('🚨 ERROR ALERT:', alert);

    // In production, send to monitoring service
    // await this.sendSlackAlert(alert);
    // await this.sendEmailAlert(alert);
    // await this.sendToMonitoring(alert);
  }

  private async sendToExternalLogger(error: AppError, context?: Context): Promise<void> {
    // Integration with external logging services
    // Examples: Sentry, LogRocket, DataDog, etc.
    
    // Sentry example:
    // Sentry.captureException(error, {
    //   tags: {
    //     errorCode: error.code,
    //     severity: error.severity
    //   },
    //   user: context?.state?.user ? {
    //     id: context.state.user.id,
    //     email: context.state.user.email
    //   } : undefined,
    //   extra: error.metadata
    // });
  }

  getStats() {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);
    const topErrors = Array.from(this.errorCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([code, count]) => ({ code, count }));

    const severityBreakdown = this.recentErrors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors,
      topErrors,
      severityBreakdown,
      recentErrorsCount: this.recentErrors.length
    };
  }
}

// Error factory functions for common scenarios
export const ErrorFactory = {
  authentication: {
    required: () => new AppError({
      code: ErrorCode.AUTHENTICATION_REQUIRED,
      message: 'Authentication required',
      severity: ErrorSeverity.LOW,
      statusCode: 401
    }),

    invalid: () => new AppError({
      code: ErrorCode.INVALID_CREDENTIALS,
      message: 'Invalid credentials provided',
      severity: ErrorSeverity.LOW,
      statusCode: 401
    }),

    expired: () => new AppError({
      code: ErrorCode.TOKEN_EXPIRED,
      message: 'Authentication token has expired',
      severity: ErrorSeverity.LOW,
      statusCode: 401,
      retryable: true,
      suggestions: ['Please log in again']
    })
  },

  validation: {
    failed: (field: string, reason: string) => new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: `Validation failed for field '${field}': ${reason}`,
      severity: ErrorSeverity.LOW,
      statusCode: 400,
      metadata: { field, reason }
    }),

    required: (field: string) => new AppError({
      code: ErrorCode.MISSING_REQUIRED_FIELD,
      message: `Required field '${field}' is missing`,
      severity: ErrorSeverity.LOW,
      statusCode: 400,
      metadata: { field }
    })
  },

  ecommerce: {
    productNotFound: (productId: string) => new AppError({
      code: ErrorCode.PRODUCT_NOT_FOUND,
      message: `Product with ID '${productId}' not found`,
      severity: ErrorSeverity.LOW,
      statusCode: 404,
      metadata: { productId }
    }),

    insufficientStock: (productId: string, requested: number, available: number) => new AppError({
      code: ErrorCode.INSUFFICIENT_STOCK,
      message: `Insufficient stock for product '${productId}'. Requested: ${requested}, Available: ${available}`,
      severity: ErrorSeverity.MEDIUM,
      statusCode: 409,
      metadata: { productId, requested, available },
      suggestions: [`Only ${available} items are available`]
    }),

    paymentFailed: (reason: string, paymentId?: string) => new AppError({
      code: ErrorCode.PAYMENT_FAILED,
      message: `Payment processing failed: ${reason}`,
      severity: ErrorSeverity.HIGH,
      statusCode: 402,
      retryable: true,
      metadata: { reason, paymentId }
    })
  },

  system: {
    database: (operation: string, originalError: Error) => new AppError({
      code: ErrorCode.DATABASE_ERROR,
      message: `Database operation '${operation}' failed: ${originalError.message}`,
      severity: ErrorSeverity.HIGH,
      statusCode: 500,
      retryable: true,
      metadata: { operation }
    }, originalError),

    external: (service: string, originalError: Error) => new AppError({
      code: ErrorCode.SERVICE_UNAVAILABLE,
      message: `External service '${service}' is unavailable: ${originalError.message}`,
      severity: ErrorSeverity.HIGH,
      statusCode: 503,
      retryable: true,
      metadata: { service }
    }, originalError)
  }
};

// Singleton error logger
export const errorLogger = new ErrorLogger();

// Main error handling middleware
export function errorHandler() {
  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      await next();
    } catch (error) {
      const startTime = performance.now();

      let appError: AppError;

      if (error instanceof AppError) {
        appError = error;
        appError.metadata.requestId = ctx.state?.requestId;
      } else {
        // Convert unknown errors to AppError
        appError = new AppError({
          code: ErrorCode.INTERNAL_ERROR,
          message: `Unexpected error: ${error.message}`,
          severity: ErrorSeverity.HIGH,
          statusCode: 500,
          retryable: true,
          metadata: {
            requestId: ctx.state?.requestId,
            originalErrorName: error.name
          }
        }, error as Error);
      }

      // Log the error
      errorLogger.log(appError, ctx);

      // Set response
      ctx.status = appError.statusCode;
      ctx.body = appError.toJSON();

      // Add debug headers in development
      if (process.env.NODE_ENV === 'development') {
        ctx.set('X-Error-Code', appError.code);
        ctx.set('X-Error-Severity', appError.severity);
      }

      // Add processing time
      const processingTime = performance.now() - startTime;
      ctx.set('X-Error-Processing-Time', `${Math.round(processingTime)}ms`);
    }
  };
}

// Utility function to throw typed errors
export function throwError(errorDetails: ErrorDetails): never {
  throw new AppError(errorDetails);
}

// Express.js compatibility (if needed)
export function expressErrorHandler() {
  return (error: any, req: any, res: any, next: any) => {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else {
      appError = new AppError({
        code: ErrorCode.INTERNAL_ERROR,
        message: `Unexpected error: ${error.message}`,
        severity: ErrorSeverity.HIGH,
        statusCode: 500
      }, error);
    }

    errorLogger.log(appError);
    res.status(appError.statusCode).json(appError.toJSON());
  };
}