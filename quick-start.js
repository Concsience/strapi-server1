#!/usr/bin/env node
'use strict';

/**
 * Quick Strapi Startup - No CLI needed!
 * Run this file to start your Strapi server
 */

console.log('🚀 Quick Starting Strapi...');

// Set environment
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Start Strapi directly using the working module path
async function startStrapi() {
  try {
    // Import Strapi from the installed location
    const strapiPath = require.resolve('@strapi/strapi/dist/src/index.js');
    console.log('📍 Found Strapi at:', strapiPath);
    
    const strapi = require('@strapi/strapi');
    
    console.log('⚡ Starting Strapi application...');
    const app = await strapi().start();
    
    console.log('✅ SUCCESS! Strapi is running!');
    console.log('🌐 Open your browser to: http://localhost:1337');
    console.log('📊 Admin panel: http://localhost:1337/admin');
    console.log('🛑 Press Ctrl+C to stop');
    
    return app;
    
  } catch (error) {
    console.error('❌ Error starting Strapi:');
    console.error('📝 Error message:', error.message);
    
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('\n💡 Solution: Try running:');
      console.log('   npm install @strapi/strapi --force');
      console.log('   OR');
      console.log('   yarn add @strapi/strapi');
    }
    
    throw error;
  }
}

startStrapi().catch(console.error);