'use strict';

/**
 * image-import service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::image-import.image-import');
