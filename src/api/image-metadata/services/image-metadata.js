'use strict';

/**
 * image-metadata service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::image-metadata.image-metadata');
