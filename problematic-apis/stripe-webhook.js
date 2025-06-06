'use strict';

/**
 * stripe-webhook router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::stripe-webhook.stripe-webhook');