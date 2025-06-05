/**
 * Error Monitoring Routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/error-monitoring/stats',
      handler: 'error-monitoring.getStats',
      config: {
        auth: false, // Set to true in production
        policies: [],
        middlewares: [],
        description: 'Get error statistics and metrics'
      }
    },
    {
      method: 'GET',
      path: '/error-monitoring/trends',
      handler: 'error-monitoring.getTrends',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Get error trends over time'
      }
    },
    {
      method: 'GET',
      path: '/error-monitoring/details/:errorCode',
      handler: 'error-monitoring.getErrorDetails',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Get detailed information about specific error code'
      }
    },
    {
      method: 'POST',
      path: '/error-monitoring/resolve/:errorCode',
      handler: 'error-monitoring.resolveError',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Mark an error as resolved'
      }
    },
    {
      method: 'POST',
      path: '/error-monitoring/alerts',
      handler: 'error-monitoring.createAlertRule',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Create error alert rule'
      }
    },
    {
      method: 'POST',
      path: '/error-monitoring/test',
      handler: 'error-monitoring.testError',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Test error generation (development only)'
      }
    },
    {
      method: 'GET',
      path: '/error-monitoring/health',
      handler: 'error-monitoring.healthCheck',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Health check for error monitoring system'
      }
    },
    {
      method: 'GET',
      path: '/error-monitoring/export',
      handler: 'error-monitoring.exportErrors',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Export error data in various formats'
      }
    }
  ]
};