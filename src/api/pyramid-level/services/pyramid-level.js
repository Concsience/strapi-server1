'use strict';

/**
 * pyramid-level service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::pyramid-level.pyramid-level');
