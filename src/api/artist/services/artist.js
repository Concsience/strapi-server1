/**
 * artist service - TypeScript implementation
 * Business logic for artist profile management
 * Follows official Strapi TypeScript documentation patterns
 */

const { factories  } = require('@strapi/strapi');

// Service-specific interfaces




module.exports = factories.createCoreService('api::artist.artist', ({ strapi }) => ({
  /**
   * Find artists with business logic enhancements
   */
  async findWithBusinessLogic(params = {}) {
    try {
      // Add default business rules
      const enhancedParams = {
        ...params,
        filters: {
          ...params.filters,
          publishedAt: { $notNull: true }
        }
      };

      const results = await strapi.documents('api::artist.artist').findMany(enhancedParams);

      // Enhance results with calculated fields
      const enhancedArtists = await Promise.all(
        results.results.map(async (artist) => {
          const artworkCount = await this.getArtistArtworkCount(artist.documentId);
          const popularityScore = await this.getArtistPopularityScore(artist.documentId);

          return {
            ...artist,
            isLiving: !artist.DOD,
            artworkCount,
            popularityScore,
            hasArtworks: artworkCount > 0,
            featuredStatus: this.getFeaturedStatus(artist, artworkCount, popularityScore)
          };
        })
      );

      return {
        ...results,
        results: enhancedArtists
      };

    } catch (error) {
      strapi.log.error('Error in findWithBusinessLogic:', error);
      throw error;
    }
  },

  /**
   * Get artist artwork count
   */
  async getArtistArtworkCount(artistId) {
    try {
      const count = await strapi.documents('api::artists-work.artists-work').count({
        filters: {
          artist: { documentId: artistId },
          publishedAt: { $notNull: true }
        }
      });

      return count;

    } catch (error) {
      strapi.log.error('Error getting artist artwork count:', error);
      return 0;
    }
  },

  /**
   * Calculate artist popularity score based on artworks
   */
  async getArtistPopularityScore(artistId) {
    try {
      const artworks = await strapi.documents('api::artists-work.artists-work').findMany({
        filters: {
          artist: { documentId: artistId },
          publishedAt: { $notNull: true }
        },
        fields: ['popularityscore'],
        pagination: { pageSize: 1000 }
      });

      if (artworks.results.length === 0) return 0;

      const totalScore = artworks.results.reduce(
        (sum, artwork) => sum + (artwork.popularityscore || 0), 
        0
      );

      return Math.round(totalScore / artworks.results.length);

    } catch (error) {
      strapi.log.error('Error calculating artist popularity:', error);
      return 0;
    }
  },

  /**
   * Determine artist featured status
   */
  getFeaturedStatus(artist, artworkCount, popularityScore) {
    if (artworkCount >= 10 && popularityScore >= 50) return 'top';
    if (artworkCount >= 5 && popularityScore >= 25) return 'featured';
    if (artworkCount >= 2 && popularityScore >= 10) return 'emerging';
    if (artworkCount >= 1) return 'active';
    return 'new';
  },

  /**
   * Get comprehensive artist statistics
   */
  async getArtistStats() {
    try {
      // Total artists count
      const totalCount = await strapi.documents('api::artist.artist').count();

      // Published artists count
      const publishedCount = await strapi.documents('api::artist.artist').count({
        filters: {
          publishedAt: { $notNull: true }
        }
      });

      // Living artists count (no death date)
      const livingCount = await strapi.documents('api::artist.artist').count({
        filters: {
          publishedAt: { $notNull: true },
          DOD: { $null: true }
        }
      });

      // Artists with artworks
      const artistsWithArtworks = await strapi.db.query('api::artist.artist').findMany({
        where: {
          publishedAt: { $notNull: true }
        },
        populate: {
          art: {
            where: {
              publishedAt: { $notNull: true }
            }
          }
        }
      });

      const artistsWithArt = artistsWithArtworks.filter(artist => artist.art && artist.art.length > 0);
      const totalArtworks = artistsWithArt.reduce((sum, artist) => sum + (artist.art?.length || 0), 0);
      const averageArtworksPerArtist = artistsWithArt.length > 0 ? totalArtworks / artistsWithArt.length : 0;

      // Most productive artist
      const mostProductive = artistsWithArt.reduce((prev, current) => {
        return (current.art?.length || 0) > (prev.art?.length || 0) ? current : prev;
      }, artistsWithArt[0] || null);

      // Featured artists (top 5 by artwork count and popularity)
      const featuredArtists = await this.getFeaturedArtists(5);

      return {
        totalArtists: totalCount,
        publishedArtists: publishedCount,
        livingArtists: livingCount,
        artistsWithArtworks: artistsWithArt.length,
        averageArtworksPerArtist: Math.round(averageArtworksPerArtist * 100) / 100,
        mostProductiveArtist: mostProductive,
        featuredArtists: featuredArtists.results
      };

    } catch (error) {
      strapi.log.error('Error getting artist stats:', error);
      throw error;
    }
  },

  /**
   * Get featured artists with highest artwork quality
   */
  async getFeaturedArtists(limit = 10) {
    try {
      const artists = await strapi.documents('api::artist.artist').findMany({
        filters: {
          publishedAt: { $notNull: true }
        },
        populate: {
          image: true,
          art: {
            populate: ['artimage'],
            sort: 'popularityscore:desc',
            pagination: { limit: 5 }
          }
        },
        pagination: { pageSize: limit * 2 } // Get more to filter and sort
      });

      // Calculate featured score for each artist
      const artistsWithScores = artists.results
        .map(artist => {
          const artworkCount = artist.art?.length || 0;
          const totalPopularity = artist.art?.reduce((sum, artwork) => sum + (artwork.popularityscore || 0), 0) || 0;
          const averagePopularity = artworkCount > 0 ? totalPopularity / artworkCount : 0;
          
          const featuredScore = (artworkCount * 2) + averagePopularity;

          return {
            ...artist,
            artworkCount,
            totalPopularity,
            averagePopularity: Math.round(averagePopularity * 100) / 100,
            featuredScore: Math.round(featuredScore * 100) / 100,
            isLiving: !artist.DOD
          };
        })
        .filter(artist => artist.artworkCount > 0) // Only artists with artworks
        .sort((a, b) => b.featuredScore - a.featuredScore)
        .slice(0, limit);

      return {
        results: artistsWithScores,
        pagination: {
          page: 1,
          pageSize: limit,
          total: artistsWithScores.length
        }
      };

    } catch (error) {
      strapi.log.error('Error getting featured artists:', error);
      throw error;
    }
  },

  /**
   * Search artists with advanced filtering
   */
  async searchArtists(searchTerm, options = {}) {
    try {
      const {
        living,
        hasArtworks,
        minArtworks,
        limit = 25
      } = options;

      const filters = {
        publishedAt: { $notNull: true },
        $or: [
          { name: { $containsi: searchTerm } },
          { description: { $containsi: searchTerm } }
        ]
      };

      // Filter by living status
      if (living === true) {
        filters.DOD = { $null: true };
      } else if (living === false) {
        filters.DOD = { $notNull: true };
      }

      const results = await strapi.documents('api::artist.artist').findMany({
        filters,
        populate: {
          image: true,
          backgroundImage: true,
          art: {
            populate: ['artimage'],
            sort: 'popularityscore:desc',
            pagination: { limit: 3 }
          }
        },
        sort: 'name:asc',
        pagination: { page: 1, pageSize: limit }
      });

      // Post-process results for additional filtering
      let filteredResults = results.results;

      if (hasArtworks) {
        filteredResults = filteredResults.filter(artist => artist.art && artist.art.length > 0);
      }

      if (minArtworks && minArtworks > 0) {
        filteredResults = filteredResults.filter(artist => (artist.art?.length || 0) >= minArtworks);
      }

      // Enhance results
      const enhancedResults = filteredResults.map(artist => ({
        ...artist,
        isLiving: !artist.DOD,
        artworkCount: artist.art?.length || 0,
        hasArtworks: !!(artist.art && artist.art.length > 0),
        averagePopularity: artist.art?.length > 0 
          ? artist.art.reduce((sum, artwork) => sum + (artwork.popularityscore || 0), 0) / artist.art.length
          : 0
      }));

      return {
        results: enhancedResults,
        pagination: {
          ...results.pagination,
          total: enhancedResults.length
        }
      };

    } catch (error) {
      strapi.log.error('Error searching artists:', error);
      throw error;
    }
  },

  /**
   * Validate artist data before create/update
   */
  validateArtistData(data) {
    const errors = [];

    if ('name' in data && data.name) {
      if (data.name.length < 2) {
        errors.push('Artist name must be at least 2 characters long');
      }
      if (data.name.length > 100) {
        errors.push('Artist name must be less than 100 characters');
      }
    }

    if ('description' in data && data.description) {
      if (data.description.length > 2000) {
        errors.push('Description must be less than 2000 characters');
      }
    }

    if ('DOB' in data && data.DOB) {
      const currentYear = new Date().getFullYear();
      const birthYear = parseInt(data.DOB, 10);
      
      if (isNaN(birthYear) || birthYear < 1000 || birthYear > currentYear) {
        errors.push('Date of birth must be a valid year between 1000 and current year');
      }
    }

    if ('DOD' in data && data.DOD) {
      const currentYear = new Date().getFullYear();
      const deathYear = parseInt(data.DOD, 10);
      
      if (isNaN(deathYear) || deathYear < 1000 || deathYear > currentYear) {
        errors.push('Date of death must be a valid year between 1000 and current year');
      }

      // Check that death year is after birth year
      if ('DOB' in data && data.DOB && data.DOD) {
        const birthYear = parseInt(data.DOB, 10);
        if (!isNaN(birthYear) && !isNaN(deathYear) && deathYear <= birthYear) {
          errors.push('Date of death must be after date of birth');
        }
      }
    }

    return errors;
  },

  /**
   * Update artist metadata based on artworks
   */
  async updateArtistMetadata(artistId) {
    try {
      const artworkCount = await this.getArtistArtworkCount(artistId);
      const popularityScore = await this.getArtistPopularityScore(artistId);

      // Update artist with calculated metadata
      const updated = await strapi.documents('api::artist.artist').update({
        documentId: artistId,
        data: {
          // Add custom fields for metadata if needed
          // This would require updating the content-type schema
        }
      });

      strapi.log.info(`Updated metadata for artist ${artistId}: ${artworkCount} artworks, ${popularityScore} popularity`);

      return updated;

    } catch (error) {
      strapi.log.error('Error updating artist metadata:', error);
      throw error;
    }
  }
}));