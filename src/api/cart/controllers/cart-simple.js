/**
 * Cart Controller - Simplified TypeScript version
 * Uses only core Strapi functionality to ensure compatibility
 */

const { factories  } = require('@strapi/strapi');

module.exports = factories.createCoreController('api::cart.cart');