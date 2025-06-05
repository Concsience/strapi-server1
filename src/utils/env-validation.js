/**
 * Environment Validation Utility (JavaScript Version)
 * Validates all required environment variables at startup
 * Prevents production failures due to missing configuration
 */

// Load environment variables from .env file
const path = require('path');
const fs = require('fs');

// Simple .env file loader
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').trim();
        // Only set if not already set
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    
    console.log('✅ Loaded environment variables from .env file');
  }
}

// Load environment variables at module initialization
loadEnvFile();

/**
 * Required environment variables for production
 */
const REQUIRED_PRODUCTION = [
  'DATABASE_URL',
  'APP_KEYS',
  'JWT_SECRET', 
  'ADMIN_JWT_SECRET',
  'API_TOKEN_SALT',
  'TRANSFER_TOKEN_SALT',
];

/**
 * Required for upload functionality
 */
const REQUIRED_UPLOAD = [
  'STRAPI_UPLOAD_ACCESS_KEY_ID',
  'STRAPI_UPLOAD_SECRET_ACCESS_KEY',
  'STRAPI_UPLOAD_BUCKET',
  'STRAPI_UPLOAD_ENDPOINT',
  'STRAPI_UPLOAD_REGION',
];

/**
 * Required for payment functionality
 */
const REQUIRED_PAYMENT = [
  'STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
];

/**
 * Recommended for production performance
 */
const RECOMMENDED_PRODUCTION = [
  'REDIS_HOST',
  'REDIS_PORT',
  'SERVER_URL',
  'STRIPE_WEBHOOK_SECRET',
];

/**
 * Security validation patterns
 */
const SECURITY_PATTERNS = {
  APP_KEYS: /^[a-zA-Z0-9+/]{32,}={0,2}(,[a-zA-Z0-9+/]{32,}={0,2})*$/,
  JWT_SECRET: /^[a-zA-Z0-9+/=]{32,}$/,
  STRIPE_SECRET: /^sk_(test|live)_[a-zA-Z0-9]{99,}$/,
  STRIPE_PUBLISHABLE: /^pk_(test|live)_[a-zA-Z0-9]{99,}$/,
};

/**
 * Validate a single environment variable
 */
function validateVariable(key, value, isRequired = false) {
  // Check if required variable is missing
  if (isRequired && !value) {
    return { 
      isValid: false, 
      error: `Required environment variable ${key} is missing` 
    };
  }

  // Skip validation if optional and not provided
  if (!value) {
    return { isValid: true };
  }

  // Security pattern validation
  if (key === 'APP_KEYS' && !SECURITY_PATTERNS.APP_KEYS.test(value)) {
    return {
      isValid: false,
      error: `${key} must be a comma-separated list of base64 strings (32+ chars each)`
    };
  }

  if (key === 'JWT_SECRET' && !SECURITY_PATTERNS.JWT_SECRET.test(value)) {
    return {
      isValid: false,
      error: `${key} must be a base64 string with at least 32 characters`
    };
  }

  if (key.includes('STRIPE_SECRET') && !SECURITY_PATTERNS.STRIPE_SECRET.test(value)) {
    return {
      isValid: false,
      error: `${key} must be a valid Stripe secret key (sk_test_... or sk_live_...)`
    };
  }

  if (key.includes('STRIPE_PUBLISHABLE') && !SECURITY_PATTERNS.STRIPE_PUBLISHABLE.test(value)) {
    return {
      isValid: false,
      error: `${key} must be a valid Stripe publishable key (pk_test_... or pk_live_...)`
    };
  }

  // Length validation for secrets
  if (key.includes('SECRET') && value.length < 32) {
    return {
      isValid: false,
      error: `${key} must be at least 32 characters long for security`
    };
  }

  // Port validation
  if (key.includes('PORT')) {
    const port = parseInt(value, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return {
        isValid: false,
        error: `${key} must be a valid port number (1-65535)`
      };
    }
  }

  // Database URL validation
  if (key === 'DATABASE_URL' && !value.startsWith('postgres://') && !value.startsWith('postgresql://')) {
    return {
      isValid: false,
      error: `${key} must be a valid PostgreSQL connection string`
    };
  }

  // Email validation
  if (key.includes('EMAIL') && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return {
      isValid: false,
      error: `${key} must be a valid email address`
    };
  }

  // URL validation
  if (key.includes('URL') && value && !value.startsWith('http')) {
    return {
      isValid: true,
      warning: `${key} should be a complete URL starting with http:// or https://`
    };
  }

  return { isValid: true };
}

/**
 * Generate secure random values for missing secrets
 */
function generateSecrets() {
  const crypto = require('crypto');
  
  return {
    JWT_SECRET: crypto.randomBytes(32).toString('base64'),
    ADMIN_JWT_SECRET: crypto.randomBytes(32).toString('base64'),
    API_TOKEN_SALT: crypto.randomBytes(16).toString('base64'),
    TRANSFER_TOKEN_SALT: crypto.randomBytes(16).toString('base64'),
    APP_KEYS: [
      crypto.randomBytes(32).toString('base64'),
      crypto.randomBytes(32).toString('base64'),
    ].join(','),
  };
}

/**
 * Main environment validation function
 */
function validateEnvironment() {
  const config = process.env;
  const errors = [];
  const warnings = [];
  const isProduction = config.NODE_ENV === 'production';

  // Validate required production variables
  REQUIRED_PRODUCTION.forEach(key => {
    // Special handling for DATABASE_URL - allow individual components as alternative
    if (key === 'DATABASE_URL') {
      const hasDbUrl = config.DATABASE_URL;
      const hasDbComponents = config.DATABASE_HOST && config.DATABASE_NAME && config.DATABASE_USERNAME;
      
      if (!hasDbUrl && !hasDbComponents) {
        errors.push('Database configuration missing - provide either DATABASE_URL or individual DB components (HOST, NAME, USERNAME)');
        return;
      }
      
      if (hasDbUrl) {
        const result = validateVariable(key, config[key], true);
        if (!result.isValid && result.error) {
          errors.push(result.error);
        }
      }
      
      return;
    }
    
    const result = validateVariable(key, config[key], true);
    if (!result.isValid && result.error) {
      errors.push(result.error);
    }
    if (result.warning) {
      warnings.push(result.warning);
    }
  });

  // Validate upload configuration (critical for image handling)
  const hasUploadConfig = REQUIRED_UPLOAD.some(key => config[key]);
  if (hasUploadConfig) {
    REQUIRED_UPLOAD.forEach(key => {
      const result = validateVariable(key, config[key], true);
      if (!result.isValid && result.error) {
        errors.push(result.error);
      }
    });
  } else if (isProduction) {
    warnings.push('Upload configuration is incomplete - file uploads may not work properly');
  }

  // Validate payment configuration (critical for e-commerce)
  const hasPaymentConfig = REQUIRED_PAYMENT.some(key => config[key]);
  if (hasPaymentConfig) {
    REQUIRED_PAYMENT.forEach(key => {
      const result = validateVariable(key, config[key], true);
      if (!result.isValid && result.error) {
        errors.push(result.error);
      }
    });
  } else if (isProduction) {
    warnings.push('Payment configuration is incomplete - Stripe payments will not work');
  }

  // Validate recommended production variables
  if (isProduction) {
    RECOMMENDED_PRODUCTION.forEach(key => {
      if (!config[key]) {
        warnings.push(`Recommended production variable ${key} is missing`);
      }
    });
  }

  // Security warnings
  if (isProduction) {
    if (config.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY?.includes('test')) {
      warnings.push('Using Stripe test keys in production environment');
    }
    
    if (!config.SERVER_URL) {
      warnings.push('SERVER_URL should be set for proper URL generation in production');
    }
    
    if (!config.REDIS_HOST) {
      warnings.push('Redis is not configured - this will impact caching and rate limiting performance');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config,
  };
}

/**
 * Check environment and exit if critical errors exist
 */
function validateAndExit() {
  const result = validateEnvironment();
  
  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment Warnings:');
    result.warnings.forEach(warning => console.warn(`   ${warning}`));
    console.warn('');
  }

  if (!result.isValid) {
    console.error('❌ Environment Validation Failed:');
    result.errors.forEach(error => console.error(`   ${error}`));
    console.error('');
    console.error('Please fix the above errors before starting the application.');
    console.error('');
    
    // Generate example values for missing secrets
    const secrets = generateSecrets();
    console.error('Example generated secrets:');
    Object.entries(secrets).forEach(([key, value]) => {
      console.error(`${key}=${value}`);
    });
    
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
  if (result.warnings.length === 0) {
    console.log('   All required variables are properly configured');
  }
  console.log('');
}

module.exports = {
  validateEnvironment,
  validateAndExit,
  generateSecrets,
};