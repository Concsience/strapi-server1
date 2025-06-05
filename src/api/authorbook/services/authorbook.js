'use strict';

/**
 * authorbook service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::authorbook.authorbook');
