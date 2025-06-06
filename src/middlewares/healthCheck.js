/**
 * Health check middleware
 * Provides a simple health endpoint at /_health
 */

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    if (ctx.path === '/_health' && ctx.method === 'GET') {
      try {
        // Simple health check
        const healthStatus = {
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: strapi.config.info.strapi || '5.14.0',
          environment: process.env.NODE_ENV || 'development',
          uptime: process.uptime()
        };

        // Quick database check
        try {
          await strapi.db.connection.raw('SELECT 1');
          healthStatus.database = 'connected';
        } catch (dbError) {
          healthStatus.database = 'disconnected';
          healthStatus.status = 'warning';
        }

        ctx.status = healthStatus.status === 'ok' ? 200 : 503;
        ctx.body = healthStatus;
        return;
      } catch (error) {
        strapi.log.error('Health check error:', error);
        ctx.status = 503;
        ctx.body = {
          status: 'error',
          timestamp: new Date().toISOString(),
          message: 'Health check failed'
        };
        return;
      }
    }

    await next();
  };
};