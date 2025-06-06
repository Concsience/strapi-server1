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
          // Find the authenticated role
          const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
            where: { type: 'authenticated' }
          });

          // Set permissions for content-type APIs and authentication (public access)
          const publicPermissions = [
            'api::artists-work.artists-work.find',
            'api::artists-work.artists-work.findOne',
            'api::cart.cart.create',
            'plugin::users-permissions.auth.register',
            'plugin::users-permissions.auth.login',
            'plugin::users-permissions.auth.callback'
          ];

          for (const action of publicPermissions) {
            try {
              // Check if permission already exists
              const existingPermission = await strapi.query('plugin::users-permissions.permission').findOne({
                where: { action, role: publicRole.id }
              });

              if (!existingPermission) {
                await strapi.query('plugin::users-permissions.permission').create({
                  data: {
                    action,
                    role: publicRole.id,
                    enabled: true
                  }
                });
                strapi.log.info(`✅ Created public permission: ${action}`);
              } else {
                // Update existing permission to ensure it's enabled
                await strapi.query('plugin::users-permissions.permission').update({
                  where: { id: existingPermission.id },
                  data: { enabled: true }
                });
                strapi.log.info(`✅ Updated public permission: ${action}`);
              }
            } catch (permError) {
              strapi.log.warn(`Could not create/update permission ${action}:`, permError.message);
            }
          }

          // Set authenticated user permissions  
          if (authenticatedRole) {
            const authenticatedPermissions = [
              'plugin::users-permissions.user.me',
              'api::cart.cart.find',
              'api::cart.cart.update'
            ];

            for (const action of authenticatedPermissions) {
              try {
                // Check if permission already exists
                const existingPermission = await strapi.query('plugin::users-permissions.permission').findOne({
                  where: { action, role: authenticatedRole.id }
                });

                if (!existingPermission) {
                  await strapi.query('plugin::users-permissions.permission').create({
                    data: {
                      action,
                      role: authenticatedRole.id,
                      enabled: true
                    }
                  });
                  strapi.log.info(`✅ Created authenticated permission: ${action}`);
                } else {
                  // Update existing permission to ensure it's enabled
                  await strapi.query('plugin::users-permissions.permission').update({
                    where: { id: existingPermission.id },
                    data: { enabled: true }
                  });
                  strapi.log.info(`✅ Updated authenticated permission: ${action}`);
                }
              } catch (permError) {
                strapi.log.warn(`Could not create/update authenticated permission ${action}:`, permError.message);
              }
            }
          }

          strapi.log.info('Authentication and API permissions set for testing');
        }
      } catch (error) {
        strapi.log.warn('Could not set public permissions:', error.message);
      }
    }
  };

  return plugin;
};