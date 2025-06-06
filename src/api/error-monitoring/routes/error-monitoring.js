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
    }
  ]
};