/**
 * Core TypeScript type definitions for Strapi E-commerce Backend
 * These types provide strong typing across the entire application
 */

import { Context } from 'koa';
import { Strapi } from '@strapi/strapi';

/**
 * Middleware type
 */
export type StrapiMiddleware = (ctx: StrapiContext, next: () => Promise<void>) => Promise<void>;

/**
 * Extended Koa Context with Strapi-specific properties
 */
export interface StrapiContext extends Context {
  strapi: Strapi;
  state: {
    user?: AuthenticatedUser;
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
 * Authenticated User Type
 */
export interface AuthenticatedUser {
  id: number;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  provider: string;
  confirmed: boolean;
  blocked: boolean;
  role: {
    id: number;
    name: string;
    type: string;
  };
  addresses?: OrderAddress[];
}

/**
 * Order Address Type
 */
export interface OrderAddress {
  nom: string;
  prenom: string;
  addresse: string;
  ville: string;
  region?: string;
  codePostal: string;
  pays?: string;
}

/**
 * Order Data Types
 */
export interface OrderData {
  id: number;
  documentId: string;
  total_price: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'shipped' | 'delivered';
  stripe_payment_id?: string;
  stripe_invoice_id?: string;
  shipping_cost?: number;
  user?: AuthenticatedUser;
  ordered_items?: any[];
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateOrderData {
  user: string | number;
  total_price: number;
  status?: string;
  shipping_cost?: number;
  stripe_payment_id?: string;
}

export interface CreateOrderRequest {
  totalprice: number;
  paymentMethodeId: string;
  address: OrderAddress;
  shipping_cost: number;
}

export interface UpdateOrderData {
  total_price?: number;
  status?: string;
  shipping_cost?: number;
  stripe_payment_id?: string;
  stripe_invoice_id?: string;
}

export interface OrderFilters {
  user?: number | string;
  status?: string;
  created_at?: {
    $gte?: Date;
    $lte?: Date;
  };
  total_price?: {
    $gte?: number;
    $lte?: number;
  };
}

/**
 * Route Configuration Types
 */
export interface RouteConfig {
  routes: Array<{
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    handler: string;
    config?: {
      auth?: boolean;
      policies?: string[];
      middlewares?: string[];
    };
  }>;
}

/**
 * Type Guards
 */
export function hasUser(ctx: StrapiContext): boolean {
  return ctx.state.user !== undefined && ctx.state.user !== null;
}

/**
 * Stripe Payment Types
 */
export interface CreatePaymentIntentRequest {
  amount: number;
  currency?: string;
  orderId?: string;
}

export interface PaymentIntentResponse {
  success: boolean;
  clientSecret?: string;
  error?: string;
  paymentIntent?: any;
}

/**
 * Stripe Types
 */
export interface StripeError extends Error {
  type: 'StripeCardError' | 'StripeRateLimitError' | 'StripeInvalidRequestError' | 'StripeAPIError' | 'StripeConnectionError' | 'StripeAuthenticationError';
  code?: string;
  decline_code?: string;
  charge?: string;
  payment_intent?: {
    id: string;
  };
}

export interface StripeWebhookEvent {
  id: string;
  object: 'event';
  type: string;
  data: {
    object: any;
  };
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string;
    idempotency_key?: string;
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

export interface CartData {
  id: number;
  documentId?: string;
  user?: AuthenticatedUser;
  cart_items?: CartItemData[];
  total_price: number;
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

// CartData interface already defined above - removed duplicate

// OrderData interface already defined above - removed duplicate

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

// StrapiMiddleware already defined above - removed duplicate

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

// hasUser already defined above - removed duplicate
export function hasUserTyped(ctx: StrapiContext): ctx is StrapiContext & { state: { user: NonNullable<StrapiContext['state']['user']> } } {
  return ctx.state.user != null;
}

/**
 * Assert authenticated user - throws if not authenticated
 * Use this when you've already checked hasUser() but need to satisfy TypeScript
 */
export function getAuthenticatedUser(ctx: StrapiContext): AuthenticatedUser {
  if (!ctx.state.user) {
    throw new Error('User not authenticated');
  }
  return ctx.state.user;
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