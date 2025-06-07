'use strict';

/**
 * Cart Service - Strapi 5 Document Service API Implementation
 * Following official Strapi 5 documentation patterns
 * https://docs.strapi.io/dev-docs/api/document-service
 */

const { createCoreService } = require('@strapi/strapi').factories;
const { errors } = require('@strapi/utils');
const { ApplicationError, ValidationError } = errors;

module.exports = createCoreService('api::cart.cart', ({ strapi }) => ({
  /**
   * Get or create a cart for a user
   * @param {string} userId - The user's ID
   * @returns {Promise<Object>} The user's cart with populated items
   */
  async getOrCreateCart(userId) {
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    try {
      // Find existing cart for user using Document Service API
      const carts = await strapi.documents('api::cart.cart').findMany({
        filters: {
          user: { id: userId },
          // Only get active carts (not converted to orders)
          status: { $ne: 'converted' }
        },
        populate: {
          cart_items: {
            populate: {
              art: {
                populate: ['artist', 'artimage']
              },
              paper_type: true,
              book: true
            }
          },
          user: {
            fields: ['id', 'email', 'username']
          }
        },
        status: 'published'
      });

      let cart = carts && carts.length > 0 ? carts[0] : null;

      // Create new cart if none exists
      if (!cart) {
        cart = await strapi.documents('api::cart.cart').create({
          data: {
            user: userId,
            total_price: 0,
            status: 'active'
          },
          populate: {
            cart_items: {
              populate: {
                art: {
                  populate: ['artist', 'artimage']
                },
                paper_type: true,
                book: true
              }
            },
            user: {
              fields: ['id', 'email', 'username']
            }
          },
          status: 'published'
        });

        strapi.log.info(`Created new cart for user ${userId}`);
      }

      // Calculate and update total
      const total = await this.calculateTotal(cart.documentId);
      if (cart.total_price !== total) {
        cart = await strapi.documents('api::cart.cart').update({
          documentId: cart.documentId,
          data: { total_price: total }
        });
      }

      return cart;
    } catch (error) {
      strapi.log.error('Error in getOrCreateCart:', error);
      throw new ApplicationError('Failed to get or create cart');
    }
  },

  /**
   * Add an item to the cart
   * @param {string} cartId - Cart document ID
   * @param {Object} itemData - Item data to add
   * @returns {Promise<Object>} The created cart item
   */
  async addItem(cartId, itemData) {
    const { artId, paperTypeId, bookId, quantity = 1, width, height } = itemData;

    // Validate input
    if (!cartId) {
      throw new ValidationError('Cart ID is required');
    }

    if (!artId && !bookId) {
      throw new ValidationError('Either art ID or book ID is required');
    }

    if (quantity <= 0) {
      throw new ValidationError('Quantity must be greater than 0');
    }

    try {
      // Check if item already exists in cart
      const existingItems = await strapi.documents('api::cart-item.cart-item').findMany({
        filters: {
          cart: { documentId: cartId },
          ...(artId && { 
            art: { documentId: artId },
            paper_type: { documentId: paperTypeId },
            width: width,
            height: height
          }),
          ...(bookId && { book: { documentId: bookId } })
        }
      });

      if (existingItems && existingItems.length > 0) {
        // Update quantity of existing item
        const existingItem = existingItems[0];
        const newQuantity = (existingItem.quantity || 0) + quantity;

        return await strapi.documents('api::cart-item.cart-item').update({
          documentId: existingItem.documentId,
          data: {
            quantity: newQuantity,
            total_price: existingItem.price * newQuantity
          }
        });
      }

      // Get art or book details for pricing
      let price = 0;
      let itemDetails = {};

      if (artId) {
        const art = await strapi.documents('api::artists-work.artists-work').findOne({
          documentId: artId,
          populate: ['artist']
        });

        if (!art) {
          throw new ValidationError('Art not found');
        }

        // Calculate price based on size and base price
        const area = (width || 30) * (height || 40); // Default size if not provided
        price = (art.base_price_per_cm_square || 0.5) * area;

        itemDetails = {
          arttitle: art.artname,
          artistname: art.artist?.name || '',
          width: width || 30,
          height: height || 40
        };
      } else if (bookId) {
        const book = await strapi.documents('api::authorbook.authorbook').findOne({
          documentId: bookId
        });

        if (!book) {
          throw new ValidationError('Book not found');
        }

        price = book.price || 25; // Default book price
        itemDetails = {
          book_title: book.title,
          author_name: book.author || ''
        };
      }

      // Create new cart item
      const cartItem = await strapi.documents('api::cart-item.cart-item').create({
        data: {
          cart: cartId,
          art: artId || null,
          paper_type: paperTypeId || null,
          book: bookId || null,
          quantity: quantity,
          price: price,
          total_price: price * quantity,
          ...itemDetails
        },
        populate: {
          art: {
            populate: ['artist', 'artimage']
          },
          paper_type: true,
          book: true
        }
      });

      // Update cart total
      await this.updateCartTotal(cartId);

      strapi.log.info(`Added item to cart ${cartId}`);
      return cartItem;

    } catch (error) {
      strapi.log.error('Error adding item to cart:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ApplicationError('Failed to add item to cart');
    }
  },

  /**
   * Remove an item from the cart
   * @param {string} cartId - Cart document ID
   * @param {string} itemId - Cart item document ID
   */
  async removeItem(cartId, itemId) {
    if (!cartId || !itemId) {
      throw new ValidationError('Cart ID and item ID are required');
    }

    try {
      // Verify item belongs to cart
      const item = await strapi.documents('api::cart-item.cart-item').findOne({
        documentId: itemId,
        filters: {
          cart: { documentId: cartId }
        }
      });

      if (!item) {
        throw new ValidationError('Item not found in cart');
      }

      // Delete the item
      await strapi.documents('api::cart-item.cart-item').delete({
        documentId: itemId
      });

      // Update cart total
      await this.updateCartTotal(cartId);

      strapi.log.info(`Removed item ${itemId} from cart ${cartId}`);

    } catch (error) {
      strapi.log.error('Error removing item from cart:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ApplicationError('Failed to remove item from cart');
    }
  },

  /**
   * Update item quantity in the cart
   * @param {string} cartId - Cart document ID
   * @param {string} itemId - Cart item document ID
   * @param {number} quantity - New quantity
   */
  async updateItemQuantity(cartId, itemId, quantity) {
    if (!cartId || !itemId) {
      throw new ValidationError('Cart ID and item ID are required');
    }

    if (quantity <= 0) {
      throw new ValidationError('Quantity must be greater than 0');
    }

    try {
      // Get the item
      const item = await strapi.documents('api::cart-item.cart-item').findOne({
        documentId: itemId,
        filters: {
          cart: { documentId: cartId }
        }
      });

      if (!item) {
        throw new ValidationError('Item not found in cart');
      }

      // Update quantity and total price
      const updatedItem = await strapi.documents('api::cart-item.cart-item').update({
        documentId: itemId,
        data: {
          quantity: quantity,
          total_price: item.price * quantity
        }
      });

      // Update cart total
      await this.updateCartTotal(cartId);

      return updatedItem;

    } catch (error) {
      strapi.log.error('Error updating item quantity:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ApplicationError('Failed to update item quantity');
    }
  },

  /**
   * Calculate cart total
   * @param {string} cartId - Cart document ID
   * @returns {Promise<number>} Total price
   */
  async calculateTotal(cartId) {
    if (!cartId) {
      throw new ValidationError('Cart ID is required');
    }

    try {
      const cartItems = await strapi.documents('api::cart-item.cart-item').findMany({
        filters: {
          cart: { documentId: cartId }
        }
      });

      const total = cartItems.reduce((sum, item) => {
        return sum + (item.total_price || item.price * item.quantity || 0);
      }, 0);

      return Math.round(total * 100) / 100; // Round to 2 decimal places

    } catch (error) {
      strapi.log.error('Error calculating cart total:', error);
      throw new ApplicationError('Failed to calculate cart total');
    }
  },

  /**
   * Update cart total price
   * @param {string} cartId - Cart document ID
   */
  async updateCartTotal(cartId) {
    try {
      const total = await this.calculateTotal(cartId);
      
      await strapi.documents('api::cart.cart').update({
        documentId: cartId,
        data: { total_price: total }
      });

    } catch (error) {
      strapi.log.error('Error updating cart total:', error);
      // Don't throw - this is a background operation
    }
  },

  /**
   * Clear all items from cart
   * @param {string} cartId - Cart document ID
   */
  async clearCart(cartId) {
    if (!cartId) {
      throw new ValidationError('Cart ID is required');
    }

    try {
      // Get all cart items
      const cartItems = await strapi.documents('api::cart-item.cart-item').findMany({
        filters: {
          cart: { documentId: cartId }
        }
      });

      // Delete all items
      for (const item of cartItems) {
        await strapi.documents('api::cart-item.cart-item').delete({
          documentId: item.documentId
        });
      }

      // Update cart total to 0
      await strapi.documents('api::cart.cart').update({
        documentId: cartId,
        data: { total_price: 0 }
      });

      strapi.log.info(`Cleared cart ${cartId}`);

    } catch (error) {
      strapi.log.error('Error clearing cart:', error);
      throw new ApplicationError('Failed to clear cart');
    }
  },

  /**
   * Convert cart to order after successful payment
   * @param {string} cartId - Cart document ID
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Promise<Object>} The created order
   */
  async checkout(cartId, paymentIntentId) {
    if (!cartId || !paymentIntentId) {
      throw new ValidationError('Cart ID and payment intent ID are required');
    }

    try {
      // Get cart with items
      const cart = await strapi.documents('api::cart.cart').findOne({
        documentId: cartId,
        populate: {
          cart_items: {
            populate: ['art', 'paper_type', 'book']
          },
          user: true
        }
      });

      if (!cart) {
        throw new ValidationError('Cart not found');
      }

      if (!cart.cart_items || cart.cart_items.length === 0) {
        throw new ValidationError('Cart is empty');
      }

      // Create order
      const order = await strapi.documents('api::order.order').create({
        data: {
          user: cart.user.id,
          total_price: cart.total_price,
          status: 'pending',
          stripe_payment_id: paymentIntentId,
          shipping_cost: 0
        }
      });

      // Create ordered items from cart items
      for (const cartItem of cart.cart_items) {
        await strapi.documents('api::ordered-item.ordered-item').create({
          data: {
            order: order.documentId,
            art: cartItem.art?.documentId || null,
            paper_type: cartItem.paper_type?.documentId || null,
            book: cartItem.book?.documentId || null,
            arttitle: cartItem.arttitle,
            artistname: cartItem.artistname,
            book_title: cartItem.book_title,
            author_name: cartItem.author_name,
            width: cartItem.width,
            height: cartItem.height,
            price: cartItem.price,
            quantity: cartItem.quantity,
            total_price: cartItem.total_price
          }
        });
      }

      // Mark cart as converted
      await strapi.documents('api::cart.cart').update({
        documentId: cartId,
        data: { status: 'converted' }
      });

      // Clear cart items
      await this.clearCart(cartId);

      strapi.log.info(`Converted cart ${cartId} to order ${order.documentId}`);
      return order;

    } catch (error) {
      strapi.log.error('Error during checkout:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ApplicationError('Checkout failed');
    }
  }
}));