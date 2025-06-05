/**
 * address router - TypeScript implementation
 * Route configuration for address API endpoints
 * Follows official Strapi TypeScript documentation patterns
 */

import { factories } from '@strapi/strapi';
import { RouteConfig } from '../../../types';

// Custom route configuration for address-specific endpoints
const customRoutes: RouteConfig = {
  routes: [
    // Address validation endpoint
    {
      method: 'POST',
      path: '/addresses/validate',
      handler: 'address.validate',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    // User's addresses endpoint
    {
      method: 'GET',
      path: '/addresses/my-addresses',
      handler: 'address.myAddresses',
      config: {
        auth: true,
        policies: ['api::address.is-owner'],
        middlewares: []
      }
    },
    // Address statistics endpoint (admin only)
    {
      method: 'GET',
      path: '/addresses/stats',
      handler: 'address.stats',
      config: {
        auth: true,
        policies: ['admin::is-owner'],
        middlewares: []
      }
    },
    // Search addresses by location
    {
      method: 'GET',
      path: '/addresses/search',
      handler: 'address.search',
      config: {
        auth: true,
        policies: ['api::address.is-owner'],
        middlewares: []
      }
    },
    // Check for duplicate addresses
    {
      method: 'POST',
      path: '/addresses/check-duplicates',
      handler: 'address.checkDuplicates',
      config: {
        auth: true,
        policies: ['api::address.is-owner'],
        middlewares: []
      }
    }
  ]
};

// Create core router with default CRUD routes
const defaultRouter = factories.createCoreRouter('api::address.address', {
  // Configure default route options
  config: {
    find: {
      auth: true,
      policies: ['api::address.is-owner'],
      middlewares: ['api::address.filter-by-owner']
    },
    findOne: {
      auth: true,
      policies: ['api::address.is-owner'],
      middlewares: ['api::address.check-ownership']
    },
    create: {
      auth: true,
      policies: ['api::address.is-owner'],
      middlewares: ['api::address.validate-address-data', 'api::address.set-owner']
    },
    update: {
      auth: true,
      policies: ['api::address.is-owner'],
      middlewares: ['api::address.check-ownership', 'api::address.validate-address-data']
    },
    delete: {
      auth: true,
      policies: ['api::address.is-owner'],
      middlewares: ['api::address.check-ownership']
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