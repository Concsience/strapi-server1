'use strict';

/**
 * list-collection service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::list-collection.list-collection');
