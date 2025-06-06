module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/webhooks',
      handler: 'webhooks.create',
      config: {
        auth: false,
        policies: []
      }
    },
    {
      method: 'GET',
      path: '/webhooks',
      handler: 'webhooks.find',
      config: {
        auth: false,
        policies: []
      }
    },
    {
      method: 'POST',
      path: '/webhooks/:id/test',
      handler: 'webhooks.test',
      config: {
        auth: false,
        policies: []
      }
    }
  ]
};