'use strict';

/**
 * cinema service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::cinema.cinema');
