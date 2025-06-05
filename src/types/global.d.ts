/**
 * Global type declarations and environment variables
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Server
      NODE_ENV: 'development' | 'production' | 'test';
      HOST: string;
      PORT: string;
      URL?: string;
      
      // Database
      DATABASE_CLIENT: 'postgres' | 'mysql' | 'sqlite' | 'mysql2';
      DATABASE_URL?: string;
      DATABASE_HOST?: string;
      DATABASE_PORT?: string;
      DATABASE_NAME?: string;
      DATABASE_USERNAME?: string;
      DATABASE_PASSWORD?: string;
      DATABASE_SSL?: string;
      DATABASE_FILENAME?: string;
      
      // Security
      APP_KEYS: string;
      API_TOKEN_SALT: string;
      ADMIN_JWT_SECRET: string;
      JWT_SECRET: string;
      TRANSFER_TOKEN_SALT?: string;
      
      // Stripe
      STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY: string;
      STRIPE_WEBHOOK_SECRET?: string;
      STRIPE_PUBLISHABLE_KEY?: string;
      
      // OVH S3
      OVH_ACCESS_KEY?: string;
      OVH_SECRET_KEY?: string;
      OVH_ENDPOINT?: string;
      OVH_BUCKET?: string;
      OVH_REGION?: string;
      
      // AWS S3 (alternative)
      AWS_ACCESS_KEY_ID?: string;
      AWS_ACCESS_SECRET?: string;
      AWS_REGION?: string;
      AWS_BUCKET?: string;
      
      // Email
      SMTP_HOST?: string;
      SMTP_PORT?: string;
      SMTP_USERNAME?: string;
      SMTP_PASSWORD?: string;
      EMAIL_FROM?: string;
      EMAIL_REPLY_TO?: string;
      
      // Redis
      REDIS_HOST?: string;
      REDIS_PORT?: string;
      REDIS_PASSWORD?: string;
      REDIS_DB?: string;
      
      // Frontend URLs
      FRONTEND_URL?: string;
      ADMIN_URL?: string;
      
      // Features
      DISABLE_TELEMETRY?: string;
      STRAPI_TELEMETRY_DISABLED?: string;
      STRAPI_LICENSE?: string;
      
      // Custom
      RATE_LIMIT_MAX?: string;
      RATE_LIMIT_WINDOW?: string;
      CACHE_TTL?: string;
      LOG_LEVEL?: string;
      
      // Google Arts & Culture
      GOOGLE_ARTS_API_KEY?: string;
      GOOGLE_ARTS_BASE_URL?: string;
      
      // Analytics
      GOOGLE_ANALYTICS_ID?: string;
      POSTHOG_API_KEY?: string;
      SENTRY_DSN?: string;
    }
  }
  
  // Extend Express Request/Response (used by Strapi internally)
  namespace Express {
    interface Request {
      user?: any;
      file?: any;
      files?: any[];
    }
  }

  // Custom window properties (for admin panel)
  interface Window {
    strapi?: {
      backendURL: string;
      isEE: boolean;
      features: {
        SSO: boolean;
        REVIEW_WORKFLOWS: boolean;
        MULTI_LOCALE: boolean;
      };
    };
  }

  // Augment console for better debugging
  interface Console {
    success(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
  }
}

// Helper type for async function return types
type AsyncReturnType<T extends (...args: any) => Promise<any>> = 
  T extends (...args: any) => Promise<infer R> ? R : never;

// Helper type for extracting promise type
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

// Database ID type (can be number or string depending on database)
type ID = string | number;

// Common query operators
type QueryOperator = 
  | '$eq' 
  | '$ne' 
  | '$in' 
  | '$notIn' 
  | '$lt' 
  | '$lte' 
  | '$gt' 
  | '$gte' 
  | '$contains' 
  | '$notContains' 
  | '$containsi' 
  | '$notContainsi'
  | '$startsWith'
  | '$endsWith'
  | '$null'
  | '$notNull'
  | '$between'
  | '$or'
  | '$and'
  | '$not';

// Query filter type
type QueryFilter<T> = {
  [K in keyof T]?: T[K] | {
    [op in QueryOperator]?: any;
  };
} & {
  $or?: QueryFilter<T>[];
  $and?: QueryFilter<T>[];
  $not?: QueryFilter<T>;
};

// Sort order
type SortOrder = 'asc' | 'desc' | 'ASC' | 'DESC';

// Pagination response
interface PaginationResponse {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

// File upload type
interface StrapiFile {
  id: number;
  name: string;
  alternativeText?: string;
  caption?: string;
  width?: number;
  height?: number;
  formats?: Record<string, any>;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl?: string;
  provider: string;
  provider_metadata?: any;
  createdAt: string;
  updatedAt: string;
}

// Re-export Strapi for convenience
export type { Strapi } from '@strapi/strapi';

export {};