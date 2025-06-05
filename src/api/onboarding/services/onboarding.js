'use strict';

/**
 * onboarding service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::onboarding.onboarding');
