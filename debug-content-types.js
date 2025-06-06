const fs = require('fs');
const path = require('path');

function checkSchema(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const schema = JSON.parse(content);
    
    if (!schema.kind) {
      console.log(`❌ MISSING KIND: ${filePath}`);
      console.log(`   Schema keys: ${Object.keys(schema).join(', ')}`);
      return false;
    } else {
      console.log(`✅ ${schema.kind}: ${filePath}`);
      return true;
    }
  } catch (error) {
    console.log(`❌ ERROR READING: ${filePath} - ${error.message}`);
    return false;
  }
}

console.log('=== Checking API Content Types ===');
const apiDir = './src/api';
if (fs.existsSync(apiDir)) {
  const apis = fs.readdirSync(apiDir);
  apis.forEach(api => {
    const schemaPath = path.join(apiDir, api, 'content-types', api, 'schema.json');
    if (fs.existsSync(schemaPath)) {
      checkSchema(schemaPath);
    }
  });
}

console.log('\n=== Checking Extension Content Types ===');
const extDir = './src/extensions';
if (fs.existsSync(extDir)) {
  const exts = fs.readdirSync(extDir);
  exts.forEach(ext => {
    const contentTypesDir = path.join(extDir, ext, 'content-types');
    if (fs.existsSync(contentTypesDir)) {
      const types = fs.readdirSync(contentTypesDir);
      types.forEach(type => {
        const schemaPath = path.join(contentTypesDir, type, 'schema.json');
        if (fs.existsSync(schemaPath)) {
          checkSchema(schemaPath);
        }
      });
    }
  });
}

console.log('\n=== Checking Component Schemas ===');
const compDir = './src/components';
if (fs.existsSync(compDir)) {
  function checkComponents(dir) {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        checkComponents(itemPath);
      } else if (item.endsWith('.json')) {
        const content = fs.readFileSync(itemPath, 'utf8');
        try {
          const schema = JSON.parse(content);
          if (!schema.kind) {
            console.log(`❌ COMPONENT MISSING KIND: ${itemPath}`);
            console.log(`   Schema keys: ${Object.keys(schema).join(', ')}`);
          } else {
            console.log(`✅ Component ${schema.kind}: ${itemPath}`);
          }
        } catch (error) {
          console.log(`❌ COMPONENT ERROR: ${itemPath} - ${error.message}`);
        }
      }
    });
  }
  checkComponents(compDir);
}