/**
 * Cart Controller - TypeScript version
 * Handles HTTP requests for cart operations with full type safety
 */

import { factories } from '@strapi/strapi';
import { StrapiContext, hasUser, ApiResponse, CartData } from '../../../types';
import { errors } from '@strapi/utils';

const { ValidationError } = errors;

interface AddItemRequest {
  artId: number;
  quantity: number;
  paperTypeId?: number;
  customWidth?: number;
  customHeight?: number;
}

interface UpdateQuantityRequest {
  quantity: number;
}

export default factories.createCoreController('api::cart.cart', ({ strapi }) => ({
  /**
   * Get the current user's cart
   */
  async findOne(ctx: StrapiContext): Promise<void> {
    try {
      if (!hasUser(ctx)) {
        ctx.unauthorized('You must be logged in to view your cart');
        return;
      }

      const userId = ctx.state.user.id;
      const cart = await strapi.service('api::cart.cart').getOrCreateCart(userId);

      const response: ApiResponse<CartData> = {
        data: cart,
      };

      ctx.send(response);
    } catch (error) {
      strapi.log.error('Error in cart.findOne:', error);
      ctx.throw(500, 'Failed to retrieve cart');
    }
  },

  /**
   * Add an item to the cart
   */
  async addItem(ctx: StrapiContext): Promise<void> {
    try {
      if (!hasUser(ctx)) {
        ctx.unauthorized('You must be logged in to add items to cart');
        return;
      }

      const userId = ctx.state.user.id;
      const itemData = ctx.request.body as AddItemRequest;

      // Validate request
      if (!itemData.artId || !itemData.quantity) {
        throw new ValidationError('Art ID and quantity are required');
      }

      if (itemData.quantity <= 0) {
        throw new ValidationError('Quantity must be greater than 0');
      }

      // Get or create cart - check if enhanced service is available
      const cartService = strapi.service('api::cart.cart');
      
      // Use enhanced methods if available, otherwise fallback to core
      const cart = typeof cartService.getOrCreateCart === 'function' 
        ? await cartService.getOrCreateCart(userId)
        : await strapi.entityService.findMany('api::cart.cart', {
            filters: { user: userId, status: 'active' },
            populate: { cart_items: { populate: ['art', 'paper_type'] } },
            limit: 1
          }).then(carts => carts?.[0]);

      if (!cart) {
        throw new ValidationError('Unable to find or create cart');
      }

      // Add item to cart - check if method exists
      const newItem = typeof cartService.addItem === 'function'
        ? await cartService.addItem(cart.id, itemData)
        : await strapi.entityService.create('api::cart-item.cart-item', {
            data: {
              cart: cart.id,
              art: itemData.artId,
              paper_type: itemData.paperTypeId,
              quantity: itemData.quantity,
            }
          });

      ctx.send({
        data: newItem,
        meta: {
          message: 'Item added to cart successfully',
        },
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        ctx.badRequest(error.message);
      } else {
        strapi.log.error('Error in cart.addItem:', error);
        ctx.throw(500, 'Failed to add item to cart');
      }
    }
  },

  /**
   * Remove an item from the cart
   */
  async removeItem(ctx: StrapiContext): Promise<void> {
    try {
      if (!hasUser(ctx)) {
        ctx.unauthorized('You must be logged in to remove items from cart');
        return;
      }

      const userId = ctx.state.user.id;
      const itemId = ctx.params.itemId;

      if (!itemId) {
        throw new ValidationError('Item ID is required');
      }

      // Get user's cart
      const cart = await strapi.service('api::cart.cart').getOrCreateCart(userId);

      // Remove item
      await strapi.service('api::cart.cart').removeItem(cart.id, itemId);

      ctx.send({
        data: null,
        meta: {
          message: 'Item removed from cart successfully',
        },
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        ctx.badRequest(error.message);
      } else {
        strapi.log.error('Error in cart.removeItem:', error);
        ctx.throw(500, 'Failed to remove item from cart');
      }
    }
  },

  /**
   * Update item quantity in the cart
   */
  async updateItemQuantity(ctx: StrapiContext): Promise<void> {
    try {
      if (!hasUser(ctx)) {
        ctx.unauthorized('You must be logged in to update cart items');
        return;
      }

      const userId = ctx.state.user.id;
      const itemId = ctx.params.itemId;
      const { quantity } = ctx.request.body as UpdateQuantityRequest;

      if (!itemId) {
        throw new ValidationError('Item ID is required');
      }

      if (!quantity || quantity <= 0) {
        throw new ValidationError('Valid quantity is required');
      }

      // Get user's cart
      const cart = await strapi.service('api::cart.cart').getOrCreateCart(userId);

      // Update item quantity
      const updatedItem = await strapi.service('api::cart.cart').updateItemQuantity(
        cart.id,
        itemId,
        quantity
      );

      ctx.send({
        data: updatedItem,
        meta: {
          message: 'Item quantity updated successfully',
        },
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        ctx.badRequest(error.message);
      } else {
        strapi.log.error('Error in cart.updateItemQuantity:', error);
        ctx.throw(500, 'Failed to update item quantity');
      }
    }
  },

  /**
   * Clear all items from the cart
   */
  async clear(ctx: StrapiContext): Promise<void> {
    try {
      if (!hasUser(ctx)) {
        ctx.unauthorized('You must be logged in to clear your cart');
        return;
      }

      const userId = ctx.state.user.id;

      // Get user's cart
      const cart = await strapi.service('api::cart.cart').getOrCreateCart(userId);

      // Clear cart
      await strapi.service('api::cart.cart').clearCart(cart.id);

      ctx.send({
        data: null,
        meta: {
          message: 'Cart cleared successfully',
        },
      });
    } catch (error) {
      strapi.log.error('Error in cart.clear:', error);
      ctx.throw(500, 'Failed to clear cart');
    }
  },

  /**
   * Get cart total
   */
  async getTotal(ctx: StrapiContext): Promise<void> {
    try {
      if (!hasUser(ctx)) {
        ctx.unauthorized('You must be logged in to view cart total');
        return;
      }

      const userId = ctx.state.user.id;

      // Get user's cart
      const cart = await strapi.service('api::cart.cart').getOrCreateCart(userId);

      // Calculate total
      const total = await strapi.service('api::cart.cart').calculateTotal(cart.id);

      ctx.send({
        data: {
          total,
          currency: 'EUR',
          formatted: `€${total.toFixed(2)}`,
        },
      });
    } catch (error) {
      strapi.log.error('Error in cart.getTotal:', error);
      ctx.throw(500, 'Failed to calculate cart total');
    }
  },

  /**
   * Checkout - convert cart to order
   */
  async checkout(ctx: StrapiContext): Promise<void> {
    try {
      if (!hasUser(ctx)) {
        ctx.unauthorized('You must be logged in to checkout');
        return;
      }

      const userId = ctx.state.user.id;
      const { paymentIntentId } = ctx.request.body as { paymentIntentId?: string };

      // Get user's cart
      const cart = await strapi.service('api::cart.cart').getOrCreateCart(userId);

      // Perform checkout
      const order = await strapi.service('api::cart.cart').checkout(
        cart.id,
        paymentIntentId
      );

      ctx.send({
        data: order,
        meta: {
          message: 'Checkout successful',
        },
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        ctx.badRequest(error.message);
      } else {
        strapi.log.error('Error in cart.checkout:', error);
        ctx.throw(500, 'Checkout failed');
      }
    }
  },
}));