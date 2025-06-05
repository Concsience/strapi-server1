'use strict';

/**
 * image-job service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::image-job.image-job');
