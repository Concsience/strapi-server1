'use strict';

/**
 * JSON Error Handler Middleware
 * Catches JSON parsing errors and returns proper 400 response
 * CRITICAL: Must be placed BEFORE strapi::body middleware
 */

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      // Handle JSON parsing errors specifically
      if (error.type === 'entity.parse.failed' || 
          error.message.includes('Unexpected token') ||
          error.message.includes('JSON') ||
          error.status === 400) {
        
        ctx.status = 400;
        ctx.body = {
          data: null,
          error: {
            status: 400,
            name: 'ValidationError',
            message: 'Invalid JSON payload',
            details: {
              errors: [{
                path: [],
                message: 'Request body contains invalid JSON',
                name: 'ValidationError'
              }]
            }
          }
        };
        return;
      }
      
      // Re-throw other errors to be handled by strapi::errors
      throw error;
    }
  };
};