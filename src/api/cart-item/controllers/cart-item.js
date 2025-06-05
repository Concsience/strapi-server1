/**
 * cart-item controller - TypeScript implementation
 * Manages individual items in shopping carts with pricing calculations
 * Follows official Strapi TypeScript documentation patterns
 */
const { factories } = require('@strapi/strapi');
module.exports = factories.createCoreController('api::cart-item.cart-item', ({ strapi }) => ({
    /**
     * Create cart item with automatic pricing calculation
     * POST /api/cart-items
     */
    async create(ctx) {
        try {
            if (!ctx.state.user) {
                return ctx.unauthorized('Authentication required to add items to cart');
            }
            const data = ctx.request.body.data;
            if (!data.art || !data.width || !data.height || !data.qty) {
                return ctx.badRequest('Art, dimensions (width/height), and quantity are required');
            }
            // Validate artwork exists
            const artwork = await strapi.documents('api::artists-work.artists-work').findOne({
                documentId: data.art,
                populate: ['artist']
            });
            if (!artwork) {
                return ctx.notFound('Artwork not found');
            }
            // Get paper type for pricing calculation
            let paperType = null;
            if (data.paper_type) {
                paperType = await strapi.documents('api::paper-type.paper-type').findOne({
                    documentId: data.paper_type
                });
            }
            // Calculate pricing
            const basePrice = artwork.base_price_per_cm_square || 0;
            const dimensions = data.width * data.height;
            const paperMultiplier = paperType ? (paperType.price_multiplier || 1) : 1;
            const itemPrice = basePrice * dimensions * paperMultiplier;
            const totalPrice = itemPrice * data.qty;
            // Create cart item with calculated prices
            const cartItemData = {
                ...data,
                artistname: data.artistname || artwork.artist?.name || 'Unknown Artist',
                arttitle: data.arttitle || artwork.artname || 'Untitled',
                price: Math.round(itemPrice * 100) / 100,
                total_price: Math.round(totalPrice * 100) / 100
            };
            const cartItem = await strapi.documents('api::cart-item.cart-item').create({
                data: cartItemData,
                populate: {
                    art: {
                        populate: ['artist', 'artimage']
                    },
                    paper_type: true,
                    cart: true,
                    book: true
                }
            });
            // Update cart total if cart exists
            if (data.cart) {
                await this.updateCartTotal(data.cart);
            }
            strapi.log.info(`Created cart item for user ${ctx.state.user?.id}: ${cartItem.arttitle} (${data.width}x${data.height}cm)`);
            return ctx.send({
                data: {
                    ...cartItem,
                    calculatedPrice: itemPrice,
                    dimensions: `${data.width}x${data.height}cm`,
                    area: dimensions
                }
            });
        }
        catch (error) {
            strapi.log.error('Error creating cart item:', error);
            return ctx.internalServerError('Failed to create cart item', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    },
    /**
     * Update cart item with recalculated pricing
     * PUT /api/cart-items/:id
     */
    async update(ctx) {
        try {
            const { id } = ctx.params;
            const data = ctx.request.body.data;
            // Get existing cart item
            const existingItem = await strapi.documents('api::cart-item.cart-item').findOne({
                documentId: id,
                populate: ['art', 'paper_type', 'cart']
            });
            if (!existingItem) {
                return ctx.notFound('Cart item not found');
            }
            // Recalculate pricing if dimensions, quantity, or paper type changed
            let updatedData = { ...data };
            if (data.width || data.height || data.qty || data.paper_type) {
                const width = data.width || existingItem.width;
                const height = data.height || existingItem.height;
                const qty = data.qty || existingItem.qty;
                const artwork = existingItem.art;
                let paperType = existingItem.paper_type;
                if (data.paper_type) {
                    paperType = await strapi.documents('api::paper-type.paper-type').findOne({
                        documentId: data.paper_type
                    });
                }
                const basePrice = artwork?.base_price_per_cm_square || 0;
                const dimensions = width * height;
                const paperMultiplier = paperType ? (paperType.price_multiplier || 1) : 1;
                const itemPrice = basePrice * dimensions * paperMultiplier;
                const totalPrice = itemPrice * qty;
                updatedData = {
                    ...updatedData,
                    price: Math.round(itemPrice * 100) / 100,
                    total_price: Math.round(totalPrice * 100) / 100
                };
            }
            const updatedItem = await strapi.documents('api::cart-item.cart-item').update({
                documentId: id,
                data: updatedData,
                populate: {
                    art: {
                        populate: ['artist', 'artimage']
                    },
                    paper_type: true,
                    cart: true,
                    book: true
                }
            });
            // Update cart total
            if (existingItem.cart) {
                await this.updateCartTotal(existingItem.cart.documentId);
            }
            strapi.log.info(`Updated cart item ${id}`);
            return ctx.send({
                data: updatedItem
            });
        }
        catch (error) {
            strapi.log.error('Error updating cart item:', error);
            return ctx.internalServerError('Failed to update cart item', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    },
    /**
     * Delete cart item and update cart total
     * DELETE /api/cart-items/:id
     */
    async delete(ctx) {
        try {
            const { id } = ctx.params;
            // Get cart info before deletion
            const cartItem = await strapi.documents('api::cart-item.cart-item').findOne({
                documentId: id,
                populate: ['cart']
            });
            if (!cartItem) {
                return ctx.notFound('Cart item not found');
            }
            await strapi.documents('api::cart-item.cart-item').delete({
                documentId: id
            });
            // Update cart total
            if (cartItem.cart) {
                await this.updateCartTotal(cartItem.cart.documentId);
            }
            strapi.log.info(`Deleted cart item ${id}`);
            return ctx.send({
                data: {
                    message: 'Cart item deleted successfully'
                }
            });
        }
        catch (error) {
            strapi.log.error('Error deleting cart item:', error);
            return ctx.internalServerError('Failed to delete cart item', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    },
    /**
     * Get cart items statistics for admin dashboard
     * GET /api/cart-items/stats
     */
    async stats(ctx) {
        try {
            const stats = await strapi.service('api::cart-item.cart-item').getCartItemStats();
            return ctx.send({
                data: stats
            });
        }
        catch (error) {
            strapi.log.error('Error getting cart item stats:', error);
            return ctx.internalServerError('Failed to get cart item statistics', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    },
    /**
     * Calculate pricing for cart item without creating it
     * POST /api/cart-items/calculate-pricing
     */
    async calculatePricing(ctx) {
        try {
            const { artworkId, width, height, paperTypeId, quantity = 1 } = ctx.request.body;
            if (!artworkId || !width || !height) {
                return ctx.badRequest('Artwork ID, width, and height are required');
            }
            const pricing = await strapi.service('api::cart-item.cart-item').calculateItemPricing(artworkId, width, height, paperTypeId, quantity);
            return ctx.send({
                data: pricing
            });
        }
        catch (error) {
            strapi.log.error('Error calculating pricing:', error);
            return ctx.internalServerError('Failed to calculate pricing', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    },
    /**
     * Get cart items by cart ID
     * GET /api/cart-items/by-cart/:cartId
     */
    async getByCart(ctx) {
        try {
            const { cartId } = ctx.params;
            const { includeStats = false } = ctx.query;
            if (!cartId) {
                return ctx.badRequest('Cart ID is required');
            }
            const result = await strapi.service('api::cart-item.cart-item').getCartItems(cartId, { includeStats: includeStats === 'true' });
            return ctx.send({
                data: result
            });
        }
        catch (error) {
            strapi.log.error('Error getting cart items:', error);
            return ctx.internalServerError('Failed to get cart items', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    },
    /**
     * Helper method to update cart total price
     */
    async updateCartTotal(cartId) {
        try {
            const cartItems = await strapi.documents('api::cart-item.cart-item').findMany({
                filters: {
                    cart: { documentId: cartId }
                }
            });
            const totalPrice = cartItems.results.reduce((sum, item) => {
                return sum + (item.total_price || 0);
            }, 0);
            await strapi.documents('api::cart.cart').update({
                documentId: cartId,
                data: {
                    total_price: Math.round(totalPrice * 100) / 100
                }
            });
            strapi.log.debug(`Updated cart ${cartId} total: €${totalPrice}`);
        }
        catch (error) {
            strapi.log.error('Error updating cart total:', error);
            // Don't throw error as this is not critical
        }
    }
}));
