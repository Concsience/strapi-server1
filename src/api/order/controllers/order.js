"use strict";
const stripe = require("stripe")(
  process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY
);

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

    const { totalprice, email } = ctx.request.body.data;

    try {
      const stripeCustomer = await stripe.customers.create({
        email: email,
      });

      const order = await strapi.service("api::order.order").create({
        data: {
          total_price: totalprice,
          user: user.id,
          status: "pending",
        },
      });

      const intent = await stripe.paymentIntents.create({
        amount: Math.round(totalprice * 100) || 0,
        currency: "eur",
        payment_method_types: ["card"],
        customer: stripeCustomer.id,
        metadata: {
          orderId: order.id,
        },
      });

      const updatedOrder = await strapi
        .service("api::order.order")
        .update(order.id, {
          data: {
            stripe_payment_id: intent.id,
          },
        });

      return ctx.send({
        success: true,
        message: "Order created successfully",
        client_secret: intent.client_secret,
        order: updatedOrder,
      });
    } catch (err) {
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

  async stripeWebhook(ctx) {
    const sig = ctx.request.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      const rawBody = ctx.request.body[Symbol.for("unparsedBody")];
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err) {
      console.error(
        `⚠️  Webhook signature verification failed: ${err.message}`
      );
      ctx.response.status = 400;
      return ctx.send(`Webhook Error: ${err.message}`);
    }

    const paymentIntent = event.data.object;
    const existingOrder = await strapi.entityService.findMany(
      "api::order.order",
      {
        filters: { stripe_payment_id: paymentIntent.id },
      }
    );

    if (!existingOrder || existingOrder.length === 0) {
      console.error(`Order not found for payment ID: ${paymentIntent.id}`);
      ctx.response.status = 404;
      return ctx.send({ error: "Order not found" });
    }

    let status;
    switch (event.type) {
      case "payment_intent.succeeded":
        status = "paid";

        const invoice = await stripe.invoices.create({
          customer: paymentIntent.customer,
          description: `Invoice for order #${existingOrder[0].id}`,
          metadata: { orderId: existingOrder[0].id },
          auto_advance: true,
          collection_method: "send_invoice",
          days_until_due: 0,
        });

        await stripe.invoiceItems.create({
          customer: paymentIntent.customer,
          amount: 1000,
          currency: "eur",
          description: `Order #${existingOrder[0].id}`,
          invoice: invoice.id,
        });

        await stripe.invoices.finalizeInvoice(invoice.id);

        await strapi.entityService.update(
          "api::order.order",
          existingOrder[0].id,
          {
            data: { stripe_invoice_id: invoice.id, status },
          }
        );

        await stripe.invoices.sendInvoice(invoice.id);

        break;
      case "payment_intent.payment_failed":
        status = "failed";
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
        return (ctx.response.status = 200);
    }

    await strapi.entityService.update("api::order.order", existingOrder[0].id, {
      data: { status },
    });

    ctx.response.status = 200;
  },
}));
