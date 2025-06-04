#!/usr/bin/env node

/**
 * Generate secure secrets for Strapi configuration
 * Run: node generate_secrets.js
 */

const crypto = require('crypto');

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

console.log('🔐 Generating new secure secrets for Strapi...\n');

// Generate all required secrets
const secrets = {
  JWT_SECRET: generateSecret(32),
  ADMIN_JWT_SECRET: generateSecret(32),
  API_TOKEN_SALT: generateSecret(16),
  TRANSFER_TOKEN_SALT: generateSecret(16),
  APP_KEYS: [
    generateSecret(16),
    generateSecret(16),
    generateSecret(16),
    generateSecret(16)
  ].join(','),
  // Database password (you should set this manually)
  DATABASE_PASSWORD_SUGGESTION: generateSecret(16)
};

console.log('📋 Copy these values to your .env file:\n');
console.log('# Security Keys (Generated on ' + new Date().toISOString() + ')');
console.log('JWT_SECRET=' + secrets.JWT_SECRET);
console.log('ADMIN_JWT_SECRET=' + secrets.ADMIN_JWT_SECRET);
console.log('API_TOKEN_SALT=' + secrets.API_TOKEN_SALT);
console.log('TRANSFER_TOKEN_SALT=' + secrets.TRANSFER_TOKEN_SALT);
console.log('APP_KEYS=' + secrets.APP_KEYS);
console.log('\n# Database (use a strong password)');
console.log('# Suggested password: ' + secrets.DATABASE_PASSWORD_SUGGESTION);
console.log('\n⚠️  IMPORTANT:');
console.log('1. Update these in your .env file');
console.log('2. Never commit .env to git');
console.log('3. Restart Strapi after updating');
console.log('4. Update database password in PostgreSQL too');