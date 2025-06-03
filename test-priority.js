// Test which file Strapi loads when both .js and .ts exist
const path = require('path');
const fs = require('fs');

// Check cart controller
const cartControllerPath = path.join(__dirname, 'src/api/cart/controllers/cart');
console.log('\n=== Cart Controller Test ===');
console.log('cart.js exists:', fs.existsSync(cartControllerPath + '.js'));
console.log('cart.ts exists:', fs.existsSync(cartControllerPath + '.ts'));

// Try to require the module (Strapi would do this)
try {
  const controller = require(cartControllerPath);
  console.log('Loaded module exports:', Object.keys(controller));
  console.log('Module type:', typeof controller);
  
  // Check if it's the JS or TS version by looking for TypeScript-specific code
  const jsContent = fs.readFileSync(cartControllerPath + '.js', 'utf8');
  const hasFactoryMethod = jsContent.includes("strapi.controller('api::cart.cart').extend");
  console.log('Loaded version: ', hasFactoryMethod ? 'JavaScript (factory pattern)' : 'Unknown');
} catch (error) {
  console.error('Error loading module:', error.message);
}

// Test Node.js module resolution order
console.log('\n=== Node.js Module Resolution ===');
console.log('Module resolution order:', require.extensions ? Object.keys(require.extensions) : 'Not available');