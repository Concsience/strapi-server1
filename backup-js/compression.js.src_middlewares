const compress = require('koa-compress');
const zlib = require('zlib');

module.exports = (config) => {
  return compress({
    filter: (content_type) => {
      // Compress JSON, text, and JavaScript responses
      return /json|text|javascript|css|svg\+xml/.test(content_type);
    },
    threshold: 1024, // Only compress responses larger than 1KB
    gzip: {
      flush: zlib.constants.Z_SYNC_FLUSH,
    },
    br: {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
      },
    },
    defaultEncoding: 'gzip',
  });
};