/**
 * artists-work router - TypeScript implementation
 * Route configuration for artwork API endpoints
 * Follows official Strapi TypeScript documentation patterns
 */

import { factories } from '@strapi/strapi';
import { RouteConfig } from '../../../types';

// Custom route configuration for artwork-specific endpoints
const customRoutes: RouteConfig = {
  routes: [
    // Popular artworks endpoint
    {
      method: 'GET',
      path: '/artists-works/popular',
      handler: 'artists-work.popular',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    // Price calculation endpoint
    {
      method: 'POST',
      path: '/artists-works/:documentId/calculate-price',
      handler: 'artists-work.calculatePrice',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    // Enhanced search endpoint
    {
      method: 'GET',
      path: '/artists-works/search',
      handler: 'artists-work.search',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    // Statistics endpoint (admin only)
    {
      method: 'GET',
      path: '/artists-works/stats',
      handler: 'artists-work.stats',
      config: {
        auth: true,
        policies: ['admin::is-owner'],
        middlewares: []
      }
    }
  ]
};

// Create core router with default CRUD routes
const defaultRouter = factories.createCoreRouter('api::artists-work.artists-work', {
  // Configure default route options
  config: {
    find: {
      auth: false,
      policies: [],
      middlewares: ['api::artists-work.populate-defaults']
    },
    findOne: {
      auth: false,
      policies: [],
      middlewares: ['api::artists-work.populate-defaults']
    },
    create: {
      auth: true,
      policies: ['admin::is-owner'],
      middlewares: ['api::artists-work.validate-artwork-data']
    },
    update: {
      auth: true,
      policies: ['admin::is-owner'],
      middlewares: ['api::artists-work.validate-artwork-data']
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