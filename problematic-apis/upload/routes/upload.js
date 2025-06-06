'use strict';

/**
 * upload router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::upload.upload');