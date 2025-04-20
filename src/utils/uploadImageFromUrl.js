const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { v4: uuidv4 } = require('uuid');

/**
 * Downloads an image from a URL and uploads it to Strapi's media library.
 *
 * @param {string} imageUrl - The image URL to fetch and upload.
 * @param {object} data - Additional data to store with the image metadata.
 * @param {object} strapi - Strapi instance.
 * @returns {Promise<object|null>} - The uploaded file object, or null on failure.
 */
async function uploadImageFromUrl(imageUrl, data, strapi) {
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Starting image upload process (Attempt ${attempt}/${maxRetries})...`);
      console.log(`📥 Attempting to download image from URL: ${imageUrl}`);

      // Download image with timeout
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 second timeout
        maxContentLength: 10 * 1024 * 1024, // 10MB limit
      });
      console.log('✅ Image downloaded successfully');
      console.log(`📊 Image size: ${(response.data.length / 1024 / 1024).toFixed(2)}MB`);

      // Generate unique filename
      const ext = path.extname(imageUrl.split('?')[0]) || '.jpg';
      const fileName = `${uuidv4()}${ext}`;
      const tmpFilePath = path.join(tmpdir(), fileName);
      console.log(`📝 Generated temporary file path: ${tmpFilePath}`);

      // Save to temporary file
      fs.writeFileSync(tmpFilePath, response.data);
      console.log('💾 Image saved to temporary file');

      // Get file stats
      const fileStat = fs.statSync(tmpFilePath);
      const fileBuffer = fs.readFileSync(tmpFilePath);
      console.log(`📄 File details - Size: ${(fileStat.size / 1024 / 1024).toFixed(2)}MB, Type: ${ext}`);

      // Upload to Strapi
      console.log('⬆️ Starting upload to Strapi media library...');
      const uploadResult = await strapi
        .plugin('upload')
        .service('upload')
        .upload({
          data: {
            fileInfo: {
              name: fileName,
              alternativeText: 'Auto-uploaded image',
              caption: 'Uploaded via script',
            },
          },
          files: {
            path: tmpFilePath,
            name: fileName,
            type: 'image/jpeg',
            size: fileStat.size,
            buffer: fileBuffer,
          },
        });
      
      // Clean up temporary file
      fs.unlinkSync(tmpFilePath);
      console.log('🧹 Temporary file cleaned up');
      
      if (uploadResult?.[0]) {
        console.log('🎉 Image successfully uploaded to Strapi');
        console.log(`📌 Uploaded file ID: ${uploadResult[0].id}`);
        return uploadResult[0];
      } else {
        console.warn('⚠️ Upload result was empty');
        return null;
      }
    } catch (err) {
      console.error(`❌ Error during image upload process (Attempt ${attempt}/${maxRetries}):`, {
        url: imageUrl,
        error: err.message,
        code: err.code,
      });

      // If it's a duplicate entry error, return null instead of retrying
      if (err.name === 'YupValidationError' && err.details?.errors?.[0]?.message?.includes('must be unique')) {
        console.log('⚠️ Skipping duplicate entry');
        return null;
      }

      // If this was the last attempt, create error metadata and return null
      if (attempt === maxRetries) {
        try {
          await strapi.entityService.create('api::image-metadata.image-metadata', {
            data: {
              ...data,
              error: err.message,
              status: 'failed',
              lastAttempt: new Date(),
            },
          });
        } catch (metadataError) {
          console.error('Failed to create error metadata:', metadataError);
        }
        return null;
      }

      // Wait before retrying
      console.log(`⏳ Waiting ${retryDelay/1000} seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

module.exports = { uploadImageFromUrl };
