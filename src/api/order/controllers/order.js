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
      // Directly create the order in Strapi without payment
      const order = await strapi.service("api::order.order").create({
        data: {
          total_price: totalprice,
          user: user.id,
          status: "pending", // Set initial status as "pending" or "created"
        },
      });

      return ctx.send({
        success: true,
        message: "Order created successfully",
        order,
      });
    } catch (err) {
      // Log the error for debugging purposes
      console.error("Order Creation Error:", err.message);

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
