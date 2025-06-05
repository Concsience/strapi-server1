"use strict";
const stripe = require("stripe")(
  process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY
);

module.exports = {
  async createPaymentIntent(ctx) {
    try {
      const user = ctx.state.user;
      const { amount, currency = "eur", orderId } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized("You are not authorized!");
      }

      if (!amount || amount <= 0) {
        return ctx.badRequest("Valid amount is required");
      }

      const userEmail = user.email;
      const userDetail = await strapi.entityService.findOne(
        "plugin::users-permissions.user",
        user.id,
        {
          populate: ["addresses"],
        }
      );

      const existingCustomers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      let customer;

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: userEmail,
          name:
            userDetail?.addresses?.[0]?.nom +
            " " +
            userDetail?.addresses?.[0]?.prenom || user.username,
          address: userDetail?.addresses?.[0] ? {
            line1: userDetail.addresses[0].addresse,
            city: userDetail.addresses[0].ville,
            state: userDetail.addresses[0].region,
            postal_code: userDetail.addresses[0].codePostal,
          } : undefined,
        });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency,
        customer: customer.id,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orderId: orderId || '',
          userId: user.id.toString(),
        },
      });

      ctx.send({ 
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id 
      });
    } catch (err) {
      console.error("Stripe PaymentIntent Error:", err);
      ctx.throw(500, "Stripe PaymentIntent Error");
    }
  },
};