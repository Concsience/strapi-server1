#!/usr/bin/env node

/**
 * Strapi 5 Migration Validation Script
 * 
 * This script validates that your Strapi 5 migration was successful
 * by checking various aspects of your application
 */

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

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function log(message, type = 'info') {
  const prefix = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`
  };
  
  console.log(`${prefix[type]} ${message}`);
  
  if (type === 'success') checks.passed++;
  if (type === 'error') checks.failed++;
  if (type === 'warning') checks.warnings++;
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`${description} found`, 'success');
    return true;
  } else {
    log(`${description} not found: ${filePath}`, 'error');
    return false;
  }
}

function checkPackageVersion(packageName, minVersion) {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const version = packageJson.dependencies[packageName] || packageJson.devDependencies[packageName];
    
    if (!version) {
      log(`${packageName} not found in dependencies`, 'error');
      return false;
    }
    
    // Simple version check (could be improved)
    const versionNumber = version.replace(/[\^~]/, '').split('.')[0];
    const minVersionNumber = minVersion.split('.')[0];
    
    if (parseInt(versionNumber) >= parseInt(minVersionNumber)) {
      log(`${packageName} version ${version} ✓`, 'success');
      return true;
    } else {
      log(`${packageName} version ${version} is below ${minVersion}`, 'error');
      return false;
    }
  } catch (error) {
    log(`Error checking ${packageName} version: ${error.message}`, 'error');
    return false;
  }
}

function findEntityServiceUsage() {
  const srcDir = path.join(process.cwd(), 'src');
  let found = false;
  
  function searchDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        searchDir(filePath);
      } else if (file.endsWith('.js') || file.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('entityService')) {
          log(`Entity Service usage found in: ${filePath.replace(process.cwd(), '.')}`, 'warning');
          found = true;
        }
      }
    }
  }
  
  try {
    searchDir(srcDir);
    if (!found) {
      log('No Entity Service usage found', 'success');
    }
  } catch (error) {
    log(`Error searching for Entity Service: ${error.message}`, 'error');
  }
}

function findTodoComments() {
  const srcDir = path.join(process.cwd(), 'src');
  let found = false;
  
  function searchDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        searchDir(filePath);
      } else if (file.endsWith('.js') || file.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('__TODO__')) {
          log(`TODO comment found in: ${filePath.replace(process.cwd(), '.')}`, 'warning');
          found = true;
        }
      }
    }
  }
  
  try {
    searchDir(srcDir);
    if (!found) {
      log('No __TODO__ comments found', 'success');
    }
  } catch (error) {
    log(`Error searching for TODO comments: ${error.message}`, 'error');
  }
}

async function main() {
  console.log(`
${colors.bright}🔍 Strapi 5 Migration Validator${colors.reset}
=================================
  `);

  // Check Strapi version
  console.log(`\n${colors.bright}Checking Strapi Version...${colors.reset}`);
  checkPackageVersion('@strapi/strapi', '5.0.0');
  checkPackageVersion('@strapi/plugin-users-permissions', '5.0.0');
  checkPackageVersion('@strapi/plugin-i18n', '5.0.0');

  // Check for migration artifacts
  console.log(`\n${colors.bright}Checking Migration Artifacts...${colors.reset}`);
  checkFile('migration-info.json', 'Migration info file');
  checkFile('node_modules.backup', 'Node modules backup');
  checkFile('package-lock.json.backup', 'Package lock backup');

  // Check for Entity Service usage
  console.log(`\n${colors.bright}Checking for Entity Service Usage...${colors.reset}`);
  findEntityServiceUsage();

  // Check for TODO comments
  console.log(`\n${colors.bright}Checking for TODO Comments...${colors.reset}`);
  findTodoComments();

  // Check TypeScript compilation
  console.log(`\n${colors.bright}Checking TypeScript...${colors.reset}`);
  try {
    const { execSync } = require('child_process');
    execSync('npm run ts:check', { stdio: 'pipe' });
    log('TypeScript compilation successful', 'success');
  } catch (error) {
    log('TypeScript compilation errors found', 'error');
  }

  // Check critical files
  console.log(`\n${colors.bright}Checking Critical Files...${colors.reset}`);
  checkFile('src/index.ts', 'Main entry point');
  checkFile('config/server.js', 'Server configuration');
  checkFile('config/database.js', 'Database configuration');
  checkFile('config/middlewares.js', 'Middleware configuration');

  // Summary
  console.log(`
${colors.bright}Validation Summary${colors.reset}
==================
${colors.green}✓ Passed:${colors.reset} ${checks.passed}
${colors.yellow}⚠ Warnings:${colors.reset} ${checks.warnings}
${colors.red}✗ Failed:${colors.reset} ${checks.failed}
  `);

  if (checks.failed === 0) {
    console.log(`${colors.green}${colors.bright}✨ Migration validation passed!${colors.reset}`);
    
    if (checks.warnings > 0) {
      console.log(`${colors.yellow}Please review the warnings above.${colors.reset}`);
    }
  } else {
    console.log(`${colors.red}${colors.bright}❌ Migration validation failed!${colors.reset}`);
    console.log(`Please fix the errors above before proceeding.`);
  }

  // Next steps
  console.log(`
${colors.bright}Next Steps:${colors.reset}
1. Fix any errors or warnings found above
2. Test your API endpoints thoroughly
3. Update your frontend to handle new response format
4. Run performance tests
5. Deploy to staging environment
  `);
}

// Run validation
main().catch((error) => {
  log(`Validation failed: ${error.message}`, 'error');
  process.exit(1);
});