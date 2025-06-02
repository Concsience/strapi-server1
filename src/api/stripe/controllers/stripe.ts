/**
 * Stripe Controller - TypeScript version
 * Handles all Stripe payment operations with full type safety
 */

import Stripe from 'stripe';
import { StrapiContext, CreatePaymentIntentRequest, PaymentIntentResponse, hasUser } from '@/types';
import { errors } from '@strapi/utils';

const { ValidationError } = errors;

// Validate Stripe configuration at startup
const stripeSecretKey = process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  strapi.log.error('CRITICAL: STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY environment variable is not set');
  // In development, we might want to continue with a warning
  // In production, this should fail fast
  if (process.env.NODE_ENV === 'production') {
    throw new Error('STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY is required in production');
  }
}

// Initialize Stripe with proper typing and error handling
let stripe: Stripe | null = null;
try {
  if (stripeSecretKey) {
    stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }
} catch (error) {
  strapi.log.error('Failed to initialize Stripe client:', error);
}

interface UserDetail {
  id: number;
  email: string;
  username: string;
  addresses?: Array<{
    nom: string;
    prenom: string;
    addresse: string;
    ville: string;
    region: string;
    codePostal: string;
  }>;
}

export default {
  /**
   * Creates a Stripe PaymentIntent for processing payments
   * @param ctx - Strapi context with typed request/response
   */
  async createPaymentIntent(ctx: StrapiContext): Promise<void> {
    try {
      // Check if Stripe is properly initialized
      if (!stripe) {
        strapi.log.error('Stripe client not initialized');
        return ctx.throw(503, 'Payment service temporarily unavailable');
      }

      // Type-safe user check
      if (!hasUser(ctx)) {
        ctx.unauthorized('You are not authorized!');
        return;
      }

      const user = ctx.state.user;
      const { amount, currency = 'eur', orderId } = ctx.request.body as CreatePaymentIntentRequest;

      // Validate input - maintain backward compatibility with original
      if (!amount || amount <= 0) {
        ctx.badRequest('Valid amount is required');
        return;
      }

      if (amount > 999999.99) {
        ctx.badRequest('Amount exceeds maximum allowed value');
        return;
      }

      // Fetch user details with type safety
      const userEmail = user.email;
      const userDetail = await strapi.entityService!.findOne(
        'plugin::users-permissions.user',
        user.id,
        {
          populate: ['addresses'],
        }
      ) as UserDetail | null;

      // Note: Original doesn't check for null userDetail, maintaining compatibility

      // Check for existing Stripe customer
      const existingCustomers = await stripe!.customers.list({
        email: userEmail,
        limit: 1,
      });

      let customer: Stripe.Customer;

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
        
        // Update customer info if needed - safely check for userDetail
        if (userDetail?.addresses?.length) {
          const address = userDetail.addresses[0];
          await stripe!.customers.update(customer.id, {
            name: `${address.prenom} ${address.nom}`,
            address: {
              line1: address.addresse,
              city: address.ville,
              state: address.region,
              postal_code: address.codePostal,
              country: 'FR', // Default to France, adjust as needed
            },
          });
        }
      } else {
        // Create new Stripe customer - maintain original behavior
        const address = userDetail?.addresses?.[0];
        const customerData: Stripe.CustomerCreateParams = {
          email: userEmail,
          name: address ? `${address.prenom} ${address.nom}` : (userDetail?.username || user.username),
          metadata: {
            strapi_user_id: user.id.toString(),
          },
        };

        if (address) {
          customerData.address = {
            line1: address.addresse,
            city: address.ville,
            state: address.region,
            postal_code: address.codePostal,
            country: 'FR',
          };
        }

        customer = await stripe!.customers.create(customerData);
      }

      // Create payment intent with proper typing
      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        customer: customer.id,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orderId: orderId || '',
          userId: user.id.toString(),
          userEmail: user.email,
        },
        description: orderId ? `Order #${orderId}` : 'Purchase from store',
      };

      const paymentIntent = await stripe!.paymentIntents.create(paymentIntentData);

      // Log for monitoring
      strapi.log.info(`PaymentIntent created: ${paymentIntent.id} for user ${user.id}`);

      // Type-safe response - handle potential null client_secret
      if (!paymentIntent.client_secret) {
        strapi.log.error('PaymentIntent created without client_secret');
        return ctx.throw(500, 'Payment initialization failed');
      }

      const response: PaymentIntentResponse = {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      };

      ctx.send(response);
    } catch (error) {
      // Enhanced error handling with proper typing
      if (error instanceof Stripe.errors.StripeError) {
        strapi.log.error('Stripe API Error:', error);
        
        // Maintain original error behavior - always throw 500
        ctx.throw(500, 'Stripe PaymentIntent Error');
      } else {
        // Log error as original does
        console.error('Stripe PaymentIntent Error:', error);
        ctx.throw(500, 'Stripe PaymentIntent Error');
      }
    }
  },

  // Note: confirmPayment and refundPayment are new methods not in original JS
  // They are added as enhancements but marked clearly

  /**
   * Confirms a payment after client-side confirmation
   * @param ctx - Strapi context
   * @note This is a new method not present in the original JavaScript version
   */
  async confirmPayment(ctx: StrapiContext): Promise<void> {
    try {
      if (!hasUser(ctx)) {
        ctx.unauthorized('You are not authorized!');
        return;
      }

      const { paymentIntentId } = ctx.request.body as { paymentIntentId: string };

      if (!paymentIntentId) {
        throw new ValidationError('Payment intent ID is required');
      }

      // Retrieve the payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      // Verify the payment belongs to the current user
      if (paymentIntent.metadata.userId !== ctx.state.user.id.toString()) {
        ctx.forbidden('You do not have permission to access this payment');
        return;
      }

      // Check payment status
      if (paymentIntent.status === 'succeeded') {
        // Update order status if orderId exists
        if (paymentIntent.metadata.orderId) {
          await strapi.service('api::order.order').updatePaymentStatus(
            paymentIntent.metadata.orderId,
            'paid'
          );
        }

        ctx.send({
          status: 'succeeded',
          paymentIntentId: paymentIntent.id,
        });
      } else {
        ctx.send({
          status: paymentIntent.status,
          paymentIntentId: paymentIntent.id,
          requiresAction: paymentIntent.status === 'requires_action',
        });
      }
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        strapi.log.error('Stripe Error in confirmPayment:', error);
        ctx.throw(400, 'Payment confirmation failed: ' + error.message);
      } else {
        strapi.log.error('Error in confirmPayment:', error);
        ctx.throw(500, 'Failed to confirm payment');
      }
    }
  },

  /**
   * Handles refund requests
   * @param ctx - Strapi context
   */
  async refundPayment(ctx: StrapiContext): Promise<void> {
    try {
      if (!hasUser(ctx)) {
        ctx.unauthorized('You are not authorized!');
        return;
      }

      const { paymentIntentId, amount, reason } = ctx.request.body as {
        paymentIntentId: string;
        amount?: number;
        reason?: string;
      };

      if (!paymentIntentId) {
        throw new ValidationError('Payment intent ID is required');
      }

      // Retrieve payment intent to verify ownership
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.metadata.userId !== ctx.state.user.id.toString()) {
        // In production, you might want to check if user is admin
        ctx.forbidden('You do not have permission to refund this payment');
        return;
      }

      const refundData: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer',
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }

      if (reason) {
        refundData.metadata = { reason };
      }

      const refund = await stripe.refunds.create(refundData);

      // Update order status
      if (paymentIntent.metadata.orderId) {
        await strapi.service('api::order.order').updatePaymentStatus(
          paymentIntent.metadata.orderId,
          'refunded'
        );
      }

      strapi.log.info(`Refund created: ${refund.id} for payment ${paymentIntentId}`);

      ctx.send({
        refundId: refund.id,
        amount: refund.amount / 100, // Convert back to currency units
        status: refund.status,
        created: new Date(refund.created * 1000).toISOString(),
      });
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        strapi.log.error('Stripe Error in refundPayment:', error);
        ctx.throw(400, 'Refund failed: ' + error.message);
      } else {
        strapi.log.error('Error in refundPayment:', error);
        ctx.throw(500, 'Failed to process refund');
      }
    }
  },
};