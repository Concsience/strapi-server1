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
    // Bootstrap temporarily disabled for debugging
    strapi.log.info('Bootstrap function disabled for debugging');
  },
};