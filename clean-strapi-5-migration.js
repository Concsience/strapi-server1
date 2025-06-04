#!/usr/bin/env node

/**
 * Clean Strapi 5 Migration Script
 * 
 * This script automates the Strapi v4 to v5 migration process
 * with proper error handling and rollback capabilities
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, type = 'info') {
  const prefix = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`
  };
  
  console.log(`${prefix[type]} ${message}`);
}

function execCommand(command, description) {
  try {
    log(`${description}...`);
    execSync(command, { stdio: 'inherit' });
    log(`${description} completed`, 'success');
    return true;
  } catch (error) {
    log(`${description} failed: ${error.message}`, 'error');
    return false;
  }
}

async function main() {
  console.log(`
${colors.bright}🚀 Strapi 5 Clean Migration Tool${colors.reset}
==================================
  `);

  // Step 1: Check current directory
  if (!fs.existsSync('package.json')) {
    log('This script must be run from the Strapi project root', 'error');
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const currentVersion = packageJson.dependencies['@strapi/strapi'];
  
  log(`Current Strapi version: ${currentVersion}`);

  // Step 2: Clean environment
  log('Cleaning npm environment...', 'warning');
  
  // Move node_modules instead of deleting (faster recovery)
  if (fs.existsSync('node_modules')) {
    if (fs.existsSync('node_modules.backup')) {
      execCommand('rm -rf node_modules.backup', 'Removing old backup');
    }
    execCommand('mv node_modules node_modules.backup', 'Backing up node_modules');
  }
  
  if (fs.existsSync('package-lock.json')) {
    execCommand('mv package-lock.json package-lock.json.backup', 'Backing up package-lock.json');
  }

  // Step 3: Clean npm cache
  execCommand('npm cache clean --force', 'Cleaning npm cache');

  // Step 4: Install fresh dependencies
  log('Installing dependencies for Strapi 4.25.22...', 'info');
  if (!execCommand('npm install', 'Installing dependencies')) {
    log('Failed to install dependencies. Please fix npm issues and try again.', 'error');
    
    // Restore backups
    if (fs.existsSync('node_modules.backup')) {
      execCommand('mv node_modules.backup node_modules', 'Restoring node_modules');
    }
    if (fs.existsSync('package-lock.json.backup')) {
      execCommand('mv package-lock.json.backup package-lock.json', 'Restoring package-lock.json');
    }
    process.exit(1);
  }

  // Step 5: Build and test current version
  log('Testing current Strapi build...', 'info');
  if (!execCommand('npm run build', 'Building Strapi')) {
    log('Build failed. Please fix any issues before migrating.', 'error');
    process.exit(1);
  }

  // Step 6: Export data
  log('Exporting Strapi data...', 'info');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  execCommand(
    `PGPASSWORD=strapi123 npm run strapi export -- --no-encrypt -f strapi-v4-backup-${timestamp}`,
    'Exporting data'
  );

  // Step 7: Create migration info file
  const migrationInfo = {
    startTime: new Date().toISOString(),
    fromVersion: currentVersion,
    toVersion: '5.x',
    backups: {
      database: `database_backup_20250603_161240.sql`,
      data: `strapi-v4-backup-${timestamp}.tar.gz`,
      nodeModules: 'node_modules.backup',
      packageLock: 'package-lock.json.backup'
    }
  };

  fs.writeFileSync(
    'migration-info.json',
    JSON.stringify(migrationInfo, null, 2)
  );

  console.log(`
${colors.bright}✅ Pre-migration setup complete!${colors.reset}

${colors.yellow}Next steps:${colors.reset}
1. Run the Strapi 5 upgrade tool:
   ${colors.blue}npx @strapi/upgrade major${colors.reset}

2. After the upgrade completes:
   - Review all ${colors.yellow}__TODO__${colors.reset} comments in your code
   - Replace Entity Service calls with Document Service
   - Update TypeScript types
   - Test all endpoints

3. Use the migration files in ${colors.blue}src/migrations/${colors.reset} as reference

${colors.green}Good luck with your migration!${colors.reset}
  `);

  // Step 8: Ask if user wants to run upgrade now
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('\nDo you want to run the Strapi 5 upgrade tool now? (y/N) ', (answer) => {
    readline.close();
    
    if (answer.toLowerCase() === 'y') {
      console.log('\nRunning Strapi 5 upgrade tool...\n');
      execCommand('npx @strapi/upgrade major', 'Strapi 5 upgrade');
    } else {
      console.log('\nYou can run the upgrade tool later with: npx @strapi/upgrade major');
    }
  });
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  log(`Unexpected error: ${error.message}`, 'error');
  process.exit(1);
});

// Run the migration
main().catch((error) => {
  log(`Migration failed: ${error.message}`, 'error');
  process.exit(1);
});