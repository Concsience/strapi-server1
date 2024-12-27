"use strict";
const stripe = require("stripe")(process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY);

/**
 *  order controller
 */
const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized("You are not authorized!");
    }

    const { totalprice } = ctx.request.body.data;

    try {
      // Create a PaymentIntent using Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalprice * 100), // Amount in cents
        currency: "usd",
        description: `Order created on ${new Date()} by user ID: ${user.id}`,
        metadata: {
          userId: user.id,
        },
      });

      // Optionally, create a preliminary order in Strapi with the PaymentIntent ID
      const order = await strapi.service("api::order.order").create({
        data: {
          totalprice,
          paymentIntentId: paymentIntent.id, // Store PaymentIntent ID for reference
          user: user.id,
        },
      });

      // Return the PaymentIntent's client_secret to the frontend
      return ctx.send({
        success: true,
        message: "PaymentIntent created successfully",
        clientSecret: paymentIntent.client_secret,
        order,
      });
    } catch (err) {
      // Log the error for debugging purposes
      console.error("Stripe Error:", err.message);

      ctx.response.status = 500;
      return ctx.send({
        error: {
          message: "There was an error creating the PaymentIntent",
          details: err.message,
        },
      });
    }
  },
}));
