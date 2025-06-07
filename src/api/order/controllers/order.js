const { factories } = require('@strapi/strapi');
const Stripe = require('stripe');
const axios = require('axios');

/**
 * Order controller - JavaScript
 * Handles order creation, payment processing, and Stripe webhooks
 */
const orderController = factories.createCoreController('api::order.order', ({ strapi }) => {
  // Initialize Stripe conditionally for non-test environments
  const stripeKey = process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  const stripe = stripeKey ? new Stripe(stripeKey, {
    apiVersion: '2025-02-24.acacia'
  }) : null;
  
  return {
  /**
   * Create a new order with Stripe payment processing
   */
  async create(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('You must be logged in to create an order');
      }

      const { cartId, shipping_cost = 0, address } = ctx.request.body.data;

      if (!cartId) {
        return ctx.badRequest('Cart ID is required');
      }

      // Use cart service to create order
      const order = await strapi.service('api::cart.cart').checkout(cartId);

      // Update with shipping and address if provided
      if (shipping_cost || address) {
        await strapi.documents('api::order.order').update({
          documentId: order.documentId,
          data: {
            shipping_cost: shipping_cost,
            address: address
          }
        });
      }

      return ctx.send({
        data: order
      });
    } catch (error) {
      strapi.log.error('Error creating order:', error);
      return ctx.internalServerError('Failed to create order');
    }

    } catch (error) {
      console.error('Order creation error:', error);

      // Handle Stripe-specific errors
      if (error instanceof Stripe.errors.StripeError) {
        const stripeError = error;
        
        switch (stripeError.type) {
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
    // Check if Stripe is available
    if (!stripe) {
      ctx.response.status = 503;
      return ctx.send('Payment processing is not available in this environment');
    }

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
      const existingOrder = await strapi.documents('api::order.order').findOne({
        documentId: orderId,
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
      const orderedItems = await strapi.documents('api::ordered-item.ordered-item').findMany({
        filters: {
          order: {
            documentId: orderId,
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
      await strapi.documents('api::order.order').update({
        documentId: existingOrder.documentId,
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
    // Check if Stripe is available
    if (!stripe) {
      console.log('Stripe not available - skipping invoice creation');
      return;
    }

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
      await strapi.documents('api::order.order').update({
        documentId: order.documentId,
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

  /**
   * Get all orders with enhanced data
   * GET /api/orders
   */
  async find(ctx) {
    try {
      const { status, userId, includeItems } = ctx.query;

      // Build filters
      const filters = {
        publishedAt: { $notNull: true }
      };

      if (status) {
        filters.status = status;
      }

      if (userId) {
        filters.user = { id: userId };
      }

      // Get orders
      const orders = await strapi.documents('api::order.order').findMany({
        filters,
        populate: {
          user: {
            fields: ['id', 'email', 'firstName', 'lastName']
          },
          ordered_items: includeItems === 'true' ? {
            populate: {
              art: {
                populate: ['artist', 'artimage']
              },
              paper_type: true
            }
          } : false
        },
        sort: 'createdAt:desc',
        ...ctx.query
      });

      // Enhance orders with calculated data
      const enhancedOrders = orders.results.map(order => ({
        ...order,
        itemCount: order.ordered_items?.length || 0,
        customerName: `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim(),
        formattedTotal: `€${order.total_price || 0}`,
        daysSinceOrder: Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      }));

      strapi.log.info(`Retrieved ${enhancedOrders.length} orders`);

      return ctx.send({
        data: enhancedOrders,
        meta: {
          pagination: orders.pagination
        }
      });

    } catch (error) {
      strapi.log.error('Error getting orders:', error);
      
      return ctx.internalServerError('Failed to fetch orders', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get single order by ID
   * GET /api/orders/:id
   */
  async findOne(ctx) {
    try {
      const { id } = ctx.params;

      const order = await strapi.documents('api::order.order').findOne({
        documentId: id,
        populate: {
          user: {
            fields: ['id', 'email', 'firstName', 'lastName']
          },
          ordered_items: {
            populate: {
              art: {
                populate: ['artist', 'artimage']
              },
              paper_type: true,
              book: true
            }
          }
        }
      });

      if (!order) {
        return ctx.notFound('Order not found');
      }

      // Enhance order with calculated data
      const enhancedOrder = {
        ...order,
        itemCount: order.ordered_items?.length || 0,
        customerName: `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim(),
        formattedTotal: `€${order.total_price || 0}`,
        itemsSummary: order.ordered_items?.map(item => ({
          ...item,
          lineTotal: (item.price || 0) * (item.quantity || 1),
          dimensions: `${item.width || 0}x${item.height || 0}cm`
        })) || []
      };

      strapi.log.info(`Retrieved order ${id}`);

      return ctx.send({
        data: enhancedOrder
      });

    } catch (error) {
      strapi.log.error('Error getting order:', error);
      
      return ctx.internalServerError('Failed to fetch order', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Update order status
   * PUT /api/orders/:id
   */
  async update(ctx) {
    try {
      const { id } = ctx.params;
      const { status, shipping_cost, notes } = ctx.request.body.data;

      if (!id) {
        return ctx.badRequest('Order ID is required');
      }

      // Validate status if provided
      const validStatuses = ['pending', 'paid', 'failed', 'cancelled', 'shipped', 'delivered'];
      if (status && !validStatuses.includes(status)) {
        return ctx.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const updateData = {};
      if (status) updateData.status = status;
      if (shipping_cost !== undefined) updateData.shipping_cost = shipping_cost;
      if (notes) updateData.notes = notes;

      const updatedOrder = await strapi.documents('api::order.order').update({
        documentId: id,
        data: updateData,
        populate: {
          user: {
            fields: ['id', 'email', 'firstName', 'lastName']
          },
          ordered_items: {
            populate: {
              art: {
                populate: ['artist']
              }
            }
          }
        }
      });

      strapi.log.info(`Updated order ${id}: status=${status}`);

      return ctx.send({
        data: updatedOrder
      });

    } catch (error) {
      strapi.log.error('Error updating order:', error);
      
      return ctx.internalServerError('Failed to update order', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Create order from cart
   * POST /api/orders/from-cart
   */
  async createFromCart(ctx) {
    try {
      const { cartId, paymentMethodId, address, shipping_cost = 0 } = ctx.request.body;

      if (!cartId) {
        return ctx.badRequest('Cart ID is required');
      }

      // Get cart items
      const cartItems = await strapi.documents('api::cart-item.cart-item').findMany({
        filters: {
          cart: { documentId: cartId }
        },
        populate: {
          art: {
            populate: ['artist']
          },
          paper_type: true
        }
      });

      if (cartItems.results.length === 0) {
        return ctx.badRequest('Cart is empty');
      }

      // Calculate total
      const itemsTotal = cartItems.results.reduce((sum, item) => 
        sum + ((item.price || 0) * (item.quantity || 1)), 0
      );
      const totalPrice = itemsTotal + shipping_cost;

      // Create order
      const orderData = {
        user: ctx.state.user?.id,
        total_price: totalPrice,
        shipping_cost: shipping_cost,
        status: 'pending'
      };

      const order = await strapi.documents('api::order.order').create({
        data: orderData,
        populate: {
          user: true
        }
      });

      // Create ordered items from cart items
      const orderedItems = await strapi.service('api::ordered-item.ordered-item').createFromCartItems(
        cartItems.results,
        order.documentId
      );

      strapi.log.info(`Created order ${order.documentId} from cart ${cartId} with ${orderedItems.length} items`);

      return ctx.send({
        data: {
          ...order,
          ordered_items: orderedItems,
          itemCount: orderedItems.length
        }
      });

    } catch (error) {
      strapi.log.error('Error creating order from cart:', error);
      
      return ctx.internalServerError('Failed to create order from cart', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Create Stripe payment intent for Elements
   * POST /api/orders/create-payment-intent
   */
  async createPaymentIntent(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('You must be logged in to make a payment');
      }

      if (!stripe) {
        return ctx.serviceUnavailable('Payment service is not available');
      }

      const { cartId, shippingCost = 0 } = ctx.request.body;

      if (!cartId) {
        return ctx.badRequest('Cart ID is required');
      }

      // Get cart with items
      const cart = await strapi.service('api::cart.cart').getOrCreateCart(user.id);
      
      if (!cart || cart.documentId !== cartId) {
        return ctx.badRequest('Invalid cart');
      }

      if (!cart.cart_items || cart.cart_items.length === 0) {
        return ctx.badRequest('Cart is empty');
      }

      // Calculate total
      const itemsTotal = cart.total_price || 0;
      const totalAmount = Math.round((itemsTotal + shippingCost) * 100); // Convert to cents

      if (totalAmount < 50) { // Stripe minimum is 50 cents
        return ctx.badRequest('Order total is below minimum amount');
      }

      // Get or create Stripe customer
      let customer;
      try {
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 1
        });

        if (customers.data.length > 0) {
          customer = customers.data[0];
        } else {
          customer = await stripe.customers.create({
            email: user.email,
            name: user.username || user.email,
            metadata: {
              strapiUserId: user.id.toString()
            }
          });
        }
      } catch (error) {
        strapi.log.error('Error creating/finding Stripe customer:', error);
        customer = null;
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'eur',
        customer: customer?.id,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          cartId: cart.documentId,
          userId: user.id.toString(),
          itemCount: cart.cart_items.length.toString(),
          source: 'strapi_backend'
        },
        description: `Order for ${user.email} - ${cart.cart_items.length} items`
      });

      // Return client secret for frontend
      return ctx.send({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: totalAmount,
        currency: 'eur'
      });

    } catch (error) {
      strapi.log.error('Payment intent creation error:', error);
      return ctx.internalServerError('Failed to create payment intent');
    }
  },

  /**
   * Confirm payment and create order for Elements
   * POST /api/orders/confirm-payment
   */
  async confirmPayment(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      if (!stripe) {
        return ctx.serviceUnavailable('Payment service is not available');
      }

      const { paymentIntentId, cartId } = ctx.request.body;

      if (!paymentIntentId || !cartId) {
        return ctx.badRequest('Payment intent ID and cart ID are required');
      }

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return ctx.badRequest('Payment has not been completed');
      }

      // Verify metadata matches
      if (paymentIntent.metadata.cartId !== cartId || 
          paymentIntent.metadata.userId !== user.id.toString()) {
        return ctx.badRequest('Payment verification failed');
      }

      // Convert cart to order
      const order = await strapi.service('api::cart.cart').checkout(
        cartId,
        paymentIntentId
      );

      // Update order with payment details
      await strapi.documents('api::order.order').update({
        documentId: order.documentId,
        data: {
          status: 'paid',
          stripe_payment_id: paymentIntentId,
          total_price: paymentIntent.amount / 100 // Convert from cents
        }
      });

      return ctx.send({
        success: true,
        order: {
          documentId: order.documentId,
          total: paymentIntent.amount / 100,
          status: 'paid'
        }
      });

    } catch (error) {
      strapi.log.error('Payment confirmation error:', error);
      return ctx.internalServerError('Failed to confirm payment');
    }
  },
  };
});

module.exports = orderController;