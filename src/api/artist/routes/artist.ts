/**
 * artist router - TypeScript implementation  
 * Route configuration for artist API endpoints
 * Follows official Strapi TypeScript documentation patterns
 */

import { factories } from '@strapi/strapi';
import { RouteConfig } from '../../../types';

// Custom route configuration for artist-specific endpoints
const customRoutes: RouteConfig = {
  routes: [
    // Featured artists endpoint
    {
      method: 'GET',
      path: '/artists/featured',
      handler: 'artist.featured',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    // Artist statistics endpoint (admin only)
    {
      method: 'GET',
      path: '/artists/stats',
      handler: 'artist.stats',
      config: {
        auth: true,
        policies: ['admin::is-owner'],
        middlewares: []
      }
    },
    // Enhanced search endpoint
    {
      method: 'GET',
      path: '/artists/search',
      handler: 'artist.search',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    // Living artists endpoint
    {
      method: 'GET',
      path: '/artists/living',
      handler: 'artist.living',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    // Artist biography endpoint
    {
      method: 'GET',
      path: '/artists/:documentId/biography',
      handler: 'artist.biography',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    }
  ]
};

// Create core router with default CRUD routes
const defaultRouter = factories.createCoreRouter('api::artist.artist', {
  // Configure default route options
  config: {
    find: {
      auth: false,
      policies: [],
      middlewares: ['api::artist.populate-defaults']
    },
    findOne: {
      auth: false,
      policies: [],
      middlewares: ['api::artist.populate-defaults']
    },
    create: {
      auth: true,
      policies: ['admin::is-owner'],
      middlewares: ['api::artist.validate-artist-data']
    },
    update: {
      auth: true,
      policies: ['admin::is-owner'],
      middlewares: ['api::artist.validate-artist-data']
    },
    delete: {
      auth: true,
      policies: ['admin::is-owner'],
      middlewares: []
    }
  }
});

// Export combined routes (default + custom)
export default {
  routes: [
    ...defaultRouter.routes,
    ...customRoutes.routes
  ]
};