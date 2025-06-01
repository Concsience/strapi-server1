const axios = require('axios');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { uploadToS3 } = require('./uploadTiles');

/**
 * Downloads an image from a URL and uploads it to S3.
 *
 * @param {string} imageUrl - The image URL to fetch and upload.
 * @param {object} data - Additional data to store with the image metadata.
 * @param {object} strapi - Strapi instance.
 * @returns {Promise<object|null>} - The uploaded file object, or null on failure.
 */
async function uploadImageFromUrl(imageUrl, data, strapi, imageId) {
  // First check if image already exists in Strapi's media library
  try {
    const existingFiles = await strapi.entityService.findMany('plugin::upload.file', {
      filters: {
        url: imageUrl
      },
      limit: 1
    });

    if (existingFiles && existingFiles.length > 0) {
      console.log('✅ Image already exists in media library, returning existing file');
      return existingFiles[0];
    }
  } catch (err) {
    console.warn('⚠️ Error checking for existing file:', err.message);
  }

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
      const fileName = `${imageId}${ext}`;
      console.log(`📝 Generated filename: ${fileName}`);

      // Upload to S3
      console.log('⬆️ Starting upload to S3...');
      const publicUrl = await uploadToS3(fileName, response.data);
      console.log('✅ Image uploaded to S3:', publicUrl);

      if (publicUrl) {
        console.log('🎉 Image successfully uploaded and registered in Strapi', publicUrl);
        return publicUrl;
      } else {
        console.warn('⚠️ File entry creation failed');
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
