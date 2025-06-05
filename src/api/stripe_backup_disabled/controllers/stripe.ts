/**
 * Standalone Stripe Controller - TypeScript version (DISABLED)
 * Handles Stripe payment operations with full type safety
 * Note: This is a backup/disabled version - main Stripe controller is in /api/stripe/
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
        strapi.log.info('🔧 PaymentIntent endpoint called');
        strapi.log.info(`🔧 Environment check: ${!!process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY}`);
        
        // Validate Stripe key first
        if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_')) {
          strapi.log.error('❌ Stripe key validation failed');
          return ctx.badRequest('Stripe configuration error');
        }
        
        strapi.log.info('✅ Stripe instance created');

        // Parse request body with type safety
        const { amount, currency = 'eur' }: CreatePaymentIntentRequest = ctx.request.body;
        
        // Validate amount
        if (!amount || amount <= 0) {
          strapi.log.error('❌ Invalid amount:', amount);
          throw new ValidationError('Invalid amount provided');
        }

        strapi.log.info(`🔧 Backend Stripe - Creating PaymentIntent for amount: ${amount}`);

        // Create PaymentIntent with proper typing
        const paymentIntent: Stripe.PaymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency,
          payment_method_types: ['card'], // Only card payments
          metadata: {
            source: 'strapi_backend_disabled',
            created_at: new Date().toISOString()
          }
        });

        strapi.log.info(`✅ PaymentIntent created: ${paymentIntent.id}`);

        // Return success response with proper typing
        const response: PaymentIntentResponse = {
          success: true,
          client_secret: paymentIntent.client_secret!,
          payment_intent_id: paymentIntent.id,
        };

        return ctx.send(response);

      } catch (error: unknown) {
        // Enhanced error logging with proper typing  
        const stripeError = error as any;
        
        strapi.log.error('❌ Backend Stripe Error:', {
          message: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
          stack: stripeError.stack
        });

        // Return proper error response
        const errorResponse: ApiError = {
          error: {
            status: 500,
            name: 'PaymentError',
            message: 'Payment creation failed',
            details: {
              original: stripeError.message,
              debug: {
                stripe_key_configured: !!stripeSecretKey,
                stripe_key_format_valid: stripeSecretKey?.startsWith('sk_') || false
              }
            }
          }
        };

        return ctx.internalServerError(errorResponse);
      }
    },

    /**
     * Get payment methods endpoint
     * @route GET /api/stripe/payment-methods
     */
    async getPaymentMethods(ctx: StrapiContext): Promise<any> {
      try {
        // Verify user authentication using type-safe helper
        if (!hasUser(ctx)) {
          return ctx.unauthorized('Authentication required');
        }

        const user = ctx.state.user;
        strapi.log.info(`Fetching payment methods for user: ${user.id}`);

        // This would fetch user's saved payment methods
        // For now, return empty array with proper typing
        const response = {
          success: true,
          payment_methods: []
        };

        return ctx.send(response);

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        strapi.log.error('❌ Get Payment Methods Error:', errorMessage);
        
        const errorResponse: ApiError = {
          error: {
            status: 500,
            name: 'PaymentMethodsError',
            message: 'Failed to fetch payment methods',
            details: errorMessage
          }
        };

        return ctx.internalServerError(errorResponse);
      }
    }
  };
});