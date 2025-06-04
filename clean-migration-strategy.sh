#!/bin/bash

echo "🧹 Strapi 5 Clean Migration Strategy"
echo "===================================="
echo ""

# Step 1: Create a clean environment
echo "📦 Step 1: Creating clean environment..."
echo "Please run these commands manually:"
echo ""
echo "# 1. Move to a temporary directory"
echo "mv node_modules node_modules.backup"
echo "mv package-lock.json package-lock.json.backup"
echo ""
echo "# 2. Clean npm cache"
echo "npm cache clean --force"
echo ""
echo "# 3. Install fresh dependencies"
echo "npm install"
echo ""
echo "Press Enter when you've completed these steps..."
read

# Step 2: Verify current setup
echo "✅ Step 2: Verifying setup..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix issues before continuing."
    exit 1
fi
echo "✅ Build successful"

# Step 3: Export current data
echo "📦 Step 3: Exporting current data..."
export PGPASSWORD='strapi123'
npm run strapi export -- --no-encrypt -f strapi-v4-final-backup-$(date +%Y%m%d_%H%M%S)
echo "✅ Data exported"

# Step 4: Create pre-migration branch
echo "📦 Step 4: Creating migration branch..."
git checkout -b feature/strapi-5-migration-clean
git add -A
git commit -m "chore: pre-Strapi 5 migration checkpoint"
echo "✅ Migration branch created"

echo ""
echo "🎯 Ready for Strapi 5 upgrade!"
echo "Run: npx @strapi/upgrade major"
echo ""