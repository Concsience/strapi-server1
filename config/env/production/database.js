module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: env('DATABASE_HOST', '127.0.0.1'),
      port: env.int('DATABASE_PORT', 5432),
      database: env('DATABASE_NAME', 'strapi_conscience_prod'),
      user: env('DATABASE_USERNAME', 'strapi_prod'),
      password: env('DATABASE_PASSWORD'),
      ssl: env.bool('DATABASE_SSL', true) ? {
        rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', false),
      } : false,
    },
    // Connection Pool Configuration
    pool: {
      min: env.int('DATABASE_POOL_MIN', 2),
      max: env.int('DATABASE_POOL_MAX', 10),
      acquireTimeoutMillis: env.int('DATABASE_POOL_ACQUIRE_TIMEOUT', 30000),
      createTimeoutMillis: env.int('DATABASE_POOL_CREATE_TIMEOUT', 30000),
      destroyTimeoutMillis: env.int('DATABASE_POOL_DESTROY_TIMEOUT', 5000),
      idleTimeoutMillis: env.int('DATABASE_POOL_IDLE_TIMEOUT', 30000),
      reapIntervalMillis: env.int('DATABASE_POOL_REAP_INTERVAL', 1000),
      createRetryIntervalMillis: env.int('DATABASE_POOL_CREATE_RETRY_INTERVAL', 100),
    },
    // Performance Monitoring
    debug: env.bool('DATABASE_DEBUG', false),
    acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
  },
  // Migrations Configuration
  migrations: {
    directory: './database/migrations',
    tableName: 'strapi_migrations',
  },
  // Performance Optimizations
  settings: {
    forceMigration: false,
    runMigrations: true,
  },
});