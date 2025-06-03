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

interface ImportRequest {
  imageIds: string[];
}

interface ImportResponse {
  message: string;
  importId: string;
  jobCount: number;
}

// Helper function for error handling
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Service functions for better organization
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
      artname: metadata.title,
      productsheet: productsheetId,
      original_width: metadata?.artwork_metadata?.width || null,
      original_height: metadata?.artwork_metadata?.height || null,
      base_price_per_cm_square: metadata?.artwork_metadata?.base_price_per_cm_square || '0.10',
      max_size: metadata?.artwork_metadata?.maxSize || '30',
      publishedAt: new Date(),
    },
  });
}

async function findOrCreateArtist(artistName: string, artworkId: string) {
  const existingArtists = await strapi.documents('api::artist.artist').findMany({
    filters: { name: artistName },
    limit: 1,
  });

  if (existingArtists.length > 0) {
    return existingArtists[0];
  }

  // Create new artist
  return await strapi.documents('api::artist.artist').create({
    data: {
      name: artistName,
      publishedAt: new Date(),
    },
  });
}

async function processImageJob(imageId: string, job: any): Promise<void> {
  try {
    // Get metadata
    const metadataList = await strapi.documents('api::image-metadata.image-metadata').findMany({
      filters: { imageId },
      limit: 1,
    });

    const metadata = metadataList[0] as ImageMetadata;
    if (!metadata) {
      throw new Error(`Metadata not found for image ${imageId}`);
    }

    strapi.log.info(`Processing image ${imageId}: ${metadata.title}`);

    // Create productsheet
    const productsheet = await createProductSheet(metadata);
    strapi.log.debug(`Created productsheet ${productsheet.id} for image ${imageId}`);

    // Create artwork
    const artwork = await createArtwork(metadata, productsheet.id);
    strapi.log.debug(`Created artwork ${artwork.id} for image ${imageId}`);

    // Find or create artist
    const artist = await findOrCreateArtist(metadata.artist, artwork.id);

    // Update artwork with artist reference
    await strapi.documents('api::artists-work.artists-work').update({
      documentId: artwork.documentId,
      data: { artist: artist.id },
    });

    // Mark job as completed
    await strapi.documents('api::image-job.image-job').update({
      documentId: job.documentId,
      data: { status: 'done' },
    });

    strapi.log.info(`Successfully processed image ${imageId}`);
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    
    // Mark job as failed
    await strapi.documents('api::image-job.image-job').update({
      documentId: job.documentId,
      data: {
        status: 'failed',
        errorMessage,
      },
    });

    strapi.log.error(`Failed to process image ${imageId}: ${errorMessage}`);
    throw error; // Re-throw to be caught by batch processor
  }
}

export default factories.createCoreController('api::image-import.image-import', ({ strapi }) => ({
  /**
   * Create a new image import batch
   */
  async create(ctx: StrapiContext): Promise<void> {
    try {
      // Validate authentication (if required)
      if (!hasUser(ctx)) {
        ctx.unauthorized('You must be logged in to import images');
        return;
      }

      const { data } = ctx.request.body as { data: ImportRequest };
      const { imageIds } = data;

      // Validate request
      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        throw new ValidationError('Provide a non-empty array of imageIds');
      }

      if (imageIds.length > 100) {
        throw new ValidationError('Maximum 100 images per batch');
      }

      // Create import batch
      const importBatch = await strapi.documents('api::image-import.image-import').create({
        data: { imageIds },
      });

      // Create processing jobs
      const jobs = await Promise.all(
        imageIds.map((id) =>
          strapi.documents('api::image-job.image-job').create({
            data: {
              imageId: id,
              status: 'processing',
              importBatch: importBatch.id,
            },
          })
        )
      );

      strapi.log.info(`Created import batch ${importBatch.id} with ${jobs.length} jobs`);

      // Background processing with proper error handling
      setImmediate(async () => {
        let successCount = 0;
        let failureCount = 0;

        try {
          for (const [index, imageId] of imageIds.entries()) {
            const job = jobs[index];
            try {
              await processImageJob(imageId, job);
              successCount++;
            } catch (error) {
              failureCount++;
              // Individual job errors are logged in processImageJob
            }
          }

          strapi.log.info(
            `Import batch ${importBatch.id} completed: ${successCount} successful, ${failureCount} failed`
          );
        } catch (error: unknown) {
          strapi.log.error(`Critical error in import batch ${importBatch.id}: ${getErrorMessage(error)}`);
        }
      });

      const response: ApiResponse<ImportResponse> = {
        data: {
          message: 'Import started successfully',
          importId: importBatch.id,
          jobCount: jobs.length,
        },
        meta: {
          message: 'Processing will continue in background',
          estimatedTime: `${Math.ceil(jobs.length * 2)} seconds`,
        },
      };

      ctx.status = 202; // Accepted
      ctx.send(response);
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        ctx.badRequest(getErrorMessage(error));
      } else {
        strapi.log.error('Error in image-import.create:', error);
        ctx.throw(500, 'Failed to start image import');
      }
    }
  },
}));
