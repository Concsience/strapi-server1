/**
 * cart-item router - TypeScript implementation
 * Route configuration for cart item API endpoints
 * Follows official Strapi TypeScript documentation patterns
 */

import { factories } from '@strapi/strapi';
import { RouteConfig } from '../../../types';

// Custom route configuration for cart-item-specific endpoints
const customRoutes: RouteConfig = {
  routes: [
    // Get cart item statistics
    {
      method: 'GET',
      path: '/cart-items/stats',
      handler: 'cart-item.stats',
      config: {
        auth: true,
        policies: ['admin::is-owner'],
        middlewares: []
      }
    },
    // Calculate pricing for cart item
    {
      method: 'POST',
      path: '/cart-items/calculate-pricing',
      handler: 'cart-item.calculatePricing',
      config: {
        auth: true,
        policies: [],
        middlewares: []
      }
    },
    // Get cart items by cart ID
    {
      method: 'GET',
      path: '/cart-items/by-cart/:cartId',
      handler: 'cart-item.getByCart',
      config: {
        auth: true,
        policies: ['api::cart-item.is-owner'],
        middlewares: []
      }
    }
  ]
};

// Create core router with default CRUD routes
const defaultRouter = factories.createCoreRouter('api::cart-item.cart-item', {
  // Configure default route options
  config: {
    find: {
      auth: true,
      policies: ['api::cart-item.is-owner'],
      middlewares: ['api::cart-item.filter-by-owner']
    },
    findOne: {
      auth: true,
      policies: ['api::cart-item.is-owner'],
      middlewares: ['api::cart-item.check-ownership']
    },
    create: {
      auth: true,
      policies: ['api::cart-item.is-owner'],
      middlewares: ['api::cart-item.validate-cart-item-data', 'api::cart-item.set-owner']
    },
    update: {
      auth: true,
      policies: ['api::cart-item.is-owner'],
      middlewares: ['api::cart-item.check-ownership', 'api::cart-item.validate-cart-item-data']
    },
    delete: {
      auth: true,
      policies: ['api::cart-item.is-owner'],
      middlewares: ['api::cart-item.check-ownership']
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