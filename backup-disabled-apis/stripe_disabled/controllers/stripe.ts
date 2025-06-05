/**
 * Stripe Controller - TypeScript version
 * Handles all Stripe payment operations with full type safety
 */

import Stripe from 'stripe';
import { factories } from '@strapi/strapi';
import { StrapiContext, CreatePaymentIntentRequest, PaymentIntentResponse, hasUser, ApiResponse, ApiError } from '../../../types';
import { errors } from '@strapi/utils';

const { ValidationError } = errors;

export default factories.createCoreController('api::stripe.stripe', ({ strapi }) => {
  // Initialize Stripe with proper configuration
  const stripeSecretKey = process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey) {
    strapi.log.error('CRITICAL: STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY environment variable is not set');
    if (process.env.NODE_ENV === 'production') {
      throw new Error('STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY is required in production');
    }
  }

  const stripe = new Stripe(stripeSecretKey || '', {
    apiVersion: '2025-02-24.acacia',
  });

  // Validate Stripe key format
  if (stripeSecretKey && !stripeSecretKey.startsWith('sk_')) {
    strapi.log.warn('Stripe secret key format appears invalid. It should start with "sk_"');
  }

  return {
    /**
     * Create a payment intent for processing payments
     * @route POST /api/stripe/create-payment-intent
     */
    async createPaymentIntent(ctx: StrapiContext): Promise<any> {
      try {
        // Verify user authentication
        if (!hasUser(ctx)) {
          return ctx.unauthorized('You must be logged in to create a payment intent');
        }

        const { amount, currency = 'eur', orderId }: CreatePaymentIntentRequest = ctx.request.body;

        // Input validation
        if (!amount || amount <= 0) {
          throw new ValidationError('Valid amount is required and must be greater than 0');
        }

        if (amount > 999999999) {
          throw new ValidationError('Amount exceeds maximum allowed value');
        }

        // Log payment intent creation for auditing
        strapi.log.info(`Creating payment intent for user ${ctx.state.user.id}, amount: ${amount} ${currency}`);

        // Create or retrieve Stripe customer
        let stripeCustomer;
        try {
          const customers = await stripe.customers.list({
            email: ctx.state.user.email,
            limit: 1,
          });

          if (customers.data.length === 0) {
            stripeCustomer = await stripe.customers.create({
              email: ctx.state.user.email,
              name: `${ctx.state.user.firstName || ''} ${ctx.state.user.lastName || ''}`.trim(),
              metadata: {
                strapi_user_id: ctx.state.user.id.toString(),
                created_from: 'strapi_backend',
              },
            });
            strapi.log.info(`Created new Stripe customer ${stripeCustomer.id} for user ${ctx.state.user.id}`);
          } else {
            stripeCustomer = customers.data[0];
          }
        } catch (customerError) {
          strapi.log.error('Failed to create/retrieve Stripe customer:', customerError);
          throw customerError;
        }

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency.toLowerCase(),
          customer: stripeCustomer.id,
          metadata: {
            user_id: ctx.state.user.id.toString(),
            order_id: orderId || '',
            source: 'strapi_backend',
            created_at: new Date().toISOString(),
          },
          // Additional security options
          automatic_payment_methods: {
            enabled: true,
          },
        });

        // Log successful creation
        strapi.log.info(`Payment intent ${paymentIntent.id} created successfully`);

        return ctx.send({
          success: true,
          clientSecret: paymentIntent.client_secret,
          paymentIntent: {
            id: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
          },
        });

      } catch (error: unknown) {
        strapi.log.error('Payment intent creation failed:', error);

        if (error && typeof error === 'object' && 'type' in error) {
          // Handle specific Stripe errors
          const stripeError = error as { type: string; code?: string; message?: string };
          switch (stripeError.type) {
            case 'StripeCardError':
              return ctx.badRequest('Card was declined', { code: stripeError.code });
            case 'StripeRateLimitError':
              return ctx.tooManyRequests('Too many requests to Stripe');
            case 'StripeInvalidRequestError':
              return ctx.badRequest('Invalid request to Stripe', { details: stripeError.message });
            case 'StripeAPIError':
              return ctx.internalServerError('Stripe API error');
            case 'StripeConnectionError':
              return ctx.internalServerError('Failed to connect to Stripe');
            case 'StripeAuthenticationError':
              strapi.log.error('Stripe authentication failed - check API keys');
              return ctx.internalServerError('Payment service configuration error');
            default:
              return ctx.internalServerError('Payment processing error');
          }
        }

        if (error instanceof ValidationError) {
          return ctx.badRequest((error as any).message);
        }

        // Generic error response
        return ctx.internalServerError('An unexpected error occurred while processing payment');
      }
    },

    /**
     * Confirm a payment intent
     * @route POST /api/stripe/confirm-payment
     */
    async confirmPayment(ctx: StrapiContext): Promise<any> {
      try {
        if (!hasUser(ctx)) {
          return ctx.unauthorized('You must be logged in to confirm a payment');
        }

        const { paymentIntentId, paymentMethodId } = ctx.request.body;

        if (!paymentIntentId) {
          throw new ValidationError('Payment intent ID is required');
        }

        strapi.log.info(`Confirming payment intent ${paymentIntentId} for user ${ctx.state.user.id}`);

        const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
          payment_method: paymentMethodId,
        });

        return ctx.send({
          success: true,
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
          },
        });

      } catch (error: unknown) {
        strapi.log.error('Payment confirmation failed:', error);

        if (error && typeof error === 'object' && 'code' in error) {
          const stripeError = error as { code?: string; message?: string };
          return ctx.badRequest('Payment confirmation failed', { 
            code: stripeError.code,
            message: stripeError.message 
          });
        }

        return ctx.internalServerError('Failed to confirm payment');
      }
    },

    /**
     * Retrieve a payment intent
     * @route GET /api/stripe/payment-intent/:id
     */
    async getPaymentIntent(ctx: StrapiContext): Promise<any> {
      try {
        if (!hasUser(ctx)) {
          return ctx.unauthorized('You must be logged in to view payment details');
        }

        const { id } = ctx.params;

        if (!id) {
          throw new ValidationError('Payment intent ID is required');
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(id);

        // Verify the payment intent belongs to the user
        if (paymentIntent.metadata.user_id !== ctx.state.user.id.toString()) {
          return ctx.forbidden('You do not have permission to view this payment');
        }

        return ctx.send({
          success: true,
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            created: paymentIntent.created,
            metadata: paymentIntent.metadata,
          },
        });

      } catch (error: unknown) {
        strapi.log.error('Failed to retrieve payment intent:', error);

        if (error && typeof error === 'object' && 'code' in error) {
          const stripeError = error as { code?: string; message?: string };
          if (stripeError.code === 'resource_missing') {
            return ctx.notFound('Payment intent not found');
          }
          return ctx.badRequest('Failed to retrieve payment', { 
            code: stripeError.code,
            message: stripeError.message 
          });
        }

        return ctx.internalServerError('Failed to retrieve payment details');
      }
    },

    /**
     * Cancel a payment intent
     * @route POST /api/stripe/cancel-payment
     */
    async cancelPayment(ctx: StrapiContext): Promise<any> {
      try {
        if (!hasUser(ctx)) {
          return ctx.unauthorized('You must be logged in to cancel a payment');
        }

        const { paymentIntentId } = ctx.request.body;

        if (!paymentIntentId) {
          throw new ValidationError('Payment intent ID is required');
        }

        strapi.log.info(`Cancelling payment intent ${paymentIntentId} for user ${ctx.state.user.id}`);

        // Retrieve payment intent first to verify ownership
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.metadata.user_id !== ctx.state.user.id.toString()) {
          return ctx.forbidden('You do not have permission to cancel this payment');
        }

        // Cancel the payment intent
        const cancelledPayment = await stripe.paymentIntents.cancel(paymentIntentId);

        strapi.log.info(`Payment intent ${paymentIntentId} cancelled successfully`);

        return ctx.send({
          success: true,
          paymentIntent: {
            id: cancelledPayment.id,
            status: cancelledPayment.status,
          },
        });

      } catch (error: unknown) {
        strapi.log.error('Payment cancellation failed:', error);

        if (error && typeof error === 'object' && 'code' in error) {
          const stripeError = error as { code?: string; message?: string };
          return ctx.badRequest('Failed to cancel payment', { 
            code: stripeError.code,
            message: stripeError.message 
          });
        }

        return ctx.internalServerError('Failed to cancel payment');
      }
    },

    /**
     * Create a refund for a payment
     * @route POST /api/stripe/refund-payment
     */
    async refundPayment(ctx: StrapiContext): Promise<any> {
      try {
        if (!hasUser(ctx)) {
          return ctx.unauthorized('You must be logged in to process a refund');
        }

        const { paymentIntentId, amount, reason = 'requested_by_customer' } = ctx.request.body;

        if (!paymentIntentId) {
          throw new ValidationError('Payment intent ID is required');
        }

        strapi.log.info(`Processing refund for payment intent ${paymentIntentId}`);

        // Retrieve the payment intent to get the charge
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (!paymentIntent.latest_charge) {
          return ctx.badRequest('No charge found for this payment intent');
        }

        // Create the refund
        const refund = await stripe.refunds.create({
          charge: paymentIntent.latest_charge as string,
          amount: amount ? Math.round(amount * 100) : undefined, // Partial refund if amount specified
          reason: reason as Stripe.RefundCreateParams.Reason,
          metadata: {
            user_id: ctx.state.user.id.toString(),
            refunded_at: new Date().toISOString(),
          },
        });

        strapi.log.info(`Refund ${refund.id} created successfully for amount ${refund.amount}`);

        return ctx.send({
          success: true,
          refund: {
            id: refund.id,
            amount: refund.amount,
            currency: refund.currency,
            status: refund.status,
            reason: refund.reason,
          },
        });

      } catch (error: unknown) {
        strapi.log.error('Refund processing failed:', error);

        if (error && typeof error === 'object' && 'code' in error) {
          const stripeError = error as { code?: string; message?: string };
          return ctx.badRequest('Failed to process refund', { 
            code: stripeError.code,
            message: stripeError.message 
          });
        }

        return ctx.internalServerError('Failed to process refund');
      }
    },
  };
});