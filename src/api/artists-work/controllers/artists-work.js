/**
 * artists-work controller
 */

const { factories } = require('@strapi/strapi');

module.exports = factories.createCoreController('api::artists-work.artists-work', ({ strapi }) => ({
  /**
   * Find artworks with enhanced filtering and population
   * GET /api/artists-works
   */
  async find(ctx) {
    try {
      // Use the parent find method for now to ensure it works
      return await super.find(ctx);
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
      // Use the parent findOne method for now
      return await super.findOne(ctx);
    } catch (error) {
      strapi.log.error('Error finding artwork:', error);
      
      return ctx.internalServerError('Failed to fetch artwork', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

}));