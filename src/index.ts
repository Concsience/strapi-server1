/**
 * Main application entry point with TypeScript support
 * This file can coexist with index.js during migration
 */

'use strict';

import { validateAndExit } from './utils/env-validation';

// Comprehensive environment validation on startup (skip in test/ci)
if (process.env.NODE_ENV !== 'test' && !process.env.CI) {
  validateAndExit();
}

// Export the standard Strapi application
module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {
    // Register any global services, policies, or middlewares here
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap(/*{ strapi }*/) {
    // Bootstrap any required services or data
    console.log('🚀 Strapi application is starting...');
    
    // Log TypeScript migration status
    if (process.env.NODE_ENV === 'development') {
      console.log('📘 TypeScript migration in progress - some APIs are now type-safe');
    }
  },
};