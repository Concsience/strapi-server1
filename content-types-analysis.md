# Comprehensive Content-Type Analysis Report

## Executive Summary

This Strapi backend manages an art e-commerce platform with 22 content types and 18 components. The system handles artwork sales, user management, shopping carts, orders, and content pages. Critical issues identified include inefficient relationship patterns, missing validations, lack of indexes, and security vulnerabilities.

## Content-Type Categories

### 1. Core E-commerce Entities

#### **Artist** (`api::artist.artist`)
- **Purpose**: Artist profiles and information
- **Key Fields**:
  - `name` (string) - No validation, should be required
  - `image`, `backgroundImage` (media) - Artist photos
  - `description` (text) - Bio information
  - `DOB`, `DOD` (string) - Should be date type
- **Relations**:
  - `art` → oneToMany → `artists-work` (artist's artworks)
  - `timeline_1s` → manyToMany → `timeline1` (timeline associations)
- **Issues**:
  - DOB/DOD stored as strings instead of dates
  - No required fields validation
  - Missing slug for SEO-friendly URLs

#### **Artists Work** (`api::artists-work.artists-work`)
- **Purpose**: Individual artwork listings
- **Key Fields**:
  - `artname` (string) - Artwork title
  - `artimage` (media) - Artwork image
  - `popularityscore` (integer) - For sorting/ranking
  - `original_width`, `original_height` (string) - Should be numeric
  - `base_price_per_cm_square` (string) - Should be decimal
  - `max_size` (string) - Maximum print size
- **Relations**:
  - `artist` → manyToOne → `artist` (artwork creator)
  - `cart_items` → oneToMany → `cart-item`
  - `ordered_items` → oneToMany → `ordered-item`
  - `productsheet` → oneToOne → `productsheet1`
  - `wishlists` → manyToMany → `wishlist`
- **Critical Issues**:
  - Pricing stored as string instead of decimal
  - Dimensions stored as strings
  - No SKU or inventory tracking
  - Missing validation for required fields

#### **Paper Type** (`api::paper-type.paper-type`)
- **Purpose**: Print paper options for artworks
- **Key Fields**:
  - `paper_names` (string) - Paper type name
  - `paper_price_per_cm_square` (string) - Should be decimal
- **Relations**:
  - `cart_items` → oneToMany → `cart-item`
  - `ordered_items` → manyToMany → `ordered-item`
- **Issues**:
  - Price stored as string
  - No quality/weight specifications
  - Missing availability status

### 2. Shopping Cart System

#### **Cart** (`api::cart.cart`)
- **Purpose**: User shopping cart
- **Key Fields**:
  - `total_price` (decimal) - Cart total
- **Relations**:
  - `user` → oneToOne → `users-permissions.user`
  - `cart_items` → manyToMany → `cart-item` ⚠️ **WRONG PATTERN**
- **Critical Issue**: Cart should have oneToMany relation with cart-items, not manyToMany

#### **Cart Item** (`api::cart-item.cart-item`)
- **Purpose**: Individual items in cart
- **Key Fields**:
  - `arttitle`, `artistname` (string) - Denormalized data
  - `width`, `height` (string) - Should be numeric
  - `price` (decimal) - Item price
- **Relations**:
  - `art` → manyToOne → `artists-work`
  - `carts` → manyToMany → `cart` ⚠️ **WRONG PATTERN**
  - `paper_type` → manyToOne → `paper-type`
- **Issues**:
  - Missing quantity field
  - Duplicated data (arttitle, artistname)
  - Wrong relationship pattern with cart

### 3. Order Management

#### **Order** (`api::order.order`)
- **Purpose**: Completed orders
- **Key Fields**:
  - `status` (string) - No enum validation
  - `total_price` (decimal)
- **Relations**:
  - `user` → manyToOne → `users-permissions.user`
  - `ordered_items` → manyToMany → `ordered-item` ⚠️ **WRONG PATTERN**
- **Critical Issues**:
  - Missing order number, timestamps
  - No payment reference
  - No shipping/billing address relations
  - Status should be enum with defined values

#### **Ordered Item** (`api::ordered-item.ordered-item`)
- **Purpose**: Items within orders
- **Key Fields**:
  - Similar to cart-item plus `quantity` (integer)
- **Relations**:
  - `art` → manyToOne → `artists-work`
  - `orders` → manyToMany → `order` ⚠️ **WRONG PATTERN**
  - `paper_types` → manyToMany → `paper-type`
- **Issues**:
  - Wrong relationship patterns
  - Paper type should be manyToOne

### 4. User Management

#### **User** (Extended `plugin::users-permissions.user`)
- **Additional Fields**:
  - `firstName`, `Surname` (string) - Inconsistent naming
  - `telephone` (string) - No validation
- **Relations**:
  - `addresses` → oneToMany → `address`
  - `cart` → oneToOne → `cart`
  - `orders` → oneToMany → `order`
  - `wishlist` → oneToOne → `wishlist`

#### **Address** (`api::address.address`)
- **Purpose**: User shipping/billing addresses
- **Fields**: All uppercase naming (POSTALCODE, USERNAME, etc.)
- **Issues**:
  - No address type (shipping/billing)
  - No default address flag
  - Inconsistent field naming

### 5. User Features

#### **Wishlist** (`api::wishlist.wishlist`)
- **Purpose**: User's saved artworks
- **Relations**:
  - `users_permissions_user` → oneToOne → user
  - `arts` → manyToMany → `artists-work`

#### **Favorite** (`api::favorite.favorite`)
- **Purpose**: Unused/deprecated feature
- **Status**: Empty, should be removed

### 6. Product Information

#### **Productsheet1** (`api::productsheet1.productsheet1`)
- **Purpose**: Detailed artwork information
- **Fields**: Extensive metadata about artworks
- **Component**: Uses `productsheetdescriptions` component
- **Issues**:
  - Poor naming convention
  - Many fields could be structured better

### 7. Content Pages (Single Types)

- **Homepage**: Dynamic zones with hero sections
- **Sign-in/Sign-up Pages**: Authentication page content
- **Onboarding**: User onboarding content
- **Stripe**: Payment processing (minimal implementation)

### 8. Additional Content Types

- **List Collection**: Book collections
- **Authorbook**: Book products (separate from artworks)
- **Nos Auteur**: Author profiles (separate system)
- **Timeline/ActivitiesTimeline**: Artist timeline data

## Relationship Map

```
User
├── Cart (1:1)
│   └── Cart Items (M:M - WRONG) → Should be 1:M
│       ├── Artists Work (M:1)
│       └── Paper Type (M:1)
├── Orders (1:M)
│   └── Ordered Items (M:M - WRONG) → Should be 1:M
│       ├── Artists Work (M:1)
│       └── Paper Types (M:M - WRONG) → Should be M:1
├── Addresses (1:M)
└── Wishlist (1:1)
    └── Artists Works (M:M)

Artist
├── Artists Works (1:M)
│   ├── Productsheet (1:1)
│   ├── Cart Items (1:M)
│   ├── Ordered Items (1:M)
│   └── Wishlists (M:M)
└── Timelines (M:M)
```

## Critical Issues & Recommendations

### 1. **Relationship Architecture Issues**

**Problem**: Cart ↔ Cart-Item and Order ↔ Ordered-Item use manyToMany relations
```javascript
// WRONG - Current Implementation
cart_items: {
  relation: "manyToMany",
  target: "api::cart-item.cart-item"
}

// CORRECT - Should be
cart_items: {
  relation: "oneToMany",
  target: "api::cart-item.cart-item",
  mappedBy: "cart"
}
```

**Impact**: 
- Cart items can belong to multiple carts (data integrity issue)
- Performance degradation with join tables
- Complex queries for simple operations

### 2. **Data Type Issues**

**Problems**:
- Prices stored as strings: `base_price_per_cm_square`, `paper_price_per_cm_square`
- Dimensions as strings: `width`, `height`, `original_width`, `original_height`
- Dates as strings: `DOB`, `DOD`

**Recommendations**:
```javascript
// Convert string prices to decimal
base_price_per_cm_square: {
  type: "decimal",
  required: true,
  min: 0
}

// Convert dimensions to numbers
width: {
  type: "float",
  required: true,
  min: 0
}

// Use proper date fields
DOB: {
  type: "date"
}
```

### 3. **Missing Validations**

**Critical Missing Validations**:
- No required fields on core entities
- No email format validation on custom fields
- No enum validation for status fields
- No min/max constraints on prices
- No unique constraints where needed

### 4. **Missing Indexes**

**Recommended Indexes**:
```sql
-- Performance critical queries
CREATE INDEX idx_cart_user ON carts(user_id);
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_ordered_items_order ON ordered_items(order_id);
CREATE INDEX idx_artists_work_artist ON artists_works(artist_id);
CREATE INDEX idx_artists_work_popularity ON artists_works(popularityscore DESC);

-- Search optimization
CREATE INDEX idx_artists_name ON artists(name);
CREATE INDEX idx_artists_work_artname ON artists_works(artname);
```

### 5. **API Design Improvements**

**Current Issues**:
- No pagination on large collections
- Missing filtering capabilities
- No sorting options defined
- No field selection (GraphQL-style)

**Recommendations**:
1. Implement pagination on all collection endpoints
2. Add filters for price ranges, artists, dimensions
3. Enable sorting by popularity, price, date
4. Implement field selection to reduce payload

### 6. **Data Integrity Concerns**

**Issues**:
- Denormalized data in cart/order items (arttitle, artistname)
- No cascade delete rules
- Missing transactions for multi-step operations
- No audit trail for orders

**Solutions**:
1. Remove denormalized fields, use relations
2. Define cascade behaviors
3. Implement database transactions
4. Add created_at, updated_at to all entities

### 7. **Security Vulnerabilities**

**Identified Issues**:
- No field-level permissions
- Missing input sanitization
- No rate limiting on API endpoints
- Exposed internal IDs

**Recommendations**:
1. Implement field-level security
2. Add input validation middleware
3. Configure rate limiting
4. Use UUIDs instead of sequential IDs

## Performance Optimization Plan

### 1. **Database Optimizations**
- Fix relationship patterns (M:M → 1:M)
- Add missing indexes
- Implement query result caching
- Use database views for complex queries

### 2. **API Optimizations**
- Implement response caching
- Add pagination everywhere
- Optimize media queries
- Lazy load relations

### 3. **Data Structure Improvements**
- Normalize cart/order item data
- Convert string fields to proper types
- Remove unused content types
- Consolidate similar entities

## Migration Strategy

### Phase 1: Critical Fixes (1-2 days)
1. Fix cart/order relationship patterns
2. Add required field validations
3. Convert critical string fields to proper types
4. Add missing indexes

### Phase 2: Data Integrity (3-5 days)
1. Remove denormalized data
2. Add cascade rules
3. Implement transactions
4. Add audit fields

### Phase 3: Performance (1 week)
1. Implement caching
2. Add pagination
3. Optimize queries
4. Add monitoring

### Phase 4: Security (1 week)
1. Field-level permissions
2. Input validation
3. Rate limiting
4. UUID migration

## Component Analysis

### Reusable Components
1. **productsheetdescriptions**: Extended product details
2. **productcard**: Product display card
3. **cartproductcard**: Cart item display
4. **header/footer**: Site navigation components

### Component Issues
- Inconsistent naming conventions
- Some components have relations (unusual)
- Missing shared validation components

## Conclusion

The current schema has fundamental architectural issues that impact data integrity, performance, and scalability. The most critical issues are the incorrect relationship patterns in the cart/order system and the widespread use of string types for numeric data. These issues should be addressed immediately to prevent data corruption and improve system performance.

The recommended migration strategy prioritizes critical fixes while maintaining system stability. Each phase builds upon the previous one, ensuring a smooth transition to a more robust architecture.