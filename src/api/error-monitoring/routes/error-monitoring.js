'use strict';

/**
 * error-monitoring router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::error-monitoring.error-monitoring');