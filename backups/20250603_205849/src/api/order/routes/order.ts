import { factories } from '@strapi/strapi';

/**
 * Order router - TypeScript
 * Defines REST API routes for order management
 */
const orderRouter = factories.createCoreRouter('api::order.order', {
  config: {
    create: {
      auth: true,
      policies: [],
      middlewares: [],
    },
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

export default orderRouter;