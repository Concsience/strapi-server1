/**
 * cart-item service - TypeScript implementation
 * Business logic for cart item management and calculations
 * Follows official Strapi TypeScript documentation patterns
 */

const { factories  } = require('@strapi/strapi');

// Service-specific interfaces


module.exports = factories.createCoreService('api::cart-item.cart-item', ({ strapi }) => ({
  /**
   * Calculate item pricing with detailed breakdown
   */
  async calculateItemPricing(
    artworkId,
    width,
    height,
    paperTypeId,
    quantity = 1
  ) {
    try {
      // Get artwork details
      const artwork = await strapi.documents('api::artists-work.artists-work').findOne({
        documentId: artworkId
      });

      if (!artwork) {
        throw new Error('Artwork not found');
      }

      // Get paper type details
      let paperType = null;
      if (paperTypeId) {
        paperType = await strapi.documents('api::paper-type.paper-type').findOne({
          documentId: paperTypeId
        });
      }

      const basePrice = artwork.base_price_per_cm_square || 0;
      const dimensions = width * height;
      const paperMultiplier = paperType ? (paperType.price_multiplier || 1) : 1;
      const itemPrice = basePrice * dimensions * paperMultiplier;
      const totalPrice = itemPrice * quantity;

      return {
        basePrice,
        dimensions,
        paperMultiplier,
        quantity,
        itemPrice: Math.round(itemPrice * 100) / 100,
        totalPrice: Math.round(totalPrice * 100) / 100,
        breakdown: {
          basePricePerCm2: basePrice,
          area: dimensions,
          paperTypeBonus: paperMultiplier - 1,
          finalUnitPrice: Math.round(itemPrice * 100) / 100
        }
      };

    } catch (error) {
      strapi.log.error('Error calculating item pricing:', error);
      throw error;
    }
  },

  /**
   * Get cart items by cart ID with enhanced data
   */
  async getCartItems(cartId, options = {}) {
    try {
      const { includeStats = false } = options;

      const cartItems = await strapi.documents('api::cart-item.cart-item').findMany({
        filters: {
          cart: { documentId: cartId },
          publishedAt: { $notNull: true }
        },
        populate: {
          art: {
            populate: ['artist', 'artimage']
          },
          paper_type: true,
          book: {
            populate: ['authorbook']
          }
        },
        sort: 'createdAt:desc'
      });

      // Enhance items with calculated data
      const enhancedItems = cartItems.results.map(item => ({
        ...item,
        dimensions: `${item.width || 0}x${item.height || 0}cm`,
        area: (item.width || 0) * (item.height || 0),
        unitPrice: item.price || 0,
        savings: this.calculateSavings(item),
        isCustomSize: this.isCustomSize(item.width || 0, item.height || 0)
      }));

      const result = {
        items: enhancedItems,
        summary: {
          totalItems: enhancedItems.length,
          totalQuantity: enhancedItems.reduce((sum, item) => sum + (item.qty || 0), 0),
          totalValue: enhancedItems.reduce((sum, item) => sum + (item.total_price || 0), 0),
          averageItemValue: enhancedItems.length > 0 
            ? enhancedItems.reduce((sum, item) => sum + (item.total_price || 0), 0) / enhancedItems.length 
            : 0
        }
      };

      if (includeStats) {
        result.stats = await this.getCartItemStats();
      }

      return result;

    } catch (error) {
      strapi.log.error('Error getting cart items:', error);
      throw error;
    }
  },

  /**
   * Calculate potential savings for bulk orders
   */
  calculateSavings(cartItem) {
    const quantity = cartItem.qty || 1;
    const unitPrice = cartItem.price || 0;

    // Apply bulk discount for quantities > 3
    if (quantity >= 5) {
      return unitPrice * quantity * 0.1; // 10% bulk discount
    } else if (quantity >= 3) {
      return unitPrice * quantity * 0.05; // 5% bulk discount
    }

    return 0;
  },

  /**
   * Check if dimensions are custom (non-standard)
   */
  isCustomSize(width, height) {
    const standardSizes = [
      [20, 30], [30, 40], [40, 50], [50, 70], [60, 80], [70, 100]
    ];

    return !standardSizes.some(([w, h]) => 
      (width === w && height === h) || (width === h && height === w)
    );
  },

  /**
   * Get comprehensive cart item statistics
   */
  async getCartItemStats() {
    try {
      const cartItems = await strapi.documents('api::cart-item.cart-item').findMany({
        filters: {
          publishedAt: { $notNull: true }
        },
        populate: {
          art: {
            populate: ['artist']
          },
          paper_type: true
        },
        pagination: { pageSize: 1000 }
      });

      const totalItems = cartItems.results.length;
      let totalValue = 0;
      const artworkCounts = {};
      const paperTypeCounts = {};
      const sizeDistribution = {};
      const quantityDistribution = {};
      const priceRanges = {
        under50: 0,
        range50to100: 0,
        range100to200: 0,
        over200: 0
      };

      // Analyze cart items
      cartItems.results.forEach(item => {
        totalValue += item.total_price || 0;

        // Artwork popularity
        if (item.art) {
          const artKey = item.art.documentId || item.art.id;
          artworkCounts[artKey] = (artworkCounts[artKey] || 0) + 1;
        }

        // Paper type popularity
        if (item.paper_type) {
          const paperKey = item.paper_type.name || 'Unknown';
          paperTypeCounts[paperKey] = (paperTypeCounts[paperKey] || 0) + 1;
        }

        // Size distribution
        const sizeKey = `${item.width || 0}x${item.height || 0}`;
        sizeDistribution[sizeKey] = (sizeDistribution[sizeKey] || 0) + 1;

        // Quantity distribution
        const qtyKey = `qty_${item.qty || 1}`;
        quantityDistribution[qtyKey] = (quantityDistribution[qtyKey] || 0) + 1;

        // Price ranges
        const itemPrice = item.total_price || 0;
        if (itemPrice < 50) {
          priceRanges.under50++;
        } else if (itemPrice < 100) {
          priceRanges.range50to100++;
        } else if (itemPrice < 200) {
          priceRanges.range100to200++;
        } else {
          priceRanges.over200++;
        }
      });

      const averageItemValue = totalItems > 0 ? totalValue / totalItems : 0;

      // Find most popular artwork
      let mostPopularArt = null;
      let maxArtCount = 0;
      for (const [artworkId, count] of Object.entries(artworkCounts)) {
        if (count > maxArtCount) {
          maxArtCount = count;
          const artwork = await strapi.documents('api::artists-work.artists-work').findOne({
            documentId: artworkId,
            populate: ['artist', 'artimage']
          });
          if (artwork) {
            mostPopularArt = {
              ...artwork,
              cartItemCount: count
            };
          }
        }
      }

      // Find most popular paper type
      let mostPopularPaperType = null;
      let maxPaperCount = 0;
      for (const [paperName, count] of Object.entries(paperTypeCounts)) {
        if (count > maxPaperCount) {
          maxPaperCount = count;
          mostPopularPaperType = {
            name: paperName,
            count: count
          };
        }
      }

      return {
        totalItems,
        totalValue: Math.round(totalValue * 100) / 100,
        averageItemValue: Math.round(averageItemValue * 100) / 100,
        mostPopularArt,
        mostPopularPaperType,
        sizeDistribution,
        quantityDistribution,
        priceRanges
      };

    } catch (error) {
      strapi.log.error('Error getting cart item stats:', error);
      throw error;
    }
  },

  /**
   * Validate cart item data before creation/update
   */
  async validateCartItemData(data) {
    const errors = [];

    // Validate required fields
    if (!data.art) {
      errors.push('Artwork is required');
    }

    if (!data.width || data.width <= 0) {
      errors.push('Valid width is required');
    }

    if (!data.height || data.height <= 0) {
      errors.push('Valid height is required');
    }

    if (!data.qty || data.qty <= 0) {
      errors.push('Valid quantity is required');
    }

    // Validate dimensions are reasonable
    if (data.width && data.height) {
      const area = data.width * data.height;
      if (area > 10000) { // 100cm x 100cm max
        errors.push('Artwork dimensions too large (max 100x100cm)');
      }
      if (area < 100) { // 10cm x 10cm min
        errors.push('Artwork dimensions too small (min 10x10cm)');
      }
    }

    // Validate quantity is reasonable
    if (data.qty && data.qty > 50) {
      errors.push('Maximum quantity is 50 items');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Duplicate cart item detection
   */
  async findDuplicateCartItem(cartId, artworkId, width, height, paperTypeId) {
    try {
      const filters = {
        cart: { documentId: cartId },
        art: { documentId: artworkId },
        width: width,
        height: height,
        publishedAt: { $notNull: true }
      };

      if (paperTypeId) {
        filters.paper_type = { documentId: paperTypeId };
      }

      const duplicates = await strapi.documents('api::cart-item.cart-item').findMany({
        filters,
        populate: ['art', 'paper_type']
      });

      return duplicates.results.length > 0 ? duplicates.results[0] : null;

    } catch (error) {
      strapi.log.error('Error finding duplicate cart item:', error);
      return null;
    }
  }
}));