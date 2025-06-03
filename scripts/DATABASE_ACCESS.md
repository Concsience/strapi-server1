# Database Access Tools

Since MCP PostgreSQL backend is not working, use these alternative methods:

## 1. Quick Bash Script (scripts/db-query.sh)
```bash
# Basic query
./scripts/db-query.sh "SELECT * FROM users-permissions_user LIMIT 5;"

# Count records
./scripts/db-query.sh "SELECT COUNT(*) FROM artists-works;"

# Check tables
./scripts/db-query.sh "\dt"
```

## 2. Node.js Tool (scripts/strapi-db.js)
```bash
# Use presets
node scripts/strapi-db.js --preset users
node scripts/strapi-db.js --preset products
node scripts/strapi-db.js --preset tables

# Custom queries
node scripts/strapi-db.js "SELECT id, title FROM artists-works WHERE price > 100"
```

## 3. Direct psql Access
```bash
# Interactive mode
PGPASSWORD=strapi123 psql -h localhost -U strapi -d strapi_conscience

# One-liner queries
PGPASSWORD=strapi123 psql -h localhost -U strapi -d strapi_conscience -c "SELECT version();"
```

## 4. Strapi Console (Best for ORM queries)
```bash
npm run strapi console

# Then in console:
const users = await strapi.db.query('plugin::users-permissions.user').findMany();
console.log(users);

const products = await strapi.db.query('api::artists-work.artists-work').findMany({ limit: 10 });
console.log(products);
```

## Common Database Tables
- `users-permissions_user` - Users
- `artists-works` - Products/Artworks  
- `artists` - Artists
- `carts` - Shopping carts
- `cart_items` - Cart items
- `orders` - Orders
- `ordered_items` - Order items
- `addresses` - User addresses
- `wishlists` - User wishlists

## Connection Details
- Host: localhost
- Port: 5432
- Database: strapi_conscience
- User: strapi
- Password: strapi123