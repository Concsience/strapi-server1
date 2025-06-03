module.exports = (plugin) => {
  // Custom Stripe routes for payment processing
  if (!plugin.routes['content-api']) {
    plugin.routes['content-api'] = { routes: [] };
  }
  plugin.routes['content-api'].routes.push({
    method: 'POST',
    path: '/stripe/create-payment-intent',
    handler: async (ctx) => {
      try {
        // Load Stripe with environment variable
        const stripe = require('stripe')(process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY);
        
        // Validate Stripe configuration
        if (!process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY) {
          return ctx.badRequest('Stripe not configured');
        }

        // Parse and validate request
        const { amount } = ctx.request.body;
        if (!amount || amount <= 0) {
          return ctx.badRequest('Invalid amount');
        }

        strapi.log.info(`Creating PaymentIntent for amount: ${amount}`);

        // Create PaymentIntent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'eur',
          payment_method_types: ['card'],
          metadata: {
            source: 'strapi_backend',
            timestamp: new Date().toISOString()
          }
        });

        // Return success response
        return ctx.send({
          success: true,
          client_secret: paymentIntent.client_secret,
          payment_intent_id: paymentIntent.id,
        });

      } catch (error) {
        strapi.log.error('Stripe PaymentIntent Error:', error);
        
        return ctx.internalServerError({
          error: 'Payment creation failed',
          details: error.message,
          debug: {
            stripe_configured: !!process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY,
            error_type: error.type || 'unknown'
          }
        });
      }
    },
    config: {
      auth: false,
      policies: [],
      middlewares: [],
    },
  });

  plugin.routes['content-api'].routes.push({
    method: 'GET',
    path: '/stripe/payment-methods',
    handler: async (ctx) => {
      return ctx.send({
        success: true,
        payment_methods: [],
        message: 'Payment methods endpoint ready'
      });
    },
    config: {
      auth: false,
      policies: [],
      middlewares: [],
    },
  });

  return plugin;
};
