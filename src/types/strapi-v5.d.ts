/**
 * Strapi 5 TypeScript Type Definitions
 * 
 * This file contains updated type definitions for Strapi v5
 * compatible with the Document Service API
 */

declare module '@strapi/strapi' {
  export interface Core {
    documents<T = any>(uid: string): DocumentService<T>;
  }
}

// Document Service Types
export interface DocumentService<T = any> {
  findOne(params: FindOneParams): Promise<StrapiDocument<T> | null>;
  findMany(params?: FindManyParams): Promise<StrapiDocument<T>[]>;
  create(params: CreateParams<T>): Promise<StrapiDocument<T>>;
  update(params: UpdateParams<T>): Promise<StrapiDocument<T>>;
  delete(params: DeleteParams): Promise<StrapiDocument<T>>;
  publish(params: PublishParams): Promise<StrapiDocument<T>>;
  unpublish(params: UnpublishParams): Promise<StrapiDocument<T>>;
  discardDraft(params: DiscardDraftParams): Promise<StrapiDocument<T>>;
}

// Base Document Structure
export interface StrapiDocument<T = any> {
  documentId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  locale?: string;
  status?: 'draft' | 'published';
}

// Document Service Parameters
export interface FindOneParams {
  documentId: string;
  populate?: PopulateParam;
  locale?: string;
  status?: 'draft' | 'published';
}

export interface FindManyParams {
  filters?: FilterParam;
  populate?: PopulateParam;
  sort?: SortParam;
  limit?: number;
  offset?: number;
  pagination?: PaginationParam;
  locale?: string;
  status?: 'draft' | 'published';
}

export interface CreateParams<T> {
  data: Partial<T>;
  populate?: PopulateParam;
  locale?: string;
  status?: 'draft' | 'published';
}

export interface UpdateParams<T> {
  documentId: string;
  data: Partial<T>;
  populate?: PopulateParam;
  locale?: string;
}

export interface DeleteParams {
  documentId: string;
  locale?: string;
}

export interface PublishParams {
  documentId: string;
  locale?: string;
}

export interface UnpublishParams {
  documentId: string;
  locale?: string;
}

export interface DiscardDraftParams {
  documentId: string;
  locale?: string;
}

// Filter, Populate, Sort Types
export type FilterParam = Record<string, any>;
export type PopulateParam = string | string[] | Record<string, any>;
export type SortParam = string | string[] | Record<string, 'asc' | 'desc'>;

export interface PaginationParam {
  page: number;
  pageSize: number;
}

// Collection Response
export interface StrapiCollectionResponse<T> {
  data: StrapiDocument<T>[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// Single Response
export interface StrapiSingleResponse<T> {
  data: StrapiDocument<T>;
  meta?: Record<string, any>;
}

// Content Type Definitions for your project
export interface CartItem {
  cart: string; // documentId
  art: string; // documentId
  paper_type?: string; // documentId
  quantity: number;
  price: number;
}

export interface Cart {
  user: string; // documentId
  cart_items: CartItem[];
  total_price: number;
}

export interface Order {
  user: string; // documentId
  ordered_items: OrderedItem[];
  total_price: number;
  payment_status: 'pending' | 'completed' | 'failed';
  stripe_payment_intent_id?: string;
  paid_at?: string;
}

export interface OrderedItem {
  order: string; // documentId
  art: string; // documentId
  paper_type?: string; // documentId
  quantity: number;
  price: number;
}

export interface ArtistsWork {
  artname: string;
  original_width: number;
  original_height: number;
  base_price_per_cm_square: number;
  max_size: number;
  artist?: string; // documentId
  images?: Media[];
  artThumbnail?: string;
}

export interface Artist {
  name: string;
  art: ArtistsWork[];
}

export interface Media {
  url: string;
  alternativeText?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface User {
  username: string;
  email: string;
  stripeCustomerId?: string;
  default_payment_method?: string;
  addresses?: Address[];
}

export interface Address {
  ville: string;
  region: string;
  codePostal: string;
  rue: string;
  user: string; // documentId
}

// Relation Connection Types
export interface RelationConnect {
  connect: string[];
}

export interface RelationDisconnect {
  disconnect: string[];
}

export interface RelationSet {
  set: string[];
}

export type RelationParam = RelationConnect | RelationDisconnect | RelationSet;

// Helper Types
export type DocumentId = string;
export type ContentTypeUID = string;

// Strapi Context for Controllers
export interface StrapiContext {
  state: {
    user?: StrapiDocument<User>;
  };
  request: {
    body: any;
    query: Record<string, any>;
  };
  params: Record<string, string>;
  send: (data: any, status?: number) => void;
  badRequest: (message: string) => void;
  unauthorized: (message: string) => void;
  forbidden: (message: string) => void;
  notFound: (message: string) => void;
  internalServerError: (message: string) => void;
}

// Extended Strapi interface
declare global {
  namespace Strapi {
    interface Strapi {
      documents<T = any>(uid: string): DocumentService<T>;
    }
  }
}

// Third-party module declarations
declare module 'stripe' {
  export interface StripeError extends Error {
    type: string;
    code?: string;
    decline_code?: string;
    charge?: string;
    payment_intent?: string;
    payment_method?: string;
    setup_intent?: string;
  }

  export interface Stripe {
    paymentIntents: {
      create(params: any): Promise<any>;
      confirm(id: string, params?: any): Promise<any>;
    };
    customers: {
      create(params: any): Promise<any>;
    };
  }

  export default function(secretKey: string): Stripe;
}

declare module 'axios' {
  export interface AxiosRequestConfig {
    method?: string;
    url?: string;
    data?: any;
    headers?: Record<string, string>;
    timeout?: number;
    maxContentLength?: number;
    responseType?: 'json' | 'text' | 'arraybuffer' | 'blob' | 'document' | 'stream';
  }

  export interface AxiosResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: any;
    config: AxiosRequestConfig;
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