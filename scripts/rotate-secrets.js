#!/usr/bin/env node

/**
 * Secret Rotation Script for Strapi Application
 * Generates secure secrets and updates configuration
 * 
 * Usage: node scripts/rotate-secrets.js [--production]
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  secret: (key, value) => console.log(`${colors.cyan}🔐${colors.reset} ${key}: ${colors.magenta}${value}${colors.reset}`)
};

/**
 * Generate a cryptographically secure random string
 */
function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('base64').replace(/[/+=]/g, '').substring(0, length);
}

/**
 * Generate APP_KEYS array for Strapi
 */
function generateAppKeys(count = 4) {
  return Array.from({ length: count }, () => generateSecureSecret(32));
}

/**
 * Generate a strong password
 */
function generateStrongPassword(length = 20) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  
  // Ensure password has at least one of each required character type
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
  
  if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
    return generateStrongPassword(length); // Regenerate if requirements not met
  }
  
  return password;
}

/**
 * Generate all required secrets
 */
function generateSecrets() {
  log.info('Generating new secure secrets...\n');
  
  const secrets = {
    // Strapi Core Secrets
    APP_KEYS: generateAppKeys(4).join(','),
    API_TOKEN_SALT: generateSecureSecret(64),
    ADMIN_JWT_SECRET: generateSecureSecret(128),
    JWT_SECRET: generateSecureSecret(128),
    TRANSFER_TOKEN_SALT: generateSecureSecret(64),
    
    // Database
    DATABASE_PASSWORD: generateStrongPassword(24),
    
    // Additional Security
    ENCRYPTION_KEY: generateSecureSecret(32),
    SESSION_SECRET: generateSecureSecret(64),
    PREVIEW_SECRET: generateSecureSecret(32),
    
    // Webhook Secrets
    WEBHOOK_SECRET: generateSecureSecret(48),
    
    // Rate Limiting
    RATE_LIMIT_SECRET: generateSecureSecret(32)
  };
  
  return secrets;
}

/**
 * Create .env.example file with secure placeholders
 */
function createEnvExample() {
  const envExampleContent = `# STRAPI CONFIGURATION TEMPLATE
# Copy this file to .env and fill in your values
# NEVER commit .env to version control

# Server Configuration
HOST=0.0.0.0
PORT=1337
NODE_ENV=development

# Database Configuration
DATABASE_CLIENT=postgres
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=strapi_conscience
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=<GENERATE_STRONG_PASSWORD>
DATABASE_SSL=false

# Strapi Security Keys (Generate with: node scripts/rotate-secrets.js)
APP_KEYS=<GENERATE_APP_KEYS>
API_TOKEN_SALT=<GENERATE_API_TOKEN_SALT>
ADMIN_JWT_SECRET=<GENERATE_ADMIN_JWT_SECRET>
JWT_SECRET=<GENERATE_JWT_SECRET>
TRANSFER_TOKEN_SALT=<GENERATE_TRANSFER_TOKEN_SALT>

# Additional Security
ENCRYPTION_KEY=<GENERATE_ENCRYPTION_KEY>
SESSION_SECRET=<GENERATE_SESSION_SECRET>
PREVIEW_SECRET=<GENERATE_PREVIEW_SECRET>
WEBHOOK_SECRET=<GENERATE_WEBHOOK_SECRET>
RATE_LIMIT_SECRET=<GENERATE_RATE_LIMIT_SECRET>

# Upload Configuration (OVH S3)
STRAPI_UPLOAD_PROVIDER=aws-s3
STRAPI_UPLOAD_BASE_URL=https://your-bucket.s3.region.cloud.ovh.net
STRAPI_UPLOAD_ENDPOINT=https://s3.region.cloud.ovh.net
STRAPI_UPLOAD_ACCESS_KEY_ID=<YOUR_OVH_ACCESS_KEY>
STRAPI_UPLOAD_SECRET_ACCESS_KEY=<YOUR_OVH_SECRET_KEY>
STRAPI_UPLOAD_REGION=<YOUR_OVH_REGION>
STRAPI_UPLOAD_BUCKET=<YOUR_OVH_BUCKET>

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=<YOUR_STRIPE_PUBLISHABLE_KEY>
STRIPE_SECRET_KEY=<YOUR_STRIPE_SECRET_KEY>
STRIPE_WEBHOOK_SECRET=<YOUR_STRIPE_WEBHOOK_SECRET>

# Redis Configuration (Optional)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=<YOUR_REDIS_PASSWORD>
REDIS_DB=1

# Logging
LOG_LEVEL=debug
LOG_PRETTY_PRINT=true
LOG_ERRORS_DETAILS=true

# CORS Configuration
CORS_ENABLED=true
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# Admin Panel
ADMIN_PATH=/admin
ADMIN_SERVE_ADMIN_PANEL=true

# Performance
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_POOL_IDLE_TIMEOUT=30000

# Monitoring (Optional)
SENTRY_DSN=<YOUR_SENTRY_DSN>
NEW_RELIC_LICENSE_KEY=<YOUR_NEW_RELIC_KEY>

# Feature Flags
STRAPI_TELEMETRY_DISABLED=true
STRAPI_DISABLE_UPDATE_NOTIFICATION=false
STRAPI_HIDE_STARTUP_MESSAGE=false
`;

  const envExamplePath = path.join(process.cwd(), '.env.example');
  fs.writeFileSync(envExamplePath, envExampleContent);
  log.success(`.env.example created successfully`);
}

/**
 * Update .gitignore to ensure .env is not tracked
 */
function updateGitignore() {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  let gitignoreContent = '';
  
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  }
  
  const envPatterns = [
    '.env',
    '.env.*',
    '!.env.example',
    '.env.local',
    '.env.production',
    '.env.staging',
    '.env.development'
  ];
  
  let updated = false;
  envPatterns.forEach(pattern => {
    if (!gitignoreContent.includes(pattern)) {
      gitignoreContent += `\n${pattern}`;
      updated = true;
    }
  });
  
  if (updated) {
    // Add section header if not present
    if (!gitignoreContent.includes('# Environment variables')) {
      const envSection = '\n# Environment variables\n' + envPatterns.join('\n');
      gitignoreContent = gitignoreContent.replace('.env', envSection);
    }
    
    fs.writeFileSync(gitignorePath, gitignoreContent.trim() + '\n');
    log.success('.gitignore updated to exclude environment files');
  } else {
    log.info('.gitignore already configured correctly');
  }
}

/**
 * Create backup of current .env file
 */
function backupCurrentEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(process.cwd(), `.env.backup.${timestamp}`);
    fs.copyFileSync(envPath, backupPath);
    log.success(`Current .env backed up to ${path.basename(backupPath)}`);
    return backupPath;
  }
  return null;
}

/**
 * Interactive prompt for user
 */
async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

/**
 * Main execution
 */
async function main() {
  console.log(`${colors.cyan}🔐 Strapi Secret Rotation Tool${colors.reset}`);
  console.log(`${colors.cyan}================================${colors.reset}\n`);
  
  // Check if we're in a Strapi project
  if (!fs.existsSync('package.json')) {
    log.error('This script must be run from the root of a Strapi project');
    process.exit(1);
  }
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (!packageJson.dependencies || !packageJson.dependencies['@strapi/strapi']) {
    log.error('This does not appear to be a Strapi project');
    process.exit(1);
  }
  
  // Parse arguments
  const args = process.argv.slice(2);
  const isProduction = args.includes('--production');
  
  if (isProduction) {
    log.warning('Running in PRODUCTION mode - be very careful!');
    const confirm = await prompt('Are you sure you want to rotate production secrets? (yes/no): ');
    if (confirm !== 'yes') {
      log.info('Operation cancelled');
      process.exit(0);
    }
  }
  
  // Step 1: Backup current .env
  const backupPath = backupCurrentEnv();
  
  // Step 2: Generate new secrets
  const secrets = generateSecrets();
  
  // Step 3: Display secrets
  console.log(`\n${colors.green}Generated Secrets:${colors.reset}\n`);
  Object.entries(secrets).forEach(([key, value]) => {
    log.secret(key, value);
  });
  
  // Step 4: Create .env.example
  createEnvExample();
  
  // Step 5: Update .gitignore
  updateGitignore();
  
  // Step 6: Instructions
  console.log(`\n${colors.yellow}⚠️  IMPORTANT NEXT STEPS:${colors.reset}`);
  console.log('1. Copy the generated secrets to your .env file');
  console.log('2. Update your database password in PostgreSQL:');
  console.log(`   ${colors.cyan}ALTER USER strapi WITH PASSWORD '${secrets.DATABASE_PASSWORD}';${colors.reset}`);
  console.log('3. Update any external services (OVH S3, Stripe, etc.) with new credentials');
  console.log('4. Restart your Strapi application');
  console.log('5. Test all integrations thoroughly');
  
  if (backupPath) {
    console.log(`\n${colors.blue}ℹ  Your old .env was backed up to: ${path.basename(backupPath)}${colors.reset}`);
  }
  
  // Step 7: Security checklist
  console.log(`\n${colors.green}✓ Security Checklist:${colors.reset}`);
  console.log('□ Remove .env from git history: git rm --cached .env');
  console.log('□ Rotate Stripe API keys in Stripe Dashboard');
  console.log('□ Rotate OVH S3 credentials in OVH Control Panel');
  console.log('□ Update all environment variables in production');
  console.log('□ Update CI/CD pipeline with new secrets');
  console.log('□ Notify team members of credential rotation');
  
  // Step 8: Generate secure storage script
  const secureStorageScript = `#!/bin/bash
# Secure Environment Setup Script
# Store this script securely and run it to set up environment

# Strapi Secrets
export APP_KEYS="${secrets.APP_KEYS}"
export API_TOKEN_SALT="${secrets.API_TOKEN_SALT}"
export ADMIN_JWT_SECRET="${secrets.ADMIN_JWT_SECRET}"
export JWT_SECRET="${secrets.JWT_SECRET}"
export TRANSFER_TOKEN_SALT="${secrets.TRANSFER_TOKEN_SALT}"

# Database
export DATABASE_PASSWORD="${secrets.DATABASE_PASSWORD}"

# Additional Security
export ENCRYPTION_KEY="${secrets.ENCRYPTION_KEY}"
export SESSION_SECRET="${secrets.SESSION_SECRET}"
export PREVIEW_SECRET="${secrets.PREVIEW_SECRET}"
export WEBHOOK_SECRET="${secrets.WEBHOOK_SECRET}"
export RATE_LIMIT_SECRET="${secrets.RATE_LIMIT_SECRET}"

echo "✓ Environment variables set successfully"
`;
  
  const scriptPath = path.join(process.cwd(), 'set-secrets.sh');
  fs.writeFileSync(scriptPath, secureStorageScript, { mode: 0o600 }); // Restrictive permissions
  log.success(`Secure setup script created: ${path.basename(scriptPath)} (chmod 600)`);
  
  console.log(`\n${colors.green}✨ Secret rotation complete!${colors.reset}`);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});

// Execute
if (require.main === module) {
  main().catch((error) => {
    log.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { generateSecureSecret, generateAppKeys, generateStrongPassword };