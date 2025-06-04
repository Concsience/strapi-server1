#!/bin/bash
# Strapi Backend Backup Script
# Created: $(date +"%Y-%m-%d %H:%M:%S")

BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
echo "🔒 Creating backup in $BACKUP_DIR"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup critical files
echo "📁 Backing up configuration files..."
cp -r config "$BACKUP_DIR/"
cp .env "$BACKUP_DIR/.env.backup" 2>/dev/null || echo "⚠️  No .env file found"
cp package.json "$BACKUP_DIR/"
cp package-lock.json "$BACKUP_DIR/"
cp ecosystem.config.js "$BACKUP_DIR/"
cp tsconfig.json "$BACKUP_DIR/"

# Backup API structure
echo "📁 Backing up API controllers and routes..."
mkdir -p "$BACKUP_DIR/src/api"
cp -r src/api/cart "$BACKUP_DIR/src/api/"
cp -r src/api/order "$BACKUP_DIR/src/api/"
cp -r src/api/stripe "$BACKUP_DIR/src/api/"
cp -r src/api/payment "$BACKUP_DIR/src/api/"

# Backup middlewares
echo "📁 Backing up custom middlewares..."
cp -r src/middlewares "$BACKUP_DIR/src/"

# Create state file
echo "📝 Creating state documentation..."
cat > "$BACKUP_DIR/BACKUP_INFO.md" << EOF
# Backup Information
- Date: $(date)
- Strapi Version: 5.14.0
- Node Version: $(node -v)
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
$(git status --short)

## Current Branch:
$(git branch --show-current)

## Last Commit:
$(git log -1 --oneline)
EOF

echo "✅ Backup completed in $BACKUP_DIR"
echo "📋 Review BACKUP_INFO.md for details"