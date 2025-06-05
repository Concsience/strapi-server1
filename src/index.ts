import type { Strapi } from '@strapi/strapi';

interface BootstrapContext {
  strapi: Strapi;
}

interface Permission {
  id: number;
  documentId: string;
  action: string;
  enabled: boolean;
  role: number;
}

interface Role {
  id: number;
  documentId: string;
  type: string;
  permissions?: Permission[];
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  register(/*{ strapi }: BootstrapContext*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: BootstrapContext): Promise<void> {
    // Ensure protected APIs are not accessible by public role
    try {
      // Get the public role using Strapi 5 Document Service
      const publicRoles = await strapi
        .documents('plugin::users-permissions.role')
        .findMany({
          filters: { type: 'public' },
          limit: 1
        });
      
      const publicRole: Role | null = publicRoles.length > 0 ? publicRoles[0] : null;

      if (!publicRole) {
        strapi.log.warn('Public role not found, skipping permission cleanup');
        return;
      }

      // Define APIs that should NOT be accessible by public users
      const protectedAPIs: string[] = [
        'api::cart.cart',
        'api::cart-item.cart-item',
        'api::order.order',
        'api::ordered-item.ordered-item',
        'api::stripe.stripe',
        'api::payment.payment',
        'api::wishlist.wishlist',
        'api::address.address'
      ];

      // Get all permissions for these APIs using Strapi 5 Document Service
      const permissions: Permission[] = await strapi
        .documents('plugin::users-permissions.permission')
        .findMany({
          filters: {
            role: publicRole.id,
            action: {
              $in: protectedAPIs.map(api => `${api}.find`)
                .concat(protectedAPIs.map(api => `${api}.findOne`))
                .concat(protectedAPIs.map(api => `${api}.create`))
                .concat(protectedAPIs.map(api => `${api}.update`))
                .concat(protectedAPIs.map(api => `${api}.delete`))
            }
          }
        });

      // Disable all permissions for protected APIs in public role
      for (const permission of permissions) {
        // Check if this permission is for a protected API
        const isProtected: boolean = protectedAPIs.some((api: string) => 
          permission.action.startsWith(api)
        );

        if (isProtected && permission.enabled) {
          await strapi
            .documents('plugin::users-permissions.permission')
            .update({
              documentId: permission.documentId,
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