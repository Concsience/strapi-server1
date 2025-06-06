/**
 * artists-work router
 * Default CRUD routes for artwork API endpoints
 */
const { factories } = require('@strapi/strapi');

module.exports = factories.createCoreRouter('api::artists-work.artists-work', {
  config: {
    find: {
      auth: false, // Allow public access for API testing
      policies: []
    },
    findOne: {
      auth: false, // Allow public access for API testing  
      policies: []
    }
  }
});
