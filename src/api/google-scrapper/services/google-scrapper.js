'use strict';

/**
 * google-scrapper service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::google-scrapper.google-scrapper');
