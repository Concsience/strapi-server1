/**
 * Health check routes
 * Public endpoints for system monitoring
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: 'health.check',
      config: {
        auth: false,
        description: 'System health check endpoint',
        tag: {
          plugin: 'content-manager',
          name: 'health-monitoring'
        },
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/health/ping',
      handler: 'health.ping',
      config: {
        auth: false,
        description: 'Simple ping endpoint',
        tag: {
          plugin: 'content-manager',
          name: 'health-monitoring'
        },
        policies: [],
        middlewares: []
      }
    }
  ]
};