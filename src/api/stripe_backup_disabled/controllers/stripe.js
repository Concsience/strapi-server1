"use strict";

/**
 * Standalone Stripe controller for payment processing
 */

module.exports = {
  // Create PaymentIntent endpoint
  async createPaymentIntent(ctx) {
    try {
      console.log('🔧 PaymentIntent endpoint called');
      console.log('🔧 Environment check:', !!process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY);
      
      // Validate Stripe key first
      if (!process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY || 
          !process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY.startsWith('sk_')) {
        console.log('❌ Stripe key validation failed');
        return ctx.badRequest('Stripe configuration error');
      }
      
      // Get Stripe instance with backend environment variable
      const stripe = require("stripe")(process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY);
      console.log('✅ Stripe instance created');

      // Parse request body
      const { amount, currency = 'eur' } = ctx.request.body;
      
      // Validate amount
      if (!amount || amount <= 0) {
        console.log('❌ Invalid amount:', amount);
        return ctx.badRequest('Invalid amount provided');
      }

      console.log('🔧 Backend Stripe - Creating PaymentIntent for amount:', amount);

      // Create PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency,
        payment_method_types: ['card'], // Only card payments
        metadata: {
          source: 'strapi_backend',
          created_at: new Date().toISOString()
        }
      });

      console.log('✅ PaymentIntent created:', paymentIntent.id);

      // Return success response
      return ctx.send({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      });

    } catch (error) {
      // Enhanced error logging
      console.error('❌ Backend Stripe Error:', {
        message: error.message,
        type: error.type,
        code: error.code,
        stack: error.stack
      });

      // Return error response
      return ctx.internalServerError({
        error: 'Payment creation failed',
        details: error.message,
        debug: {
          stripe_key_configured: !!process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY,
          stripe_key_format_valid: process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY?.startsWith('sk_') || false
        }
      });
    }
  },

  // Get payment methods endpoint (if needed)
  async getPaymentMethods(ctx) {
    try {
      const user = ctx.state.user;
      
      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      // This would fetch user's saved payment methods
      // For now, return empty array
      return ctx.send({
        success: true,
        payment_methods: []
      });

    } catch (error) {
      console.error('❌ Get Payment Methods Error:', error);
      return ctx.internalServerError('Failed to fetch payment methods');
    }
  }
};