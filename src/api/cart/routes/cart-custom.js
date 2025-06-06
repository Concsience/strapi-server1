module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/carts/me',
      handler: 'cart.me',
      config: {
        auth: false, // Allow public access for testing
        policies: []
      }
    },
    {
      method: 'POST',
      path: '/carts/add',
      handler: 'cart.add',
      config: {
        auth: false, // Allow public access for testing
        policies: []
      }
    }
  ]
};