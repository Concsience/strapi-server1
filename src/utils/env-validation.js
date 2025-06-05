/**
 * Environment Validation Utility
 * Validates all required environment variables at startup
 * Prevents production failures due to missing configuration
 */

interface EnvironmentConfig {
  // Database
  DATABASE_URL?: string;
  DATABASE_CLIENT?: string;
  DATABASE_HOST?: string;
  DATABASE_PORT?: string;
  DATABASE_NAME?: string;
  DATABASE_USERNAME?: string;
  DATABASE_PASSWORD?: string;

  // Strapi Core
  APP_KEYS?: string;
  JWT_SECRET?: string;
  ADMIN_JWT_SECRET?: string;
  API_TOKEN_SALT?: string;
  TRANSFER_TOKEN_SALT?: string;

  // Server
  HOST?: string;
  PORT?: string;
  NODE_ENV?: string;
  SERVER_URL?: string;

  // Upload & Storage (OVH S3)
  STRAPI_UPLOAD_ACCESS_KEY_ID?: string;
  STRAPI_UPLOAD_SECRET_ACCESS_KEY?: string;
  STRAPI_UPLOAD_BUCKET?: string;
  STRAPI_UPLOAD_ENDPOINT?: string;
  STRAPI_UPLOAD_REGION?: string;
  STRAPI_UPLOAD_BASE_URL?: string;

  // Payment (Stripe)
  STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;

  // Email (Optional)
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USERNAME?: string;
  SMTP_PASSWORD?: string;

  // Redis (Optional but recommended)
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;
  REDIS_DB?: string;
  REDIS_KEY_PREFIX?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: Partial<EnvironmentConfig>;
}

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
function validateVariable(
  key: string, 
  value: string | undefined, 
  isRequired: boolean = false
): { isValid: boolean; error?: string; warning?: string } {
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
export function generateSecrets(): Partial<EnvironmentConfig> {
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
export function validateEnvironment(): ValidationResult {
  const config = process.env as EnvironmentConfig;
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = config.NODE_ENV === 'production';

  // Validate required production variables
  REQUIRED_PRODUCTION.forEach(key => {
    const result = validateVariable(key, config[key as keyof EnvironmentConfig], true);
    if (!result.isValid && result.error) {
      errors.push(result.error);
    }
    if (result.warning) {
      warnings.push(result.warning);
    }
  });

  // Validate upload configuration (critical for image handling)
  const hasUploadConfig = REQUIRED_UPLOAD.some(key => config[key as keyof EnvironmentConfig]);
  if (hasUploadConfig) {
    REQUIRED_UPLOAD.forEach(key => {
      const result = validateVariable(key, config[key as keyof EnvironmentConfig], true);
      if (!result.isValid && result.error) {
        errors.push(result.error);
      }
    });
  } else if (isProduction) {
    warnings.push('Upload configuration is incomplete - file uploads may not work properly');
  }

  // Validate payment configuration (critical for e-commerce)
  const hasPaymentConfig = REQUIRED_PAYMENT.some(key => config[key as keyof EnvironmentConfig]);
  if (hasPaymentConfig) {
    REQUIRED_PAYMENT.forEach(key => {
      const result = validateVariable(key, config[key as keyof EnvironmentConfig], true);
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
      if (!config[key as keyof EnvironmentConfig]) {
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
export function validateAndExit(): void {
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

/**
 * Runtime configuration object with validation
 */
export const envConfig = {
  get(key: keyof EnvironmentConfig, defaultValue?: string): string {
    const value = process.env[key] || defaultValue;
    if (!value) {
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    return value;
  },
  
  getOptional(key: keyof EnvironmentConfig, defaultValue?: string): string | undefined {
    return process.env[key] || defaultValue;
  },
  
  getNumber(key: keyof EnvironmentConfig, defaultValue?: number): number {
    const value = process.env[key];
    if (!value) {
      if (defaultValue !== undefined) return defaultValue;
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw new Error(`Environment variable ${key} must be a valid number`);
    }
    return num;
  },
  
  getBoolean(key: keyof EnvironmentConfig, defaultValue?: boolean): boolean {
    const value = process.env[key];
    if (!value) {
      if (defaultValue !== undefined) return defaultValue;
      return false;
    }
    return value.toLowerCase() === 'true';
  },
  
  getArray(key: keyof EnvironmentConfig, separator: string = ','): string[] {
    const value = process.env[key];
    if (!value) return [];
    return value.split(separator).map(item => item.trim()).filter(Boolean);
  },
};

export default {
  validateEnvironment,
  validateAndExit,
  generateSecrets,
  envConfig,
};