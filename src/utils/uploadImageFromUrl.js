const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { v4: uuidv4 } = require('uuid');

/**
 * Downloads an image from a URL and uploads it to Strapi's media library.
 *
 * @param {string} imageUrl - The image URL to fetch and upload.
 * @returns {Promise<object|null>} - The uploaded file object, or null on failure.
 */
async function uploadImageFromUrl(imageUrl) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
    });
    console.log(response, 'response');

    const ext = path.extname(imageUrl.split('?')[0]) || '.jpg';
    const fileName = `${uuidv4()}${ext}`;
    const tmpFilePath = path.join(tmpdir(), fileName);

    fs.writeFileSync(tmpFilePath, response.data);

    const fileStat = fs.statSync(tmpFilePath);
    const fileBuffer = fs.readFileSync(tmpFilePath);

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

    fs.unlinkSync(tmpFilePath);

    return uploadResult?.[0] || null;
  } catch (err) {
    console.error(`Failed to upload image from URL: ${imageUrl}`, err);
    return null;
  }
}

module.exports = { uploadImageFromUrl };
