/**
 * paper-type controller - TypeScript implementation
 * Paper type and material options management for e-commerce
 * Follows official Strapi TypeScript documentation patterns
 */

import { factories } from '@strapi/strapi';
import { StrapiContext, ApiResponse, ApiError } from '../../../types';

// Paper type interface based on schema
interface PaperType {
  id: number;
  paper_names?: string;
  paper_price_per_cm_square?: number;
  cart_items?: any[];
  ordered_items?: any[];
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PaperTypeSearchFilters {
  paper_names?: {
    $containsi?: string;
  };
  paper_price_per_cm_square?: {
    $gte?: number;
    $lte?: number;
  };
  publishedAt?: {
    $notNull?: boolean;
  };
  $or?: Array<{
    paper_names?: { $containsi?: string };
  }>;
}

interface PriceCalculation {
  basePaperCost: number;
  totalCost: number;
  paperType: {
    id: number;
    name: string;
    pricePerCmSquare: number;
  };
  dimensions: {
    width: number;
    height: number;
    area: number;
  };
}

interface PaperTypeStats {
  totalPaperTypes: number;
  publishedPaperTypes: number;
  averagePrice: number;
  mostPopular: any;
  priceRange: {
    min: number;
    max: number;
  };
}

export default factories.createCoreController('api::paper-type.paper-type', ({ strapi }) => ({
  /**
   * Find paper types with enhanced filtering
   * GET /api/paper-types
   */
  async find(ctx: StrapiContext): Promise<void> {
    try {
      const {
        page = 1,
        pageSize = 25,
        sort = 'paper_names:asc',
        populate = '',
        filters = {},
        search = '',
        minPrice,
        maxPrice,
        available = 'true'
      } = ctx.query;

      // Build filters based on query parameters
      const queryFilters: PaperTypeSearchFilters = {
        ...filters
      };

      // Only show published paper types by default
      if (available === 'true') {
        queryFilters.publishedAt = { $notNull: true };
      }

      // Add search functionality
      if (search) {
        queryFilters.$or = [
          { paper_names: { $containsi: search } }
        ];
      }

      // Add price range filtering
      if (minPrice || maxPrice) {
        queryFilters.paper_price_per_cm_square = {};
        if (minPrice) queryFilters.paper_price_per_cm_square.$gte = parseFloat(minPrice as string);
        if (maxPrice) queryFilters.paper_price_per_cm_square.$lte = parseFloat(maxPrice as string);
      }

      const params = {
        filters: queryFilters,
        sort: sort as string,
        populate: populate as string,
        pagination: {
          page: parseInt(page as string, 10),
          pageSize: Math.min(parseInt(pageSize as string, 10), 100)
        }
      };

      // Use Document Service as recommended by Strapi docs
      const { results, pagination } = await strapi.documents('api::paper-type.paper-type').findMany(params);

      // Enhance results with calculated fields
      const enhancedPaperTypes = await Promise.all(
        results.map(async (paperType) => {
          const usageCount = await this.getPaperTypeUsageCount(paperType.documentId);
          
          return {
            ...paperType,
            usageCount,
            isPopular: usageCount >= 10,
            priceCategory: this.getPriceCategory(paperType.paper_price_per_cm_square || 0),
            isAvailable: !!paperType.publishedAt
          };
        })
      );

      strapi.log.info(`Found ${results.length} paper types with filters: ${JSON.stringify(queryFilters)}`);

      return ctx.send({
        data: enhancedPaperTypes,
        meta: {
          pagination
        }
      });

    } catch (error: unknown) {
      strapi.log.error('Error finding paper types:', error);
      
      return ctx.internalServerError('Failed to fetch paper types', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Find one paper type with usage statistics
   * GET /api/paper-types/:documentId
   */
  async findOne(ctx: StrapiContext): Promise<void> {
    try {
      const { documentId } = ctx.params;
      
      if (!documentId) {
        return ctx.badRequest('Document ID is required');
      }

      const paperType = await strapi.documents('api::paper-type.paper-type').findOne({
        documentId,
        populate: {
          cart_items: {
            populate: ['art', 'cart'],
            sort: 'createdAt:desc',
            pagination: { limit: 10 }
          },
          ordered_items: {
            populate: ['art', 'order'],
            sort: 'createdAt:desc',
            pagination: { limit: 10 }
          }
        }
      });

      if (!paperType) {
        return ctx.notFound('Paper type not found');
      }

      // Calculate usage statistics
      const usageStats = await this.calculateUsageStats(paperType);

      // Enhance paper type data
      const enhancedPaperType = {
        ...paperType,
        ...usageStats,
        priceCategory: this.getPriceCategory(paperType.paper_price_per_cm_square || 0),
        isAvailable: !!paperType.publishedAt
      };

      strapi.log.info(`Retrieved paper type ${documentId}: ${paperType.paper_names}`);

      return ctx.send({
        data: enhancedPaperType
      });

    } catch (error: unknown) {
      strapi.log.error('Error finding paper type:', error);
      
      return ctx.internalServerError('Failed to fetch paper type', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Calculate cost for paper type with given dimensions
   * POST /api/paper-types/:documentId/calculate-cost
   */
  async calculateCost(ctx: StrapiContext): Promise<void> {
    try {
      const { documentId } = ctx.params;
      const { width, height } = ctx.request.body;

      if (!documentId || !width || !height) {
        return ctx.badRequest('Document ID, width, and height are required');
      }

      // Get paper type details
      const paperType = await strapi.documents('api::paper-type.paper-type').findOne({
        documentId
      });

      if (!paperType) {
        return ctx.notFound('Paper type not found');
      }

      if (!paperType.paper_price_per_cm_square || paperType.paper_price_per_cm_square <= 0) {
        return ctx.badRequest('Paper type has no valid pricing');
      }

      // Calculate cost
      const area = parseFloat(width) * parseFloat(height);
      const basePaperCost = area * paperType.paper_price_per_cm_square;

      const calculation: PriceCalculation = {
        basePaperCost: Math.round(basePaperCost * 100) / 100,
        totalCost: Math.round(basePaperCost * 100) / 100,
        paperType: {
          id: paperType.id,
          name: paperType.paper_names || 'Unknown',
          pricePerCmSquare: paperType.paper_price_per_cm_square
        },
        dimensions: {
          width: parseFloat(width),
          height: parseFloat(height),
          area
        }
      };

      strapi.log.info(`Calculated cost for paper type ${documentId}: €${calculation.totalCost}`);

      return ctx.send({
        data: calculation
      });

    } catch (error: unknown) {
      strapi.log.error('Error calculating paper type cost:', error);
      
      return ctx.internalServerError('Failed to calculate cost', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get popular paper types based on usage
   * GET /api/paper-types/popular
   */
  async popular(ctx: StrapiContext): Promise<void> {
    try {
      const { limit = 10 } = ctx.query;

      const popularPaperTypes = await strapi.service('api::paper-type.paper-type').getPopularPaperTypes(
        Math.min(parseInt(limit as string, 10), 50)
      );

      strapi.log.info(`Retrieved ${popularPaperTypes.results.length} popular paper types`);

      return ctx.send({
        data: popularPaperTypes.results,
        meta: {
          pagination: popularPaperTypes.pagination
        }
      });

    } catch (error: unknown) {
      strapi.log.error('Error fetching popular paper types:', error);
      
      return ctx.internalServerError('Failed to fetch popular paper types', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get paper type statistics for admin dashboard
   * GET /api/paper-types/stats
   */
  async stats(ctx: StrapiContext): Promise<void> {
    try {
      const stats = await strapi.service('api::paper-type.paper-type').getPaperTypeStats();

      strapi.log.info('Retrieved paper type statistics');

      return ctx.send({
        data: stats
      });

    } catch (error: unknown) {
      strapi.log.error('Error getting paper type stats:', error);
      
      return ctx.internalServerError('Failed to get paper type statistics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Helper method to get paper type usage count
   */
  async getPaperTypeUsageCount(paperTypeId: string): Promise<number> {
    try {
      const [cartItemCount, orderItemCount] = await Promise.all([
        strapi.documents('api::cart-item.cart-item').count({
          filters: { paper_type: { documentId: paperTypeId } }
        }),
        strapi.documents('api::ordered-item.ordered-item').count({
          filters: { paper_type: { documentId: paperTypeId } }
        })
      ]);

      return cartItemCount + orderItemCount;

    } catch (error) {
      strapi.log.error('Error getting paper type usage count:', error);
      return 0;
    }
  },

  /**
   * Helper method to calculate usage statistics
   */
  async calculateUsageStats(paperType: any) {
    try {
      const cartItemCount = paperType.cart_items?.length || 0;
      const orderItemCount = paperType.ordered_items?.length || 0;
      const totalUsage = cartItemCount + orderItemCount;

      // Calculate revenue if we have ordered items
      let totalRevenue = 0;
      if (paperType.ordered_items && paperType.ordered_items.length > 0) {
        for (const item of paperType.ordered_items) {
          if (item.total_price) {
            totalRevenue += parseFloat(item.total_price);
          }
        }
      }

      return {
        usageStats: {
          cartUsage: cartItemCount,
          orderUsage: orderItemCount,
          totalUsage,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          isPopular: totalUsage >= 10
        }
      };

    } catch (error) {
      strapi.log.error('Error calculating usage stats:', error);
      return {
        usageStats: {
          cartUsage: 0,
          orderUsage: 0,
          totalUsage: 0,
          totalRevenue: 0,
          isPopular: false
        }
      };
    }
  },

  /**
   * Helper method to categorize price
   */
  getPriceCategory(price: number): string {
    if (price <= 0) return 'invalid';
    if (price < 0.10) return 'economy';
    if (price < 0.25) return 'standard';
    if (price < 0.50) return 'premium';
    if (price < 1.00) return 'luxury';
    return 'ultra-premium';
  }
}));