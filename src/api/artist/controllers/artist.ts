/**
 * artist controller - TypeScript implementation
 * Artist profile management for e-commerce platform
 * Follows official Strapi TypeScript documentation patterns
 */

import { factories } from '@strapi/strapi';
import { StrapiContext, ApiResponse, ApiError } from '../../../types';

// Artist interface based on schema
interface Artist {
  id: number;
  name?: string;
  image?: any;
  description?: string;
  DOB?: string; // Date of Birth
  DOD?: string; // Date of Death
  backgroundImage?: any;
  art?: any[]; // Related artworks
  timeline_1s?: any[];
  activitiestimelines?: any[];
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ArtistSearchFilters {
  name?: {
    $containsi?: string;
  };
  DOB?: {
    $gte?: string;
    $lte?: string;
  };
  DOD?: {
    $null?: boolean;
    $notNull?: boolean;
  };
  publishedAt?: {
    $notNull?: boolean;
  };
  $or?: Array<{
    name?: { $containsi?: string };
    description?: { $containsi?: string };
  }>;
}

interface ArtistStats {
  totalArtists: number;
  publishedArtists: number;
  livingArtists: number;
  artistsWithArtworks: number;
  featuredArtists: any[];
}

export default factories.createCoreController('api::artist.artist', ({ strapi }) => ({
  /**
   * Find artists with enhanced filtering and population
   * GET /api/artists
   */
  async find(ctx: StrapiContext): Promise<ApiResponse<Artist[]> | ApiError> {
    try {
      const {
        page = 1,
        pageSize = 25,
        sort = 'name:asc',
        populate = 'image,backgroundImage',
        filters = {},
        search = '',
        living = '',
        featured = ''
      } = ctx.query;

      // Build filters based on query parameters
      const queryFilters: ArtistSearchFilters = {
        ...filters,
        publishedAt: { $notNull: true }
      };

      // Add search functionality
      if (search) {
        queryFilters.$or = [
          { name: { $containsi: search } },
          { description: { $containsi: search } }
        ];
      }

      // Filter living artists (no death date)
      if (living === 'true') {
        queryFilters.DOD = { $null: true };
      } else if (living === 'false') {
        queryFilters.DOD = { $notNull: true };
      }

      // Enhanced population for featured artists
      let populateOption: any = populate as string;
      if (featured === 'true') {
        populateOption = {
          image: true,
          backgroundImage: true,
          art: {
            populate: ['artimage'],
            sort: 'popularityscore:desc',
            pagination: { limit: 5 }
          }
        };
      }

      const params = {
        filters: queryFilters,
        sort: sort as string,
        populate: populateOption,
        pagination: {
          page: parseInt(page as string, 10),
          pageSize: Math.min(parseInt(pageSize as string, 10), 100)
        }
      };

      // Use Document Service as recommended by Strapi docs
      const { results, pagination } = await strapi.documents('api::artist.artist').findMany(params);

      // Enhance results with calculated fields
      const enhancedArtists = results.map(artist => ({
        ...artist,
        isLiving: !artist.DOD,
        artworkCount: artist.art?.length || 0,
        hasArtworks: !!(artist.art && artist.art.length > 0)
      }));

      strapi.log.info(`Found ${results.length} artists with filters: ${JSON.stringify(queryFilters)}`);

      return ctx.send({
        data: enhancedArtists,
        meta: {
          pagination
        }
      });

    } catch (error: unknown) {
      strapi.log.error('Error finding artists:', error);
      
      return ctx.internalServerError('Failed to fetch artists', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Find one artist with complete information including artworks
   * GET /api/artists/:documentId
   */
  async findOne(ctx: StrapiContext): Promise<ApiResponse<Artist> | ApiError> {
    try {
      const { documentId } = ctx.params;
      
      if (!documentId) {
        return ctx.badRequest('Document ID is required');
      }

      const artist = await strapi.documents('api::artist.artist').findOne({
        documentId,
        populate: {
          image: true,
          backgroundImage: true,
          art: {
            populate: ['artimage', 'productsheet'],
            sort: 'popularityscore:desc'
          },
          timeline_1s: {
            populate: ['image']
          },
          activitiestimelines: {
            populate: ['image']
          }
        }
      });

      if (!artist) {
        return ctx.notFound('Artist not found');
      }

      // Enhance artist data with calculated fields
      const enhancedArtist = {
        ...artist,
        isLiving: !artist.DOD,
        artworkCount: artist.art?.length || 0,
        popularArtworks: artist.art?.filter((artwork: any) => (artwork.popularityscore || 0) >= 20).length || 0,
        averagePopularity: artist.art?.length > 0 
          ? artist.art.reduce((sum: number, artwork: any) => sum + (artwork.popularityscore || 0), 0) / artist.art.length
          : 0,
        biography: this.generateBiography(artist)
      };

      strapi.log.info(`Retrieved artist ${documentId}: ${artist.name}`);

      return ctx.send({
        data: enhancedArtist
      });

    } catch (error: unknown) {
      strapi.log.error('Error finding artist:', error);
      
      return ctx.internalServerError('Failed to fetch artist', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get featured artists for homepage
   * GET /api/artists/featured
   */
  async featured(ctx: StrapiContext): Promise<ApiResponse<Artist[]> | ApiError> {
    try {
      const { limit = 6 } = ctx.query;

      // Get artists with artworks, sorted by total artwork popularity
      const featuredArtists = await strapi.documents('api::artist.artist').findMany({
        filters: {
          publishedAt: { $notNull: true }
        },
        populate: {
          image: true,
          backgroundImage: true,
          art: {
            populate: ['artimage'],
            sort: 'popularityscore:desc',
            pagination: { limit: 3 }
          }
        },
        sort: 'createdAt:desc',
        pagination: {
          page: 1,
          pageSize: Math.min(parseInt(limit as string, 10), 20)
        }
      });

      // Filter and sort by artists who have artworks
      const artistsWithArt = featuredArtists.results
        .filter(artist => artist.art && artist.art.length > 0)
        .map(artist => ({
          ...artist,
          isLiving: !artist.DOD,
          artworkCount: artist.art?.length || 0,
          totalPopularity: artist.art?.reduce((sum: number, artwork: any) => sum + (artwork.popularityscore || 0), 0) || 0
        }))
        .sort((a, b) => b.totalPopularity - a.totalPopularity);

      strapi.log.info(`Retrieved ${artistsWithArt.length} featured artists`);

      return ctx.send({
        data: artistsWithArt,
        meta: {
          pagination: featuredArtists.pagination
        }
      });

    } catch (error: unknown) {
      strapi.log.error('Error fetching featured artists:', error);
      
      return ctx.internalServerError('Failed to fetch featured artists', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get artist statistics for admin dashboard
   * GET /api/artists/stats
   */
  async stats(ctx: StrapiContext): Promise<ApiResponse<ArtistStats> | ApiError> {
    try {
      // Get comprehensive artist statistics
      const stats = await strapi.service('api::artist.artist').getArtistStats();

      strapi.log.info('Retrieved artist statistics');

      return ctx.send({
        data: stats
      });

    } catch (error: unknown) {
      strapi.log.error('Error getting artist stats:', error);
      
      return ctx.internalServerError('Failed to get artist statistics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Search artists with advanced filters
   * GET /api/artists/search
   */
  async search(ctx: StrapiContext): Promise<ApiResponse<Artist[]> | ApiError> {
    try {
      const {
        q: searchTerm = '',
        living,
        hasArtworks,
        minArtworks,
        limit = 25
      } = ctx.query;

      if (!searchTerm || searchTerm.length < 2) {
        return ctx.badRequest('Search term must be at least 2 characters long');
      }

      const searchOptions = {
        living: living === 'true' ? true : living === 'false' ? false : undefined,
        hasArtworks: hasArtworks === 'true',
        minArtworks: minArtworks ? parseInt(minArtworks as string, 10) : undefined,
        limit: parseInt(limit as string, 10)
      };

      const results = await strapi.service('api::artist.artist').searchArtists(searchTerm, searchOptions);

      strapi.log.info(`Search for "${searchTerm}" returned ${results.results.length} artists`);

      return ctx.send(results);

    } catch (error: unknown) {
      strapi.log.error('Error searching artists:', error);
      
      return ctx.internalServerError('Failed to search artists', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Helper method to generate artist biography summary
   */
  generateBiography(artist: any): string {
    const parts: string[] = [];

    if (artist.name) {
      parts.push(artist.name);
    }

    if (artist.DOB && artist.DOD) {
      parts.push(`(${artist.DOB} - ${artist.DOD})`);
    } else if (artist.DOB) {
      parts.push(`(born ${artist.DOB})`);
    }

    if (artist.art && artist.art.length > 0) {
      parts.push(`is known for ${artist.art.length} artwork${artist.art.length > 1 ? 's' : ''}`);
    }

    if (artist.description) {
      parts.push(artist.description.substring(0, 200) + (artist.description.length > 200 ? '...' : ''));
    }

    return parts.join(' ');
  }
}));