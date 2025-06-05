const { factories } = require('@strapi/strapi');
/**
 * Order router - TypeScript
 * Defines REST API routes for order management
 */
module.exports = factories.createCoreRouter('api::order.order', {
    config: {
        create: {
            auth: {},
            policies: [],
            middlewares: [],
        },
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
