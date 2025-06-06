module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: 'health.basic',
      config: {
        auth: false, // No authentication required for health checks
        policies: []
      }
    },
    {
      method: 'GET', 
      path: '/health/advanced',
      handler: 'health.advanced',
      config: {
        auth: false, // No authentication required for health checks
        policies: []
      }
    }
  ]
};