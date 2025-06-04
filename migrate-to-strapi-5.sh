#!/bin/bash

echo "🚀 Starting Strapi 5 Migration Process"
echo "======================================"

# Step 1: Export data backup
echo "📦 Step 1: Creating data backup..."
export PGPASSWORD='strapi123'
npm run strapi export -- --no-encrypt -f ../strapi-backup-$(date +%Y%m%d_%H%M%S)
echo "✅ Data backup completed"

# Step 2: Update to latest Strapi v4
echo "📦 Step 2: Updating to latest Strapi v4 (4.25.22)..."
echo "Package.json already updated to 4.25.22"

# Step 3: Clean install
echo "📦 Step 3: Cleaning and reinstalling dependencies..."
rm -rf node_modules package-lock.json
npm install
echo "✅ Dependencies updated"

# Step 4: Test current version
echo "📦 Step 4: Testing Strapi v4.25.22..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Strapi v4.25.22 build successful"
else
    echo "❌ Build failed. Please fix issues before continuing."
    exit 1
fi

# Step 5: Run upgrade tool
echo "📦 Step 5: Running Strapi 5 upgrade tool..."
echo "This will:"
echo "  - Update dependencies to v5"
echo "  - Run codemods to update your code"
echo "  - Add __TODO__ comments where manual updates are needed"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

npx @strapi/upgrade major --yes

echo ""
echo "✅ Strapi 5 upgrade complete!"
echo ""
echo "Next steps:"
echo "1. Review all __TODO__ comments in your code"
echo "2. Update Entity Service calls to Document Service"
echo "3. Test all endpoints"
echo "4. Update frontend to handle new response format"
echo ""
echo "Check STRAPI_5_MIGRATION_PLAN.md for detailed migration guide"