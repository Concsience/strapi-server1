#!/usr/bin/env node
/**
 * CI-specific startup script with retry logic
 * Handles database connection issues in CI environments
 */

const { spawn } = require('child_process');

let attempts = 0;
const maxAttempts = 3;
const retryDelay = 5000; // 5 seconds

console.log('🚀 Starting Strapi in CI environment...');

function startStrapi() {
  attempts++;
  console.log(`\nAttempt ${attempts}/${maxAttempts}...`);
  
  const strapi = spawn('npm', ['run', 'start'], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      // Force smaller pool for CI
      DATABASE_POOL_MIN: '0',
      DATABASE_POOL_MAX: '3',
      DATABASE_CONNECTION_TIMEOUT: '120000',
      // Disable telemetry in CI
      STRAPI_TELEMETRY_DISABLED: 'true'
    },
    stdio: 'inherit'
  });

  strapi.on('error', (error) => {
    console.error('Failed to start Strapi:', error);
    retryStart();
  });

  strapi.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Strapi exited with code ${code}`);
      retryStart();
    } else {
      console.log('✅ Strapi started successfully!');
    }
  });
}

function retryStart() {
  if (attempts < maxAttempts) {
    console.log(`⏳ Retrying in ${retryDelay/1000} seconds...`);
    setTimeout(startStrapi, retryDelay);
  } else {
    console.error('❌ Failed to start Strapi after multiple attempts');
    process.exit(1);
  }
}

// Start the process
startStrapi();