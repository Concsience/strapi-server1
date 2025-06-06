module.exports = (plugin) => {
  // Configure default permissions for CI testing
  const originalBootstrap = plugin.bootstrap;
  
  plugin.bootstrap = async ({ strapi }) => {
    // Call original bootstrap if it exists
    if (originalBootstrap) {
      await originalBootstrap({ strapi });
    }

    // Set public permissions for API testing in CI
    if (process.env.CI || process.env.NODE_ENV === 'test') {
      try {
        // Find the public role
        const publicRole = await strapi.query('plugin::users-permissions.role').findOne({
          where: { type: 'public' }
        });

        if (publicRole) {
          // Set permissions for artists-work API
          await strapi.query('plugin::users-permissions.permission').createMany({
            data: [
              {
                action: 'api::artists-work.artists-work.find',
                role: publicRole.id,
                enabled: true
              },
              {
                action: 'api::artists-work.artists-work.findOne', 
                role: publicRole.id,
                enabled: true
              },
              {
                action: 'api::cart.cart.create',
                role: publicRole.id,
                enabled: true
              }
            ]
          });

          strapi.log.info('Public permissions set for API testing');
        }
      } catch (error) {
        strapi.log.warn('Could not set public permissions:', error.message);
      }
    }
  };

  return plugin;
};