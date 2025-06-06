const fs = require('fs');
const path = require('path');

// This script will help identify which content type is causing the issue
function loadAndValidateContentType(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const schema = JSON.parse(content);
    
    // Simulate what Strapi does internally
    if (schema && typeof schema === 'object') {
      if (!schema.kind) {
        console.log(`❌ FOUND THE PROBLEM: ${filePath}`);
        console.log(`   Missing 'kind' property`);
        console.log(`   Schema keys: ${Object.keys(schema).join(', ')}`);
        console.log(`   Schema:`, JSON.stringify(schema, null, 2));
        return false;
      }
      
      if (!['collectionType', 'singleType'].includes(schema.kind)) {
        console.log(`❌ INVALID KIND: ${filePath}`);
        console.log(`   Invalid 'kind' value: ${schema.kind}`);
        return false;
      }
      
      // Check if schema is malformed
      if (!schema.info || !schema.attributes) {
        console.log(`⚠️  INCOMPLETE SCHEMA: ${filePath}`);
        console.log(`   Has kind: ${schema.kind}, but missing info or attributes`);
      }
      
      console.log(`✅ ${schema.kind}: ${path.basename(filePath)}`);
      return true;
    } else {
      console.log(`❌ INVALID JSON: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ERROR LOADING: ${filePath} - ${error.message}`);
    return false;
  }
}

console.log('🔍 Deep scanning all content type schemas...\n');

// Check all possible locations where content types might be defined
const locations = [
  './src/api/*/content-types/*/schema.json',
  './src/extensions/*/content-types/*/schema.json',
  './node_modules/@strapi/*/schemas/**/*.json'
];

// Also check if any content types are programmatically defined
console.log('📁 Checking src/index.js for programmatic content types...');
if (fs.existsSync('./src/index.js')) {
  const indexContent = fs.readFileSync('./src/index.js', 'utf8');
  if (indexContent.includes('contentType') || indexContent.includes('kind')) {
    console.log('   ⚠️  Found content type references in src/index.js');
  } else {
    console.log('   ✅ No programmatic content types in src/index.js');
  }
}

console.log('\n📁 Checking extensions for programmatic content types...');
const extensionsDir = './src/extensions';
if (fs.existsSync(extensionsDir)) {
  const extensions = fs.readdirSync(extensionsDir);
  extensions.forEach(ext => {
    const strapiServerPath = path.join(extensionsDir, ext, 'strapi-server.js');
    if (fs.existsSync(strapiServerPath)) {
      const content = fs.readFileSync(strapiServerPath, 'utf8');
      if (content.includes('contentType') || content.includes('kind')) {
        console.log(`   ⚠️  Found content type references in ${strapiServerPath}`);
      } else {
        console.log(`   ✅ Clean extension: ${ext}`);
      }
    }
  });
}

console.log('\n📁 Scanning all schema files...');

// Find all schema.json files
const { execSync } = require('child_process');
try {
  const files = execSync('find . -name "schema.json" -not -path "./node_modules/*" 2>/dev/null', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  
  files.forEach(file => {
    loadAndValidateContentType(file);
  });
  
  console.log(`\n📊 Scanned ${files.length} schema files total`);
} catch (error) {
  console.log('Error finding schema files:', error.message);
}

console.log('\n🔍 Checking for any malformed JSON files...');
try {
  const allJsonFiles = execSync('find src -name "*.json" 2>/dev/null', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  
  allJsonFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      JSON.parse(content);
    } catch (error) {
      console.log(`❌ MALFORMED JSON: ${file} - ${error.message}`);
    }
  });
} catch (error) {
  console.log('Could not scan JSON files');
}

console.log('\n✅ Diagnostic complete!');