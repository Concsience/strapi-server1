"use strict";

const axios = require("axios");

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

    const { totalprice, paymentMethodeId, address, shipping_cost } =
      ctx.request.body.data;

    try {
      const stripeCustomer = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      const order = await strapi.service("api::order.order").create({
        data: {
          total_price: totalprice,
          user: user.id,
          status: "pending",
        },
      });

      const intent = await stripe.paymentIntents.create({
        amount: Math.round((totalprice + shipping_cost) * 100) || 0,
        currency: "eur",
        payment_method: paymentMethodeId,
        customer: stripeCustomer?.data?.[0].id,
        off_session: true,
        confirm: true,
        shipping: {
          name: address.nom + " " + address.prenom,
          address: {
            line1: address.addresse,
            city: address.ville,
            state: address.region,
            postal_code: address.codePostal,
          },
        },
        metadata: {
          orderId: order.id,
        },
      });

      const updatedOrder = await strapi
        .service("api::order.order")
        .update(order.id, {
          data: {
            stripe_payment_id: intent.id,
            shipping_cost: shipping_cost,
          },
        });

      return ctx.send({
        success: true,
        message: "Order created successfully",
        paymentIntent: intent,
        order: updatedOrder,
      });
    } catch (err) {
      if (err.type === "StripeCardError") {
        return ctx.send({
          success: false,
          message: "Payment failed. Please check your card details.",
          code: "CARD_ERROR",
        });
      }

      console.error("Stripe error:", err);
      ctx.throw(500, "An error occurred while processing the payment.");
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
    const orderId = paymentIntent.metadata.orderId;

    const existingOrder = await strapi.entityService.findOne(
      "api::order.order",
      orderId,
      {
        populate: {
          ordered_items: {
            populate: "*",
          },
          user: {
            populate: "*",
          },
        },
      }
    );

    const orderedItem = await strapi.entityService.findMany(
      "api::ordered-item.ordered-item",
      {
        filters: {
          order: {
            id: orderId,
          },
        },
      }
    );

    let status;
    switch (event.type) {
      case "payment_intent.succeeded":
        status = "paid";

        const invoice = await stripe.invoices.create({
          customer: paymentIntent.customer,
          auto_advance: true,
          description: `Invoice for order #${existingOrder.id}`,
          metadata: { orderId: existingOrder.id },
          shipping_details: {
            name:
              existingOrder.user.addresses[0].nom +
              " " +
              existingOrder.user.addresses[0].prenom,
            address: {
              line1: existingOrder.user.addresses[0].addresse,
              city: existingOrder.user.addresses[0].ville,
              country: "FR",
            },
          },
          custom_fields: [
            {
              name: "SIRET",
              value: 93032314200016,
            },
            {
              name: "Code APE",
              value: "58.11Z",
            },
          ],
          footer: "TVA non applicable, article 293 B du CGI",
        });

        for (const item of orderedItem) {
          const hasArt = item.arttitle && item.arttitle.trim() !== "";
          const hasBook = item.book_title && item.book_title.trim() !== "";

          const description = hasArt
            ? `${item.arttitle} (${item.width}x${item.height}) - 3 ART`
            : hasBook
            ? `${item.book_title} - 5 ART`
            : "No title provided";

          await stripe.invoiceItems.create({
            customer: paymentIntent.customer,
            unit_amount: Math.round(item.price * 100),
            currency: "eur",
            description,
            quantity: item.quantity,
            invoice: invoice.id,
          });
        }

        await stripe.invoiceItems.create({
          customer: paymentIntent.customer,
          amount: Math.round(existingOrder.shipping_cost * 100),
          currency: "eur",
          description: "Shipping Cost",
          invoice: invoice.id,
        });

        const finalizedInvoice = await stripe.invoices.finalizeInvoice(
          invoice.id
        );
        const invoicePdfUrl = finalizedInvoice.invoice_pdf;

        let invoicePdfBuffer = null;
        if (invoicePdfUrl) {
          const response = await axios.get(invoicePdfUrl, {
            responseType: "arraybuffer",
          });
          invoicePdfBuffer = response.data;
        }

        await strapi.entityService.update(
          "api::order.order",
          existingOrder.id,
          {
            data: { stripe_invoice_id: invoice.id, status },
          }
        );

        await strapi
          .plugin("email")
          .service("email")
          .send({
            to: existingOrder.user.email,
            subject: "Payment Invoice from ARTEDUSA",
            text: `Hallo ${existingOrder.user.firstName}, your payment has been received.`,
            html: `
                <p>Hallo ${existingOrder.user.firstName},</p>
                <p>Thank you for your purchase. We have received your payment.</p>
                <p><strong>ID Order:</strong> ${existingOrder.id}</p>
                <p><strong>Total:</strong> €${
                  paymentIntent.amount_received / 100
                }</p>
                    `,
            attachments: invoicePdfBuffer
              ? [
                  {
                    filename: `invoice-${existingOrder.id}.pdf`,
                    content: invoicePdfBuffer,
                  },
                ]
              : [],
          });

        break;

      case "payment_intent.payment_failed":
        status = "failed";
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
        return (ctx.response.status = 200);
    }

    await strapi.entityService.update("api::order.order", existingOrder.id, {
      data: { status },
    });
    ctx.response.status = 200;
  },
}));
