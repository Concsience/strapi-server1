# Backup Information
- Date: Tue Jun  3 20:58:50 CEST 2025
- Strapi Version: 5.14.0
- Node Version: v20.19.2
- Database: PostgreSQL (strapi_conscience)
- Environment: Staging

## Files Backed Up:
- All configuration files (config/)
- Environment variables (.env)
- Package files (package.json, package-lock.json)
- Critical API controllers (cart, order, stripe, payment)
- Custom middlewares
- PM2 configuration

## Current Git Status:
 M package-lock.json
 M package.json
 M src/api/cart/controllers/cart.ts
 M src/api/image-import/controllers/image-import.js
 M src/api/payment/controllers/payment.js
 M src/api/stripe/controllers/stripe.ts
 M src/cron/index.js
 M src/utils/decryptTilesBuffer.js
 M src/utils/uploadImageFromUrl.js
 M src/utils/uploadTiles.js
 M tsconfig.json
?? MIDDLEWARE_STRAPI5_COMPATIBILITY_REPORT.md
?? STRAPI_5_COMPLIANCE_REPORT.md
?? STRAPI_5_ENTITY_SERVICE_MIGRATIONS.md
?? STRAPI_5_MIGRATION_CHECKLIST.md
?? STRAPI_5_MIGRATION_FINAL_REPORT.md
?? STRAPI_5_MIGRATION_PLAN.md
?? STRAPI_5_PRE_MIGRATION_ANALYSIS.md
?? backup_database.sh
?? backup_state.sh
?? backups/
?? clean-migration-strategy.sh
?? clean-strapi-5-migration.js
?? clean-strapi/
?? hardcore-strapi.js
?? manual-start.js
?? manual-strapi.js
?? migrate-to-strapi-5.sh
?? node_modules.backup/
?? node_modules.clean/
?? node_modules.old/
?? package-lock.json.backup
?? quick-start.js
?? src/api/cart/controllers/cart.js
?? src/api/cart/routes/cart.js
?? src/api/order/controllers/order.js
?? src/api/order/routes/order.js
?? src/api/order/services/order.js
?? src/api/stripe/controllers/stripe.js
?? src/api/stripe/routes/stripe.js
?? src/index.js
?? src/middlewares/apiCache.js
?? src/middlewares/compression.js
?? src/middlewares/rateLimiter.js
?? src/migrations/
?? src/types/strapi-v5.d.ts
?? start-strapi.js
?? strapi-clean/
?? strapi-start.js
?? validate-strapi-5-migration.js

## Current Branch:
feature/typescript-strapi-official

## Last Commit:
2952426 Pre-Strapi-5 migration backup - 2025-06-03-16:11:15
