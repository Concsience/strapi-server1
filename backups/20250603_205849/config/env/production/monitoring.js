module.exports = ({ env }) => ({
  // Sentry Error Tracking
  sentry: {
    enabled: !!env('SENTRY_DSN'),
    dsn: env('SENTRY_DSN'),
    environment: env('SENTRY_ENVIRONMENT', 'production'),
    serverName: env('SERVER_NAME', 'artedusa-api'),
    sampleRate: 1.0,
    tracesSampleRate: env.float('SENTRY_TRACES_SAMPLE_RATE', 0.1),
    attachStacktrace: true,
    // Performance monitoring
    profilesSampleRate: 0.1,
    // Integrations
    integrations: [
      'Http',
      'Express',
      'Postgres',
      'Redis',
    ],
    // Request data
    requestDataOptions: {
      include: {
        headers: true,
        cookies: false, // Privacy
        query_string: true,
        data: true,
        user: {
          id: true,
          email: false, // Privacy
        },
      },
    },
    // Before send hook for filtering
    beforeSend: (event, hint) => {
      // Filter out specific errors
      if (event.exception?.values?.[0]?.type === 'RateLimitError') {
        return null; // Don't send rate limit errors
      }
      
      // Remove sensitive data
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      
      return event;
    },
  },

  // Application Performance Monitoring
  apm: {
    enabled: true,
    serviceName: 'artedusa-strapi',
    serverUrl: env('APM_SERVER_URL'),
    secretToken: env('APM_SECRET_TOKEN'),
    environment: 'production',
    active: true,
    captureBody: 'all',
    captureHeaders: true,
    captureErrorLogStackTraces: 'always',
    transactionSampleRate: 0.1,
    // Metrics
    metricsInterval: '30s',
    breakdownMetrics: true,
    // Filtering
    ignoreUrls: [
      '/_health',
      '/favicon.ico',
      '/robots.txt',
    ],
    // Custom context
    addLabels: {
      region: env('DEPLOYMENT_REGION', 'eu-west'),
      version: env('APP_VERSION', '1.0.0'),
    },
  },

  // Database Query Monitoring
  database: {
    logSlowQueries: true,
    slowQueryThreshold: env.int('DATABASE_SLOW_QUERY_THRESHOLD', 1000),
    explainSlowQueries: true,
    logQueryStats: true,
    // Alert thresholds
    alerts: {
      connectionPoolExhaustion: 0.8, // Alert when 80% of connections used
      slowQueryCount: 10, // Alert after 10 slow queries in 5 minutes
      failedQueryRate: 0.05, // Alert if 5% of queries fail
    },
  },

  // Redis Monitoring
  redis: {
    logCommands: false, // Too verbose for production
    logErrors: true,
    // Metrics to track
    metrics: [
      'connected_clients',
      'used_memory',
      'hit_rate',
      'evicted_keys',
      'keyspace_hits',
      'keyspace_misses',
    ],
    // Alert thresholds
    alerts: {
      memoryUsage: 0.8, // Alert at 80% memory usage
      hitRate: 0.5, // Alert if hit rate drops below 50%
      connectionFailures: 5, // Alert after 5 connection failures
    },
  },

  // Custom Metrics
  metrics: {
    // API Performance
    api: {
      responseTime: {
        histogram: true,
        buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
      },
      requestRate: {
        interval: 60, // Per minute
      },
      errorRate: {
        interval: 60,
        threshold: 0.01, // Alert if error rate > 1%
      },
    },
    // Business Metrics
    business: {
      ordersPerHour: true,
      cartAbandonmentRate: true,
      averageOrderValue: true,
      productViewsPerHour: true,
      checkoutConversionRate: true,
    },
  },

  // Health Checks
  healthCheck: {
    enabled: true,
    path: '/_health',
    // Services to check
    checks: {
      database: {
        enabled: true,
        timeout: 5000,
      },
      redis: {
        enabled: true,
        timeout: 3000,
      },
      s3: {
        enabled: true,
        timeout: 10000,
      },
      stripe: {
        enabled: true,
        timeout: 5000,
      },
    },
    // Response format
    detailed: env.bool('HEALTH_CHECK_DETAILED', false),
  },

  // Logging Configuration
  logging: {
    level: env('LOG_LEVEL', 'warn'),
    format: 'json',
    // Structured logging
    fields: {
      app: 'artedusa-strapi',
      environment: 'production',
      version: env('APP_VERSION', '1.0.0'),
      region: env('DEPLOYMENT_REGION', 'eu-west'),
    },
    // Log destinations
    transports: [
      {
        type: 'console',
        level: 'warn',
      },
      {
        type: 'file',
        level: 'info',
        filename: '/var/log/strapi/app.log',
        maxsize: 104857600, // 100MB
        maxFiles: 10,
        tailable: true,
      },
      {
        type: 'syslog',
        level: 'error',
        host: env('SYSLOG_HOST'),
        port: env.int('SYSLOG_PORT', 514),
      },
    ],
  },

  // Alerts Configuration
  alerts: {
    enabled: true,
    channels: {
      email: {
        enabled: true,
        recipients: env.array('ALERT_EMAIL_RECIPIENTS', ['devops@artedusa.com']),
        smtp: {
          host: env('SMTP_HOST'),
          port: env.int('SMTP_PORT', 465),
          secure: true,
          auth: {
            user: env('SMTP_USERNAME'),
            pass: env('SMTP_PASSWORD'),
          },
        },
      },
      slack: {
        enabled: !!env('SLACK_WEBHOOK_URL'),
        webhookUrl: env('SLACK_WEBHOOK_URL'),
        channel: '#alerts',
        username: 'Strapi Monitor',
      },
      pagerduty: {
        enabled: !!env('PAGERDUTY_INTEGRATION_KEY'),
        integrationKey: env('PAGERDUTY_INTEGRATION_KEY'),
        severity: 'critical',
      },
    },
    // Alert rules
    rules: [
      {
        name: 'High Error Rate',
        condition: 'errorRate > 0.05',
        severity: 'critical',
        channels: ['email', 'slack', 'pagerduty'],
      },
      {
        name: 'Slow Response Time',
        condition: 'avgResponseTime > 1000',
        severity: 'warning',
        channels: ['slack'],
      },
      {
        name: 'Database Connection Pool Exhausted',
        condition: 'dbConnectionsUsed / dbConnectionsTotal > 0.9',
        severity: 'critical',
        channels: ['email', 'pagerduty'],
      },
      {
        name: 'High Memory Usage',
        condition: 'memoryUsage > 0.85',
        severity: 'warning',
        channels: ['slack'],
      },
      {
        name: 'Redis Connection Failed',
        condition: 'redisConnected === false',
        severity: 'critical',
        channels: ['email', 'slack', 'pagerduty'],
      },
    ],
  },
});