/**
 * paper-type router - TypeScript implementation
 * Route configuration for paper type API endpoints
 * Follows official Strapi TypeScript documentation patterns
 */

import { factories } from '@strapi/strapi';
import { RouteConfig } from '../../../types';

// Custom route configuration for paper type-specific endpoints
const customRoutes: RouteConfig = {
  routes: [
    // Popular paper types endpoint
    {
      method: 'GET',
      path: '/paper-types/popular',
      handler: 'paper-type.popular',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    // Cost calculation endpoint
    {
      method: 'POST',
      path: '/paper-types/:documentId/calculate-cost',
      handler: 'paper-type.calculateCost',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    // Paper type statistics endpoint (admin only)
    {
      method: 'GET',
      path: '/paper-types/stats',
      handler: 'paper-type.stats',
      config: {
        auth: true,
        policies: ['admin::is-owner'],
        middlewares: []
      }
    },
    // Search paper types endpoint
    {
      method: 'GET',
      path: '/paper-types/search',
      handler: 'paper-type.search',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    // Price categories endpoint
    {
      method: 'GET',
      path: '/paper-types/categories',
      handler: 'paper-type.categories',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    }
  ]
};

// Create core router with default CRUD routes
const defaultRouter = factories.createCoreRouter('api::paper-type.paper-type', {
  // Configure default route options
  config: {
    find: {
      auth: false,
      policies: [],
      middlewares: ['api::paper-type.validate-pricing']
    },
    findOne: {
      auth: false,
      policies: [],
      middlewares: ['api::paper-type.validate-pricing']
    },
    create: {
      auth: true,
      policies: ['admin::is-owner'],
      middlewares: ['api::paper-type.validate-paper-data']
    },
    update: {
      auth: true,
      policies: ['admin::is-owner'],
      middlewares: ['api::paper-type.validate-paper-data']
    },
    delete: {
      auth: true,
      policies: ['admin::is-owner'],
      middlewares: ['api::paper-type.check-usage-before-delete']
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