/**
 * Stripe Routes - TypeScript version
 * Defines all Stripe-related API endpoints with proper typing
 */

// Type imports for route configuration

interface RouteConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: string;
  config?: {
    auth?: boolean;
    policies?: string[];
    middlewares?: string[];
    description?: string;
  };
}

interface RoutesExport {
  routes: RouteConfig[];
}

const routes: RoutesExport = {
  routes: [
    {
      method: 'POST',
      path: '/stripe/create-payment-intent',
      handler: 'stripe.createPaymentIntent',
      config: {
        auth: true,
        policies: [],
        middlewares: [],
        description: 'Create a new Stripe PaymentIntent for processing payments',
      },
    },
    {
      method: 'POST',
      path: '/stripe/confirm-payment',
      handler: 'stripe.confirmPayment',
      config: {
        auth: true,
        policies: [],
        middlewares: [],
        description: 'Confirm a payment after client-side confirmation',
      },
    },
    {
      method: 'POST',
      path: '/stripe/refund-payment',
      handler: 'stripe.refundPayment',
      config: {
        auth: true,
        policies: [],
        middlewares: [],
        description: 'Process a refund for a completed payment',
      },
    },
  ],
};

export default routes;