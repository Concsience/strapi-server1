module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/payment/create-payment-intent',
      handler: 'payment.createPaymentIntent',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/payment/setup-intent',
      handler: 'payment.createSetupIntent',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};