# 📝 Entity Service to Document Service Migration Guide

## Files Requiring Migration

### 1. **Cart Controller** (`src/api/cart/controllers/cart.ts`)

#### Line 85 - getUserCart function
```typescript
// BEFORE (Entity Service)
const cart = await strapi.entityService.findMany('api::cart.cart', {
  filters: { user: userId },
  populate: {
    cart_items: {
      populate: {
        art: { populate: ['images'] },
        paper_type: true,
      },
    },
  },
});

// AFTER (Document Service)
const carts = await strapi.documents('api::cart.cart').findMany({
  filters: { user: { documentId: userId } },
  populate: {
    cart_items: {
      populate: {
        art: { populate: ['images'] },
        paper_type: true,
      },
    },
  },
});
const cart = carts[0]; // Get first cart
```

#### Line 98 - createCart function
```typescript
// BEFORE (Entity Service)
const newCart = await strapi.entityService.create('api::cart.cart', {
  data: {
    user: userId,
    total_price: 0,
  },
});

// AFTER (Document Service)
const newCart = await strapi.documents('api::cart.cart').create({
  data: {
    user: { connect: [userId] },
    total_price: 0,
  },
});
```

### 2. **Payment Controller** (`src/api/payment/controllers/payment.js`)

Multiple instances need migration. Key patterns:
```javascript
// BEFORE
const user = await strapi.entityService.findOne(
  'plugin::users-permissions.user',
  userId,
  { populate: ['role'] }
);

// AFTER
const user = await strapi.documents('plugin::users-permissions.user').findOne({
  documentId: userId,
  populate: ['role']
});
```

### 3. **Image Import Controller** (`src/api/image-import/controllers/image-import.js`)

```javascript
// BEFORE
const existingJobs = await strapi.entityService.findMany(
  'api::image-job.image-job',
  {
    filters: { url: jobUrl },
    limit: 1,
  }
);

// AFTER
const existingJobs = await strapi.documents('api::image-job.image-job').findMany({
  filters: { url: jobUrl },
  limit: 1,
});
```

### 4. **Upload Utilities**

#### `src/utils/uploadImageFromUrl.js`
```javascript
// BEFORE
const uploadedFile = await strapi.entityService.create(
  'plugin::upload.file',
  {
    data: fileData,
  }
);

// AFTER
const uploadedFile = await strapi.documents('plugin::upload.file').create({
  data: fileData,
});
```

#### `src/utils/uploadTiles.js`
Similar pattern - replace entityService with documents API

### 5. **Cron Jobs** (`src/cron/index.js`)

```javascript
// BEFORE
const jobs = await strapi.entityService.findMany(
  'api::image-job.image-job',
  {
    filters: { status: 'pending' },
    limit: 10,
  }
);

// AFTER
const jobs = await strapi.documents('api::image-job.image-job').findMany({
  filters: { status: 'pending' },
  limit: 10,
});
```

## Key Migration Patterns

### 1. **ID Changes**
- `id` → `documentId`
- In filters: `{ user: userId }` → `{ user: { documentId: userId } }`

### 2. **Relation Handling**
```typescript
// BEFORE
data: {
  user: userId,
  cart_items: [itemId1, itemId2]
}

// AFTER
data: {
  user: { connect: [userId] },
  cart_items: { connect: [itemId1, itemId2] }
}
```

### 3. **Response Format**
```typescript
// BEFORE
const article = response.data.attributes;

// AFTER
const article = response.data; // Flattened structure
```

### 4. **Publishing Status**
```typescript
// BEFORE
publicationState: 'live'

// AFTER
status: 'published'
```

## Testing Checklist

- [ ] Cart creation and management
- [ ] Payment processing (Stripe webhooks)
- [ ] User authentication
- [ ] Image uploads
- [ ] Cron job execution
- [ ] API response format
- [ ] Frontend integration

## Priority Order

1. **High**: Cart and Payment controllers (core functionality)
2. **Medium**: Image upload utilities
3. **Low**: Cron jobs and batch operations