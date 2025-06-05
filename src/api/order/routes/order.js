'use strict';

/**
 * order router
 */

module.exports = {
  routes: [
    // Routes CRUD de base
    {
      method: "GET",
      path: "/orders",
      handler: "order.find",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "GET",
      path: "/orders/:id",
      handler: "order.findOne",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/orders",
      handler: "order.create",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "PUT",
      path: "/orders/:id",
      handler: "order.update",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "DELETE",
      path: "/orders/:id",
      handler: "order.delete",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // NEW: Route for creating orders without payment processing
    {
      method: "POST",
      path: "/orders/create-without-payment",
      handler: "order.createWithoutPayment",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Route webhook Stripe (sans authentification)
    {
      method: "POST",
      path: "/order/stripe-webhook",
      handler: "order.stripeWebhook",
      config: {
        auth: false, // ⚠️ Important: pas d'auth pour les webhooks
        policies: [],
        middlewares: [],
      },
    },
    // Routes pour Stripe setup intent et payment methods
    {
      method: "GET",
      path: "/order/setup-intent",
      handler: "order.createSetupIntent",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/order/create-payment-intent",
      handler: "order.createPaymentIntent",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};