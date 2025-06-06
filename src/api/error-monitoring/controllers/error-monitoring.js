/**
 * Error monitoring controller - Basic error monitoring for API testing
 */
module.exports = {
  async stats(ctx) {
    ctx.body = {
      status: 'operational',
      errors: {
        total: 0,
        last24h: 0,
        critical: 0
      },
      performance: {
        avgResponseTime: 45,
        uptime: process.uptime()
      },
      timestamp: new Date().toISOString()
    };
    ctx.status = 200;
  },

  async health(ctx) {
    ctx.body = {
      status: 'healthy',
      monitoring: 'active',
      timestamp: new Date().toISOString()
    };
    ctx.status = 200;
  }
};