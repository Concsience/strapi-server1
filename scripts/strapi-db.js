#!/usr/bin/env node
/**
 * Strapi Database Query Tool
 * Direct database access for development and debugging
 */

const { Client } = require('pg');

const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'strapi_conscience',
  user: 'strapi',
  password: 'strapi123'
};

async function executeQuery(query) {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    console.error('Database error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Common queries
const queries = {
  users: "SELECT id, username, email, created_at FROM up_users LIMIT 10",
  products: "SELECT id, title, price, created_at FROM artists_works LIMIT 10",
  orders: "SELECT id, status, created_at FROM orders LIMIT 10",
  carts: "SELECT id, created_at, updated_at FROM carts LIMIT 10",
  
  // Table structure queries
  tables: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
  columns: (table) => `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${table}'`
};

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Strapi Database Query Tool\n');
    console.log('Usage:');
    console.log('  node scripts/strapi-db.js <query>');
    console.log('  node scripts/strapi-db.js --preset <preset-name>');
    console.log('\nAvailable presets:');
    Object.keys(queries).forEach(key => console.log(`  - ${key}`));
    process.exit(0);
  }
  
  try {
    let query;
    
    if (args[0] === '--preset' && args[1]) {
      query = queries[args[1]];
      if (!query) {
        console.error(`Unknown preset: ${args[1]}`);
        process.exit(1);
      }
    } else {
      query = args.join(' ');
    }
    
    const results = await executeQuery(query);
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}