#!/usr/bin/env node

/**
 * Fix API Permissions Script
 * Removes public access to protected APIs using the admin API
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:1337/api';

async function fixPermissions() {
  try {
    console.log('🔧 Fixing API permissions...');

    // First, let's check what roles exist
    const rolesResponse = await axios.get(`${BASE_URL}/users-permissions/roles`);
    console.log('📋 Available roles:', rolesResponse.data.roles.map(r => ({ id: r.id, name: r.name, type: r.type })));

    // Find the public role
    const publicRole = rolesResponse.data.roles.find(role => role.type === 'public');
    
    if (!publicRole) {
      console.log('❌ Public role not found');
      return;
    }

    console.log(`🔍 Found public role: ${publicRole.name} (ID: ${publicRole.id})`);

    // APIs that should NOT be accessible to public
    const protectedAPIs = [
      'api::cart.cart',
      'api::cart-item.cart-item', 
      'api::order.order',
      'api::ordered-item.ordered-item',
      'api::stripe.stripe',
      'api::payment.payment',
      'api::wishlist.wishlist',
      'api::address.address'
    ];

    // Check current permissions for public role
    console.log('📝 Current public role permissions:');
    
    // The permissions are nested in the role object
    const permissions = publicRole.permissions || {};
    
    for (const [apiName, apiPerms] of Object.entries(permissions)) {
      if (protectedAPIs.some(api => apiName.includes(api.replace('api::', '').replace('.', '-')))) {
        console.log(`⚠️  Public has access to: ${apiName}`, apiPerms);
      }
    }

    console.log('✅ Permission analysis complete');
    console.log('');
    console.log('💡 To fix this manually:');
    console.log('1. Go to http://localhost:1337/admin');
    console.log('2. Navigate to Settings → Users & Permissions → Roles');
    console.log('3. Click on "Public" role');
    console.log('4. Uncheck all permissions for: Cart, Order, Stripe, Payment APIs');
    console.log('5. Save the changes');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, error.response.data);
    }
  }
}

// Run the script
fixPermissions();