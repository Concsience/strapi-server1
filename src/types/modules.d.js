/**
 * Module declarations for third-party packages
 * Required for TypeScript to recognize these modules
 */

// Strapi utils module declaration
declare module '@strapi/utils' {
  export const errors: {
    ValidationError: new (message: string, details?: any) => Error;
    ApplicationError: new (message: string, details?: any) => Error;
    NotFoundError: new (message: string, details?: any) => Error;
    ForbiddenError: new (message: string, details?: any) => Error;
    UnauthorizedError: new (message: string, details?: any) => Error;
    PayloadTooLargeError: new (message: string, details?: any) => Error;
    RateLimitError: new (message: string, details?: any) => Error;
  };
  
  export const yup: any;
  export const parseMultipartData: (ctx: any) => { data: any; files: any };
  export const sanitize: {
    contentAPI: {
      input: (data: any, schema: any, auth: any) => any;
      output: (data: any, schema: any, auth: any) => any;
    };
  };
}

// Make sure all modules are properly declared
declare module 'axios' {
  export interface AxiosRequestConfig {
    method?: string;
    url?: string;
    data?: any;
    headers?: Record<string, string>;
    timeout?: number;
  }

  export interface AxiosResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: any;
  }

  export interface AxiosStatic {
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  }

  const axios: AxiosStatic;
  export default axios;
}

// Stripe module is already declared in strapi-v5.d.ts
// But we need to ensure it's properly exported
declare module 'stripe' {
  interface Stripe {
    paymentIntents: {
      create(params: any): Promise<any>;
      confirm(id: string, params?: any): Promise<any>;
      retrieve(id: string): Promise<any>;
      update(id: string, params: any): Promise<any>;
      cancel(id: string): Promise<any>;
    };
    customers: {
      create(params: any): Promise<any>;
      retrieve(id: string): Promise<any>;
      update(id: string, params: any): Promise<any>;
    };
    paymentMethods: {
      attach(id: string, params: any): Promise<any>;
    };
    webhookEndpoints: {
      create(params: any): Promise<any>;
    };
    webhooks: {
      constructEvent(payload: string | Buffer, header: string, secret: string): any;
    };
  }

  class Stripe {
    constructor(apiKey: string, config?: any);
  }

  export = Stripe;
}

// Axios is already declared in strapi-v5.d.ts

// IORedis module declaration
declare module 'ioredis' {
  export interface RedisOptions {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    retryStrategy?: (times: number) => number | void;
    enableReadyCheck?: boolean;
    maxRetriesPerRequest?: number;
  }

  export default class Redis {
    constructor(options?: RedisOptions);
    
    get(key: string): Promise<string | null>;
    set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'>;
    setex(key: string, seconds: number, value: string): Promise<'OK'>;
    del(...keys: string[]): Promise<number>;
    exists(...keys: string[]): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    ttl(key: string): Promise<number>;
    incr(key: string): Promise<number>;
    decr(key: string): Promise<number>;
    hget(key: string, field: string): Promise<string | null>;
    hset(key: string, field: string, value: string): Promise<number>;
    hdel(key: string, ...fields: string[]): Promise<number>;
    hgetall(key: string): Promise<Record<string, string>>;
    keys(pattern: string): Promise<string[]>;
    flushdb(): Promise<'OK'>;
    ping(): Promise<'PONG'>;
    quit(): Promise<'OK'>;
    on(event: string, listener: (...args: any[]) => void): this;
  }
}

// Global Strapi object declaration
declare global {
  const strapi: import('@strapi/strapi').Strapi;
}

export {};