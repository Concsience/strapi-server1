/**
 * Cart Controller - Strapi v5 Migration
 * 
 * This file shows the migrated version of cart controller methods
 * using the Document Service API instead of Entity Service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::cart.cart', ({ strapi }) => ({
  
  /**
   * Get user's cart - MIGRATED TO v5
   */
  async getUserCart(ctx) {
    const { user } = ctx.state;
    if (!user) {
      return ctx.unauthorized('You must be logged in to view your cart');
    }

    try {
      // STRAPI V5: Using Document Service
      const carts = await strapi.documents('api::cart.cart').findMany({
        filters: { 
          user: { 
            documentId: user.documentId || user.id // Handle both v4 and v5 user objects
          } 
        },
        populate: {
          cart_items: {
            populate: {
              art: { 
                populate: ['images'] 
              },
              paper_type: true,
            },
          },
        },
        status: 'published' // Only get published carts
      });

      // Get the first cart (users should have only one cart)
      const cart = carts?.[0];

      if (!cart) {
        // Create a new cart if none exists
        const newCart = await strapi.documents('api::cart.cart').create({
          data: {
            user: { 
              connect: [user.documentId || user.id] // v5 relation format
            },
            total_price: 0,
          },
          status: 'published'
        });

        return ctx.send({ 
          data: newCart,
          meta: { message: 'New cart created' }
        });
      }

      return ctx.send({ data: cart });
    } catch (error) {
      strapi.log.error('Error fetching user cart:', error);
      return ctx.internalServerError('Unable to fetch cart');
    }
  },

  /**
   * Add item to cart - MIGRATED TO v5
   */
  async addItem(ctx) {
    const { user } = ctx.state;
    if (!user) {
      return ctx.unauthorized('You must be logged in to add items to cart');
    }

    const { artId, quantity = 1, paperTypeId } = ctx.request.body;

    try {
      // Get user's cart
      const carts = await strapi.documents('api::cart.cart').findMany({
        filters: { 
          user: { 
            documentId: user.documentId || user.id 
          } 
        },
        populate: ['cart_items']
      });

      let cart = carts?.[0];

      if (!cart) {
        // Create cart if it doesn't exist
        cart = await strapi.documents('api::cart.cart').create({
          data: {
            user: { 
              connect: [user.documentId || user.id] 
            },
            total_price: 0,
          },
          status: 'published'
        });
      }

      // Check if item already exists in cart
      const existingItems = await strapi.documents('api::cart-item.cart-item').findMany({
        filters: {
          cart: { 
            documentId: cart.documentId 
          },
          art: { 
            documentId: artId 
          },
          paper_type: paperTypeId ? { 
            documentId: paperTypeId 
          } : null
        }
      });

      if (existingItems.length > 0) {
        // Update quantity of existing item
        const existingItem = existingItems[0];
        const updatedItem = await strapi.documents('api::cart-item.cart-item').update({
          documentId: existingItem.documentId,
          data: {
            quantity: existingItem.quantity + quantity
          }
        });

        return ctx.send({ 
          data: updatedItem,
          meta: { message: 'Item quantity updated' }
        });
      }

      // Get artwork details for price calculation
      const artwork = await strapi.documents('api::artists-work.artists-work').findOne({
        documentId: artId,
        populate: ['artist']
      });

      if (!artwork) {
        return ctx.notFound('Artwork not found');
      }

      // Calculate price
      const price = this.calculatePrice(artwork, paperTypeId);

      // Create new cart item
      const cartItem = await strapi.documents('api::cart-item.cart-item').create({
        data: {
          cart: { 
            connect: [cart.documentId] 
          },
          art: { 
            connect: [artId] 
          },
          paper_type: paperTypeId ? { 
            connect: [paperTypeId] 
          } : undefined,
          quantity,
          price
        },
        status: 'published'
      });

      // Update cart total
      await this.updateCartTotal(cart.documentId);

      return ctx.send({ 
        data: cartItem,
        meta: { message: 'Item added to cart' }
      });
    } catch (error) {
      strapi.log.error('Error adding item to cart:', error);
      return ctx.internalServerError('Unable to add item to cart');
    }
  },

  /**
   * Update cart total - HELPER METHOD for v5
   */
  async updateCartTotal(cartDocumentId: string) {
    try {
      // Get all cart items
      const cartItems = await strapi.documents('api::cart-item.cart-item').findMany({
        filters: { 
          cart: { 
            documentId: cartDocumentId 
          } 
        }
      });

      // Calculate total
      const total = cartItems.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      // Update cart
      await strapi.documents('api::cart.cart').update({
        documentId: cartDocumentId,
        data: {
          total_price: total
        }
      });
    } catch (error) {
      strapi.log.error('Error updating cart total:', error);
    }
  },

  /**
   * Calculate price helper - remains the same
   */
  calculatePrice(artwork: any, paperTypeId?: string): number {
    // Your existing price calculation logic
    const basePrice = artwork.base_price_per_cm_square || 0;
    const width = artwork.original_width || 0;
    const height = artwork.original_height || 0;
    
    return basePrice * width * height;
  },

  /**
   * Remove item from cart - MIGRATED TO v5
   */
  async removeItem(ctx) {
    const { user } = ctx.state;
    if (!user) {
      return ctx.unauthorized('You must be logged in to remove items');
    }

    const { itemId } = ctx.params;

    try {
      // Verify the item belongs to user's cart
      const cartItem = await strapi.documents('api::cart-item.cart-item').findOne({
        documentId: itemId,
        populate: {
          cart: {
            populate: ['user']
          }
        }
      });

      if (!cartItem) {
        return ctx.notFound('Cart item not found');
      }

      // Check ownership
      if (cartItem.cart.user.documentId !== (user.documentId || user.id)) {
        return ctx.forbidden('You can only remove items from your own cart');
      }

      // Delete the item
      await strapi.documents('api::cart-item.cart-item').delete({
        documentId: itemId
      });

      // Update cart total
      await this.updateCartTotal(cartItem.cart.documentId);

      return ctx.send({ 
        data: { success: true },
        meta: { message: 'Item removed from cart' }
      });
    } catch (error) {
      strapi.log.error('Error removing item from cart:', error);
      return ctx.internalServerError('Unable to remove item');
    }
  },

  /**
   * Clear cart - MIGRATED TO v5
   */
  async clearCart(ctx) {
    const { user } = ctx.state;
    if (!user) {
      return ctx.unauthorized('You must be logged in to clear cart');
    }

    try {
      // Get user's cart
      const carts = await strapi.documents('api::cart.cart').findMany({
        filters: { 
          user: { 
            documentId: user.documentId || user.id 
          } 
        }
      });

      const cart = carts?.[0];
      if (!cart) {
        return ctx.notFound('Cart not found');
      }

      // Delete all cart items
      const cartItems = await strapi.documents('api::cart-item.cart-item').findMany({
        filters: { 
          cart: { 
            documentId: cart.documentId 
          } 
        }
      });

      // Delete each item
      await Promise.all(
        cartItems.map(item => 
          strapi.documents('api::cart-item.cart-item').delete({
            documentId: item.documentId
          })
        )
      );

      // Update cart total to 0
      await strapi.documents('api::cart.cart').update({
        documentId: cart.documentId,
        data: {
          total_price: 0
        }
      });

      return ctx.send({ 
        data: { success: true },
        meta: { message: 'Cart cleared successfully' }
      });
    } catch (error) {
      strapi.log.error('Error clearing cart:', error);
      return ctx.internalServerError('Unable to clear cart');
    }
  }
}));