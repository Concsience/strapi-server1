const path = require('path');

module.exports = ({ env }) => {
  const client = env('DATABASE_CLIENT', 'postgres');

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
        min: env.int('DATABASE_POOL_MIN', 2),
        max: env.int('DATABASE_POOL_MAX', 10),
        // Production optimizations
        idleTimeoutMillis: env.int('DATABASE_POOL_IDLE_TIMEOUT', 30000),
        createTimeoutMillis: env.int('DATABASE_POOL_CREATE_TIMEOUT', 30000),
        acquireTimeoutMillis: env.int('DATABASE_POOL_ACQUIRE_TIMEOUT', 30000),
        propagateCreateError: false, // Don't crash on connection error
      },
      // Production settings
      debug: env.bool('DATABASE_DEBUG', false),
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
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
      // Additional production settings
      ...(env('NODE_ENV') === 'production' && {
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