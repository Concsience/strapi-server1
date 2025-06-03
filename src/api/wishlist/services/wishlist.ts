/**
 * wishlist service - TypeScript implementation
 * Business logic for wishlist management and analytics
 * Follows official Strapi TypeScript documentation patterns
 */

import { factories } from '@strapi/strapi';

// Service-specific interfaces
interface WishlistStats {
  totalWishlists: number;
  totalWishlistItems: number;
  averageItemsPerWishlist: number;
  mostWishlistedArtwork: any;
  wishlistTrends: Array<{
    artwork: any;
    wishlistCount: number;
  }>;
  userEngagement: {
    activeWishlists: number;
    emptyWishlists: number;
    largeWishlists: number; // >10 items
  };
}

interface WishlistAnalytics {
  conversionRate: number; // Percentage of wishlist items that get purchased
  popularityBoost: number; // Average popularity increase for wishlisted items
  retentionRate: number; // Percentage of users who keep items in wishlist >30 days
}

export default factories.createCoreService('api::wishlist.wishlist', ({ strapi }) => ({
  /**
   * Get or create user's wishlist
   */
  async getOrCreateUserWishlist(userId: number) {
    try {
      // Try to find existing wishlist
      const existingWishlist = await strapi.documents('api::wishlist.wishlist').findMany({
        filters: {
          users_permissions_user: { id: userId },
          publishedAt: { $notNull: true }
        },
        populate: {
          arts: {
            populate: ['artist', 'artimage'],
            sort: 'popularityscore:desc'
          }
        }
      });

      if (existingWishlist.results.length > 0) {
        return existingWishlist.results[0];
      }

      // Create new wishlist if none exists
      const newWishlist = await strapi.documents('api::wishlist.wishlist').create({
        data: {
          users_permissions_user: userId,
          arts: []
        },
        populate: {
          arts: {
            populate: ['artist', 'artimage']
          }
        }
      });

      strapi.log.info(`Created new wishlist for user ${userId}`);
      return newWishlist;

    } catch (error) {
      strapi.log.error('Error getting or creating user wishlist:', error);
      throw error;
    }
  },

  /**
   * Check if artwork is in user's wishlist
   */
  async isArtworkInUserWishlist(userId: number, artworkId: string | number): Promise<boolean> {
    try {
      const wishlist = await strapi.documents('api::wishlist.wishlist').findMany({
        filters: {
          users_permissions_user: { id: userId },
          publishedAt: { $notNull: true }
        },
        populate: {
          arts: {
            fields: ['id', 'documentId']
          }
        }
      });

      if (wishlist.results.length === 0) {
        return false;
      }

      const userWishlist = wishlist.results[0];
      const isInWishlist = userWishlist.arts?.some((art: any) => 
        art.documentId === artworkId || 
        art.id === parseInt(artworkId as string) ||
        art.id === artworkId
      );

      return !!isInWishlist;

    } catch (error) {
      strapi.log.error('Error checking if artwork is in wishlist:', error);
      return false;
    }
  },

  /**
   * Add artwork to user's wishlist
   */
  async addArtworkToWishlist(userId: number, artworkId: string | number) {
    try {
      // Get or create wishlist
      const wishlist = await this.getOrCreateUserWishlist(userId);

      // Check if artwork is already in wishlist
      const isAlreadyInWishlist = await this.isArtworkInUserWishlist(userId, artworkId);
      
      if (isAlreadyInWishlist) {
        throw new Error('Artwork is already in wishlist');
      }

      // Add artwork to wishlist
      const currentArtworkIds = wishlist.arts?.map((art: any) => art.documentId || art.id) || [];
      const updatedArtworkIds = [...currentArtworkIds, artworkId];

      const updatedWishlist = await strapi.documents('api::wishlist.wishlist').update({
        documentId: wishlist.documentId,
        data: {
          arts: updatedArtworkIds
        },
        populate: {
          arts: {
            populate: ['artist', 'artimage']
          }
        }
      });

      // Update artwork popularity (wishlist adds boost popularity)
      await this.updateArtworkPopularityFromWishlist(artworkId, 1);

      strapi.log.info(`Added artwork ${artworkId} to wishlist for user ${userId}`);
      return updatedWishlist;

    } catch (error) {
      strapi.log.error('Error adding artwork to wishlist:', error);
      throw error;
    }
  },

  /**
   * Remove artwork from user's wishlist
   */
  async removeArtworkFromWishlist(userId: number, artworkId: string | number) {
    try {
      const wishlist = await strapi.documents('api::wishlist.wishlist').findMany({
        filters: {
          users_permissions_user: { id: userId }
        },
        populate: {
          arts: true
        }
      });

      if (wishlist.results.length === 0) {
        throw new Error('Wishlist not found');
      }

      const userWishlist = wishlist.results[0];

      // Remove artwork from wishlist
      const currentArtworkIds = userWishlist.arts?.map((art: any) => art.documentId || art.id) || [];
      const updatedArtworkIds = currentArtworkIds.filter((id: any) => 
        id !== artworkId && id !== parseInt(artworkId as string)
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

      strapi.log.info(`Removed artwork ${artworkId} from wishlist for user ${userId}`);
      return updatedWishlist;

    } catch (error) {
      strapi.log.error('Error removing artwork from wishlist:', error);
      throw error;
    }
  },

  /**
   * Get wishlist statistics for admin dashboard
   */
  async getWishlistStats(): Promise<WishlistStats> {
    try {
      // Get all wishlists with their artworks
      const wishlists = await strapi.documents('api::wishlist.wishlist').findMany({
        filters: {
          publishedAt: { $notNull: true }
        },
        populate: {
          arts: {
            populate: ['artist']
          }
        },
        pagination: { pageSize: 1000 }
      });

      const totalWishlists = wishlists.results.length;
      let totalWishlistItems = 0;
      const artworkWishlistCounts: Record<string, number> = {};
      let activeWishlists = 0;
      let emptyWishlists = 0;
      let largeWishlists = 0;

      // Analyze wishlists
      wishlists.results.forEach(wishlist => {
        const itemCount = wishlist.arts?.length || 0;
        totalWishlistItems += itemCount;

        if (itemCount === 0) {
          emptyWishlists++;
        } else {
          activeWishlists++;
          
          if (itemCount > 10) {
            largeWishlists++;
          }

          // Count artwork appearances
          wishlist.arts?.forEach((artwork: any) => {
            const key = artwork.documentId || artwork.id;
            artworkWishlistCounts[key] = (artworkWishlistCounts[key] || 0) + 1;
          });
        }
      });

      const averageItemsPerWishlist = totalWishlists > 0 ? totalWishlistItems / totalWishlists : 0;

      // Find most wishlisted artwork
      let mostWishlistedArtwork = null;
      let maxWishlistCount = 0;

      for (const [artworkId, count] of Object.entries(artworkWishlistCounts)) {
        if (count > maxWishlistCount) {
          maxWishlistCount = count;
          
          // Get artwork details
          const artwork = await strapi.documents('api::artists-work.artists-work').findOne({
            documentId: artworkId,
            populate: ['artist', 'artimage']
          });
          
          if (artwork) {
            mostWishlistedArtwork = {
              ...artwork,
              wishlistCount: count
            };
          }
        }
      }

      // Get top 10 wishlisted artworks
      const wishlistTrends = await this.getWishlistTrends(10);

      return {
        totalWishlists,
        totalWishlistItems,
        averageItemsPerWishlist: Math.round(averageItemsPerWishlist * 100) / 100,
        mostWishlistedArtwork,
        wishlistTrends,
        userEngagement: {
          activeWishlists,
          emptyWishlists,
          largeWishlists
        }
      };

    } catch (error) {
      strapi.log.error('Error getting wishlist stats:', error);
      throw error;
    }
  },

  /**
   * Get wishlist trends (most wishlisted artworks)
   */
  async getWishlistTrends(limit: number = 10) {
    try {
      // Get all wishlists with artworks
      const wishlists = await strapi.documents('api::wishlist.wishlist').findMany({
        filters: {
          publishedAt: { $notNull: true }
        },
        populate: {
          arts: {
            fields: ['id', 'documentId']
          }
        },
        pagination: { pageSize: 1000 }
      });

      // Count artwork appearances
      const artworkCounts: Record<string, number> = {};
      
      wishlists.results.forEach(wishlist => {
        wishlist.arts?.forEach((artwork: any) => {
          const key = artwork.documentId || artwork.id;
          artworkCounts[key] = (artworkCounts[key] || 0) + 1;
        });
      });

      // Sort by count and get top artworks
      const sortedArtworks = Object.entries(artworkCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit);

      // Get artwork details
      const trends = await Promise.all(
        sortedArtworks.map(async ([artworkId, count]) => {
          const artwork = await strapi.documents('api::artists-work.artists-work').findOne({
            documentId: artworkId,
            populate: ['artist', 'artimage']
          });

          return {
            artwork,
            wishlistCount: count
          };
        })
      );

      return trends.filter(trend => trend.artwork); // Filter out null artworks

    } catch (error) {
      strapi.log.error('Error getting wishlist trends:', error);
      return [];
    }
  },

  /**
   * Update artwork popularity based on wishlist activity
   */
  async updateArtworkPopularityFromWishlist(artworkId: string | number, increment: number) {
    try {
      const artwork = await strapi.documents('api::artists-work.artists-work').findOne({
        documentId: artworkId as string
      });

      if (artwork) {
        const currentScore = artwork.popularityscore || 0;
        const newScore = Math.max(0, currentScore + increment);

        await strapi.documents('api::artists-work.artists-work').update({
          documentId: artwork.documentId,
          data: {
            popularityscore: newScore
          }
        });

        strapi.log.debug(`Updated popularity for artwork ${artworkId}: ${currentScore} -> ${newScore}`);
      }

    } catch (error) {
      strapi.log.error('Error updating artwork popularity from wishlist:', error);
      // Don't throw error as this is not critical
    }
  },

  /**
   * Get wishlist analytics for business insights
   */
  async getWishlistAnalytics(): Promise<WishlistAnalytics> {
    try {
      // This would require integration with order data to calculate conversion rates
      // For now, return placeholder analytics
      
      const wishlists = await strapi.documents('api::wishlist.wishlist').findMany({
        filters: { publishedAt: { $notNull: true } },
        populate: { arts: true },
        pagination: { pageSize: 1000 }
      });

      const totalItems = wishlists.results.reduce((sum, wishlist) => 
        sum + (wishlist.arts?.length || 0), 0
      );

      // Placeholder calculations - would need order integration for real data
      const conversionRate = 15.5; // Example: 15.5% of wishlisted items get purchased
      const popularityBoost = 8.2; // Example: 8.2 point average popularity increase
      const retentionRate = 72.3; // Example: 72.3% retention rate

      return {
        conversionRate,
        popularityBoost,
        retentionRate
      };

    } catch (error) {
      strapi.log.error('Error getting wishlist analytics:', error);
      return {
        conversionRate: 0,
        popularityBoost: 0,
        retentionRate: 0
      };
    }
  },

  /**
   * Clean up empty wishlists
   */
  async cleanupEmptyWishlists() {
    try {
      const emptyWishlists = await strapi.documents('api::wishlist.wishlist').findMany({
        filters: {
          publishedAt: { $notNull: true }
        },
        populate: { arts: true },
        pagination: { pageSize: 1000 }
      });

      const toDelete = emptyWishlists.results.filter(wishlist => 
        !wishlist.arts || wishlist.arts.length === 0
      );

      let deletedCount = 0;
      for (const wishlist of toDelete) {
        await strapi.documents('api::wishlist.wishlist').delete({
          documentId: wishlist.documentId
        });
        deletedCount++;
      }

      strapi.log.info(`Cleaned up ${deletedCount} empty wishlists`);
      return deletedCount;

    } catch (error) {
      strapi.log.error('Error cleaning up empty wishlists:', error);
      throw error;
    }
  },

  /**
   * Get similar artworks based on user's wishlist
   */
  async getRecommendationsForUser(userId: number, limit: number = 5) {
    try {
      const userWishlist = await this.getOrCreateUserWishlist(userId);
      
      if (!userWishlist.arts || userWishlist.arts.length === 0) {
        // If empty wishlist, return popular artworks
        const popular = await strapi.documents('api::artists-work.artists-work').findMany({
          filters: {
            publishedAt: { $notNull: true },
            popularityscore: { $gte: 20 }
          },
          sort: 'popularityscore:desc',
          populate: ['artist', 'artimage'],
          pagination: { pageSize: limit }
        });

        return popular.results;
      }

      // Get artists from user's wishlist
      const likedArtists = userWishlist.arts
        .map((artwork: any) => artwork.artist?.id)
        .filter(Boolean);

      // Find other artworks by the same artists
      const recommendations = await strapi.documents('api::artists-work.artists-work').findMany({
        filters: {
          publishedAt: { $notNull: true },
          artist: { id: { $in: likedArtists } },
          // Exclude artworks already in wishlist
          id: { $notIn: userWishlist.arts.map((art: any) => art.id) }
        },
        sort: 'popularityscore:desc',
        populate: ['artist', 'artimage'],
        pagination: { pageSize: limit }
      });

      return recommendations.results;

    } catch (error) {
      strapi.log.error('Error getting recommendations for user:', error);
      return [];
    }
  }
}));