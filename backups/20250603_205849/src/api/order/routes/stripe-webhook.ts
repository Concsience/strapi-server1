import { RouteConfig } from '../../../types';

/**
 * Stripe webhook route - TypeScript
 * Handles Stripe payment webhook events
 */
const stripeWebhookRoutes: RouteConfig = {
  routes: [
    {
      method: 'POST',
      path: '/order/stripe-webhook',
      handler: 'order.stripeWebhook',
      config: {
        auth: false, // Stripe webhooks don't use JWT auth
        policies: [],
        middlewares: ['global::requestLogger'], // Log webhook events
      },
    },
  ],
};

export default stripeWebhookRoutes;