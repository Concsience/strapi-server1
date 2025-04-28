const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { v4: uuidv4 } = require('uuid');
const { decryptImage } = require('./decryptTilesBuffer');

/**
 * Processes and uploads tiles in parallel batches
 * @param {Object} tilesUrls - Object containing tile URLs with keys in format `${token}/${x}/${y}/${levelIndex}`
 * @param {string} imageId - The image ID to associate with the tiles
 * @param {Object} strapi - Strapi instance
 */
async function uploadTiles(tilesUrls, imageId, strapi) {
  const BATCH_SIZE = 10;
  const tileEntries = Object.entries(tilesUrls);
  const totalTiles = tileEntries.length;
  let processedTiles = 0;
  let failedTiles = 0;

  console.log(`[Tile Upload] Starting to process ${totalTiles} tiles in batches of ${BATCH_SIZE}`);
  console.log(`[Tile Upload] Image ID: ${imageId}`);

  // Process tiles in batches
  for (let i = 0; i < tileEntries.length; i += BATCH_SIZE) {
    const batch = tileEntries.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(tileEntries.length / BATCH_SIZE);
    
    console.log(`[Tile Upload] Processing batch ${batchNumber}/${totalBatches} (${batch.length} tiles)`);

    const batchPromises = batch.map(async ([key, url]) => {
      try {
        // Generate unique tileID and filename
        const ext = '.jpg';
        const safeKey = key.replace(/\//g, '_');
        const tileID = `${imageId}${safeKey}`;
        const fileName = `${tileID}${ext}`;
        
        // Check if tile already exists in Strapi
        const existingTiles = await strapi.entityService.findMany('api::tile.tile', {
          filters: { tileID },
          limit: 1
        });
        if (existingTiles && existingTiles.length > 0) {
          console.log(`[Tile Upload] Tile already exists, skipping: ${tileID}`);
          return null;
        }

        // Check if the image file is already uploaded in Strapi's media library
        let fileId = null;
        const existingFiles = await strapi.entityService.findMany('plugin::upload.file', {
          filters: { name: fileName },
          limit: 1
        });
        if (existingFiles && existingFiles.length > 0) {
          console.log(`[Tile Upload] Image file already exists in media library, using existing file: ${fileName}`);
          fileId = existingFiles[0].id;
        } else {
          console.log(`[Tile Upload] Downloading tile: ${key}`);
          // Download tile
          const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: 10 * 1024 * 1024 // 10MB limit
          });
          console.log(`[Tile Upload] Tile downloaded: ${key} ${url}`);
          
          // Convert response data to ArrayBuffer
          const arrayBuffer = response.data.buffer || response.data;
          
          console.log(`[Tile Upload] Decrypting tile: ${key}`);
          // Decrypt the image if needed
          const decryptedBuffer = await decryptImage({ buffer: arrayBuffer });
          
          const tmpFilePath = path.join(tmpdir(), fileName);

          console.log(`[Tile Upload] Saving tile to temporary file: ${tmpFilePath}`);
          // Save to temporary file
          fs.writeFileSync(tmpFilePath, decryptedBuffer);
          const fileStat = fs.statSync(tmpFilePath);
          const fileBuffer = fs.readFileSync(tmpFilePath);

          console.log(`[Tile Upload] Uploading tile to Strapi: ${key}`);
          // Upload to Strapi
          const uploadResult = await strapi
            .plugin('upload')
            .service('upload')
            .upload({
              data: {
                fileInfo: {
                  name: fileName,
                  alternativeText: `Tile ${key}`,
                  caption: `Tile for image ${imageId}`,
                  url: url,
                  preserveFilename: true
                },
              },
              files: {
                path: tmpFilePath,
                name: fileName,
                type: 'image/jpeg',
                size: fileStat.size,
                buffer: fileBuffer,
                preserveFilename: true
              },
            });

          // Clean up temporary file
          fs.unlinkSync(tmpFilePath);

          if (uploadResult?.[0]) {
            fileId = uploadResult[0].id;
          }
        }

        // Always create tile entry in Strapi referencing the correct image file
        if (fileId) {
          await strapi.entityService.create('api::tile.tile', {
            data: {
              tileID: tileID,
              tileImage: [fileId],
            },
          });
        }

        processedTiles++;
        console.log(`[Tile Upload] Successfully processed tile ${processedTiles}/${totalTiles}: ${key}`);

        return fileId || null;
      } catch (error) {
        failedTiles++;
        console.error(`[Tile Upload] Error processing tile ${key}:`, {
          error: error.message,
          stack: error.stack,
          url: url
        });
        return null;
      }
    });

    // Wait for current batch to complete
    const batchResults = await Promise.all(batchPromises);
    const successfulInBatch = batchResults.filter(result => result !== null).length;
    console.log(`[Tile Upload] Batch ${batchNumber}/${totalBatches} completed: ${successfulInBatch}/${batch.length} tiles successful`);
  }

  console.log(`[Tile Upload] Completed processing all ${totalTiles} tiles`);
  console.log(`[Tile Upload] Summary: ${processedTiles} successful, ${failedTiles} failed`);
}

module.exports = { uploadTiles };
