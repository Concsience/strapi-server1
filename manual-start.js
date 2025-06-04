#!/usr/bin/env node

// Manual Strapi 5 startup bypassing broken CLI
process.env.NODE_ENV = 'development';

console.log('🚀 Manual Strapi 5 startup...');
console.log('📁 Working directory:', process.cwd());

async function startStrapi() {
  try {
    // Direct module loading
    const { Strapi } = require('@strapi/strapi/dist/Strapi');
    
    console.log('⚡ Creating Strapi instance...');
    const strapi = new Strapi({
      appDir: process.cwd(),
      distDir: './dist'
    });
    
    console.log('🔧 Registering app...');
    await strapi.register();
    
    console.log('🏁 Starting server...');
    await strapi.start();
    
    console.log('✅ SUCCESS! Strapi 5 is running!');
    console.log('🌐 Server: http://localhost:1337');
    console.log('📊 Admin: http://localhost:1337/admin');
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    
    // Fallback information
    console.log('\n💡 Try these solutions:');
    console.log('1. yarn install && yarn develop');  
    console.log('2. rm -rf node_modules && npm install');
    console.log('3. Check database connection');
  }
}

startStrapi();