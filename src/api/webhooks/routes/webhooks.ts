/**
 * Webhooks Routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/webhooks',
      handler: 'webhooks.list',
      config: {
        auth: false, // Set to true in production
        policies: [],
        middlewares: [],
        description: 'List all registered webhooks'
      }
    },
    {
      method: 'POST',
      path: '/webhooks',
      handler: 'webhooks.create',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Create new webhook'
      }
    },
    {
      method: 'PUT',
      path: '/webhooks/:id',
      handler: 'webhooks.update',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Update webhook configuration'
      }
    },
    {
      method: 'DELETE',
      path: '/webhooks/:id',
      handler: 'webhooks.delete',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Delete webhook'
      }
    },
    {
      method: 'GET',
      path: '/webhooks/stats',
      handler: 'webhooks.getStats',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Get webhook statistics'
      }
    },
    {
      method: 'GET',
      path: '/webhooks/:id/deliveries',
      handler: 'webhooks.getDeliveries',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Get delivery history for webhook'
      }
    },
    {
      method: 'POST',
      path: '/webhooks/deliveries/:deliveryId/retry',
      handler: 'webhooks.retryDelivery',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Retry failed webhook delivery'
      }
    },
    {
      method: 'POST',
      path: '/webhooks/:id/test',
      handler: 'webhooks.testWebhook',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Test webhook endpoint'
      }
    },
    {
      method: 'GET',
      path: '/webhooks/recent-deliveries',
      handler: 'webhooks.getRecentDeliveries',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Get recent deliveries across all webhooks'
      }
    },
    {
      method: 'GET',
      path: '/webhooks/events',
      handler: 'webhooks.getAvailableEvents',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Get available webhook events'
      }
    }
  ]
};