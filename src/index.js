'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    // Ensure protected APIs are not accessible by public role
    try {
      // Get the public role
      const publicRole = await strapi
        .query('plugin::users-permissions.role')
        .findOne({ 
          where: { type: 'public' },
          populate: ['permissions']
        });

      if (!publicRole) {
        strapi.log.warn('Public role not found, skipping permission cleanup');
        return;
      }

      // Define APIs that should NOT be accessible by public users
      const protectedAPIs = [
        'api::cart.cart',
        'api::cart-item.cart-item',
        'api::order.order',
        'api::ordered-item.ordered-item',
        'api::stripe.stripe',
        'api::payment.payment',
        'api::wishlist.wishlist',
        'api::address.address'
      ];

      // Get all permissions for these APIs
      const permissions = await strapi
        .query('plugin::users-permissions.permission')
        .findMany({
          where: {
            role: publicRole.id,
            action: {
              $startsWith: protectedAPIs
            }
          }
        });

      // Disable all permissions for protected APIs in public role
      for (const permission of permissions) {
        // Check if this permission is for a protected API
        const isProtected = protectedAPIs.some(api => 
          permission.action.startsWith(api)
        );

        if (isProtected && permission.enabled) {
          await strapi
            .query('plugin::users-permissions.permission')
            .update({
              where: { id: permission.id },
              data: { enabled: false }
            });
          
          strapi.log.info(`Disabled public access to: ${permission.action}`);
        }
      }

      strapi.log.info('✅ Protected API permissions have been secured');

    } catch (error) {
      strapi.log.error('Error securing API permissions:', error);
    }
  },
};