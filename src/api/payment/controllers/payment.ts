/**
 * Payment Controller - TypeScript version
 * Handles Stripe payment operations with full type safety and error handling
 */

import { factories } from '@strapi/strapi';
import { StrapiContext, hasUser, ApiResponse } from '../../../types';
import { errors } from '@strapi/utils';
import Stripe from 'stripe';

const { ValidationError } = errors;

export default factories.createCoreController('api::payment.payment', ({ strapi }) => {
  // Initialize Stripe with proper typing
  const stripe = new Stripe(process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia',
  });

  // Type definitions
  interface UserAddress {
    nom?: string;
    prenom?: string;
    addresse?: string;
    ville?: string;
    region?: string;
    codePostal?: string;
  }

  interface UserWithAddresses {
    documentId: string;
    email: string;
    username: string;
    stripe_customer_id?: string;
    addresses?: UserAddress[];
  }

  interface SetupIntentResponse {
    client_secret: string;
  }

  interface PaymentMethodResponse {
    payment_methods: Array<{
      id: string;
      type: string;
      card?: {
        brand: string;
        last4: string;
        exp_month: number;
        exp_year: number;
      };
    }>;
    default_payment_method?: string;
  }

  /**
   * Helper: Get safe error message
   */
  function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  /**
   * Helper: Get or create Stripe customer
   */
  async function getOrCreateStripeCustomer(
    email: string,
    userDetail?: UserWithAddresses
  ): Promise<Stripe.Customer> {
    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Create new customer with metadata
    const customerData: Stripe.CustomerCreateParams = {
      email,
      metadata: {
        strapi_user_id: userDetail?.documentId || '',
      },
    };

    // Add address if available
    if (userDetail?.addresses && userDetail.addresses.length > 0) {
      const address = userDetail.addresses[0];
      if (address.addresse && address.ville && address.codePostal) {
        customerData.address = {
          line1: address.addresse,
          city: address.ville,
          state: address.region || '',
          postal_code: address.codePostal,
        };
      }
    } else if (userDetail?.username) {
      customerData.name = userDetail.username;
    }

    return await stripe.customers.create(customerData);
  }

  return {
    /**
     * Create a setup intent for future payments
     */
    async createSetupIntent(ctx: StrapiContext): Promise<void> {
      try {
        // Validate user authentication
        if (!hasUser(ctx)) {
          ctx.unauthorized('You must be logged in to create a payment setup');
          return;
        }

        const user = ctx.state.user;
        const userEmail = user.email;

        if (!userEmail) {
          throw new ValidationError('User email is required for payment setup');
        }

        // Get user details with addresses
        const userDetail = await strapi.documents('plugin::users-permissions.user').findOne({
          documentId: user.documentId || user.id.toString(),
          populate: ['addresses']
        }) as UserWithAddresses;

        // Get or create Stripe customer
        const customer = await getOrCreateStripeCustomer(userEmail, userDetail);

        // Clean up existing payment methods (as per original logic)
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customer.id,
          type: 'card',
        });

        for (const pm of paymentMethods.data) {
          await stripe.paymentMethods.detach(pm.id);
        }

        // Create setup intent
        const intent = await stripe.setupIntents.create({
          customer: customer.id,
          payment_method_types: ['card'],
          usage: 'off_session', // For future payments
        });

        if (!intent.client_secret) {
          throw new Error('Failed to create setup intent');
        }

        const response: ApiResponse<SetupIntentResponse> = {
          data: {
            client_secret: intent.client_secret,
          },
          meta: {
            message: 'Setup intent created successfully',
            customerId: customer.id,
          },
        };

        ctx.send(response);
      } catch (error: unknown) {
        if (error instanceof ValidationError) {
          ctx.badRequest(getErrorMessage(error));
        } else if (error instanceof Stripe.errors.StripeError) {
          strapi.log.error('Stripe error in createSetupIntent:', error);
          ctx.throw(400, `Stripe error: ${error.message}`);
        } else {
          strapi.log.error('Error in createSetupIntent:', error);
          ctx.throw(500, 'Failed to create setup intent');
        }
      }
    },

    /**
     * Get saved payment methods for a customer
     */
    async getPaymentMethods(ctx: StrapiContext): Promise<void> {
      try {
        // Validate user authentication
        if (!hasUser(ctx)) {
          ctx.unauthorized('You must be logged in to view payment methods');
          return;
        }

        const user = ctx.state.user;
        const userEmail = user.email;

        if (!userEmail) {
          throw new ValidationError('User email is required');
        }

        // Get user details with potential stripe customer ID
        const userDetail = await strapi.documents('plugin::users-permissions.user').findOne({
          documentId: user.documentId || user.id.toString(),
          populate: ['addresses']
        }) as UserWithAddresses;

        // Get or create Stripe customer
        const customer = await getOrCreateStripeCustomer(userEmail, userDetail);

        // Get payment methods
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customer.id,
          type: 'card',
        });

        // Get default payment method
        const customerData = await stripe.customers.retrieve(customer.id);
        const defaultPaymentMethod = 
          typeof customerData !== 'string' && 'invoice_settings' in customerData
            ? customerData.invoice_settings?.default_payment_method
            : null;

        const response: ApiResponse<PaymentMethodResponse> = {
          data: {
            payment_methods: paymentMethods.data.map(pm => ({
              id: pm.id,
              type: pm.type,
              card: pm.card ? {
                brand: pm.card.brand,
                last4: pm.card.last4,
                exp_month: pm.card.exp_month,
                exp_year: pm.card.exp_year,
              } : undefined,
            })),
            default_payment_method: defaultPaymentMethod as string | undefined,
          },
        };

        ctx.send(response);
      } catch (error: unknown) {
        if (error instanceof ValidationError) {
          ctx.badRequest(getErrorMessage(error));
        } else if (error instanceof Stripe.errors.StripeError) {
          strapi.log.error('Stripe error in getPaymentMethods:', error);
          ctx.throw(400, `Stripe error: ${error.message}`);
        } else {
          strapi.log.error('Error in getPaymentMethods:', error);
          ctx.throw(500, 'Failed to retrieve payment methods');
        }
      }
    },
  };
});