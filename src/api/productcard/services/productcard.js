'use strict';

/**
 * productcard service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::productcard.productcard');
