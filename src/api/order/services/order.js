const { factories  } = require('@strapi/strapi');


/**
 * Order service - TypeScript
 * Business logic for order management and calculations
 */
const orderService = factories.createCoreService('api::order.order', ({ strapi }) => ({
  /**
   * Create order with proper validation and relations
   */
  async createOrder(data) {
    // Validate required fields
    if (!data.user || !data.total_price) {
      throw new Error('User and total_price are required for order creation');
    }

    // Set default values
    const orderData = {
      ...data,
      status: data.status || 'pending',
      shipping_cost: data.shipping_cost || 0,
      created_at: new Date(),
    };

    return await strapi.documents('api::order.order').create({
      data: orderData,
    });
  },

  /**
   * Find user orders with pagination and population
   */
  async findUserOrders(
    userId, 
    options = {}
  ) {
    const { page = 1, pageSize = 25, populate = {}, sort = 'createdAt:desc' } = options;

    return await strapi.documents('api::order.order').findMany({
      filters: {
        user: {
          id: userId,
        },
      },
      populate: {
        ordered_items: {
          populate: ['art', 'book', 'paper_type'],
        },
        user: true,
        ...populate,
      },
      pagination: {
        page,
        pageSize,
      },
      sort: [sort],
    });
  },

  /**
   * Calculate order total from items
   */
  async calculateOrderTotal(orderId) {
    const orderedItems = await strapi.documents('api::ordered-item.ordered-item').findMany({
      filters: {
        order: {
          documentId: orderId,
        },
      },
    });

    let total = 0;
    for (const item of orderedItems) {
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      total += itemTotal;
    }

    return total;
  },

  /**
   * Update order status with validation
   */
  async updateOrderStatus(
    documentId, 
    status
  ) {
    const validStatuses = ['pending', 'paid', 'failed', 'cancelled', 'shipped', 'delivered'];
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Valid statuses: ${validStatuses.join(', ')}`);
    }

    return await strapi.documents('api::order.order').update({
      documentId,
      data: { 
        status,
        updated_at: new Date(),
      },
    });
  },

  /**
   * Get order statistics for admin dashboard
   */
  async getOrderStatistics(filters = {}) {
    const orders = await strapi.documents('api::order.order').findMany({
      filters,
      populate: {
        ordered_items: true,
      },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total_price || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const statusBreakdown = {};
    orders.forEach(order => {
      const status = order.status || 'unknown';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      statusBreakdown,
    };
  },

  /**
   * Generate order confirmation data for emails
   */
  async getOrderConfirmationData(documentId) {
    const order = await strapi.documents('api::order.order').findOne({
      documentId,
      populate: {
        ordered_items: {
          populate: ['art', 'book', 'paper_type'],
        },
        user: true,
      },
    });

    if (!order) {
      throw new Error(`Order ${documentId} not found`);
    }

    const items = order.ordered_items || [];
    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const formattedTotal = `€${(order.total_price || 0).toFixed(2)}`;

    return {
      order,
      items,
      totalItems,
      formattedTotal,
    };
  },

  /**
   * Convert cart to order
   */
  async convertCartToOrder(cartId, orderData) {
    // Get cart with items
    const cart = await strapi.documents('api::cart.cart').findOne({
      documentId: cartId,
      populate: {
        cart_items: {
          populate: ['art', 'book', 'paper_type'],
        },
        user: true,
      },
    });

    if (!cart) {
      throw new Error(`Cart ${cartId} not found`);
    }

    if (!cart.cart_items || cart.cart_items.length === 0) {
      throw new Error('Cannot create order from empty cart');
    }

    // Create order
    const order = await this.createOrder({
      user: cart.user?.id,
      total_price: cart.total_price || 0,
      ...orderData,
    });

    // Convert cart items to ordered items
    for (const cartItem of cart.cart_items) {
      await strapi.documents('api::ordered-item.ordered-item').create({
        data: {
          order: order.documentId,
          art: cartItem.art?.id,
          book: cartItem.book?.id,
          paper_type: cartItem.paper_type?.id,
          arttitle: cartItem.arttitle,
          book_title: cartItem.book_title,
          author_name: cartItem.author_name,
          artistname: cartItem.artistname,
          width: cartItem.width,
          height: cartItem.height,
          price: cartItem.price,
          quantity: cartItem.qty || 1,
        },
      });
    }

    // Clear cart after successful order creation
    await strapi.documents('api::cart-item.cart-item').delete({
      filters: {
        cart: {
          documentId: cartId,
        },
      },
    });

    return order;
  },
}));

module.exports = orderService;