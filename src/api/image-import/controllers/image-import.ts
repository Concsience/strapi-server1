/**
 * Image Import Controller - TypeScript version
 * Handles bulk image import and processing with proper error handling
 */

import { factories } from '@strapi/strapi';
import { StrapiContext, hasUser, ApiResponse } from '../../../types';
import { errors } from '@strapi/utils';

const { ValidationError } = errors;

// Type definitions
interface ImageMetadata {
  id: string;
  documentId: string;
  imageId: string;
  title: string;
  artist: string;
  thumbnail?: string;
  artwork_metadata?: {
    description?: string;
    physicalDimensions?: string;
    type?: string;
    medium?: string;
    width?: number;
    height?: number;
    base_price_per_cm_square?: string;
    maxSize?: string;
  };
}

interface ProcessImageRequest {
  metadata: ImageMetadata[];
  options?: {
    batch_size?: number;
    delay?: number;
  };
}

// Helper function for error handling
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export default factories.createCoreController('api::image-import.image-import', ({ strapi }) => {
  
  // Service functions with strapi instance available
  async function createProductSheet(metadata: ImageMetadata) {
    return await strapi.documents('api::productsheet1.productsheet1').create({
      data: {
        image_metadata: metadata.id,
        artname: metadata.title || null,
        AboutTheWork: metadata?.artwork_metadata?.description || null,
        Dimensions: metadata?.artwork_metadata?.physicalDimensions || null,
        creator: metadata?.artist || null,
        TypeofWork: metadata?.artwork_metadata?.type || null,
        MaterialsUsed: metadata?.artwork_metadata?.medium || null,
        publishedAt: new Date(),
      },
    });
  }

  async function createArtwork(metadata: ImageMetadata, productsheetId: string) {
    return await strapi.documents('api::artists-work.artists-work').create({
      data: {
        artThumbnail: metadata?.thumbnail || null,
        artname: metadata.title || null,
        original_width: metadata?.artwork_metadata?.width || 0,
        original_height: metadata?.artwork_metadata?.height || 0,
        base_price_per_cm_square: parseFloat(metadata?.artwork_metadata?.base_price_per_cm_square || '0'),
        max_size: parseFloat(metadata?.artwork_metadata?.maxSize || '0'),
        // Link to product sheet
        productsheets: productsheetId,
        publishedAt: new Date(),
      },
    });
  }

  async function createImageMetadata(data: any) {
    return await strapi.documents('api::image-metadata.image-metadata').create({
      data: {
        ...data,
        publishedAt: new Date(),
      },
    });
  }

  async function getAllImageMetadata() {
    return await strapi.documents('api::image-metadata.image-metadata').findMany({
      populate: '*',
    });
  }

  async function processImageJob(imageId: string, job: any): Promise<void> {
    try {
      // Update job status to processing
      await strapi.documents('api::image-job.image-job').update({
        documentId: imageId,
        data: { status: 'processing' },
      });

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update to completed
      await strapi.documents('api::image-job.image-job').update({
        documentId: imageId, 
        data: { 
          status: 'completed',
          completed_at: new Date(),
        },
      });

    } catch (error) {
      // Update to failed status
      await strapi.documents('api::image-job.image-job').update({
        documentId: imageId,
        data: { 
          status: 'failed',
          error_message: getErrorMessage(error),
        },
      });
      
      throw error;
    }
  }

  return {
    /**
     * Bulk import images with metadata processing
     */
    async bulkImport(ctx: StrapiContext): Promise<void> {
      try {
        // Validate user authentication
        if (!hasUser(ctx)) {
          ctx.unauthorized('You must be logged in to perform bulk import');
          return;
        }

        const { metadata, options }: ProcessImageRequest = ctx.request.body.data || {};

        if (!metadata || !Array.isArray(metadata)) {
          throw new ValidationError('Metadata array is required');
        }

        const batchSize = options?.batch_size || 10;
        const delay = options?.delay || 1000;

        strapi.log.info(`Starting bulk import of ${metadata.length} images with batch size ${batchSize}`);

        const results = [];
        let processed = 0;
        let errors = 0;

        // Process in batches to avoid overwhelming the system
        for (let i = 0; i < metadata.length; i += batchSize) {
          const batch = metadata.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (item) => {
            try {
              // Create image metadata first
              const imageMetadataResult = await createImageMetadata(item);
              
              // Create product sheet
              const productSheetResult = await createProductSheet(item);
              
              // Create artwork entry
              const artworkResult = await createArtwork(item, productSheetResult.documentId);
              
              processed++;
              return {
                success: true,
                item: item.title,
                imageMetadata: imageMetadataResult.documentId,
                productSheet: productSheetResult.documentId,
                artwork: artworkResult.documentId,
              };
            } catch (error) {
              errors++;
              strapi.log.error(`Failed to process image ${item.title}:`, error);
              return {
                success: false,
                item: item.title,
                error: getErrorMessage(error),
              };
            }
          });

          const batchResults = await Promise.allSettled(batchPromises);
          results.push(...batchResults.map(result => 
            result.status === 'fulfilled' ? result.value : { success: false, error: 'Promise rejected' }
          ));

          // Add delay between batches
          if (i + batchSize < metadata.length) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        const response: ApiResponse<{
          processed: number;
          errors: number;
          results: any[];
        }> = {
          data: {
            processed,
            errors,
            results,
          },
          meta: {
            message: `Bulk import completed: ${processed} processed, ${errors} errors`,
            total: metadata.length,
            batchSize,
          },
        };

        ctx.send(response);
      } catch (error: unknown) {
        if (error instanceof ValidationError) {
          ctx.badRequest(getErrorMessage(error));
        } else {
          strapi.log.error('Error in bulkImport:', error);
          ctx.throw(500, 'Failed to process bulk import');
        }
      }
    },

    /**
     * Get all image metadata
     */
    async getAllMetadata(ctx: StrapiContext): Promise<void> {
      try {
        const metadata = await getAllImageMetadata();

        const response: ApiResponse<any[]> = {
          data: metadata,
          meta: {
            count: metadata.length,
          },
        };

        ctx.send(response);
      } catch (error: unknown) {
        strapi.log.error('Error in getAllMetadata:', error);
        ctx.throw(500, 'Failed to retrieve image metadata');
      }
    },

    /**
     * Process individual image job
     */
    async processJob(ctx: StrapiContext): Promise<void> {
      try {
        const { imageId } = ctx.params;
        const jobData = ctx.request.body.data;

        if (!imageId) {
          throw new ValidationError('Image ID is required');
        }

        // Start background processing
        setImmediate(() => {
          processImageJob(imageId, jobData).catch(error => {
            strapi.log.error(`Background job failed for image ${imageId}:`, error);
          });
        });

        const response: ApiResponse<{ imageId: string; status: string }> = {
          data: {
            imageId,
            status: 'started',
          },
          meta: {
            message: 'Image processing job started',
          },
        };

        ctx.send(response);
      } catch (error: unknown) {
        if (error instanceof ValidationError) {
          ctx.badRequest(getErrorMessage(error));
        } else {
          strapi.log.error('Error in processJob:', error);
          ctx.throw(500, 'Failed to start image processing job');
        }
      }
    },
  };
});