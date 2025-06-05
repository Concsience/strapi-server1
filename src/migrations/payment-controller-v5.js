/**
 * Payment Controller - Strapi v5 Migration
 * 
 * This file shows the migrated version of payment controller
 * using the Document Service API instead of Entity Service
 */

'use strict';

module.exports = {
  /**
   * Create setup intent - MIGRATED TO v5
   */
  async createSetupIntent(ctx) {
    try {
      const { user } = ctx.state;
      
      if (!user) {
        return ctx.unauthorized('You must be logged in to set up payment');
      }

      // STRAPI V5: Using Document Service to get user details
      const fullUser = await strapi.documents('plugin::users-permissions.user').findOne({
        documentId: user.documentId || user.id,
        populate: ['role']
      });

      if (!fullUser) {
        return ctx.notFound('User not found');
      }

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      // Create or get Stripe customer
      let customerId = fullUser.stripeCustomerId;

      if (!customerId) {
        // Create new Stripe customer
        const customer = await stripe.customers.create({
          email: fullUser.email,
          metadata: {
            strapi_user_id: fullUser.documentId // Use documentId instead of id
          }
        });

        // Update user with Stripe customer ID
        await strapi.documents('plugin::users-permissions.user').update({
          documentId: fullUser.documentId,
          data: {
            stripeCustomerId: customer.id
          }
        });

        customerId = customer.id;
      }

      // Create setup intent
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        metadata: {
          user_id: fullUser.documentId // Use documentId
        }
      });

      return ctx.send({
        clientSecret: setupIntent.client_secret,
        customerId: customerId
      });
    } catch (error) {
      strapi.log.error('Error creating setup intent:', error);
      return ctx.internalServerError('Unable to create setup intent');
    }
  },

  /**
   * Create payment intent - MIGRATED TO v5
   */
  async createPaymentIntent(ctx) {
    try {
      const { user } = ctx.state;
      const { amount, currency = 'eur', orderId } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('You must be logged in to make a payment');
      }

      if (!amount || amount <= 0) {
        return ctx.badRequest('Invalid payment amount');
      }

      // Get user details
      const fullUser = await strapi.documents('plugin::users-permissions.user').findOne({
        documentId: user.documentId || user.id,
        populate: ['role']
      });

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      // Get or create Stripe customer
      let customerId = fullUser.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: fullUser.email,
          metadata: {
            strapi_user_id: fullUser.documentId
          }
        });

        await strapi.documents('plugin::users-permissions.user').update({
          documentId: fullUser.documentId,
          data: {
            stripeCustomerId: customer.id
          }
        });

        customerId = customer.id;
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: customerId,
        metadata: {
          order_id: orderId,
          user_id: fullUser.documentId
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Update order with payment intent ID if orderId provided
      if (orderId) {
        await strapi.documents('api::order.order').update({
          documentId: orderId,
          data: {
            stripe_payment_intent_id: paymentIntent.id,
            payment_status: 'pending'
          }
        });
      }

      return ctx.send({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error) {
      strapi.log.error('Error creating payment intent:', error);
      return ctx.internalServerError('Unable to create payment intent');
    }
  },

  /**
   * Confirm payment - MIGRATED TO v5
   */
  async confirmPayment(ctx) {
    try {
      const { paymentIntentId, orderId } = ctx.request.body;

      if (!paymentIntentId || !orderId) {
        return ctx.badRequest('Payment intent ID and order ID are required');
      }

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      // Get payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return ctx.badRequest('Payment not successful');
      }

      // Update order status
      const order = await strapi.documents('api::order.order').update({
        documentId: orderId,
        data: {
          payment_status: 'completed',
          stripe_payment_intent_id: paymentIntentId,
          paid_at: new Date().toISOString()
        }
      });

      // Clear user's cart after successful payment
      const { user } = ctx.state;
      if (user) {
        const carts = await strapi.documents('api::cart.cart').findMany({
          filters: { 
            user: { 
              documentId: user.documentId || user.id 
            } 
          }
        });

        if (carts.length > 0) {
          const cart = carts[0];
          
          // Delete all cart items
          const cartItems = await strapi.documents('api::cart-item.cart-item').findMany({
            filters: { 
              cart: { 
                documentId: cart.documentId 
              } 
            }
          });

          await Promise.all(
            cartItems.map(item => 
              strapi.documents('api::cart-item.cart-item').delete({
                documentId: item.documentId
              })
            )
          );

          // Reset cart total
          await strapi.documents('api::cart.cart').update({
            documentId: cart.documentId,
            data: {
              total_price: 0
            }
          });
        }
      }

      return ctx.send({
        success: true,
        order: order
      });
    } catch (error) {
      strapi.log.error('Error confirming payment:', error);
      return ctx.internalServerError('Unable to confirm payment');
    }
  },

  /**
   * Get payment methods - MIGRATED TO v5
   */
  async getPaymentMethods(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('You must be logged in to view payment methods');
      }

      // Get user with Stripe customer ID
      const fullUser = await strapi.documents('plugin::users-permissions.user').findOne({
        documentId: user.documentId || user.id
      });

      if (!fullUser.stripeCustomerId) {
        return ctx.send({ paymentMethods: [] });
      }

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      // Get payment methods from Stripe
      const paymentMethods = await stripe.paymentMethods.list({
        customer: fullUser.stripeCustomerId,
        type: 'card'
      });

      // Format response
      const formattedMethods = paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
        is_default: pm.id === fullUser.default_payment_method
      }));

      return ctx.send({
        paymentMethods: formattedMethods
      });
    } catch (error) {
      strapi.log.error('Error getting payment methods:', error);
      return ctx.internalServerError('Unable to get payment methods');
    }
  },

  /**
   * Delete payment method - MIGRATED TO v5
   */
  async deletePaymentMethod(ctx) {
    try {
      const { user } = ctx.state;
      const { paymentMethodId } = ctx.params;

      if (!user) {
        return ctx.unauthorized('You must be logged in to delete payment methods');
      }

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      // Detach payment method
      await stripe.paymentMethods.detach(paymentMethodId);

      // If this was the default payment method, clear it from user
      const fullUser = await strapi.documents('plugin::users-permissions.user').findOne({
        documentId: user.documentId || user.id
      });

      if (fullUser.default_payment_method === paymentMethodId) {
        await strapi.documents('plugin::users-permissions.user').update({
          documentId: fullUser.documentId,
          data: {
            default_payment_method: null
          }
        });
      }

      return ctx.send({
        success: true,
        message: 'Payment method deleted successfully'
      });
    } catch (error) {
      strapi.log.error('Error deleting payment method:', error);
      return ctx.internalServerError('Unable to delete payment method');
    }
  }
};