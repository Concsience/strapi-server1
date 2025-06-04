#!/usr/bin/env node

/**
 * HARDCORE STRAPI 5 BYPASS
 * Directly construct Strapi from working components
 */

const path = require('path');
const fs = require('fs');

console.log('🔥 HARDCORE Strapi 5 Bootstrap...');

process.env.NODE_ENV = 'development';

async function hardcoreStrapi() {
  try {
    console.log('⚡ Loading from individual Strapi components...');
    
    // Try to access the core directly
    const corePath = path.join(process.cwd(), 'node_modules/@strapi/core');
    if (fs.existsSync(corePath)) {
      console.log('✅ Found @strapi/core');
      
      try {
        // Direct core import
        const core = require('@strapi/core');
        console.log('✅ Core loaded successfully');
        
        // Create minimal Strapi instance
        const strapi = core({
          appDir: process.cwd(),
          distDir: path.join(process.cwd(), 'dist')
        });
        
        console.log('🚀 Starting Strapi core...');
        await strapi.start();
        
        console.log('🎉 HARDCORE SUCCESS!');
        return strapi;
        
      } catch (coreError) {
        console.log('❌ Core import failed:', coreError.message);
      }
    }
    
    // Fallback: Try admin components
    console.log('🔄 Trying admin components...');
    const adminPath = path.join(process.cwd(), 'node_modules/@strapi/admin');
    if (fs.existsSync(adminPath)) {
      console.log('✅ Found @strapi/admin');
      
      const admin = require('@strapi/admin');
      console.log('✅ Admin components available');
    }
    
    throw new Error('Could not construct Strapi from available components');
    
  } catch (error) {
    console.error('🔥 HARDCORE FAILURE:', error.message);
    
    // Emergency: Create our own server based on what we know
    console.log('\n💀 EMERGENCY: Creating minimal API server...');
    
    const http = require('http');
    const server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      
      if (req.url === '/admin') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
<!DOCTYPE html>
<html><head><title>Strapi 5 Emergency</title></head>
<body>
<h1>🔥 EMERGENCY STRAPI 5</h1>
<p><strong>Status:</strong> Package manager corrupted, but server running</p>
<p><strong>Solution:</strong> Need to fix package installation</p>
<h2>Diagnostics:</h2>
<pre>
Node.js: ${process.version}
Environment: ${process.env.NODE_ENV}
Working directory: ${process.cwd()}
</pre>
<p><strong>Next steps:</strong> Fix yarn/npm installation completely</p>
</body></html>
        `);
        return;
      }
      
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'emergency',
        message: 'Strapi components exist but package manager broken',
        node_version: process.version,
        available_packages: fs.readdirSync('node_modules/@strapi').slice(0, 10)
      }));
    });
    
    const port = 1337;
    server.listen(port, () => {
      console.log(`💀 Emergency server: http://localhost:${port}`);
      console.log(`💀 Emergency admin: http://localhost:${port}/admin`);
    });
  }
}

hardcoreStrapi();