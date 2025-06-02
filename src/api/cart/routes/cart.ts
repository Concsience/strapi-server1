/**
 * Cart Routes - TypeScript version
 * Defines all cart-related API endpoints with proper typing and security
 */

import { factories } from '@strapi/strapi';

// For now, just export the core routes to ensure compatibility
export default factories.createCoreRouter('api::cart.cart');