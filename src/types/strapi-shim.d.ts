/**
 * Temporary type declarations for @strapi/strapi
 * Until proper types are generated or npm is fixed
 */

declare module '@strapi/strapi' {
  export interface Strapi {
    log: {
      info: (message: string) => void;
      warn: (message: string) => void;
      error: (message: string, error?: any) => void;
      debug: (message: string) => void;
    };
    config: {
      get: (key: string, defaultValue?: any) => any;
    };
    service: (name: string) => any;
    controller: (name: string) => any;
    entityService: any;
    documents: (model: string) => any;
    plugin: (name: string) => any;
  }

  export const factories: {
    createCoreController: (model: string, implementation?: (params: { strapi: Strapi }) => any) => any;
    createCoreService: (model: string, implementation?: (params: { strapi: Strapi }) => any) => any;
    createCoreRouter: (model: string, config?: any) => any;
  };
}

declare module '@/types' {
  export * from '../index';
}