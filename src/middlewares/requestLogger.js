/**
 * Request Logger Middleware - JavaScript version
 * Logs all HTTP requests with detailed metrics and error tracking
 * Preserves exact original behavior while adding type safety
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Creates a request logging middleware
 * Logs all requests with unique IDs and timing information
 */
module.exports = (config = {}, { strapi }) => {
    return async (ctx, next) => {
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
        const requestLog = {
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
        strapi.log.info(`Request started: ${JSON.stringify({
            type: 'request_start',
            ...requestLog,
        })}`);
        try {
            await next();
            const responseTime = Date.now() - startTime;
            // Log successful response (exact same structure)
            strapi.log.info(`Request completed: ${JSON.stringify({
                type: 'request_complete',
                ...requestLog,
                status: ctx.status,
                responseTime,
                responseSize: ctx.response.length,
            })}`);
            // Add response headers (preserving original conditions)
            if (config.includeResponseTime) {
                ctx.set('X-Response-Time', `${responseTime}ms`);
            }
            if (config.includeRequestId) {
                ctx.set('X-Request-ID', requestId);
            }
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            // Log error response (preserving exact structure and logic)
            strapi.log.error(`Request error: ${JSON.stringify({
                type: 'request_error',
                ...requestLog,
                status: error.status || 500,
                responseTime,
                error: {
                    message: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                },
            })}`);
            // Re-throw error for Strapi to handle (preserving original behavior)
            throw error;
        }
    };
};