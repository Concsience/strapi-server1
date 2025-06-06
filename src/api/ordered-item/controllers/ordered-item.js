/**
 * ordered-item controller - TypeScript implementation
 * Manages items within completed orders for fulfillment tracking
 * Follows official Strapi TypeScript documentation patterns
 */

const { factories  } = require('@strapi/strapi');


// Ordered Item interface based on schema


module.exports = factories.createCoreController('api::ordered-item.ordered-item', ({ strapi }) => ({
  /**
   * Get ordered items with enhanced order context
   * GET /api/ordered-items
   */
  async find(ctx) {
    try {
      if (!hasUser(ctx)) {
        return ctx.unauthorized('Authentication required to view ordered items');
      }

      const { orderId, status, includeStats } = ctx.query;

      // Build filters
      const filters = {
        publishedAt: { $notNull: true }
      };

      // Filter by order if specified
      if (orderId) {
        filters.order = { documentId: orderId };
      }

      // Filter by order status if specified
      if (status) {
        filters.order = {
          ...filters.order,
          status: status
        };
      }

      const orderedItems = await strapi.documents('api::ordered-item.ordered-item').findMany({
        filters,
        populate: {
          art: {
            populate: ['artist', 'artimage']
          },
          paper_type: true,
          book: true,
          order: {
            populate: ['user']
          }
        },
        sort: 'createdAt:desc',
        ...ctx.query
      });

      // Enhance with calculated data
      const enhancedItems = orderedItems.results.map(item => ({
        ...item,
        dimensions: `${item.width || 0}x${item.height || 0}cm`,
        area: (item.width || 0) * (item.height || 0),
        totalPrice: (item.price || 0) * (item.quantity || 1),
        orderStatus: item.order?.status || 'unknown',
        customerEmail: item.order?.user?.email || 'Unknown'
      }));

      const response = {
        data: enhancedItems,
        meta: {
          pagination: orderedItems.pagination,
          summary: {
            totalItems: enhancedItems.length,
            totalQuantity: enhancedItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
            totalValue: enhancedItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0)
          }
        }
      };

      // Add statistics if requested
      if (includeStats === 'true') {
        response.meta.stats = await strapi.service('api::ordered-item.ordered-item').getOrderedItemStats();
      }

      strapi.log.info(`Retrieved ${enhancedItems.length} ordered items`);

      return ctx.send(response);

    } catch (error) {
      strapi.log.error('Error getting ordered items:', error);
      
      return ctx.internalServerError('Failed to fetch ordered items', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get ordered items by order ID
   * GET /api/ordered-items/by-order/:orderId
   */
  async getByOrder(ctx) {
    try {
      const { orderId } = ctx.params;

      if (!orderId) {
        return ctx.badRequest('Order ID is required');
      }

      const orderedItems = await strapi.documents('api::ordered-item.ordered-item').findMany({
        filters: {
          order: { documentId: orderId },
          publishedAt: { $notNull: true }
        },
        populate: {
          art: {
            populate: ['artist', 'artimage']
          },
          paper_type: true,
          book: true
        },
        sort: 'createdAt:asc'
      });

      // Calculate order totals
      const orderSummary = {
        itemCount: orderedItems.results.length,
        totalQuantity: orderedItems.results.reduce((sum, item) => sum + (item.quantity || 0), 0),
        totalValue: orderedItems.results.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0),
        items: orderedItems.results.map(item => ({
          ...item,
          lineTotal: (item.price || 0) * (item.quantity || 1),
          dimensions: `${item.width || 0}x${item.height || 0}cm`
        }))
      };

      strapi.log.info(`Retrieved ${orderedItems.results.length} items for order ${orderId}`);

      return ctx.send({
        data: orderSummary
      });

    } catch (error) {
      strapi.log.error('Error getting ordered items by order:', error);
      
      return ctx.internalServerError('Failed to get ordered items for order', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get ordered item statistics for admin dashboard
   * GET /api/ordered-items/stats
   */
  async stats(ctx) {
    try {
      const stats = await strapi.service('api::ordered-item.ordered-item').getOrderedItemStats();

      return ctx.send({
        data: stats
      });

    } catch (error) {
      strapi.log.error('Error getting ordered item stats:', error);
      
      return ctx.internalServerError('Failed to get ordered item statistics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Update fulfillment status for ordered items
   * PUT /api/ordered-items/:id/fulfillment
   */
  async updateFulfillment(ctx) {
    try {
      const { id } = ctx.params;
      const { fulfillmentStatus, trackingNumber, notes } = ctx.request.body;

      if (!id) {
        return ctx.badRequest('Ordered item ID is required');
      }

      if (!fulfillmentStatus) {
        return ctx.badRequest('Fulfillment status is required');
      }

      // Validate fulfillment status
      const validStatuses = ['pending', 'processing', 'printed', 'shipped', 'delivered'];
      if (!validStatuses.includes(fulfillmentStatus)) {
        return ctx.badRequest(`Invalid fulfillment status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const updatedItem = await strapi.documents('api::ordered-item.ordered-item').update({
        documentId: id,
        data: {
          fulfillmentStatus,
          trackingNumber,
          fulfillmentNotes: notes,
          lastFulfillmentUpdate: new Date().toISOString()
        },
        populate: {
          art: {
            populate: ['artist']
          },
          order: {
            populate: ['user']
          }
        }
      });

      strapi.log.info(`Updated fulfillment status for ordered item ${id}: ${fulfillmentStatus}`);

      return ctx.send({
        data: updatedItem
      });

    } catch (error) {
      strapi.log.error('Error updating fulfillment:', error);
      
      return ctx.internalServerError('Failed to update fulfillment status', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Create ordered items from cart items (called during order processing)
   * POST /api/ordered-items/from-cart
   */
  async createFromCart(ctx) {
    try {
      const { cartId, orderId } = ctx.request.body;

      if (!cartId || !orderId) {
        return ctx.badRequest('Cart ID and Order ID are required');
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
          paper_type: true,
          book: true
        }
      });

      if (cartItems.results.length === 0) {
        return ctx.badRequest('No items found in cart');
      }

      // Create ordered items from cart items
      const orderedItems = [];
      for (const cartItem of cartItems.results) {
        const orderedItemData = {
          arttitle: cartItem.arttitle,
          width: cartItem.width,
          height: cartItem.height,
          art: cartItem.art?.documentId,
          artistname: cartItem.artistname,
          paper_type: cartItem.paper_type?.documentId,
          price: cartItem.price,
          quantity: cartItem.qty,
          book_title: cartItem.book_title,
          author_name: cartItem.author_name,
          book: cartItem.book?.documentId,
          order: orderId,
          fulfillmentStatus: 'pending'
        };

        const orderedItem = await strapi.documents('api::ordered-item.ordered-item').create({
          data: orderedItemData,
          populate: {
            art: {
              populate: ['artist']
            },
            paper_type: true,
            book: true
          }
        });

        orderedItems.push(orderedItem);
      }

      strapi.log.info(`Created ${orderedItems.length} ordered items from cart ${cartId} for order ${orderId}`);

      return ctx.send({
        data: orderedItems,
        meta: {
          summary: {
            itemsCreated: orderedItems.length,
            totalValue: orderedItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0)
          }
        }
      });

    } catch (error) {
      strapi.log.error('Error creating ordered items from cart:', error);
      
      return ctx.internalServerError('Failed to create ordered items from cart', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get fulfillment pipeline overview
   * GET /api/ordered-items/fulfillment-pipeline
   */
  async getFulfillmentPipeline(ctx) {
    try {
      const pipeline = await strapi.service('api::ordered-item.ordered-item').getFulfillmentPipeline();

      return ctx.send({
        data: pipeline
      });

    } catch (error) {
      strapi.log.error('Error getting fulfillment pipeline:', error);
      
      return ctx.internalServerError('Failed to get fulfillment pipeline', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get items ready for printing
   * GET /api/ordered-items/ready-for-printing
   */
  async getReadyForPrinting(ctx) {
    try {
      const readyItems = await strapi.service('api::ordered-item.ordered-item').getItemsReadyForPrinting();

      return ctx.send({
        data: readyItems
      });

    } catch (error) {
      strapi.log.error('Error getting items ready for printing:', error);
      
      return ctx.internalServerError('Failed to get items ready for printing', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Generate production sheets
   * GET /api/ordered-items/production-sheets
   */
  async getProductionSheets(ctx) {
    try {
      const { paperType } = ctx.query;

      const productionSheets = await strapi.service('api::ordered-item.ordered-item').generateProductionSheets(
        paperType
      );

      return ctx.send({
        data: productionSheets
      });

    } catch (error) {
      strapi.log.error('Error generating production sheets:', error);
      
      return ctx.internalServerError('Failed to generate production sheets', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}));