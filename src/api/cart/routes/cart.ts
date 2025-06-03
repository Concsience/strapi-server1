/**
 * Cart Routes - TypeScript version
 * Defines all cart-related API endpoints with proper typing and security
 */

import { factories } from '@strapi/strapi';

/**
 * Cart router with authentication required for all endpoints
 * Using Strapi 4 route configuration format
 */
export default factories.createCoreRouter('api::cart.cart', {
  config: {
    find: {
      auth: true,
      policies: [],
      middlewares: [],
    },
    findOne: {
      auth: true,
      policies: [],
      middlewares: [],
    },
    create: {
      auth: true,
      policies: [],
      middlewares: [],
    },
    update: {
      auth: true,
      policies: [],
      middlewares: [],
    },
    delete: {
      auth: true,
      policies: [],
      middlewares: [],
    },
  },
});