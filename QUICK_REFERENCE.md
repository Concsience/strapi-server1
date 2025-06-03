# 🚀 STRAPI BACKEND - QUICK REFERENCE

## 🔧 Start Development
```bash
npm run develop       # Start Strapi dev server
```

## 📊 Database Access (PostgreSQL)
```bash
# Quick queries
./scripts/db-query.sh "SELECT * FROM artists_works LIMIT 5;"

# Show all tables
./scripts/db-query.sh "\dt"

# Node.js presets
node scripts/strapi-db.js --preset tables
node scripts/strapi-db.js --preset products

# Custom query
node scripts/strapi-db.js "SELECT id, title FROM artists_works WHERE price > 100"
```

## 🏗️ Common Tables
- `up_users` - Users
- `artists_works` - Products/Artworks
- `artists` - Artists info
- `carts` - Shopping carts
- `orders` - Customer orders
- `addresses` - Shipping addresses

## 🔐 Admin Access
- URL: http://localhost:1337/admin
- Database: strapi_conscience
- User: strapi / Pass: strapi123

## 📝 API Endpoints
```bash
# Health check
curl http://localhost:1337/_health

# Get products
curl http://localhost:1337/api/artists-works

# Get with relations
curl http://localhost:1337/api/artists-works?populate=*
```

## 🛠️ Strapi Console
```bash
npm run strapi console

# In console:
const products = await strapi.db.query('api::artists-work.artists-work').findMany();
console.log(products);
```

## 📦 Build & Deploy
```bash
npm run build         # Build admin panel
npm run start         # Start production server
```

## 🐛 Debugging
```bash
# With debug logs
DEBUG=strapi:* npm run develop

# Check logs
pm2 logs              # If using PM2
```

## 💡 MCP Status
- ✅ filesystem-backend: auto-configured
- ✅ strapi-docs: puppeteer for web scraping
- ❌ postgres/memory: removed (use scripts instead)