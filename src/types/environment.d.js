/**
 * Environment variable validation and startup checks
 * This module ensures all required environment variables are present
 */

export interface RequiredEnvVars {
  // Database
  DATABASE_CLIENT: string;
  DATABASE_HOST?: string;
  DATABASE_PORT?: string;
  DATABASE_NAME?: string;
  DATABASE_USERNAME?: string;
  DATABASE_PASSWORD?: string;
  DATABASE_URL?: string;
  
  // Security
  APP_KEYS: string;
  API_TOKEN_SALT: string;
  ADMIN_JWT_SECRET: string;
  JWT_SECRET: string;
  
  // Server
  HOST?: string;
  PORT?: string;
}

export interface OptionalEnvVars {
  // Stripe
  STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  
  // Storage
  OVH_ACCESS_KEY?: string;
  OVH_SECRET_KEY?: string;
  OVH_ENDPOINT?: string;
  OVH_BUCKET?: string;
  OVH_REGION?: string;
  
  // Redis
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;
  REDIS_DB?: string;
  
  // Email
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USERNAME?: string;
  SMTP_PASSWORD?: string;
}

/**
 * Validates that all required environment variables are set
 * @throws Error if any required variable is missing
 */
export function validateEnvironment(): void {
  const required: (keyof RequiredEnvVars)[] = [
    'DATABASE_CLIENT',
    'APP_KEYS',
    'API_TOKEN_SALT', 
    'ADMIN_JWT_SECRET',
    'JWT_SECRET'
  ];

  // Check database configuration
  if (process.env.DATABASE_CLIENT === 'postgres') {
    if (!process.env.DATABASE_URL) {
      // If no DATABASE_URL, require individual settings
      const dbRequired = ['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USERNAME', 'DATABASE_PASSWORD'];
      dbRequired.forEach(key => {
        if (!process.env[key]) {
          throw new Error(`Missing required environment variable: ${key}`);
        }
      });
    }
  }

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file or environment configuration.`
    );
  }

  // Validate specific formats
  if (process.env.APP_KEYS) {
    const keys = process.env.APP_KEYS.split(',');
    if (keys.length < 1 || keys.some(key => key.length < 32)) {
      throw new Error('APP_KEYS must contain at least one key of 32+ characters');
    }
  }

  // Warn about optional but recommended variables
  const warnings: string[] = [];
  
  if (!process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY && process.env.NODE_ENV === 'production') {
    warnings.push('STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY is not set - Stripe payments will not work');
  }

  if (!process.env.REDIS_HOST) {
    warnings.push('Redis configuration not found - rate limiting may use in-memory store');
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  }
}

/**
 * Gets an environment variable with type safety
 * @param key The environment variable key
 * @param defaultValue Optional default value
 * @returns The environment variable value or default
 */
export function getEnvVar<K extends keyof (RequiredEnvVars & OptionalEnvVars)>(
  key: K,
  defaultValue?: string
): string {
  return process.env[key] || defaultValue || '';
}

/**
 * Gets a required environment variable
 * @param key The environment variable key
 * @returns The environment variable value
 * @throws Error if the variable is not set
 */
export function getRequiredEnvVar<K extends keyof RequiredEnvVars>(key: K): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Checks if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Checks if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Checks if running in test
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}