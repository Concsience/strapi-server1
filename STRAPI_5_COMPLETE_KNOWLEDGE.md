# 🚀 STRAPI 5 COMPLETE KNOWLEDGE BASE

## 📋 TABLE OF CONTENTS
1. [Core Changes](#core-changes)
2. [Document Service API](#document-service-api)
3. [Breaking Changes](#breaking-changes)
4. [Migration Guide](#migration-guide)
5. [New Features](#new-features)
6. [Code Examples](#code-examples)
7. [Best Practices](#best-practices)

---

## 🔄 CORE CHANGES

### Document Service vs Entity Service
```javascript
// ❌ Strapi 4 - Entity Service (DEPRECATED)
await strapi.entityService.findOne('api::article.article', id, {
  populate: '*'
});

// ✅ Strapi 5 - Document Service (NEW)
await strapi.documents('api::article.article').findOne({
  documentId: 'abc123',
  populate: '*'
});
```

### Response Format Changes
```javascript
// ❌ Strapi 4 Response
{
  "data": {
    "id": 1,
    "attributes": {
      "title": "Article Title",
      "content": "Article content..."
    }
  }
}

// ✅ Strapi 5 Response
{
  "data": {
    "documentId": "abc123",
    "title": "Article Title",
    "content": "Article content..."
  }
}
```

### Key Architectural Changes
- **documentId** replaces **id** as unique identifier
- **status** parameter replaces **publicationState**
- Flattened response structure (no attributes wrapper)
- Built-in Draft & Publish workflow
- Vite as default bundler
- React Router v6
- Better TypeScript support

---

## 📚 DOCUMENT SERVICE API

### Core Methods
```javascript
// Initialize Document Service
const documents = strapi.documents('api::article.article');

// Find One Document
await documents.findOne({
  documentId: 'abc123',
  populate: ['author', 'categories'],
  status: 'published' // 'draft' | 'published'
});

// Find Many Documents
await documents.findMany({
  filters: {
    title: { $contains: 'news' },
    publishedAt: { $notNull: true }
  },
  populate: '*',
  sort: { createdAt: 'desc' },
  limit: 20,
  offset: 0,
  status: 'published'
});

// Create Document
await documents.create({
  data: {
    title: 'New Article',
    content: 'Article content...',
    author: { connect: ['author-doc-id'] }
  },
  status: 'draft' // Creates as draft by default
});

// Update Document
await documents.update({
  documentId: 'abc123',
  data: {
    title: 'Updated Title',
    content: 'Updated content...'
  }
});

// Delete Document
await documents.delete({
  documentId: 'abc123'
});
```

### Publishing Methods
```javascript
// Publish a Draft
await documents.publish({
  documentId: 'abc123'
});

// Unpublish to Draft
await documents.unpublish({
  documentId: 'abc123'
});

// Discard Draft Changes
await documents.discardDraft({
  documentId: 'abc123'
});
```

### Advanced Queries
```javascript
// Complex Filtering
await documents.findMany({
  filters: {
    $and: [
      { category: { name: { $eq: 'Technology' } } },
      { 
        $or: [
          { featured: true },
          { views: { $gt: 1000 } }
        ]
      }
    ]
  },
  populate: {
    author: {
      fields: ['name', 'email'],
      populate: ['avatar']
    },
    categories: true
  }
});

// Pagination Options
// Option 1: Offset-based
await documents.findMany({
  limit: 10,
  offset: 20
});

// Option 2: Page-based
await documents.findMany({
  pagination: {
    page: 3,
    pageSize: 10
  }
});
```

---

## ⚠️ BREAKING CHANGES

### 1. Database Changes
- **MySQL**: Version 5 no longer supported (requires 8+)
- **SQLite**: Must use `better-sqlite3` package
- **PostgreSQL**: No changes

### 2. Dependency Changes
```json
{
  // ❌ Old packages
  "sqlite3": "5.0.2",
  "strapi-plugin-*": "4.x",
  
  // ✅ New packages
  "better-sqlite3": "8.5.0",
  "@strapi/plugin-*": "5.x"
}
```

### 3. Configuration Changes
```javascript
// ❌ Strapi 4 - config/server.js
module.exports = {
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET')
    }
  }
};

// ✅ Strapi 5 - config/server.js
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS')
  }
});
```

### 4. API Changes
- Default input validation enabled
- Stricter multipart parsing with koa-body v6
- Helper-plugin removed from admin panel
- New middleware loading order

### 5. Admin Panel Changes
- Design System v2
- React Router v6
- No more helper-plugin
- New plugin registration API

---

## 🔧 MIGRATION GUIDE

### Step 1: Backup Everything
```bash
# Backup database
pg_dump strapi_db > backup.sql

# Backup code
git add .
git commit -m "Pre-v5 migration backup"
git tag pre-v5-migration
```

### Step 2: Run Upgrade Tool
```bash
# Install and run upgrade tool
npx @strapi/upgrade major

# This will:
# - Update dependencies
# - Run codemods
# - Add __TODO__ placeholders
```

### Step 3: Handle TODOs
```javascript
// Codemods add placeholders like:
const article = await strapi.entityService.findOne(
  'api::article.article',
  '__TODO__' // Replace with documentId
);

// Fix by updating to:
const article = await strapi.documents('api::article.article').findOne({
  documentId: 'actual-document-id'
});
```

### Step 4: Update API Consumers
```javascript
// Frontend API calls need updates
// ❌ Old
const article = response.data.attributes;

// ✅ New
const article = response.data;

// Or use compatibility header
fetch('/api/articles', {
  headers: {
    'Strapi-Response-Format': 'v4' // Temporary compatibility
  }
});
```

### Step 5: Test Publishing
```javascript
// Test new publishing workflow
const draft = await strapi.documents('api::article.article').create({
  data: { title: 'Draft Article' },
  status: 'draft'
});

// Publish when ready
await strapi.documents('api::article.article').publish({
  documentId: draft.documentId
});
```

---

## ✨ NEW FEATURES

### 1. Enhanced Draft & Publish
- Built-in draft/publish states
- Dedicated publishing methods
- Better preview capabilities
- Automatic draft creation

### 2. Performance Improvements
- Optimized Document Service queries
- Better caching strategies
- Reduced database queries
- Faster admin panel with Vite

### 3. Developer Experience
- Improved TypeScript support
- Better error messages
- Enhanced debugging tools
- Streamlined plugin development

### 4. Security Enhancements
- Default input validation
- Stricter configuration validation
- Better authentication handling
- Enhanced RBAC capabilities

---

## 💻 CODE EXAMPLES

### E-commerce Implementation
```javascript
// Product Management with Document Service
const productService = {
  async createProduct(data) {
    return await strapi.documents('api::product.product').create({
      data: {
        name: data.name,
        price: data.price,
        description: data.description,
        images: data.images,
        categories: {
          connect: data.categoryIds.map(id => ({ documentId: id }))
        }
      },
      status: 'draft'
    });
  },

  async publishProduct(documentId) {
    return await strapi.documents('api::product.product').publish({
      documentId
    });
  },

  async getPublishedProducts(filters = {}) {
    return await strapi.documents('api::product.product').findMany({
      filters: {
        ...filters,
        status: 'published'
      },
      populate: ['images', 'categories'],
      sort: { createdAt: 'desc' }
    });
  }
};
```

### Cart System Update
```javascript
// Updated Cart Service for Strapi 5
module.exports = {
  async addToCart(userId, productId, quantity) {
    // Find user's cart
    const carts = await strapi.documents('api::cart.cart').findMany({
      filters: { user: { documentId: userId } },
      populate: ['cart_items']
    });

    let cart = carts[0];
    
    if (!cart) {
      // Create new cart
      cart = await strapi.documents('api::cart.cart').create({
        data: {
          user: { connect: [userId] },
          cart_items: []
        }
      });
    }

    // Add item to cart
    const cartItem = await strapi.documents('api::cart-item.cart-item').create({
      data: {
        cart: { connect: [cart.documentId] },
        product: { connect: [productId] },
        quantity
      }
    });

    return cart;
  }
};
```

### Custom Controller with Document Service
```javascript
// src/api/article/controllers/article.js
module.exports = {
  async findPublished(ctx) {
    const { page = 1, pageSize = 10 } = ctx.query;

    const articles = await strapi.documents('api::article.article').findMany({
      status: 'published',
      populate: ['author', 'categories', 'cover'],
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize)
      },
      sort: { publishedAt: 'desc' }
    });

    // Transform response if needed
    const transformed = articles.map(article => ({
      ...article,
      readTime: calculateReadTime(article.content),
      excerpt: generateExcerpt(article.content)
    }));

    ctx.body = {
      data: transformed,
      meta: {
        pagination: articles.pagination
      }
    };
  }
};
```

---

## 🎯 BEST PRACTICES

### 1. Always Use Document Service
```javascript
// ❌ Don't use Entity Service
strapi.entityService.findOne(...);

// ❌ Don't use Query Engine directly
strapi.db.query(...);

// ✅ Use Document Service
strapi.documents('api::model.model').findOne(...);
```

### 2. Handle Status Properly
```javascript
// Always specify status for public APIs
async findPublishedArticles() {
  return await strapi.documents('api::article.article').findMany({
    status: 'published' // Explicit status
  });
}
```

### 3. Migration Strategy
1. Use compatibility header during transition
2. Update backend first, then frontend
3. Test publishing workflow thoroughly
4. Monitor for deprecation warnings

### 4. Performance Optimization
```javascript
// Optimize population
await strapi.documents('api::product.product').findMany({
  populate: {
    images: {
      fields: ['url', 'alternativeText'] // Only needed fields
    },
    categories: {
      fields: ['name', 'slug']
    }
  }
});
```

### 5. Error Handling
```javascript
try {
  const document = await strapi.documents('api::article.article').findOne({
    documentId: ctx.params.documentId
  });
  
  if (!document) {
    return ctx.notFound('Article not found');
  }
  
  ctx.body = { data: document };
} catch (error) {
  ctx.badRequest('Invalid document ID');
}
```

---

## 🔗 QUICK REFERENCE

### Common Replacements
| Strapi 4 | Strapi 5 |
|----------|----------|
| `id` | `documentId` |
| `attributes` | (flattened) |
| `publicationState` | `status` |
| `entityService` | `documents()` |
| `sqlite3` | `better-sqlite3` |
| `helper-plugin` | (removed) |

### Document Service Methods
- `findOne({ documentId, populate, status })`
- `findMany({ filters, populate, sort, limit, status })`
- `create({ data, status })`
- `update({ documentId, data })`
- `delete({ documentId })`
- `publish({ documentId })`
- `unpublish({ documentId })`
- `discardDraft({ documentId })`

### Status Values
- `'draft'` - Unpublished content
- `'published'` - Published content
- `null` - All content (draft + published)

---

*This knowledge base contains everything needed to work with Strapi 5 effectively. Keep it updated as new features are released!*