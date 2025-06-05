/**
 * Content History Configuration for E-commerce
 * Tracks changes to critical e-commerce entities
 */

export default {
  // Enable content history
  enabled: true,
  
  // Content types to track
  trackedContentTypes: [
    'api::order.order',
    'api::artists-work.artists-work',
    'api::artist.artist',
    'api::cart.cart',
    'api::cart-item.cart-item',
    'api::ordered-item.ordered-item'
  ],
  
  // Fields to exclude from tracking
  excludedFields: [
    'createdAt',
    'updatedAt',
    'publishedAt',
    'password',
    'resetPasswordToken',
    'confirmationToken'
  ],
  
  // Retention configuration
  retention: {
    maxVersions: 50,        // Maximum versions per document
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days in milliseconds
    cleanupInterval: 24 * 60 * 60 * 1000 // Daily cleanup
  },
  
  // Audit configuration
  audit: {
    trackUserChanges: true,
    trackSystemChanges: false,
    includeMetadata: true,
    compressData: true
  },
  
  // Notification settings
  notifications: {
    enabled: true,
    criticalChanges: [
      'order.status',
      'order.total_price',
      'artists-work.base_price_per_cm_square',
      'artists-work.stock'
    ],
    webhookUrl: process.env.CONTENT_HISTORY_WEBHOOK_URL
  }
};