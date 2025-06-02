/**
 * Strapi core type extensions and augmentations
 * This file extends the core Strapi types with our custom properties
 */

import '@strapi/strapi';
import { StrapiContext } from './index';

declare module '@strapi/strapi' {
  export interface Strapi {
    // Custom services
    service(uid: 'api::cart.cart'): {
      calculateTotal(cartId: string | number): Promise<number>;
      clearCart(cartId: string | number): Promise<void>;
      addItem(cartId: string | number, itemData: any): Promise<any>;
      removeItem(cartId: string | number, itemId: string | number): Promise<void>;
      updateItemQuantity(cartId: string | number, itemId: string | number, quantity: number): Promise<any>;
      getOrCreateCart(userId: number): Promise<any>;
      checkout(cartId: string | number, paymentIntentId?: string): Promise<any>;
    };
    
    service(uid: 'api::order.order'): {
      createFromCart(cartId: string | number, paymentIntentId?: string): Promise<any>;
      updatePaymentStatus(orderId: string | number, status: string): Promise<any>;
      fulfillOrder(orderId: string | number): Promise<any>;
      cancelOrder(orderId: string | number, reason?: string): Promise<any>;
    };

    service(uid: 'api::stripe.stripe'): {
      createPaymentIntent(amount: number, currency: string, metadata?: any): Promise<any>;
      confirmPayment(paymentIntentId: string): Promise<any>;
      refundPayment(paymentIntentId: string, amount?: number): Promise<any>;
    };

    // Custom middleware registry
    middleware(name: string): any;
    
    // Custom policy registry
    policy(name: string): any;
    
    // Enhanced config
    config: {
      get(key: string, defaultValue?: any): any;
      set(key: string, value: any): void;
      has(key: string): boolean;
      server: {
        host: string;
        port: number;
        url: string;
        app: {
          keys: string[];
        };
      };
      admin: {
        auth: {
          secret: string;
        };
      };
      database: {
        connection: {
          client: string;
          connection: any;
        };
      };
      plugin: Record<string, any>;
      api: Record<string, any>;
    };

    // Enhanced store for caching
    store(type: string): {
      get(key: string): Promise<any>;
      set(key: string, value: any, ttl?: number): Promise<void>;
      delete(key: string): Promise<void>;
      flush(): Promise<void>;
    };

    // Custom hooks
    hook(event: string): {
      register(fn: Function): void;
      delete(fn: Function): void;
      call(args?: any): Promise<void>;
    };

    // WebSocket support (if implemented)
    io?: any;

    // Redis client (if configured)
    redis?: any;

    // Email service
    plugins: {
      email?: {
        service(provider: string): {
          send(options: any): Promise<any>;
        };
      };
      upload?: {
        service(provider: string): {
          upload(file: any): Promise<any>;
          delete(file: any): Promise<any>;
        };
      };
      'users-permissions'?: {
        services: {
          user: {
            fetch(id: number): Promise<any>;
            fetchAll(params?: any): Promise<any[]>;
            create(data: any): Promise<any>;
            update(id: number, data: any): Promise<any>;
            delete(id: number): Promise<any>;
          };
          role: {
            find(params?: any): Promise<any[]>;
            findOne(id: number): Promise<any>;
          };
          jwt: {
            issue(payload: any): string;
            verify(token: string): any;
          };
        };
      };
    };

    // Entity Service with proper typing
    entityService: {
      findOne(uid: string, id: number | string, params?: any): Promise<any>;
      findMany(uid: string, params?: any): Promise<any[]>;
      create(uid: string, params: { data: any }): Promise<any>;
      update(uid: string, id: number | string, params: { data: any }): Promise<any>;
      delete(uid: string, id: number | string): Promise<any>;
      count(uid: string, params?: any): Promise<number>;
    };

    // Document Service (Strapi v5 style)
    documents(uid: string): {
      findOne(params: { documentId: string; populate?: any; fields?: string[] }): Promise<any>;
      findMany(params?: { filters?: any; populate?: any; sort?: any; pagination?: any }): Promise<{ results: any[]; pagination: any }>;
      create(params: { data: any; populate?: any }): Promise<any>;
      update(params: { documentId: string; data: any; populate?: any }): Promise<any>;
      delete(params: { documentId: string }): Promise<any>;
      count(params?: { filters?: any }): Promise<number>;
    };

    // Query Engine
    db: {
      query(uid: string): {
        findOne(params?: any): Promise<any>;
        findMany(params?: any): Promise<any[]>;
        findWithCount(params?: any): Promise<[any[], number]>;
        create(params: { data: any }): Promise<any>;
        createMany(params: { data: any[] }): Promise<{ count: number }>;
        update(params: { where: any; data: any }): Promise<any>;
        updateMany(params: { where: any; data: any }): Promise<{ count: number }>;
        delete(params: { where: any }): Promise<any>;
        deleteMany(params: { where: any }): Promise<{ count: number }>;
        count(params?: { where: any }): Promise<number>;
      };
      transaction<T>(fn: (trx: any) => Promise<T>): Promise<T>;
    };

    // Telemetry
    telemetry: {
      send(event: string, properties?: any): Promise<void>;
      isDisabled: boolean;
    };

    // Cron jobs
    cron: {
      add(rule: string, fn: () => void, options?: any): void;
      remove(name: string): void;
      jobs: Map<string, any>;
    };

    // Webhooks
    webhooks: {
      publish(event: string, data: any): Promise<void>;
      listeners: Map<string, any[]>;
    };

    // Admin API
    admin: {
      services: {
        permission: {
          find(params?: any): Promise<any[]>;
          findOne(id: number): Promise<any>;
          create(data: any): Promise<any>;
          update(id: number, data: any): Promise<any>;
          delete(id: number): Promise<any>;
        };
        role: {
          find(params?: any): Promise<any[]>;
          findOne(id: number): Promise<any>;
          create(data: any): Promise<any>;
          update(id: number, data: any): Promise<any>;
          delete(id: number): Promise<any>;
        };
        user: {
          find(params?: any): Promise<any[]>;
          findOne(id: number): Promise<any>;
          create(data: any): Promise<any>;
          update(id: number, data: any): Promise<any>;
          delete(id: number): Promise<any>;
        };
      };
    };
  }

  // Extend factories to accept our context type
  namespace factories {
    export function createCoreController(
      uid: string,
      cfg?: (params: { strapi: Strapi }) => Record<string, (ctx: StrapiContext) => Promise<void> | void>
    ): any;

    export function createCoreService(
      uid: string,
      cfg?: (params: { strapi: Strapi }) => Record<string, (...args: any[]) => any>
    ): any;

    export function createCoreRouter(
      uid: string,
      cfg?: any
    ): any;
  }
}