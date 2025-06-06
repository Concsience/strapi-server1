const path = require('path');

module.exports = ({ env }) => {
  // Check if we're in CI/test environment
  const isCI = env.bool('CI', false) || env('NODE_ENV') === 'test';
  const isProduction = env('NODE_ENV') === 'production';
  
  // Use SQLite for CI if PostgreSQL is not properly configured
  const client = env('DATABASE_CLIENT', isCI && !env('DATABASE_HOST') ? 'sqlite' : 'postgres');

  const connections = {
    postgres: {
      connection: {
        connectionString: env('DATABASE_URL'),
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'strapi_conscience'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi123'),
        ssl: env.bool('DATABASE_SSL', false) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: {
        // CI/Test environment needs smaller pool to avoid timeouts
        min: env.int('DATABASE_POOL_MIN', isCI ? 0 : 2),
        max: env.int('DATABASE_POOL_MAX', isCI ? 5 : 10),
        // Longer timeouts for CI environment
        idleTimeoutMillis: env.int('DATABASE_POOL_IDLE_TIMEOUT', isCI ? 60000 : 30000),
        createTimeoutMillis: env.int('DATABASE_POOL_CREATE_TIMEOUT', isCI ? 60000 : 30000),
        acquireTimeoutMillis: env.int('DATABASE_POOL_ACQUIRE_TIMEOUT', isCI ? 60000 : 30000),
        propagateCreateError: false, // Don't crash on connection error
        // CI-specific: retry connection
        reapIntervalMillis: env.int('DATABASE_REAP_INTERVAL', 1000),
        createRetryIntervalMillis: env.int('DATABASE_RETRY_INTERVAL', 200),
      },
      // More lenient timeout for CI
      debug: env.bool('DATABASE_DEBUG', false),
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', isCI ? 120000 : 60000),
    },
    sqlite: {
      connection: {
        filename: path.join(
          __dirname,
          '..',
          env('DATABASE_FILENAME', path.join('.tmp', 'data.db'))
        ),
      },
      useNullAsDefault: true,
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      // Additional production settings (but not for CI)
      ...(isProduction && !isCI && {
        pool: {
          ...connections[client].pool,
          // More aggressive pooling in production
          min: env.int('DATABASE_POOL_MIN', 5),
          max: env.int('DATABASE_POOL_MAX', 20),
        },
      }),
    },
  };
};