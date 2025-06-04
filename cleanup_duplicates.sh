#!/bin/bash
# Cleanup duplicate controllers/routes/services
# This removes .js files where .ts versions exist

echo "🧹 Cleaning up duplicate files..."
echo "📋 Files to be removed:"

# List files that will be removed
echo ""
echo "Cart API:"
echo "  - src/api/cart/controllers/cart.js (stub, using cart.ts instead)"
echo "  - src/api/cart/routes/cart.js (stub, using cart.ts instead)"

echo ""
echo "Order API:"
echo "  - src/api/order/controllers/order.js (old version, using order.ts instead)"
echo "  - src/api/order/routes/order.js (stub, using order.ts instead)"
echo "  - src/api/order/services/order.js (stub, using order.ts instead)"

echo ""
echo "Stripe API:"
echo "  - src/api/stripe/controllers/stripe.js (old version, using stripe.ts instead)"
echo "  - src/api/stripe/routes/stripe.js (stub, using stripe.ts instead)"

echo ""
read -p "⚠️  Are you sure you want to remove these files? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]
then
    # Remove duplicate files
    rm -f src/api/cart/controllers/cart.js
    rm -f src/api/cart/routes/cart.js
    rm -f src/api/order/controllers/order.js
    rm -f src/api/order/routes/order.js
    rm -f src/api/order/services/order.js
    rm -f src/api/stripe/controllers/stripe.js
    rm -f src/api/stripe/routes/stripe.js
    
    echo "✅ Duplicate files removed successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Restart Strapi to ensure TypeScript files are loaded"
    echo "2. Test all API endpoints"
    echo "3. Check for any errors in the logs"
else
    echo "❌ Cleanup cancelled"
fi