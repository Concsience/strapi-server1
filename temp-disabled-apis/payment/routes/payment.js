module.exports = {
  routes: [
    {
      method: "GET",
      path: "/stripe/setup-intent",
      handler: "payment.createSetupIntent",
    },
    {
      method: "GET",
      path: "/stripe/payment-methods",
      handler: "payment.getPaymentMethods",
    },
  ],
};
