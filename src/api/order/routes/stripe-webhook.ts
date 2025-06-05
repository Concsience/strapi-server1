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
        middlewares: [], // Remove middleware reference for now
      },
    },
  ],
};

export default stripeWebhookRoutes;