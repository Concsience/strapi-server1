const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { decryptImage } = require('./decryptTilesBuffer');

const s3 = new S3Client({
  endpoint: process.env.STRAPI_UPLOAD_ENDPOINT,
  region: process.env.STRAPI_UPLOAD_REGION,
  credentials: {
    accessKeyId: process.env.STRAPI_UPLOAD_ACCESS_KEY_ID,
    secretAccessKey: process.env.STRAPI_UPLOAD_SECRET_ACCESS_KEY
  },
  forcePathStyle: true // Required for OVH / some S3-compatible APIs
});

const bucketName = process.env.STRAPI_UPLOAD_BUCKET;
const publicBaseUrl = process.env.STRAPI_UPLOAD_BASE_URL;

/**
 * Uploads a file buffer directly to OVH S3
 */
async function uploadToS3(fileName, buffer, contentType = 'image/jpeg') {
  const headCommand = new HeadObjectCommand({
    Bucket: bucketName,
    Key: fileName
  });

  // Check if file exists
  const fileExists = await s3.send(headCommand)
    .then(() => true)
    .catch(() => false);

  if (fileExists) {
    return `${publicBaseUrl}/${fileName}`
  }

  // Upload new file
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read'
  });

  return s3.send(command)
    .then(() => `${publicBaseUrl}/${fileName}`)
    .catch(error => {
      console.error(`Error in uploadToS3 for ${fileName}:`, error);
      return null;
    });
}

/**
 * Processes and uploads tiles in parallel batches to OVH
 */
async function uploadTiles(tilesUrls, imageId, strapi, tileInfoDocumentId) {
  const BATCH_SIZE = Number(process.env.TILE_UPLOAD_BATCH_SIZE) || 10;
  const tileEntries = Object.entries(tilesUrls);
  const totalTiles = tileEntries.length;
  let processedTiles = 0;
  let failedTiles = 0;

  console.log(`[Tile Upload] Starting to process ${totalTiles} tiles in batches of ${BATCH_SIZE}`);

  for (let i = 0; i < tileEntries.length; i += BATCH_SIZE) {
    const batch = tileEntries.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(tileEntries.length / BATCH_SIZE);

    console.log(`[Tile Upload] Processing batch ${batchNumber}/${totalBatches}`);

    const batchPromises = batch.map(async ([key, url]) => {
      try {
          const ext = '.jpg';
          const safeKey = key.replace(/\//g, '_');
          const tileID = `${imageId}${safeKey}`;
          const fileName = `${tileID}${ext}`;

        // Check if tile already exists in Strapi
        const existingTiles = await strapi.documents('api::tile.tile').findMany({
          filters: { tileID },
          limit: 1
        });
        if (existingTiles.length > 0) {
          console.log(`[Tile Upload] Tile already exists, skipping: ${tileID}`);
          return null;
        }

        // Download the tile
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 30000,
          maxContentLength: 10 * 1024 * 1024
        });
        const arrayBuffer = response.data.buffer || response.data;

        // Decrypt
        const decryptedBuffer = await decryptImage({ buffer: arrayBuffer });

        // Upload to OVH
        const uploadResult = await uploadToS3(fileName, decryptedBuffer);
        console.log(`[Tile Upload] Uploaded to OVH: ${uploadResult}`);

        // Create tile entry in Strapi
        await strapi.documents('api::tile.tile').create({
          data: {
            tileID,
            tile_url: uploadResult,
            publishedAt: new Date()
          },
        });

        processedTiles++;
        console.log(`[Tile Upload] Successfully processed: ${key}`);
        return true;
      } catch (error) {
        failedTiles++;
        console.error(`[Tile Upload] Error processing ${key}:`, error.message);
        return null;
      }
    });

    await Promise.all(batchPromises);
    await strapi.documents('api::tile-info.tile-info').update({
      documentId: tileInfoDocumentId,

      data: {
        scrapedTiles: processedTiles
      }
    });
    console.log(`[Tile Upload] Batch ${batchNumber}/${totalBatches} complete`);
  }

  console.log(`[Tile Upload] Completed: ${processedTiles} successful, ${failedTiles} failed`);
}

module.exports = { uploadTiles, uploadToS3 };
