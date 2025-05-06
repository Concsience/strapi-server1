"use strict";
const stripe = require("stripe")(
  process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY
);

module.exports = {
  async createSetupIntent(ctx) {
    try {
      const user = ctx.state.user;
      const userEmail = user.email;

      const userDetail = await strapi.entityService.findOne(
        "plugin::users-permissions.user",
        ctx.state.user.id,
        {
          populate: ["addresses"],
        }
      );

      if (!user) {
        return ctx.unauthorized("You are not authorized!");
      }

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
            userDetail?.addresses?.[0]?.prenom,
          address: {
            line1: userDetail?.addresses?.[0]?.addresse,
            city: userDetail?.addresses?.[0]?.ville,
            state: userDetail?.addresses?.[0]?.region,
            postal_code: userDetail?.addresses?.[0]?.codePostal,
          },
        });
      }
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customer.id,
        type: "card",
      });

      for (const pm of paymentMethods.data) {
        await stripe.paymentMethods.detach(pm.id);
      }

      const intent = await stripe.setupIntents.create({
        customer: customer.id,
        payment_method_types: ["card"],
      });

      ctx.send({ client_secret: intent.client_secret });
    } catch (err) {
      console.error("Stripe SetupIntent Error:", err);
      ctx.throw(500, "Stripe SetupIntent Error");
    }
  },

  async getPaymentMethods(ctx) {
    try {
      const user = ctx.state.user;
      const userEmail = user.email;

      if (!user) {
        return ctx.unauthorized("You are not authorized!");
      }

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
          name: user.username,
        });
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: customer.id,
        type: "card",
      });

      ctx.send(paymentMethods.data);
    } catch (err) {
      console.error("getPaymentMethods Error:", err);
      ctx.throw(500, "getPaymentMethods Error");
    }
  },
};
