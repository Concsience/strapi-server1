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
  email: {
    config: {
      provider: '@strapi/provider-email-nodemailer',
      providerOptions: {
        host: env('SMTP_HOST'),
        port: env.int('SMTP_PORT'),
        auth: {
          user: env('SMTP_USERNAME'),
          pass: env('SMTP_PASSWORD'),
        },
        secure: false, // true for port 465, false for 587
        tls: {
          rejectUnauthorized: false,
        },
      },
      settings: {
        defaultFrom: env('SMTP_USERNAME'),
        defaultReplyTo: env('SMTP_USERNAME'),
      },
    },
  },
});