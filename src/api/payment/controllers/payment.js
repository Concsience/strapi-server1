/**
 * Payment controller - TypeScript version
 * Handles Stripe payment processing and customer management
 */

const { factories } = require('@strapi/strapi');
const { errors } = require('@strapi/utils');
const Stripe = require('stripe');

const { ValidationError } = errors;

module.exports = factories.createCoreController('api::payment.payment', ({ strapi }) => {
  // Initialize Stripe with environment variable
  const stripe = new Stripe(process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia',
  });

  // Type definitions removed for JavaScript compatibility

  /**
   * Helper: Get safe error message
   */
  function getErrorMessage(error) {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  /**
   * Helper: Get or create Stripe customer
   */
  async function getOrCreateStripeCustomer(
    email,
    userDetail
  ) {
    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Create new customer with metadata
    const customerData = {
      email,
      metadata: {
        strapi_user_id: userDetail?.documentId || '',
        strapi_username: userDetail?.username || '',
      },
    };

    return await stripe.customers.create(customerData);
  }

  return {
    /**
     * Create setup intent for saving payment methods
     * POST /api/payment/create-setup-intent
     */
    async createSetupIntent(ctx) {
      try {
        if (!ctx.state.user) {
          ctx.unauthorized('You must be logged in to create a setup intent');
          return;
        }

        const userId = ctx.state.user.id;

        // Get user details including addresses
        const userDetail = await strapi.documents('plugin::users-permissions.user').findOne({
          documentId: userId,
          populate: {
            addresses: true,
          },
        });

        if (!userDetail) {
          ctx.throw(404, 'User not found');
        }

        // Get or create Stripe customer
        const customer = await getOrCreateStripeCustomer(userDetail.email, userDetail);

        // Update user with Stripe customer ID if not already set
        if (!userDetail.stripe_customer_id) {
          await strapi.documents('plugin::users-permissions.user').update({
            documentId: userId,
            data: { stripe_customer_id: customer.id },
          });
        }

        // Create setup intent
        const setupIntent = await stripe.setupIntents.create({
          customer: customer.id,
          payment_method_types: ['card'],
          usage: 'off_session',
        });

        const response = {
          data: {
            client_secret: setupIntent.client_secret,
            customer_id: customer.id,
          },
          meta: {
            message: 'Setup intent created successfully',
          },
        };

        ctx.send(response);
      } catch (error) {
        if (error instanceof ValidationError) {
          ctx.badRequest(getErrorMessage(error));
        } else {
          strapi.log.error('Error creating setup intent:', error);
          ctx.throw(500, 'Failed to create setup intent');
        }
      }
    },

    /**
     * Get user's saved payment methods
     * GET /api/payment/payment-methods
     */
    async getPaymentMethods(ctx) {
      try {
        if (!ctx.state.user) {
          ctx.unauthorized('You must be logged in to view payment methods');
          return;
        }

        const userId = ctx.state.user.id;

        // Get user details
        const userDetail = await strapi.documents('plugin::users-permissions.user').findOne({
          documentId: userId,
          populate: {
            addresses: true,
          },
        });

        if (!userDetail || !userDetail.stripe_customer_id) {
          ctx.send({
            data: {
              payment_methods: [],
              default_payment_method: null,
            },
          });
          return;
        }

        // Get payment methods from Stripe
        const paymentMethods = await stripe.paymentMethods.list({
          customer: userDetail.stripe_customer_id,
          type: 'card',
        });

        // Get customer to find default payment method
        const customer = await stripe.customers.retrieve(userDetail.stripe_customer_id);

        const response = {
          data: {
            payment_methods: paymentMethods.data.map(pm => ({
              id: pm.id,
              type: pm.type,
              card: {
                brand: pm.card?.brand,
                last4: pm.card?.last4,
                exp_month: pm.card?.exp_month,
                exp_year: pm.card?.exp_year,
              },
            })),
            default_payment_method: customer.invoice_settings?.default_payment_method,
          },
        };

        ctx.send(response);
      } catch (error) {
        strapi.log.error('Error getting payment methods:', error);
        ctx.throw(500, 'Failed to retrieve payment methods');
      }
    },

    /**
     * Delete a payment method
     * DELETE /api/payment/payment-methods/:paymentMethodId
     */
    async deletePaymentMethod(ctx) {
      try {
        if (!ctx.state.user) {
          ctx.unauthorized('You must be logged in to delete payment methods');
          return;
        }

        const { paymentMethodId } = ctx.params;

        if (!paymentMethodId) {
          throw new ValidationError('Payment method ID is required');
        }

        // Detach payment method from customer
        await stripe.paymentMethods.detach(paymentMethodId);

        ctx.send({
          data: null,
          meta: {
            message: 'Payment method deleted successfully',
          },
        });
      } catch (error) {
        if (error instanceof ValidationError) {
          ctx.badRequest(getErrorMessage(error));
        } else {
          strapi.log.error('Error deleting payment method:', error);
          ctx.throw(500, 'Failed to delete payment method');
        }
      }
    },

    /**
     * Set default payment method
     * PATCH /api/payment/payment-methods/:paymentMethodId/default
     */
    async setDefaultPaymentMethod(ctx) {
      try {
        if (!ctx.state.user) {
          ctx.unauthorized('You must be logged in to set default payment method');
          return;
        }

        const userId = ctx.state.user.id;
        const { paymentMethodId } = ctx.params;

        if (!paymentMethodId) {
          throw new ValidationError('Payment method ID is required');
        }

        // Get user details
        const userDetail = await strapi.documents('plugin::users-permissions.user').findOne({
          documentId: userId,
        });

        if (!userDetail || !userDetail.stripe_customer_id) {
          ctx.throw(404, 'User or Stripe customer not found');
        }

        // Update customer's default payment method
        await stripe.customers.update(userDetail.stripe_customer_id, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        ctx.send({
          data: null,
          meta: {
            message: 'Default payment method updated successfully',
          },
        });
      } catch (error) {
        if (error instanceof ValidationError) {
          ctx.badRequest(getErrorMessage(error));
        } else {
          strapi.log.error('Error setting default payment method:', error);
          ctx.throw(500, 'Failed to set default payment method');
        }
      }
    },
  };
});