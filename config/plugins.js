// ./config/plugins.js
module.exports = ({
  env
}) => ({
  'users-permissions': {
    enabled: true,
    config: {
      jwtSecret: env('JWT_SECRET'),
    },
  },
  // Upload temporarily disabled for testing core functionality
  // TODO: Re-enable with proper OVH S3 configuration once core is verified
  // Email temporarily disabled for testing core functionality
  // TODO: Re-enable with proper SMTP configuration once core is verified
});