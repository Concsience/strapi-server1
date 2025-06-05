/**
 * Stripe webhook route - TypeScript
 * Handles Stripe payment webhook events
 */
const stripeWebhookRoutes = {
    routes: [
        {
            method: 'POST',
            path: '/order/stripe-webhook',
            handler: 'order.stripeWebhook',
            config: {
                auth: false,
                policies: [],
                middlewares: [], // Remove middleware reference for now
            },
        },
    ],
};
module.exports = stripeWebhookRoutes;
