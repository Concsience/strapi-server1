// ./config/plugins.js
module.exports = ({
  env
}) => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        baseUrl: env('STRAPI_UPLOAD_BASE_URL'),
        rootPath: '',
        s3Options: {
          endpoint: env("STRAPI_UPLOAD_ENDPOINT"),
          credentials: {
            accessKeyId: env('STRAPI_UPLOAD_ACCESS_KEY_ID'),
            secretAccessKey: env('STRAPI_UPLOAD_SECRET_ACCESS_KEY'),
          },
          region: env('STRAPI_UPLOAD_REGION'),
          params: {
            ACL: 'public-read',
            signedUrlExpires: 15 * 60,
            Bucket: env('STRAPI_UPLOAD_BUCKET'),
          },
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
});