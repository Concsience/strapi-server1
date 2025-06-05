/**
 * Payment custom routes
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/payment/setup-intent',
      handler: 'payment.createSetupIntent',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/payment/payment-methods',
      handler: 'payment.getPaymentMethods',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};