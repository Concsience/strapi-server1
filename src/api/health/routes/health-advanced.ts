/**
 * Advanced health check routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/health/advanced',
      handler: 'health-advanced.index',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Get comprehensive health status'
      }
    },
    {
      method: 'GET',
      path: '/health/detailed',
      handler: 'health-advanced.detailed',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Get detailed health check with all services'
      }
    }
  ]
};