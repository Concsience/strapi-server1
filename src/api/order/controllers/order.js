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

    const { totalprice, paymentIntentId } = ctx.request.body.data;

    try {
      // Step 1: If no paymentIntentId is provided, create a PaymentIntent
      if (!paymentIntentId) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalprice * 100), // Amount in cents
          currency: "usd",
          description: `PaymentIntent for user ID: ${user.id}`,
          metadata: {
            userId: user.id,
          },
        });

        // Return client_secret to frontend
        return ctx.send({
          success: true,
          message: "PaymentIntent created successfully",
          clientSecret: paymentIntent.client_secret,
        });
      }

      // Step 2: If paymentIntentId is provided, confirm payment and create order
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== "succeeded") {
        return ctx.send({
          success: false,
          message: "Payment has not been completed yet.",
        });
      }

      // Step 3: Create the order in Strapi
      const order = await strapi.service("api::order.order").create({
        data: {
          totalprice,
          paymentIntentId: paymentIntent.id, // Store PaymentIntent ID for reference
          user: user.id,
          status: "paid", // Mark the order as paid
        },
      });

      return ctx.send({
        success: true,
        message: "Order created successfully",
        order,
      });
    } catch (err) {
      // Log the error for debugging purposes
      console.error("Stripe Error:", err.message);

      ctx.response.status = 500;
      return ctx.send({
        error: {
          message: "There was an error processing the request",
          details: err.message,
        },
      });
    }
  },
}));
