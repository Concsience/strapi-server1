/**
 * wishlist router - TypeScript implementation
 * Route configuration for wishlist API endpoints
 * Follows official Strapi TypeScript documentation patterns
 */

import { factories } from '@strapi/strapi';
import { RouteConfig } from '../../../types';

// Custom route configuration for wishlist-specific endpoints
const customRoutes: RouteConfig = {
  routes: [
    // Get current user's wishlist
    {
      method: 'GET',
      path: '/wishlists/my-wishlist',
      handler: 'wishlist.getMyWishlist',
      config: {
        auth: true,
        policies: [],
        middlewares: []
      }
    },
    // Add item to wishlist
    {
      method: 'POST',
      path: '/wishlists/add-item',
      handler: 'wishlist.addItem',
      config: {
        auth: true,
        policies: [],
        middlewares: []
      }
    },
    // Remove item from wishlist
    {
      method: 'DELETE',
      path: '/wishlists/remove-item',
      handler: 'wishlist.removeItem',
      config: {
        auth: true,
        policies: [],
        middlewares: []
      }
    },
    // Clear entire wishlist
    {
      method: 'DELETE',
      path: '/wishlists/clear',
      handler: 'wishlist.clear',
      config: {
        auth: true,
        policies: [],
        middlewares: []
      }
    },
    // Check if artwork is in wishlist
    {
      method: 'GET',
      path: '/wishlists/check/:artworkId',
      handler: 'wishlist.checkItem',
      config: {
        auth: true,
        policies: [],
        middlewares: []
      }
    },
    // Get wishlist statistics (admin only)
    {
      method: 'GET',
      path: '/wishlists/stats',
      handler: 'wishlist.stats',
      config: {
        auth: true,
        policies: ['admin::is-owner'],
        middlewares: []
      }
    },
    // Get personalized recommendations
    {
      method: 'GET',
      path: '/wishlists/recommendations',
      handler: 'wishlist.getRecommendations',
      config: {
        auth: true,
        policies: [],
        middlewares: []
      }
    }
  ]
};

// Create core router with default CRUD routes
const defaultRouter = factories.createCoreRouter('api::wishlist.wishlist', {
  // Configure default route options
  config: {
    find: {
      auth: true,
      policies: ['api::wishlist.is-owner'],
      middlewares: ['api::wishlist.filter-by-owner']
    },
    findOne: {
      auth: true,
      policies: ['api::wishlist.is-owner'],
      middlewares: ['api::wishlist.check-ownership']
    },
    create: {
      auth: true,
      policies: ['api::wishlist.is-owner'],
      middlewares: ['api::wishlist.set-owner']
    },
    update: {
      auth: true,
      policies: ['api::wishlist.is-owner'],
      middlewares: ['api::wishlist.check-ownership']
    },
    delete: {
      auth: true,
      policies: ['api::wishlist.is-owner'],
      middlewares: ['api::wishlist.check-ownership']
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