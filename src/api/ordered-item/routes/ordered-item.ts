/**
 * ordered-item router - TypeScript implementation
 * Route configuration for ordered item API endpoints
 * Follows official Strapi TypeScript documentation patterns
 */

import { factories } from '@strapi/strapi';
import { RouteConfig } from '../../../types';

// Custom route configuration for ordered-item-specific endpoints
const customRoutes: RouteConfig = {
  routes: [
    // Get ordered items by order ID
    {
      method: 'GET',
      path: '/ordered-items/by-order/:orderId',
      handler: 'ordered-item.getByOrder',
      config: {
        auth: true,
        policies: ['api::ordered-item.is-owner'],
        middlewares: []
      }
    },
    // Get ordered item statistics
    {
      method: 'GET',
      path: '/ordered-items/stats',
      handler: 'ordered-item.stats',
      config: {
        auth: true,
        policies: ['admin::is-owner'],
        middlewares: []
      }
    },
    // Update fulfillment status
    {
      method: 'PUT',
      path: '/ordered-items/:id/fulfillment',
      handler: 'ordered-item.updateFulfillment',
      config: {
        auth: true,
        policies: ['admin::is-owner'],
        middlewares: []
      }
    },
    // Create ordered items from cart
    {
      method: 'POST',
      path: '/ordered-items/from-cart',
      handler: 'ordered-item.createFromCart',
      config: {
        auth: true,
        policies: ['api::ordered-item.is-owner'],
        middlewares: []
      }
    },
    // Get fulfillment pipeline
    {
      method: 'GET',
      path: '/ordered-items/fulfillment-pipeline',
      handler: 'ordered-item.getFulfillmentPipeline',
      config: {
        auth: true,
        policies: ['admin::is-owner'],
        middlewares: []
      }
    },
    // Get items ready for printing
    {
      method: 'GET',
      path: '/ordered-items/ready-for-printing',
      handler: 'ordered-item.getReadyForPrinting',
      config: {
        auth: true,
        policies: ['admin::is-owner'],
        middlewares: []
      }
    },
    // Generate production sheets
    {
      method: 'GET',
      path: '/ordered-items/production-sheets',
      handler: 'ordered-item.getProductionSheets',
      config: {
        auth: true,
        policies: ['admin::is-owner'],
        middlewares: []
      }
    }
  ]
};

// Create core router with default CRUD routes
const defaultRouter = factories.createCoreRouter('api::ordered-item.ordered-item', {
  // Configure default route options
  config: {
    find: {
      auth: true,
      policies: ['api::ordered-item.is-owner'],
      middlewares: ['api::ordered-item.filter-by-owner']
    },
    findOne: {
      auth: true,
      policies: ['api::ordered-item.is-owner'],
      middlewares: ['api::ordered-item.check-ownership']
    },
    create: {
      auth: true,
      policies: ['api::ordered-item.is-owner'],
      middlewares: ['api::ordered-item.validate-ordered-item-data']
    },
    update: {
      auth: true,
      policies: ['api::ordered-item.is-owner'],
      middlewares: ['api::ordered-item.check-ownership', 'api::ordered-item.validate-ordered-item-data']
    },
    delete: {
      auth: true,
      policies: ['admin::is-owner'], // Only admins can delete ordered items
      middlewares: ['api::ordered-item.check-ownership']
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