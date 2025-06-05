# 🧠 STRAPI EXPERT KNOWLEDGE BASE
*Perfect knowledge for Claude Code sessions*

## 🏗️ ARCHITECTURE CORE

### Content Management System
- **Content-Type Builder**: Schema creation (development only)
- **Content Manager**: Data entry management (dev + production)  
- **Backend Server**: HTTP/Koa server handling API requests
- **Admin Panel**: React frontend for content management

### Request Flow Architecture
```
Request → Global Middlewares → Routes → Policies → Route Middlewares → Controllers → Services → Models → Document Service → Query Engine → Database
```

### API Layers (High to Low Level)
1. **REST/GraphQL APIs**: Frontend access
2. **Document Service API**: Backend/plugin development (recommended)
3. **Query Engine API**: Low-level database (avoid unless necessary)

## 📋 CONTENT TYPES SYSTEM

### Types
- **Collection Types**: Multiple entries (products, articles)
- **Single Types**: One entry only (homepage, settings)
- **Components**: Reusable field structures
- **Dynamic Zones**: Flexible component combinations

### Field Types
- **Text**: Short (255 chars) / Long text
- **Number**: integer, big integer, **decimal** (use for money), float
- **Media**: Single/multiple files with type restrictions
- **Relation**: 6 types (one-way, 1:1, 1:many, many:1, many:many, many-way)
- **Boolean**: true/false/null toggle
- **Date**: date/datetime/time picker
- **Email**: Email validation
- **JSON**: Store objects/arrays
- **Enumeration**: Dropdown values
- **UID**: Unique identifier (slug generation)

### Relationship Best Practices
```javascript
// ✅ E-commerce Correct Patterns
Cart (1) ↔ (many) CartItems        // oneToMany/manyToOne
Order (1) ↔ (many) OrderedItems    // oneToMany/manyToOne
Artist (1) ↔ (many) ArtistsWork    // oneToMany/manyToOne

// ❌ Avoid for cart/order systems
Cart ↔ CartItems (manyToMany)      // Wrong for e-commerce
```

## 🔧 BACKEND CUSTOMIZATION

### Controllers
```javascript
// Handle HTTP requests
module.exports = createCoreController('api::cart.cart', ({ strapi }) => ({
  async calculateTotal(ctx) {
    // Custom logic here
  }
}));
```

### Services  
```javascript
// Reusable business logic
module.exports = createCoreService('api::artists-work.artists-work', ({ strapi }) => ({
  async calculatePrice(width, height, basePricePerCm) {
    return width * height * basePricePerCm;
  }
}));
```

### Routes
- Auto-generated for content-types
- Customizable with policies and middlewares
- File: `src/api/[content-type]/routes/[content-type].js`

### Middlewares
- **Global**: All requests (compression, rate limiting, logging)
- **Route-specific**: Specific endpoints only
- Configuration: `config/middlewares.js` (order matters)

## ⚙️ CONFIGURATION SYSTEM

### Core Files
- `config/database.js`: Database connection
- `config/server.js`: Server settings  
- `config/middlewares.js`: Middleware stack
- `config/plugins.js`: Plugin configuration

### Environment Variables
```bash
DATABASE_CLIENT=postgres
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your-secret-key
ADMIN_JWT_SECRET=your-admin-secret
```

### Middleware Configuration Example
```javascript
module.exports = [
  'strapi::logger',
  'global::requestLogger',    // Custom monitoring
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'global::compression',      // Performance
  'global::rateLimiter',      // Security  
  'strapi::body',
  'global::apiCache',         // Redis caching
  'strapi::public'
];
```

## 🏪 E-COMMERCE BEST PRACTICES

### Data Modeling
```javascript
// ✅ Correct field types
{
  "base_price_per_cm_square": { "type": "decimal" },    // Money
  "original_width": { "type": "decimal" },              // Dimensions
  "original_height": { "type": "decimal" },             // Dimensions
  "quantity": { "type": "integer" },                    // Counts
  "description": { "type": "text" },                    // Content
  "images": { "type": "media", "multiple": true }       // Files
}
```

### Relationship Patterns
```javascript
// Cart System
cart: {
  user: { relation: "oneToOne", target: "plugin::users-permissions.user" },
  cart_items: { relation: "oneToMany", target: "api::cart-item.cart-item", mappedBy: "cart" }
}

cart_item: {
  cart: { relation: "manyToOne", target: "api::cart.cart", inversedBy: "cart_items" },
  art: { relation: "manyToOne", target: "api::artists-work.artists-work" },
  quantity: { type: "integer" },
  price: { type: "decimal" }
}
```

## 🚀 PERFORMANCE OPTIMIZATION

### Middleware Stack
```javascript
// Essential performance middlewares
'global::compression',      // Reduce bandwidth
'global::rateLimiter',      // Prevent abuse  
'global::apiCache',         // Redis caching
'global::requestLogger'     // Monitoring
```

### Database Optimization
- Use **indexes** on frequently queried fields
- Proper **population** strategy for relationships
- **Decimal** type for monetary calculations
- Avoid **manyToMany** for simple relationships

### API Optimization
```javascript
// Efficient population
await strapi.documents('api::cart.cart').findMany({
  populate: {
    cart_items: {
      populate: ['art', 'paper_type']
    }
  }
});
```

## 🔒 SECURITY & PERMISSIONS

### Role-Based Access Control
- **Public**: Publicly accessible content
- **Authenticated**: Logged-in users only
- **Admin**: Full access to admin panel
- **Custom roles**: Specific permission sets

### API Security
```javascript
// Private fields (excluded from API)
"password": { "type": "password", "private": true }

// Required fields (validation)
"email": { "type": "email", "required": true, "unique": true }
```

## 🛠️ DEVELOPMENT WORKFLOW

### Commands
```bash
npm run develop    # Development with Content-Type Builder
npm run build      # Production build
npm run start      # Production server
npm run strapi     # CLI commands
```

### Environment Rules
- **Content-Type Builder**: Development only
- **Database migrations**: Automatic on save
- **Plugin development**: Development environment recommended

## 📡 API USAGE PATTERNS

### REST API Examples
```javascript
// GET with filters and population
GET /api/artists-work?populate=*&filters[artist][name][$eq]=Picasso

// POST new cart item
POST /api/cart-items
{
  "data": {
    "cart": 1,
    "art": 5,
    "quantity": 2,
    "price": 150.00
  }
}

// PUT update order
PUT /api/orders/1
{
  "data": {
    "status": "completed",
    "total_price": 350.75
  }
}
```

### Document Service API (Backend)
```javascript
// Create entry
await strapi.documents('api::cart.cart').create({
  data: { user: userId, total_price: 0 }
});

// Find with population
await strapi.documents('api::order.order').findMany({
  filters: { user: userId },
  populate: { ordered_items: true }
});

// Update entry
await strapi.documents('api::cart.cart').update({
  documentId: cartId,
  data: { total_price: newTotal }
});
```

## 🎯 STRAPI 5 SPECIFIC FEATURES

### Documents vs Entries
- **Documents**: New Strapi 5 concept with better versioning
- **Draft & Publish**: Built-in content versioning
- **Content History**: Track all changes
- **Internationalization**: Multi-language support

### New APIs
- **Document Service**: Replaces Entity Service (recommended)
- **Query Engine**: Low-level database access
- **Content API**: Unified REST/GraphQL access

---

## 💡 QUICK REFERENCE

### Common Issues & Solutions
1. **405 Method Not Allowed**: Check route registration and HTTP method
2. **Relationship errors**: Verify manyToOne/oneToMany pairing
3. **Type errors**: Use decimal for money, integer for counts
4. **Permission denied**: Check public role permissions in Settings

### Performance Checklist
- ✅ Compression middleware enabled
- ✅ Rate limiting configured  
- ✅ Redis caching implemented
- ✅ Proper relationship modeling
- ✅ Decimal types for money
- ✅ Database indexes on query fields

### Security Checklist  
- ✅ JWT secrets configured
- ✅ CORS properly set up
- ✅ Public permissions configured
- ✅ Private fields marked
- ✅ Rate limiting active
- ✅ Input validation enabled

---

*Cette base de connaissances contient tout ce dont Claude Code a besoin pour être expert Strapi à chaque session. Garde ce fichier dans ton projet !*