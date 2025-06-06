/**
 * Health controller - Basic health checks for API testing
 */
module.exports = {
  async basic(ctx) {
    ctx.body = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '5.15.0'
    };
    ctx.status = 200;
  },

  async advanced(ctx) {
    ctx.body = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      },
      services: {
        database: 'connected',
        strapi: 'running'
      }
    };
    ctx.status = 200;
  }
};