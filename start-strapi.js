#!/usr/bin/env node
'use strict';

/**
 * Strapi Development Startup Script
 * This bypasses the broken CLI and starts Strapi directly
 */

const path = require('path');
const strapi = require('@strapi/strapi');

async function main() {
  console.log('🚀 Starting Strapi Development Server...');
  console.log('📁 Project directory:', process.cwd());
  console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
  
  try {
    // Set development environment if not set
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'development';
    }
    
    // Start Strapi
    const app = await strapi({
      distDir: path.join(__dirname, 'dist'),
      autoReload: true,
      serveAdminPanel: true
    }).start();
    
    console.log('✅ Strapi started successfully!');
    console.log('🌐 Server: http://localhost:1337');
    console.log('📊 Admin: http://localhost:1337/admin');
    console.log('🛑 Press Ctrl+C to stop');
    
  } catch (error) {
    console.error('❌ Failed to start Strapi:', error.message);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Gracefully shutting down Strapi...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  process.exit(0);
});

main().catch(error => {
  console.error('💥 Startup error:', error);
  process.exit(1);
});