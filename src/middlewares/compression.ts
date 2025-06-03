/**
 * Compression Middleware - TypeScript version
 * Compresses response bodies for better performance
 */

import { Strapi } from '@strapi/strapi';
import { StrapiContext, StrapiMiddleware } from '../types';
import compress from 'koa-compress';
import { Z_SYNC_FLUSH } from 'zlib';

interface CompressionConfig {
  enabled?: boolean;
  threshold?: number; // Minimum response size in bytes to compress
  level?: number; // Compression level (0-9)
  filter?: (contentType: string) => boolean;
  // Compression algorithm options
  br?: {
    enabled?: boolean;
    params?: {
      [key: string]: any;
    };
  };
  gzip?: {
    enabled?: boolean;
  };
  deflate?: {
    enabled?: boolean;
  };
}

/**
 * Default content types to compress
 */
const COMPRESSIBLE_TYPES = [
  'text/plain',
  'text/html',
  'text/xml',
  'text/css',
  'text/javascript',
  'application/javascript',
  'application/json',
  'application/xml',
  'application/rss+xml',
  'application/atom+xml',
  'application/xhtml+xml',
  'application/x-font-ttf',
  'application/x-font-opentype',
  'application/vnd.ms-fontobject',
  'image/svg+xml',
  'image/x-icon',
];

/**
 * Creates a compression middleware for response optimization
 */
export default (config: CompressionConfig = {}, { strapi }: { strapi: Strapi }): StrapiMiddleware => {
  // Check if compression is enabled
  if (config.enabled === false) {
    strapi.log.info('Compression middleware is disabled');
    return async (_ctx: StrapiContext, next: () => Promise<void>) => {
      await next();
    };
  }

  // Configure compression options
  const threshold = config.threshold || 1024; // Default: 1KB
  const level = config.level ?? 6; // Default compression level

  // Content type filter
  const defaultFilter = (contentType: string): boolean => {
    if (!contentType) return false;
    
    // Check if content type is in the compressible list
    return COMPRESSIBLE_TYPES.some(type => 
      contentType.toLowerCase().includes(type)
    );
  };

  const filter = config.filter || defaultFilter;

  // Build compression options
  const compressionOptions: compress.CompressOptions = {
    threshold,
    gzip: config.gzip?.enabled !== false ? { 
      flush: Z_SYNC_FLUSH,
      level,
    } : false,
    deflate: config.deflate?.enabled !== false ? {
      flush: Z_SYNC_FLUSH,
      level,
    } : false,
    br: false, // Brotli compression
    filter: (contentType: string) => {
      const shouldCompress = filter(contentType);
      
      // Log compression decisions for debugging
      if (strapi.config.get('middleware.compression.debug')) {
        strapi.log.debug(`Compression ${shouldCompress ? 'enabled' : 'skipped'} for content-type: ${contentType}`);
      }
      
      return shouldCompress;
    },
  };

  // Enable Brotli if available and configured
  if (config.br?.enabled && typeof (compress as any).br !== 'undefined') {
    compressionOptions.br = {
      params: {
        [(compress as any).constants.BROTLI_PARAM_QUALITY]: level,
        ...config.br.params,
      },
    };
  }

  // Create and configure the compression middleware
  const compressionMiddleware = compress(compressionOptions);

  // Return enhanced middleware with logging
  return async (ctx: StrapiContext, next: () => Promise<void>): Promise<void> => {
    const startTime = Date.now();
    const originalSize = ctx.length || 0;

    // Skip compression for certain conditions
    if (shouldSkipCompression(ctx, config)) {
      await next();
      return;
    }

    try {
      // Apply compression
      await compressionMiddleware(ctx as any, next);

      // Log compression results if enabled
      if (strapi.config.get('middleware.compression.logStats')) {
        const duration = Date.now() - startTime;
        const compressedSize = ctx.length || 0;
        const ratio = originalSize > 0 ? ((1 - compressedSize / originalSize) * 100).toFixed(2) : '0';
        
        strapi.log.debug(`Compression stats: ${JSON.stringify({
          path: ctx.path,
          method: ctx.method,
          originalSize,
          compressedSize,
          ratio: `${ratio}%`,
          duration: `${duration}ms`,
          encoding: ctx.get('content-encoding'),
        })}`);
      }
    } catch (error) {
      // Log error but don't break the request
      strapi.log.error('Compression middleware error:', error);
      
      // Continue without compression
      await next();
    }
  };
};

/**
 * Determines if compression should be skipped for this request
 */
function shouldSkipCompression(ctx: StrapiContext, config: CompressionConfig): boolean {
  // Skip if already compressed
  if (ctx.get('content-encoding')) {
    return true;
  }

  // Skip for WebSocket upgrade requests
  if (ctx.get('upgrade') === 'websocket') {
    return true;
  }

  // Skip for Server-Sent Events
  if (ctx.get('content-type')?.includes('text/event-stream')) {
    return true;
  }

  // Skip for HEAD requests
  if (ctx.method === 'HEAD') {
    return true;
  }

  // Skip for empty responses
  if (ctx.status === 204 || ctx.status === 304) {
    return true;
  }

  // Skip if client doesn't support compression
  const acceptEncoding = ctx.get('accept-encoding');
  if (!acceptEncoding || !acceptEncoding.match(/gzip|deflate|br/)) {
    return true;
  }

  // Skip for specific paths if configured
  const skipPaths = (config as any).skipPaths as string[] | undefined;
  if (skipPaths && skipPaths.some(path => ctx.path.startsWith(path))) {
    return true;
  }

  return false;
}

// Export types for use in configuration
export type { CompressionConfig };