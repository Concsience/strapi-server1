interface RouteConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: string;
  config: {
    policies: string[];
    middlewares: string[];
  };
}

interface PaymentRoutes {
  routes: RouteConfig[];
}

const paymentRoutes: PaymentRoutes = {
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

export default paymentRoutes;