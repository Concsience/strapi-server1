'use strict';

/**
 * pa service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::pa.pa');
