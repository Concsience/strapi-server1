/**
 * JSON Error Handler Middleware
 * Catches JSON parsing errors and returns 400 Bad Request instead of 500
 */
module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      strapi.log.info('Error caught in JSON handler:', {
        type: error.type,
        message: error.message,
        status: error.status,
        expose: error.expose
      });

      // Check for various types of JSON/body parsing errors
      const isJSONError = 
        error.type === 'entity.parse.failed' ||
        error.message?.includes('invalid JSON') ||
        error.message?.includes('Unexpected token') ||
        error.message?.includes('JSON.parse') ||
        error.message?.includes('Bad Request') ||
        error.message?.includes('Invalid JSON') ||
        (error.status === 400 && error.expose) ||
        // Koa body parser errors
        error.type === 'entity.too.large' ||
        error.type === 'entity.unsupported' ||
        error.type === 'encoding.unsupported';

      if (isJSONError) {
        strapi.log.info('🔧 JSON/Body parsing error detected, returning 400 Bad Request');
        
        ctx.status = 400;
        ctx.body = {
          error: {
            status: 400,
            name: 'ValidationError',
            message: 'Invalid request format',
            details: {
              error: 'The request body contains invalid data or malformed JSON'
            }
          }
        };
        return;
      }

      // Re-throw other errors to be handled by Strapi's error middleware
      throw error;
    }
  };
};