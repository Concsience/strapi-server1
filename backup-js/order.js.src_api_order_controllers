"use strict";

const { factories } = require('@strapi/strapi');
const stripe = require('stripe')(process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY);
const axios = require('axios');

/**
 * Order controller
 * Handles order creation, payment processing, and Stripe webhooks
 */
module.exports = factories.createCoreController('api::order.order', ({ strapi }) => ({
  /**
   * Create a new order with Stripe payment processing
   */
  async create(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You are not authorized!');
    }

    const { totalprice, paymentMethodeId, address, shipping_cost } = ctx.request.body.data;

    // Validate required fields
    if (!totalprice || !paymentMethodeId || !address) {
      return ctx.badRequest('Missing required fields: totalprice, paymentMethodeId, or address');
    }

    try {
      // Find or create Stripe customer
      const stripeCustomer = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      let customerId;
      if (stripeCustomer.data.length === 0) {
        const newCustomer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        });
        customerId = newCustomer.id;
      } else {
        customerId = stripeCustomer.data[0].id;
      }

      // Create order in Strapi
      const order = await strapi.service('api::order.order').create({
        data: {
          total_price: totalprice,
          user: user.id,
          status: 'pending',
          shipping_cost: shipping_cost || 0,
        },
      });

      // Create payment intent with proper error handling
      const totalAmount = Math.round((totalprice + (shipping_cost || 0)) * 100);
      
      const intent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'eur',
        payment_method: paymentMethodeId,
        customer: customerId,
        off_session: true,
        confirm: true,
        shipping: {
          name: `${address.nom} ${address.prenom}`,
          address: {
            line1: address.addresse,
            city: address.ville,
            state: address.region || undefined,
            postal_code: address.codePostal,
            country: 'FR',
          },
        },
        metadata: {
          orderId: order.id,
          userId: user.id.toString(),
          source: 'strapi_backend',
        },
      });

      // Update order with Stripe payment ID
      const updatedOrder = await strapi.service('api::order.order').update(order.id, {
        data: {
          stripe_payment_id: intent.id,
        },
      });

      return ctx.send({
        success: true,
        message: 'Order created successfully',
        paymentIntent: intent,
        order: updatedOrder,
      });

    } catch (error) {
      console.error('Order creation error:', error);

      // Handle Stripe-specific errors
      if (error.type) {
        switch (error.type) {
          case 'StripeCardError':
            return ctx.send({
              success: false,
              message: 'Payment failed. Please check your card details.',
              code: 'CARD_ERROR',
            });
          case 'StripeRateLimitError':
            return ctx.send({
              success: false,
              message: 'Too many requests. Please try again later.',
              code: 'RATE_LIMIT_ERROR',
            });
          case 'StripeInvalidRequestError':
            return ctx.send({
              success: false,
              message: 'Invalid request. Please check your payment details.',
              code: 'INVALID_REQUEST_ERROR',
            });
          default:
            return ctx.send({
              success: false,
              message: 'Payment processing error. Please try again.',
              code: 'STRIPE_ERROR',
            });
        }
      }

      // Handle general errors
      return ctx.throw(500, 'An error occurred while processing the payment.');
    }
  },

  /**
   * Handle Stripe webhook events for payment status updates
   */
  async stripeWebhook(ctx) {
    const sig = ctx.request.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      ctx.response.status = 500;
      return ctx.send('Webhook configuration error');
    }

    let event;

    try {
      const rawBody = ctx.request.body[Symbol.for('unparsedBody')];
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (error) {
      console.error(`⚠️  Webhook signature verification failed: ${error.message}`);
      ctx.response.status = 400;
      return ctx.send(`Webhook Error: ${error.message}`);
    }

    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.orderId;

    if (!orderId) {
      console.error('No orderId found in payment intent metadata');
      ctx.response.status = 400;
      return ctx.send('No order ID found');
    }

    try {
      // Find existing order with populated relations
      const existingOrder = await strapi.entityService.findOne('api::order.order', orderId, {
        populate: {
          ordered_items: {
            populate: ['art', 'book', 'paper_type'],
          },
          user: {
            populate: ['addresses'],
          },
        },
      });

      if (!existingOrder) {
        console.error(`Order ${orderId} not found`);
        ctx.response.status = 404;
        return ctx.send('Order not found');
      }

      // Get ordered items
      const orderedItems = await strapi.entityService.findMany('api::ordered-item.ordered-item', {
        filters: {
          order: {
            id: orderId,
          },
        },
      });

      let status;

      switch (event.type) {
        case 'payment_intent.succeeded':
          status = 'paid';
          await this.handleSuccessfulPayment(paymentIntent, existingOrder, orderedItems);
          break;

        case 'payment_intent.payment_failed':
          status = 'failed';
          console.log(`Payment failed for order ${orderId}`);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
          ctx.response.status = 200;
          return;
      }

      // Update order status
      await strapi.entityService.update('api::order.order', existingOrder.id, {
        data: { status },
      });

      ctx.response.status = 200;

    } catch (error) {
      console.error('Webhook processing error:', error);
      ctx.response.status = 500;
      return ctx.send('Webhook processing failed');
    }
  },

  /**
   * Handle successful payment processing
   */
  async handleSuccessfulPayment(paymentIntent, order, orderedItems) {
    try {
      // Create Stripe invoice
      const invoice = await stripe.invoices.create({
        customer: paymentIntent.customer,
        auto_advance: true,
        description: `Invoice for order #${order.id}`,
        metadata: { orderId: order.id.toString() },
        shipping_details: order.user?.addresses?.[0] ? {
          name: `${order.user.addresses[0].nom} ${order.user.addresses[0].prenom}`,
          address: {
            line1: order.user.addresses[0].addresse,
            city: order.user.addresses[0].ville,
            country: 'FR',
          },
        } : undefined,
        custom_fields: [
          {
            name: 'SIRET',
            value: '93032314200016',
          },
          {
            name: 'Code APE',
            value: '58.11Z',
          },
        ],
        footer: 'TVA non applicable, article 293 B du CGI',
      });

      // Add invoice items
      for (const item of orderedItems) {
        const hasArt = item.arttitle && item.arttitle.trim() !== '';
        const hasBook = item.book_title && item.book_title.trim() !== '';

        const description = hasArt
          ? `${item.arttitle} (${item.width}x${item.height}) - 3 ART`
          : hasBook
          ? `${item.book_title} - 5 ART`
          : 'No title provided';

        await stripe.invoiceItems.create({
          customer: paymentIntent.customer,
          unit_amount: Math.round((item.price || 0) * 100),
          currency: 'eur',
          description,
          quantity: item.quantity || 1,
          invoice: invoice.id,
        });
      }

      // Add shipping cost
      if (order.shipping_cost && order.shipping_cost > 0) {
        await stripe.invoiceItems.create({
          customer: paymentIntent.customer,
          amount: Math.round(order.shipping_cost * 100),
          currency: 'eur',
          description: 'Shipping Cost',
          invoice: invoice.id,
        });
      }

      // Finalize invoice
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
      const invoicePdfUrl = finalizedInvoice.invoice_pdf;

      // Download invoice PDF
      let invoicePdfBuffer = null;
      if (invoicePdfUrl) {
        try {
          const response = await axios.get(invoicePdfUrl, {
            responseType: 'arraybuffer',
          });
          invoicePdfBuffer = Buffer.from(response.data);
        } catch (error) {
          console.error('Failed to download invoice PDF:', error);
        }
      }

      // Update order with invoice ID
      await strapi.entityService.update('api::order.order', order.id, {
        data: { 
          stripe_invoice_id: invoice.id,
          status: 'paid'
        },
      });

      // Send confirmation email
      if (order.user?.email) {
        await strapi
          .plugin('email')
          .service('email')
          .send({
            to: order.user.email,
            subject: 'Payment Invoice from ARTEDUSA',
            text: `Hello ${order.user.firstName || 'Customer'}, your payment has been received.`,
            html: `
              <p>Hello ${order.user.firstName || 'Customer'},</p>
              <p>Thank you for your purchase. We have received your payment.</p>
              <p><strong>Order ID:</strong> ${order.id}</p>
              <p><strong>Total:</strong> €${(paymentIntent.amount_received || 0) / 100}</p>
            `,
            attachments: invoicePdfBuffer ? [
              {
                filename: `invoice-${order.id}.pdf`,
                content: invoicePdfBuffer,
              },
            ] : [],
          });
      }

    } catch (error) {
      console.error('Error handling successful payment:', error);
      throw error;
    }
  },
}));