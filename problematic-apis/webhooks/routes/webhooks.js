'use strict';

/**
 * webhooks router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::webhooks.webhooks');