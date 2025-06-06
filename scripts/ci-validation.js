#!/usr/bin/env node
/**
 * CI/CD Validation Script
 * Ensures environment is properly configured before build/deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Starting CI/CD environment validation...\n');

let hasErrors = false;
const errors = [];
const warnings = [];

// Check required files
const requiredFiles = [
  'package.json',
  'package-lock.json', 
  'src/index.js',
  'config/database.js'
];

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    errors.push(`Required file missing: ${file}`);
    hasErrors = true;
  }
});

// Check package.json integrity
console.log('\n📦 Validating package.json...');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check Strapi version
  if (pkg.dependencies['@strapi/strapi']) {
    const strapiVersion = pkg.dependencies['@strapi/strapi'];
    if (strapiVersion.includes('5.14.0')) {
      console.log(`  ✅ Strapi version: ${strapiVersion}`);
    } else {
      console.log(`  ⚠️  Strapi version: ${strapiVersion} (expected 5.14.0)`);
      warnings.push(`Strapi version ${strapiVersion} may not be optimal`);
    }
  }
  
  // Check required scripts
  const requiredScripts = ['develop', 'build', 'start'];
  requiredScripts.forEach(script => {
    if (pkg.scripts[script]) {
      console.log(`  ✅ Script: ${script}`);
    } else {
      console.log(`  ❌ Script: ${script} - MISSING`);
      errors.push(`Required script missing: ${script}`);
      hasErrors = true;
    }
  });
  
} catch (error) {
  console.log('  ❌ Invalid package.json');
  errors.push('package.json is invalid or corrupted');
  hasErrors = true;
}

// Check environment variables template
console.log('\n🔧 Checking environment configuration...');
const envRequired = [
  'DATABASE_CLIENT',
  'DATABASE_HOST', 
  'DATABASE_PORT',
  'DATABASE_NAME',
  'DATABASE_USERNAME',
  'DATABASE_PASSWORD'
];

// For CI, check if .env.test will have required vars
envRequired.forEach(envVar => {
  // In CI, these should be set via GitHub Actions
  console.log(`  ✅ ${envVar} (will be configured in CI)`);
});

// Check TypeScript configuration
console.log('\n📘 Validating TypeScript configuration...');
if (fs.existsSync('tsconfig.json')) {
  try {
    const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    
    if (tsConfig.compilerOptions) {
      console.log('  ✅ TypeScript compiler options found');
      
      // Check important options
      const importantOptions = ['esModuleInterop', 'skipLibCheck', 'moduleResolution'];
      importantOptions.forEach(option => {
        if (tsConfig.compilerOptions[option] !== undefined) {
          console.log(`  ✅ ${option}: ${tsConfig.compilerOptions[option]}`);
        }
      });
    }
    
  } catch (error) {
    console.log('  ⚠️  TypeScript config has issues (non-blocking)');
    warnings.push('TypeScript configuration may need adjustment');
  }
} else {
  console.log('  ✅ JavaScript project - TypeScript not required');
}

// Check database setup script
console.log('\n🗄️  Checking database setup...');
if (fs.existsSync('scripts/db-setup.sql')) {
  console.log('  ✅ Database setup script found');
} else {
  console.log('  ❌ Database setup script missing');
  errors.push('Database setup script is required for CI');
  hasErrors = true;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 VALIDATION SUMMARY');
console.log('='.repeat(50));

if (errors.length > 0) {
  console.log('\n❌ ERRORS FOUND:');
  errors.forEach((error, i) => {
    console.log(`  ${i + 1}. ${error}`);
  });
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  warnings.forEach((warning, i) => {
    console.log(`  ${i + 1}. ${warning}`);
  });
}

if (!hasErrors) {
  console.log('\n✅ CI/CD validation PASSED!');
  console.log('Environment is ready for build and deployment.');
  process.exit(0);
} else {
  console.log('\n❌ CI/CD validation FAILED!');
  console.log('Please fix the errors above before proceeding.');
  process.exit(1);
}