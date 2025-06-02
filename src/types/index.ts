/**
 * Core TypeScript type definitions for Strapi E-commerce Backend
 * These types provide strong typing across the entire application
 */

import { Context } from 'koa';
import { Strapi } from '@strapi/strapi';

/**
 * Extended Koa Context with Strapi-specific properties
 */
export interface StrapiContext extends Context {
  strapi: Strapi;
  state: {
    user?: {
      id: number;
      email: string;
      username: string;
      provider: string;
      confirmed: boolean;
      blocked: boolean;
      role: {
        id: number;
        name: string;
        type: string;
      };
    };
    auth?: {
      strategy: {
        name: string;
        credentials: any;
      };
      credentials: any;
    };
    route?: {
      endpoint: string;
      controller: string;
      action: string;
      plugin?: string;
    };
    requestId?: string;
    rateLimit?: any;
  };
  params: Record<string, string>;
  query: Record<string, any>;
  request: Context['request'] & {
    body: any;
    files?: any;
  };
}

/**
 * Standard API Response wrapper
 */
export interface ApiResponse<T = any> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
    [key: string]: any;
  };
}

/**
 * Standard API Error response
 */
export interface ApiError {
  error: {
    status: number;
    name: string;
    message: string;
    details?: any;
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sort?: string | string[];
  filters?: Record<string, any>;
  populate?: string | string[] | Record<string, any>;
  fields?: string[];
  publicationState?: 'live' | 'preview';
  locale?: string;
}

/**
 * Base entity with common fields
 */
export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  locale?: string;
}

/**
 * E-commerce specific types
 */

export interface PriceData {
  amount: number;
  currency: string;
  formatted?: string;
}

export interface CartItemData {
  id: number;
  quantity: number;
  price: number;
  total_price: number;
  art: {
    id: number;
    title: string;
    slug: string;
    price: number;
    images?: Array<{
      url: string;
      alternativeText?: string;
    }>;
  };
  paper_type?: {
    id: number;
    name: string;
    price_multiplier: number;
  };
}

export interface CartData {
  id: number;
  total_price: number;
  status: 'active' | 'abandoned' | 'completed';
  cart_items: CartItemData[];
  user: {
    id: number;
    email: string;
  };
}

export interface OrderData {
  id: number;
  order_number: string;
  total_price: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_intent_id?: string;
  ordered_items: Array<{
    id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    art: any;
  }>;
  shipping_address?: any;
  billing_address?: any;
  user: {
    id: number;
    email: string;
  };
}

/**
 * Stripe-specific types
 */
export interface CreatePaymentIntentRequest {
  amount: number;
  currency?: string;
  orderId?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
}

/**
 * Service method types
 */
export interface ServiceMethods {
  find(params?: PaginationParams): Promise<{ results: any[]; pagination: any }>;
  findOne(id: number | string, params?: any): Promise<any>;
  create(data: any): Promise<any>;
  update(id: number | string, data: any): Promise<any>;
  delete(id: number | string): Promise<any>;
}

/**
 * Controller decorator for type safety
 */
export type ControllerAction = (ctx: StrapiContext) => Promise<void> | void;

export interface ControllerMethods {
  [key: string]: ControllerAction;
}

/**
 * Middleware type
 */
export type StrapiMiddleware = (
  ctx: StrapiContext,
  next: () => Promise<void>
) => Promise<void> | void;

/**
 * Policy type
 */
export type StrapiPolicy = (
  ctx: StrapiContext,
  config: any,
  { strapi }: { strapi: Strapi }
) => Promise<boolean> | boolean;

/**
 * Lifecycle hook types
 */
export interface LifecycleEvent {
  action: string;
  model: any;
  params: {
    data?: any;
    where?: any;
    select?: any;
    populate?: any;
    orderBy?: any;
    limit?: number;
    offset?: number;
  };
  result?: any;
  state: any;
}

export interface LifecycleHooks {
  beforeCreate?: (event: LifecycleEvent) => Promise<void> | void;
  afterCreate?: (event: LifecycleEvent) => Promise<void> | void;
  beforeUpdate?: (event: LifecycleEvent) => Promise<void> | void;
  afterUpdate?: (event: LifecycleEvent) => Promise<void> | void;
  beforeDelete?: (event: LifecycleEvent) => Promise<void> | void;
  afterDelete?: (event: LifecycleEvent) => Promise<void> | void;
  beforeFind?: (event: LifecycleEvent) => Promise<void> | void;
  afterFind?: (event: LifecycleEvent) => Promise<void> | void;
  beforeFindOne?: (event: LifecycleEvent) => Promise<void> | void;
  afterFindOne?: (event: LifecycleEvent) => Promise<void> | void;
}

/**
 * Type guards
 */
export function isApiError(error: any): error is ApiError {
  return error && error.error && typeof error.error.status === 'number';
}

export function hasUser(ctx: StrapiContext): ctx is StrapiContext & { state: { user: NonNullable<StrapiContext['state']['user']> } } {
  return ctx.state.user != null;
}

/**
 * Utility types
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>>
  & {
    [K in Keys]-?:
      Required<Pick<T, K>>
      & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys];

export type Await<T> = T extends PromiseLike<infer U> ? U : T;