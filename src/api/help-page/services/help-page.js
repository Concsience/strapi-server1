'use strict';

/**
 * help-page service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::help-page.help-page');
