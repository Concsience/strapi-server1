#!/usr/bin/env node
/**
 * Database Connection Test for CI/CD
 * Tests database connectivity with detailed error reporting
 */

const { execSync } = require('child_process');

const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'strapi_test',
  username: process.env.DATABASE_USERNAME || 'strapi',
  password: process.env.DATABASE_PASSWORD || 'strapi123'
};

console.log('🔍 Testing database connection...');
console.log(`📍 Host: ${dbConfig.host}:${dbConfig.port}`);
console.log(`🗄️ Database: ${dbConfig.database}`);
console.log(`👤 User: ${dbConfig.username}`);
console.log('');

async function testConnection() {
  let attempts = 0;
  const maxAttempts = 5;
  const delay = 2000;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`⏳ Attempt ${attempts}/${maxAttempts}...`);

    try {
      // Test with PostgreSQL client
      const command = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -c "SELECT version();"`;
      
      const result = execSync(command, { 
        encoding: 'utf8',
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      console.log('✅ Database connection successful!');
      
      // Parse PostgreSQL version safely
      const lines = result.split('\n').filter(line => line.trim().length > 0);
      const versionLine = lines.find(line => line.includes('PostgreSQL')) || 'Version info not found';
      console.log('📊 Database version:', versionLine.trim());
      
      // Test basic operations
      const testQuery = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -c "SELECT current_user, current_database();"`;
      const userResult = execSync(testQuery, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      
      // Parse user info safely
      const userLines = userResult.split('\n').filter(line => line.trim().length > 0);
      const userInfo = userLines.find(line => line.includes('|')) || 'User info not found';
      console.log('👤 Connected as:', userInfo.trim());
      
      return true;
      
    } catch (error) {
      console.log(`❌ Connection attempt ${attempts} failed:`, error.message);
      
      if (error.message.includes('password authentication failed')) {
        console.log('🔐 Authentication issue detected - user may not exist or wrong password');
      } else if (error.message.includes('Connection refused')) {
        console.log('🔌 Connection refused - database server may not be ready');
      } else if (error.message.includes('does not exist')) {
        console.log('🗄️ Database or user does not exist');
      }
      
      if (attempts < maxAttempts) {
        console.log(`⏳ Waiting ${delay/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.log('❌ All connection attempts failed');
  return false;
}

// Test Node.js pg module if available
async function testNodeConnection() {
  try {
    const { Client } = require('pg');
    
    const client = new Client({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.username,
      password: dbConfig.password,
      connectionTimeoutMillis: 5000,
    });

    await client.connect();
    const result = await client.query('SELECT current_user, current_database(), version()');
    await client.end();
    
    console.log('✅ Node.js pg connection successful!');
    console.log('📊 Query result:', result.rows[0]);
    return true;
    
  } catch (error) {
    console.log('❌ Node.js pg connection failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Starting comprehensive database connectivity test\\n');
  
  const psqlSuccess = await testConnection();
  console.log('');
  
  let nodeSuccess = false;
  try {
    nodeSuccess = await testNodeConnection();
  } catch (error) {
    console.log('⚠️ Node.js pg module test skipped (module not available)');
  }
  
  console.log('');
  console.log('📊 Test Summary:');
  console.log(`   PSQL Connection: ${psqlSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Node.js Connection: ${nodeSuccess ? '✅ PASSED' : '⚠️ SKIPPED'}`);
  
  if (psqlSuccess) {
    console.log('\\n🎉 Database is ready for Strapi!');
    process.exit(0);
  } else {
    console.log('\\n💥 Database connection failed - check configuration and setup');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Test script error:', error);
  process.exit(1);
});