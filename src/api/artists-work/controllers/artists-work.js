/**
 * artists-work controller - TypeScript implementation
 * Core e-commerce API for artwork catalog management
 * Follows official Strapi TypeScript documentation patterns
 */

const { factories  } = require('@strapi/strapi');


// Core artwork interface based on schema


module.exports = factories.createCoreController('api::artists-work.artists-work', ({ strapi }) => ({
  /**
   * Find artworks with enhanced filtering and population
   * GET /api/artists-works
   */
  async find(ctx) {
    try {
      const {
        page = 1,
        pageSize = 25,
        sort = 'createdAt:desc',
        populate = '*',
        filters = {},
        search = '',
        minPrice,
        maxPrice,
        minPopularity,
        maxPopularity
      } = ctx.query;

      // Build filters based on query parameters
      const queryFilters = {
        ...filters,
        publishedAt: { $notNull: true }
      };

      // Add search functionality
      if (search) {
        queryFilters.$or = [
          { artname: { $containsi: search } },
          { artist: { name: { $containsi: search } } }
        ];
      }

      // Add price range filtering
      if (minPrice || maxPrice) {
        queryFilters.base_price_per_cm_square = {};
        if (minPrice) queryFilters.base_price_per_cm_square.$gte = parseFloat(minPrice);
        if (maxPrice) queryFilters.base_price_per_cm_square.$lte = parseFloat(maxPrice);
      }

      // Add popularity filtering
      if (minPopularity || maxPopularity) {
        queryFilters.popularityscore = {};
        if (minPopularity) queryFilters.popularityscore.$gte = parseInt(minPopularity, 10);
        if (maxPopularity) queryFilters.popularityscore.$lte = parseInt(maxPopularity, 10);
      }

      const params = {
        filters: queryFilters,
        sort: sort,
        populate: populate,
        pagination: {
          page: parseInt(page, 10),
          pageSize: Math.min(parseInt(pageSize, 10), 100) // Max 100 items per page
        }
      };

      // Use Document Service as recommended by Strapi docs
      const { results, pagination } = await strapi.documents('api::artists-work.artists-work').findMany(params);

      strapi.log.info(`Found ${results.length} artworks with filters: ${JSON.stringify(queryFilters)}`);

      return ctx.send({
        data: results,
        meta: {
          pagination
        }
      });

    } catch (error) {
      strapi.log.error('Error finding artworks:', error);
      
      return ctx.internalServerError('Failed to fetch artworks', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Find one artwork with complete information
   * GET /api/artists-works/:documentId
   */
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params;
      
      if (!documentId) {
        return ctx.badRequest('Document ID is required');
      }

      const artwork = await strapi.documents('api::artists-work.artists-work').findOne({
        documentId,
        populate: {
          artist: true,
          artimage: true,
          productsheet: {
            populate: '*'
          },
          cart_items: {
            populate: ['paper_type']
          },
          ordered_items: {
            populate: ['paper_type', 'order']
          },
          wishlists: {
            populate: ['user']
          }
        }
      });

      if (!artwork) {
        return ctx.notFound('Artwork not found');
      }

      strapi.log.info(`Retrieved artwork ${documentId}: ${artwork.artname}`);

      return ctx.send({
        data: artwork
      });

    } catch (error) {
      strapi.log.error('Error finding artwork:', error);
      
      return ctx.internalServerError('Failed to fetch artwork', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get popular artworks for homepage/recommendations
   * GET /api/artists-works/popular
   */
  async popular(ctx) {
    try {
      const { limit = 10 } = ctx.query;

      const popularArtworks = await strapi.documents('api::artists-work.artists-work').findMany({
        filters: {
          publishedAt: { $notNull: true },
          popularityscore: { $gte: 1 }
        },
        sort: 'popularityscore:desc',
        populate: ['artist', 'artimage'],
        pagination: {
          page: 1,
          pageSize: Math.min(parseInt(limit, 10), 50)
        }
      });

      strapi.log.info(`Retrieved ${popularArtworks.results.length} popular artworks`);

      return ctx.send({
        data: popularArtworks.results,
        meta: {
          pagination: popularArtworks.pagination
        }
      });

    } catch (error) {
      strapi.log.error('Error fetching popular artworks:', error);
      
      return ctx.internalServerError('Failed to fetch popular artworks', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Calculate price for artwork with given dimensions
   * POST /api/artists-works/:documentId/calculate-price
   */
  async calculatePrice(ctx) {
    try {
      const { documentId } = ctx.params;
      const { width, height, paper_type_id } = ctx.request.body;

      if (!documentId || !width || !height) {
        return ctx.badRequest('Document ID, width, and height are required');
      }

      // Get artwork details
      const artwork = await strapi.documents('api::artists-work.artists-work').findOne({
        documentId,
        populate: ['artist']
      });

      if (!artwork) {
        return ctx.notFound('Artwork not found');
      }

      // Calculate base price
      const area = parseFloat(width) * parseFloat(height);
      const basePrice = area * (artwork.base_price_per_cm_square || 0);

      let finalPrice = basePrice;
      let paperTypeMultiplier = 1;

      // Apply paper type multiplier if specified
      if (paper_type_id) {
        const paperType = await strapi.documents('api::paper-type.paper-type').findOne({
          documentId: paper_type_id
        });

        if (paperType) {
          paperTypeMultiplier = paperType.price_multiplier || 1;
          finalPrice = basePrice * paperTypeMultiplier;
        }
      }

      const pricing = {
        basePrice: Math.round(basePrice * 100) / 100,
        paperTypeMultiplier,
        finalPrice: Math.round(finalPrice * 100) / 100,
        dimensions: {
          width: parseFloat(width),
          height: parseFloat(height),
          area
        },
        artwork: {
          id: artwork.id,
          artname: artwork.artname,
          base_price_per_cm_square: artwork.base_price_per_cm_square
        }
      };

      strapi.log.info(`Calculated price for artwork ${documentId}: €${finalPrice}`);

      return ctx.send({
        data: pricing
      });

    } catch (error) {
      strapi.log.error('Error calculating artwork price:', error);
      
      return ctx.internalServerError('Failed to calculate price', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}));