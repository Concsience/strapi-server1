#!/usr/bin/env node

/**
 * Strapi 5 Development Startup
 * This works around CLI issues by starting Strapi directly
 */

const path = require('path');

console.log('🚀 Starting Strapi 5 Development Server...');
console.log('📁 Project directory:', process.cwd());

// Set development environment
process.env.NODE_ENV = 'development';

async function startStrapi() {
  try {
    // Try to load Strapi directly
    console.log('⚡ Loading Strapi...');
    
    // Option 1: Try main entry point
    let strapi;
    try {
      strapi = require('@strapi/strapi');
      console.log('✅ Strapi loaded successfully');
    } catch (e) {
      console.log('❌ Direct import failed:', e.message);
      
      // Option 2: Try from dist
      try {
        strapi = require('@strapi/strapi/dist');
        console.log('✅ Strapi loaded from dist');
      } catch (e2) {
        throw new Error(`Could not load Strapi: ${e2.message}`);
      }
    }
    
    console.log('🔧 Creating Strapi application...');
    
    // Start with basic configuration
    const app = strapi({
      distDir: path.join(__dirname, 'dist'),
      appDir: __dirname,
      autoReload: true
    });
    
    console.log('🏁 Starting application...');
    await app.start();
    
    console.log('\n🎉 SUCCESS! Strapi is running!');
    console.log('🌐 Server: http://localhost:1337');
    console.log('📊 Admin: http://localhost:1337/admin');
    console.log('🛑 Press Ctrl+C to stop\n');
    
    return app;
    
  } catch (error) {
    console.error('\n❌ Failed to start Strapi:');
    console.error('📝 Error:', error.message);
    
    if (error.stack) {
      console.error('📋 Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
    
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check database connection');
    console.log('2. Verify environment variables');
    console.log('3. Try: npm run build first');
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Strapi...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  process.exit(0);
});

startStrapi();