/**
 * Cart Routes - TypeScript version
 * Defines all cart-related API endpoints with proper typing and security
 */
const { factories } = require('@strapi/strapi');
/**
 * Cart router with authentication required for all endpoints
 * Using Strapi 4 route configuration format
 */
module.exports = factories.createCoreRouter('api::cart.cart', {
    config: {
        find: {
            auth: {},
            policies: [],
            middlewares: [],
        },
        findOne: {
            auth: {},
            policies: [],
            middlewares: [],
        },
        create: {
            auth: {},
            policies: [],
            middlewares: [],
        },
        update: {
            auth: {},
            policies: [],
            middlewares: [],
        },
        delete: {
            auth: {},
            policies: [],
            middlewares: [],
        },
    },
});
