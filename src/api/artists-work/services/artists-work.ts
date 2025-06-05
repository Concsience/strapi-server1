/**
 * artists-work service - TypeScript implementation
 * Business logic for artwork management and pricing calculations
 * Follows official Strapi TypeScript documentation patterns
 */

import { factories } from '@strapi/strapi';

// Service-specific interfaces
interface ArtworkCreateData {
  artname: string;
  artist?: string | number;
  artimage?: any;
  original_width?: number;
  original_height?: number;
  base_price_per_cm_square?: number;
  max_size?: string;
  popularityscore?: number;
  artThumbnail?: string;
}

interface ArtworkUpdateData extends Partial<ArtworkCreateData> {
  publishedAt?: string | null;
}

interface PricingCalculation {
  basePrice: number;
  finalPrice: number;
  paperTypeMultiplier: number;
  dimensions: {
    width: number;
    height: number;
    area: number;
  };
}

interface ArtworkStats {
  totalArtworks: number;
  publishedArtworks: number;
  averagePrice: number;
  mostPopular: any;
  recentlyAdded: any[];
}

export default factories.createCoreService('api::artists-work.artists-work', ({ strapi }) => ({
  /**
   * Find artworks with business logic filtering
   */
  async findWithBusinessLogic(params: any = {}) {
    try {
      // Add default business rules
      const enhancedParams = {
        ...params,
        filters: {
          ...params.filters,
          // Only show artworks with valid pricing
          base_price_per_cm_square: { $gt: 0 }
        }
      };

      const results = await strapi.entityService.findMany('api::artists-work.artists-work', enhancedParams);
      const resultsList = Array.isArray(results) ? results : [results];

      // Enhance results with calculated fields
      const enhancedArtworks = resultsList.map(artwork => ({
        ...artwork,
        // Calculate estimated price for standard size (30x40cm)
        estimatedPrice: this.calculateEstimatedPrice(artwork, 30, 40),
        // Calculate popularity tier
        popularityTier: this.getPopularityTier(artwork.popularityscore || 0),
        // Check if artwork is available for ordering
        isAvailable: this.checkAvailability(artwork)
      }));

      return enhancedArtworks;

    } catch (error) {
      strapi.log.error('Error in findWithBusinessLogic:', error);
      throw error;
    }
  },

  /**
   * Calculate estimated price for given dimensions
   */
  calculateEstimatedPrice(artwork: any, width: number, height: number): number {
    if (!artwork.base_price_per_cm_square || artwork.base_price_per_cm_square <= 0) {
      return 0;
    }

    const area = width * height;
    const basePrice = area * artwork.base_price_per_cm_square;
    
    return Math.round(basePrice * 100) / 100;
  },

  /**
   * Calculate detailed pricing with paper type
   */
  async calculateDetailedPricing(
    artworkId: string,
    width: number,
    height: number,
    paperTypeId?: string
  ): Promise<PricingCalculation> {
    try {
      // Get artwork
      const artwork = await strapi.entityService.findOne('api::artists-work.artists-work', artworkId);

      if (!artwork) {
        throw new Error('Artwork not found');
      }

      if (!artwork.base_price_per_cm_square || artwork.base_price_per_cm_square <= 0) {
        throw new Error('Artwork has no valid pricing');
      }

      // Calculate base price
      const area = width * height;
      const basePrice = area * artwork.base_price_per_cm_square;

      let paperTypeMultiplier = 1;

      // Get paper type multiplier if specified
      if (paperTypeId) {
        const paperType = await strapi.entityService.findOne('api::paper-type.paper-type', paperTypeId);

        if (paperType && paperType.price_multiplier) {
          paperTypeMultiplier = paperType.price_multiplier;
        }
      }

      const finalPrice = basePrice * paperTypeMultiplier;

      return {
        basePrice: Math.round(basePrice * 100) / 100,
        finalPrice: Math.round(finalPrice * 100) / 100,
        paperTypeMultiplier,
        dimensions: {
          width,
          height,
          area
        }
      };

    } catch (error) {
      strapi.log.error('Error calculating detailed pricing:', error);
      throw error;
    }
  },

  /**
   * Get popularity tier for artwork
   */
  getPopularityTier(score: number): string {
    if (score >= 100) return 'trending';
    if (score >= 50) return 'popular';
    if (score >= 20) return 'emerging';
    if (score >= 5) return 'discovered';
    return 'new';
  },

  /**
   * Check if artwork is available for ordering
   */
  checkAvailability(artwork: any): boolean {
    return !!(
      artwork.publishedAt &&
      artwork.base_price_per_cm_square &&
      artwork.base_price_per_cm_square > 0 &&
      artwork.artname &&
      artwork.artimage
    );
  },

  /**
   * Get artwork statistics for admin dashboard
   */
  async getArtworkStats(): Promise<ArtworkStats> {
    try {
      // Total count
      const totalCount = await strapi.entityService.count('api::artists-work.artists-work');

      // Published count
      const publishedCount = await strapi.entityService.count('api::artists-work.artists-work');

      // Calculate average price
      const artworksWithPricing = await strapi.entityService.findMany('api::artists-work.artists-work', {
        filters: {
          base_price_per_cm_square: { $gt: 0 }
        },
        fields: ['base_price_per_cm_square'],
        limit: 1000
      });

      const pricingList = Array.isArray(artworksWithPricing) ? artworksWithPricing : [artworksWithPricing];
      let averagePrice = 0;
      if (pricingList.length > 0) {
        const totalPrice = pricingList.reduce(
          (sum, artwork) => sum + (artwork.base_price_per_cm_square || 0), 
          0
        );
        averagePrice = totalPrice / pricingList.length;
      }

      // Most popular artwork
      const popularResults = await strapi.entityService.findMany('api::artists-work.artists-work', {
        sort: 'popularityscore:desc',
        populate: ['artist', 'artimage'],
        limit: 1
      });

      // Recently added artworks
      const recentResults = await strapi.entityService.findMany('api::artists-work.artists-work', {
        sort: 'createdAt:desc',
        populate: ['artist'],
        limit: 5
      });

      const popularList = Array.isArray(popularResults) ? popularResults : [popularResults];
      const recentList = Array.isArray(recentResults) ? recentResults : [recentResults];

      return {
        totalArtworks: totalCount,
        publishedArtworks: publishedCount,
        averagePrice: Math.round(averagePrice * 100) / 100,
        mostPopular: popularList[0] || null,
        recentlyAdded: recentList
      };

    } catch (error) {
      strapi.log.error('Error getting artwork stats:', error);
      throw error;
    }
  },

  /**
   * Search artworks with advanced filters
   */
  async searchArtworks(searchTerm: string, options: any = {}) {
    try {
      const {
        minPrice,
        maxPrice,
        artistName,
        minPopularity,
        maxPopularity,
        limit = 25
      } = options;

      const filters: any = {
        $or: [
          { artname: { $containsi: searchTerm } },
          { artist: { name: { $containsi: searchTerm } } }
        ]
      };

      // Add price filters
      if (minPrice || maxPrice) {
        filters.base_price_per_cm_square = {};
        if (minPrice) filters.base_price_per_cm_square.$gte = minPrice;
        if (maxPrice) filters.base_price_per_cm_square.$lte = maxPrice;
      }

      // Add popularity filters
      if (minPopularity || maxPopularity) {
        filters.popularityscore = {};
        if (minPopularity) filters.popularityscore.$gte = minPopularity;
        if (maxPopularity) filters.popularityscore.$lte = maxPopularity;
      }

      // Add artist filter
      if (artistName) {
        filters.artist = { name: { $containsi: artistName } };
      }

      const results = await strapi.entityService.findMany('api::artists-work.artists-work', {
        filters,
        populate: ['artist', 'artimage'],
        sort: 'popularityscore:desc',
        limit: limit
      });

      const searchResults = Array.isArray(results) ? results : [results];
      // Enhance results
      const enhancedResults = searchResults.map(artwork => ({
        ...artwork,
        estimatedPrice: this.calculateEstimatedPrice(artwork, 30, 40),
        popularityTier: this.getPopularityTier(artwork.popularityscore || 0),
        isAvailable: this.checkAvailability(artwork)
      }));

      return enhancedResults;

    } catch (error) {
      strapi.log.error('Error searching artworks:', error);
      throw error;
    }
  },

  /**
   * Update artwork popularity score
   */
  async updatePopularity(artworkId: string, increment: number = 1) {
    try {
      const artwork = await strapi.entityService.findOne('api::artists-work.artists-work', artworkId);

      if (!artwork) {
        throw new Error('Artwork not found');
      }

      const newScore = Math.max(0, (artwork.popularityscore || 0) + increment);

      const updated = await strapi.entityService.update('api::artists-work.artists-work', artworkId, {
        data: {
          popularityscore: newScore
        }
      });

      strapi.log.info(`Updated popularity for artwork ${artworkId}: ${newScore}`);

      return updated;

    } catch (error) {
      strapi.log.error('Error updating artwork popularity:', error);
      throw error;
    }
  },

  /**
   * Validate artwork data before create/update
   */
  validateArtworkData(data: ArtworkCreateData | ArtworkUpdateData): string[] {
    const errors: string[] = [];

    if ('artname' in data && data.artname) {
      if (data.artname.length < 2) {
        errors.push('Artwork name must be at least 2 characters long');
      }
      if (data.artname.length > 200) {
        errors.push('Artwork name must be less than 200 characters');
      }
    }

    if ('base_price_per_cm_square' in data && data.base_price_per_cm_square !== undefined) {
      if (data.base_price_per_cm_square < 0) {
        errors.push('Base price per cm² cannot be negative');
      }
      if (data.base_price_per_cm_square > 1000) {
        errors.push('Base price per cm² seems too high (max 1000€)');
      }
    }

    if ('original_width' in data && data.original_width !== undefined) {
      if (data.original_width <= 0) {
        errors.push('Original width must be positive');
      }
      if (data.original_width > 10000) {
        errors.push('Original width seems too large (max 10000cm)');
      }
    }

    if ('original_height' in data && data.original_height !== undefined) {
      if (data.original_height <= 0) {
        errors.push('Original height must be positive');
      }
      if (data.original_height > 10000) {
        errors.push('Original height seems too large (max 10000cm)');
      }
    }

    if ('popularityscore' in data && data.popularityscore !== undefined) {
      if (data.popularityscore < 0) {
        errors.push('Popularity score cannot be negative');
      }
    }

    return errors;
  }
}));