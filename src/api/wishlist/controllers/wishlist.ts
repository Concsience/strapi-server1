/**
 * wishlist controller - TypeScript implementation
 * User wishlist management for saving favorite artworks
 * Follows official Strapi TypeScript documentation patterns
 */

import { factories } from '@strapi/strapi';
import { StrapiContext, ApiResponse, ApiError, hasUser } from '../../../types';

// Wishlist interface based on schema
interface Wishlist {
  id: number;
  users_permissions_user?: any; // User reference
  arts?: any[]; // Related artworks
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface WishlistItem {
  id: number;
  artname?: string;
  artist?: any;
  artimage?: any;
  base_price_per_cm_square?: number;
  popularityscore?: number;
  addedAt?: string;
}

interface WishlistStats {
  totalWishlists: number;
  averageItemsPerWishlist: number;
  mostWishlistedArtwork: any;
  wishlistTrends: Array<{
    artwork: any;
    wishlistCount: number;
  }>;
}

// Helper functions for wishlist calculations
function calculateWishlistValue(artworks: any[]): number {
  const standardSize = 30 * 40; // 30x40cm standard size
  
  const totalValue = artworks.reduce((sum, artwork) => {
    const basePrice = (artwork.base_price_per_cm_square || 0) * standardSize;
    return sum + basePrice;
  }, 0);

  return Math.round(totalValue * 100) / 100;
}

function calculateEstimatedPrice(artwork: any): number {
  const standardSize = 30 * 40; // 30x40cm
  const basePrice = (artwork.base_price_per_cm_square || 0) * standardSize;
  return Math.round(basePrice * 100) / 100;
}

function getPopularityTier(score: number): string {
  if (score >= 100) return 'trending';
  if (score >= 50) return 'popular';
  if (score >= 20) return 'emerging';
  if (score >= 5) return 'discovered';
  return 'new';
}

export default factories.createCoreController('api::wishlist.wishlist', ({ strapi }) => ({
  /**
   * Get current user's wishlist
   * GET /api/wishlists/my-wishlist
   */
  async getMyWishlist(ctx: StrapiContext): Promise<void> {
    try {
      if (!hasUser(ctx)) {
        return ctx.unauthorized('Authentication required to view wishlist');
      }

      // Find or create user's wishlist
      let wishlist = await strapi.documents('api::wishlist.wishlist').findMany({
        filters: {
          users_permissions_user: { id: ctx.state.user.id },
          publishedAt: { $notNull: true }
        },
        populate: {
          arts: {
            populate: ['artist', 'artimage'],
            sort: 'popularityscore:desc'
          }
        }
      });

      // If no wishlist exists, create one
      if (wishlist.results.length === 0) {
        const newWishlist = await strapi.documents('api::wishlist.wishlist').create({
          data: {
            users_permissions_user: ctx.state.user.id,
            arts: []
          },
          populate: {
            arts: {
              populate: ['artist', 'artimage']
            }
          }
        });

        strapi.log.info(`Created new wishlist for user ${ctx.state.user.id}`);

        return ctx.send({
          data: {
            ...newWishlist,
            itemCount: 0,
            totalValue: 0,
            lastUpdated: newWishlist.createdAt
          }
        });
      }

      const userWishlist = wishlist.results[0];

      // Enhance wishlist data
      const enhancedWishlist = {
        ...userWishlist,
        itemCount: userWishlist.arts?.length || 0,
        totalValue: calculateWishlistValue(userWishlist.arts || []),
        lastUpdated: userWishlist.updatedAt,
        items: (userWishlist.arts || []).map((artwork: any) => ({
          ...artwork,
          estimatedPrice: calculateEstimatedPrice(artwork),
          popularityTier: getPopularityTier(artwork.popularityscore || 0)
        }))
      };

      strapi.log.info(`Retrieved wishlist for user ${ctx.state.user.id} with ${enhancedWishlist.itemCount} items`);

      return ctx.send({
        data: enhancedWishlist
      });

    } catch (error: unknown) {
      strapi.log.error('Error getting user wishlist:', error);
      
      return ctx.internalServerError('Failed to fetch wishlist', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Add artwork to wishlist
   * POST /api/wishlists/add-item
   */
  async addItem(ctx: StrapiContext): Promise<void> {
    try {
      if (!hasUser(ctx)) {
        return ctx.unauthorized('Authentication required to add to wishlist');
      }

      const { artworkId } = ctx.request.body;

      if (!artworkId) {
        return ctx.badRequest('Artwork ID is required');
      }

      // Verify artwork exists
      const artwork = await strapi.documents('api::artists-work.artists-work').findOne({
        documentId: artworkId
      });

      if (!artwork) {
        return ctx.notFound('Artwork not found');
      }

      // Get or create user's wishlist
      let wishlist = await strapi.documents('api::wishlist.wishlist').findMany({
        filters: {
          users_permissions_user: { id: ctx.state.user.id }
        },
        populate: {
          arts: true
        }
      });

      let userWishlist;

      if (wishlist.results.length === 0) {
        // Create new wishlist
        userWishlist = await strapi.documents('api::wishlist.wishlist').create({
          data: {
            users_permissions_user: ctx.state.user.id,
            arts: [artworkId]
          },
          populate: {
            arts: {
              populate: ['artist', 'artimage']
            }
          }
        });

        strapi.log.info(`Created wishlist and added artwork ${artworkId} for user ${ctx.state.user.id}`);
      } else {
        userWishlist = wishlist.results[0];
        
        // Check if artwork is already in wishlist
        const isAlreadyInWishlist = userWishlist.arts?.some((art: any) => 
          art.documentId === artworkId || art.id === parseInt(artworkId)
        );

        if (isAlreadyInWishlist) {
          return ctx.conflict('Artwork is already in your wishlist');
        }

        // Add artwork to existing wishlist
        const currentArtworkIds = userWishlist.arts?.map((art: any) => art.documentId || art.id) || [];
        const updatedArtworkIds = [...currentArtworkIds, artworkId];

        userWishlist = await strapi.documents('api::wishlist.wishlist').update({
          documentId: userWishlist.documentId,
          data: {
            arts: updatedArtworkIds
          },
          populate: {
            arts: {
              populate: ['artist', 'artimage']
            }
          }
        });

        strapi.log.info(`Added artwork ${artworkId} to wishlist for user ${ctx.state.user.id}`);
      }

      // Enhance response
      const enhancedWishlist = {
        ...userWishlist,
        itemCount: userWishlist.arts?.length || 0,
        totalValue: calculateWishlistValue(userWishlist.arts || []),
        recentlyAdded: artwork
      };

      return ctx.send({
        data: enhancedWishlist
      });

    } catch (error: unknown) {
      strapi.log.error('Error adding item to wishlist:', error);
      
      return ctx.internalServerError('Failed to add item to wishlist', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Remove artwork from wishlist
   * DELETE /api/wishlists/remove-item
   */
  async removeItem(ctx: StrapiContext): Promise<void> {
    try {
      if (!hasUser(ctx)) {
        return ctx.unauthorized('Authentication required to remove from wishlist');
      }

      const { artworkId } = ctx.request.body;

      if (!artworkId) {
        return ctx.badRequest('Artwork ID is required');
      }

      // Get user's wishlist
      const wishlist = await strapi.documents('api::wishlist.wishlist').findMany({
        filters: {
          users_permissions_user: { id: ctx.state.user.id }
        },
        populate: {
          arts: true
        }
      });

      if (wishlist.results.length === 0) {
        return ctx.notFound('Wishlist not found');
      }

      const userWishlist = wishlist.results[0];

      // Remove artwork from wishlist
      const currentArtworkIds = userWishlist.arts?.map((art: any) => art.documentId || art.id) || [];
      const updatedArtworkIds = currentArtworkIds.filter((id: any) => 
        id !== artworkId && id !== parseInt(artworkId)
      );

      const updatedWishlist = await strapi.documents('api::wishlist.wishlist').update({
        documentId: userWishlist.documentId,
        data: {
          arts: updatedArtworkIds
        },
        populate: {
          arts: {
            populate: ['artist', 'artimage']
          }
        }
      });

      strapi.log.info(`Removed artwork ${artworkId} from wishlist for user ${ctx.state.user.id}`);

      // Enhance response
      const enhancedWishlist = {
        ...updatedWishlist,
        itemCount: updatedWishlist.arts?.length || 0,
        totalValue: calculateWishlistValue(updatedWishlist.arts || [])
      };

      return ctx.send({
        data: enhancedWishlist
      });

    } catch (error: unknown) {
      strapi.log.error('Error removing item from wishlist:', error);
      
      return ctx.internalServerError('Failed to remove item from wishlist', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Clear entire wishlist
   * DELETE /api/wishlists/clear
   */
  async clear(ctx: StrapiContext): Promise<void> {
    try {
      if (!hasUser(ctx)) {
        return ctx.unauthorized('Authentication required to clear wishlist');
      }

      // Get user's wishlist
      const wishlist = await strapi.documents('api::wishlist.wishlist').findMany({
        filters: {
          users_permissions_user: { id: ctx.state.user.id }
        }
      });

      if (wishlist.results.length === 0) {
        return ctx.notFound('Wishlist not found');
      }

      const userWishlist = wishlist.results[0];

      // Clear all items
      const clearedWishlist = await strapi.documents('api::wishlist.wishlist').update({
        documentId: userWishlist.documentId,
        data: {
          arts: []
        }
      });

      strapi.log.info(`Cleared wishlist for user ${ctx.state.user.id}`);

      return ctx.send({
        data: {
          ...clearedWishlist,
          itemCount: 0,
          totalValue: 0,
          message: 'Wishlist cleared successfully'
        }
      });

    } catch (error: unknown) {
      strapi.log.error('Error clearing wishlist:', error);
      
      return ctx.internalServerError('Failed to clear wishlist', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get wishlist statistics for admin dashboard
   * GET /api/wishlists/stats
   */
  async stats(ctx: StrapiContext): Promise<void> {
    try {
      const stats = await strapi.service('api::wishlist.wishlist').getWishlistStats();

      strapi.log.info('Retrieved wishlist statistics');

      return ctx.send({
        data: stats
      });

    } catch (error: unknown) {
      strapi.log.error('Error getting wishlist stats:', error);
      
      return ctx.internalServerError('Failed to get wishlist statistics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Check if artwork is in user's wishlist
   * GET /api/wishlists/check/:artworkId
   */
  async checkItem(ctx: StrapiContext): Promise<void> {
    try {
      if (!hasUser(ctx)) {
        return ctx.unauthorized('Authentication required to check wishlist');
      }

      const { artworkId } = ctx.params;

      if (!artworkId) {
        return ctx.badRequest('Artwork ID is required');
      }

      const isInWishlist = await strapi.service('api::wishlist.wishlist').isArtworkInUserWishlist(
        ctx.state.user.id,
        artworkId
      );

      return ctx.send({
        data: {
          inWishlist: isInWishlist
        }
      });

    } catch (error: unknown) {
      strapi.log.error('Error checking wishlist item:', error);
      
      return ctx.internalServerError('Failed to check wishlist item', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get personalized recommendations based on user's wishlist
   * GET /api/wishlists/recommendations
   */
  async getRecommendations(ctx: StrapiContext): Promise<void> {
    try {
      if (!hasUser(ctx)) {
        return ctx.unauthorized('Authentication required to get recommendations');
      }

      const limit = parseInt(ctx.query.limit as string) || 5;
      
      const recommendations = await strapi.service('api::wishlist.wishlist').getRecommendationsForUser(
        ctx.state.user.id,
        limit
      );

      // Enhance recommendations with pricing
      const enhancedRecommendations = recommendations.map((artwork: any) => ({
        ...artwork,
        estimatedPrice: calculateEstimatedPrice(artwork),
        popularityTier: getPopularityTier(artwork.popularityscore || 0)
      }));

      strapi.log.info(`Generated ${enhancedRecommendations.length} recommendations for user ${ctx.state.user.id}`);

      return ctx.send({
        data: enhancedRecommendations,
        meta: {
          recommendationType: enhancedRecommendations.length > 0 ? 'personalized' : 'popular',
          count: enhancedRecommendations.length
        }
      });

    } catch (error: unknown) {
      strapi.log.error('Error getting wishlist recommendations:', error);
      
      return ctx.internalServerError('Failed to get recommendations', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}));