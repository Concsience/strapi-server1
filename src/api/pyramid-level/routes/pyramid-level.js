'use strict';

/**
 * pyramid-level router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::pyramid-level.pyramid-level');
