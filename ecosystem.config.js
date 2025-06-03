module.exports = {
  apps: [{
    name: 'artedusa-strapi',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/artedusa-strapi',
    instances: 2, // Cluster mode with 2 instances
    exec_mode: 'cluster',
    instance_var: 'INSTANCE_ID',
    env: {
      NODE_ENV: 'development',
      PORT: 1337,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 1337,
    },
    // Process management
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    autorestart: true,
    // Monitoring
    error_file: '/var/log/pm2/artedusa-strapi-error.log',
    out_file: '/var/log/pm2/artedusa-strapi-out.log',
    log_file: '/var/log/pm2/artedusa-strapi-combined.log',
    time: true,
    merge_logs: true,
    // Advanced features
    watch: false, // Don't watch in production
    ignore_watch: ['node_modules', '.tmp', '.cache', 'public/uploads'],
    watch_delay: 1000,
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: true,
  }],

  deploy: {
    production: {
      user: 'deploy',
      host: ['api.artedusa.com'],
      ref: 'origin/main',
      repo: 'git@github.com:YOUR_USERNAME/strapi-server1.git',
      path: '/var/www/artedusa-strapi',
      'pre-deploy': 'git fetch --all',
      'post-deploy': 'npm ci --production && NODE_ENV=production npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'sudo apt update && sudo apt install -y nodejs npm postgresql redis-server nginx',
      env: {
        NODE_ENV: 'production',
      },
    },
    staging: {
      user: 'deploy',
      host: ['staging-api.artedusa.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:YOUR_USERNAME/strapi-server1.git',
      path: '/var/www/artedusa-strapi-staging',
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
      },
    },
  },
};