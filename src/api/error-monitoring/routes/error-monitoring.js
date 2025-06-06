module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/error-monitoring/stats',
      handler: 'error-monitoring.stats',
      config: {
        auth: false,
        policies: []
      }
    },
    {
      method: 'GET',
      path: '/error-monitoring/health',
      handler: 'error-monitoring.health',
      config: {
        auth: false,
        policies: []
      }
    }
  ]
};