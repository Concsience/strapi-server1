# STRAPI E-COMMERCE API ENDPOINT MAPPING

## 🔐 Authentication & User Management

### Auth Endpoints (users-permissions plugin)
```
POST   /api/auth/local                    - Login with email/password
POST   /api/auth/local/register           - Register new user
POST   /api/auth/forgot-password          - Request password reset
POST   /api/auth/reset-password           - Reset password with token
GET    /api/auth/email-confirmation       - Confirm email
POST   /api/auth/send-email-confirmation  - Resend confirmation email
GET    /api/users/me                      - Get current user profile
PUT    /api/users/:id                     - Update user profile
```

### User Schema Extensions
- `firstName`: string
- `Surname`: string  
- `telephone`: string
- `addresses`: One-to-Many relation
- `cart`: One-to-One relation
- `orders`: One-to-Many relation
- `wishlist`: One-to-One relation

## 🎨 Artist & Artwork Management

### Artist API (`/api/artists`)
```
GET    /api/artists                       - List all artists (public)
GET    /api/artists/:id                   - Get artist details
POST   /api/artists                       - Create artist (admin)
PUT    /api/artists/:id                   - Update artist (admin)
DELETE /api/artists/:id                   - Delete artist (admin)
```

**Artist Schema:**
- `name`: string
- `image`: media (single)
- `description`: text
- `DOB`: string (Date of Birth)
- `DOD`: string (Date of Death)
- `backgroundImage`: media
- `art`: One-to-Many → artists-work
- `timeline_1s`: Many-to-Many → timeline1

### Artists Work API (`/api/artists-works`)
```
GET    /api/artists-works                 - List all artworks
GET    /api/artists-works/:id             - Get artwork details
POST   /api/artists-works                 - Create artwork (admin)
PUT    /api/artists-works/:id             - Update artwork (admin)
DELETE /api/artists-works/:id             - Delete artwork (admin)
```

**Artists Work Schema:**
- `artimage`: media (artwork image)
- `artname`: string
- `artist`: Many-to-One → artist
- `popularityscore`: integer
- `original_width`: string
- `original_height`: string
- `base_price_per_cm_square`: string
- `max_size`: string
- `productsheet`: One-to-One → productsheet1
- `cart_items`: One-to-Many → cart-item
- `ordered_items`: One-to-Many → ordered-item
- `wishlists`: Many-to-Many → wishlist

## 🛒 Shopping Cart System

### Cart API (`/api/carts`)
```
GET    /api/carts                         - List all carts (admin)
GET    /api/carts/:id                     - Get cart details
POST   /api/carts                         - Create cart
PUT    /api/carts/:id                     - Update cart
DELETE /api/carts/:id                     - Delete cart
```

**Cart Schema:**
- `user`: One-to-One → user
- `cart_items`: Many-to-Many → cart-item ⚠️
- `total_price`: decimal

### Cart Item API (`/api/cart-items`)
```
GET    /api/cart-items                    - List cart items
GET    /api/cart-items/:id                - Get cart item details
POST   /api/cart-items                    - Add item to cart
PUT    /api/cart-items/:id                - Update cart item
DELETE /api/cart-items/:id                - Remove from cart
```

**Cart Item Schema:**
- `arttitle`: string
- `artistname`: string
- `width`: string
- `height`: string
- `price`: decimal
- `art`: Many-to-One → artists-work
- `paper_type`: Many-to-One → paper-type
- `carts`: Many-to-Many → cart ⚠️

## 📦 Order Management

### Order API (`/api/orders`)
```
GET    /api/orders                        - List user orders
GET    /api/orders/:id                    - Get order details
POST   /api/orders                        - Create order (custom controller)
PUT    /api/orders/:id                    - Update order status
DELETE /api/orders/:id                    - Cancel order
```

**Custom Order Controller:**
```javascript
// POST /api/orders - Creates order without payment
{
  data: {
    totalprice: number
  }
}
// Returns: { success: true, message, order }
```

**Order Schema:**
- `user`: Many-to-One → user
- `status`: string ("pending", "processing", "completed", "cancelled")
- `ordered_items`: Many-to-Many → ordered-item ⚠️
- `total_price`: decimal

### Ordered Item API (`/api/ordered-items`)
```
GET    /api/ordered-items                 - List ordered items
GET    /api/ordered-items/:id             - Get ordered item
POST   /api/ordered-items                 - Create ordered item
PUT    /api/ordered-items/:id             - Update ordered item
DELETE /api/ordered-items/:id             - Delete ordered item
```

## 💳 Payment Processing (Stripe)

### Stripe API (`/api/stripe`)
```
POST   /api/stripe/create-payment-intent  - Create Stripe PaymentIntent
GET    /api/stripe/payment-methods        - Get saved payment methods
```

**Create Payment Intent:**
```javascript
// POST /api/stripe/create-payment-intent
{
  amount: number // in euros, will be converted to cents
}
// Returns: { success, client_secret, payment_intent_id }
```

**Stripe Extension (`/api/stripe`):**
- Same endpoints duplicated via extension system
- No authentication required (`auth: false`)
- Validates Stripe configuration before processing

## 💝 Wishlist Management

### Wishlist API (`/api/wishlists`)
```
GET    /api/wishlists                     - List wishlists
GET    /api/wishlists/:id                 - Get wishlist
POST   /api/wishlists                     - Create wishlist
PUT    /api/wishlists/:id                 - Update wishlist
DELETE /api/wishlists/:id                 - Delete wishlist
```

**Wishlist Schema:**
- `users_permissions_user`: One-to-One → user
- `arts`: Many-to-Many → artists-work

## 📍 Address Management

### Address API (`/api/addresses`)
```
GET    /api/addresses                     - List user addresses
GET    /api/addresses/:id                 - Get address details
POST   /api/addresses                     - Create address
PUT    /api/addresses/:id                 - Update address
DELETE /api/addresses/:id                 - Delete address
```

**Address Schema:**
- `owner`: Many-to-One → user
- `USERNAME`: string
- `ADDRESSEEUSER`: string
- `POSTALCODE`: string
- `CITY`: string
- `REGION`: string
- `PHONENUMBER`: string

## 📄 Content Pages

### Homepage API (`/api/homepages`)
```
GET    /api/homepages                     - Get homepage content
```

### Sign-in Page API (`/api/sign-in-pages`)
```
GET    /api/sign-in-pages                 - Get sign-in page content
```

### Sign-up Page API (`/api/sign-up-pages`)
```
GET    /api/sign-up-pages                 - Get sign-up page content
```

### Onboarding API (`/api/onboardings`)
```
GET    /api/onboardings                   - Get onboarding content
```

## 📚 Additional Collections

### Paper Type API (`/api/paper-types`)
```
GET    /api/paper-types                   - List paper types
GET    /api/paper-types/:id               - Get paper type details
```

### Product Sheet API (`/api/productsheet1s`)
```
GET    /api/productsheet1s                - List product sheets
GET    /api/productsheet1s/:id            - Get product sheet
```

### Author Book API (`/api/authorbooks`)
```
GET    /api/authorbooks                   - List author books
GET    /api/authorbooks/:id               - Get author book
```

### Timeline API (`/api/timeline1s`)
```
GET    /api/timeline1s                    - List timelines
GET    /api/timeline1s/:id                - Get timeline
```

### Activities Timeline API (`/api/activitiestimelines`)
```
GET    /api/activitiestimelines           - List activity timelines
GET    /api/activitiestimelines/:id       - Get activity timeline
```

### List Collection API (`/api/list-collections`)
```
GET    /api/list-collections              - List collections
GET    /api/list-collections/:id          - Get collection
```

### Nos Auteur API (`/api/nos-auteurs`)
```
GET    /api/nos-auteurs                   - List nos auteurs
GET    /api/nos-auteurs/:id               - Get nos auteur
```

## 🔧 E-commerce Workflow

### 1. User Registration/Login Flow
```
1. POST /api/auth/local/register → Create account
2. POST /api/auth/local → Login
3. GET /api/users/me → Get profile with relations
4. POST /api/carts → Create user cart (one-time)
5. POST /api/wishlists → Create wishlist (one-time)
```

### 2. Shopping Flow
```
1. GET /api/artists-works?populate=* → Browse products
2. POST /api/cart-items → Add to cart
3. GET /api/carts/:id?populate=cart_items → View cart
4. PUT /api/cart-items/:id → Update quantities
5. DELETE /api/cart-items/:id → Remove items
```

### 3. Checkout Flow
```
1. POST /api/addresses → Save shipping address
2. POST /api/stripe/create-payment-intent → Get payment intent
3. [Frontend: Confirm payment with Stripe]
4. POST /api/orders → Create order after payment
5. POST /api/ordered-items → Copy cart items to order
6. DELETE /api/cart-items/:id → Clear cart
```

### 4. Order Management
```
1. GET /api/orders?filters[user][:id]=X → User orders
2. GET /api/orders/:id?populate=* → Order details
3. PUT /api/orders/:id → Update status (admin)
```

## ⚠️ Critical Issues Identified

### 1. **Relation Architecture Problems**
- Cart ↔ CartItem: Many-to-Many should be One-to-Many
- Order ↔ OrderedItem: Many-to-Many should be One-to-Many
- This causes data integrity issues and complex queries

### 2. **Missing Business Logic**
- No inventory management
- No price calculation in services
- No order status workflow
- No payment verification with Stripe
- No automatic cart creation for users

### 3. **Security Gaps**
- No custom policies for user-specific data
- Missing rate limiting on critical endpoints
- No input validation in controllers
- Stripe webhook verification missing

### 4. **Performance Issues**
- No pagination on list endpoints
- Missing database indexes
- No query optimization (populate=*)
- No caching strategy

## 🚀 Optimization Recommendations

### 1. **Fix Relations**
```javascript
// Cart → CartItem: One-to-Many
// Order → OrderedItem: One-to-Many
// This simplifies queries and improves performance
```

### 2. **Add Custom Controllers**
```javascript
// Cart management
async getUserCart(ctx) {
  const user = ctx.state.user;
  let cart = await strapi.query('api::cart.cart')
    .findOne({ where: { user: user.id }, populate: ['cart_items'] });
  
  if (!cart) {
    cart = await strapi.service('api::cart.cart')
      .create({ data: { user: user.id } });
  }
  
  return cart;
}
```

### 3. **Implement Services**
```javascript
// Price calculation service
async calculateItemPrice(artId, width, height, paperTypeId) {
  const art = await strapi.query('api::artists-work.artists-work')
    .findOne({ where: { id: artId } });
  
  const area = (width * height) / 10000; // cm² to m²
  const basePrice = parseFloat(art.base_price_per_cm_square);
  
  return area * basePrice;
}
```

### 4. **Add Middleware**
```javascript
// Rate limiting for orders
const rateLimit = require('koa-ratelimit');
strapi.app.use(rateLimit({
  driver: 'memory',
  db: new Map(),
  duration: 60000, // 1 minute
  max: 5, // 5 requests per minute
  id: (ctx) => ctx.state.user?.id || ctx.ip,
}));
```

### 5. **Database Optimization**
```sql
-- Add indexes for common queries
CREATE INDEX idx_cart_user ON carts(user_id);
CREATE INDEX idx_order_user ON orders(user_id);
CREATE INDEX idx_order_status ON orders(status);
CREATE INDEX idx_artists_work_artist ON artists_works(artist_id);
```

## 📊 API Usage Examples

### Get User Cart with Items
```bash
GET /api/carts?filters[user][id][$eq]=1&populate[cart_items][populate]=art,paper_type
```

### Create Order from Cart
```javascript
// 1. Get cart items
const cart = await fetch('/api/carts/1?populate=cart_items');

// 2. Create payment intent
const payment = await fetch('/api/stripe/create-payment-intent', {
  method: 'POST',
  body: JSON.stringify({ amount: cart.total_price })
});

// 3. After payment confirmation
const order = await fetch('/api/orders', {
  method: 'POST',
  body: JSON.stringify({
    data: { totalprice: cart.total_price }
  })
});
```

### Filter Products by Artist
```bash
GET /api/artists-works?filters[artist][id][$eq]=1&populate=artist,productsheet
```

## 🔑 Environment Variables Required
```bash
# Database
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=strapi_conscience
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=strapi123

# Stripe
STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY=sk_test_...

# JWT
JWT_SECRET=<64-char-secret>
ADMIN_JWT_SECRET=<64-char-secret>

# OVH S3
OVH_ACCESS_KEY=<access-key>
OVH_SECRET_KEY=<secret-key>
OVH_ENDPOINT=https://s3.rbx.io.cloud.ovh.net
OVH_REGION=rbx
OVH_BUCKET=image-artedusa
```

## 🚦 Health Check Endpoint
```
GET /_health → Returns 204 No Content if healthy
```