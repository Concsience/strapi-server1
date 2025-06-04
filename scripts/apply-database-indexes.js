/**
 * Database Index Migration Script
 * Safely applies e-commerce performance indexes to PostgreSQL database
 * Run with: node scripts/apply-database-indexes.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnvFile() {
  const envPath = path.join(__dirname, '../.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').trim();
        // Only set if not already set
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    
    console.log('✅ Loaded environment variables from .env file');
  }
}

// Load environment at startup
loadEnvFile();

/**
 * Apply database indexes from migration file
 */
async function applyDatabaseIndexes() {
  try {
    console.log('🔧 Starting database index migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/001-add-ecommerce-indexes.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const sqlCommands = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration file loaded successfully');
    
    // Initialize Strapi without starting the server
    const strapi = require('@strapi/strapi')({
      distDir: path.join(__dirname, '../dist'),
    });
    
    await strapi.load();
    console.log('🚀 Strapi loaded successfully');
    
    // Get database connection
    const db = strapi.db.connection;
    
    if (!db) {
      throw new Error('Database connection not available');
    }
    
    console.log('💾 Database connection established');
    
    // Split commands by semicolon and filter out comments and empty lines
    const commands = sqlCommands
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && !cmd.startsWith('/*'));
    
    console.log(`📊 Found ${commands.length} SQL commands to execute`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    // Execute each command
    for (const [index, command] of commands.entries()) {
      if (!command) continue;
      
      try {
        console.log(`⏳ Executing command ${index + 1}/${commands.length}...`);
        
        // Log the command being executed (truncated for readability)
        const cmdPreview = command.length > 80 
          ? command.substring(0, 80) + '...' 
          : command;
        console.log(`   ${cmdPreview}`);
        
        await db.raw(command);
        successCount++;
        console.log(`   ✅ Success`);
        
      } catch (error) {
        // Check if it's a "already exists" error (which is fine)
        if (error.message && error.message.includes('already exists')) {
          console.log(`   ⏭️  Index already exists (skipped)`);
          skipCount++;
        } else {
          console.error(`   ❌ Error: ${error.message}`);
          errorCount++;
          
          // Don't fail the entire migration for individual index errors
          // Log and continue
        }
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total: ${successCount + skipCount + errorCount}`);
    
    // Query index usage statistics
    try {
      console.log('\n📊 Querying index statistics...');
      
      const indexStats = await db.raw(`
        SELECT 
          schemaname, 
          tablename, 
          indexname, 
          idx_tup_read, 
          idx_tup_fetch,
          pg_size_pretty(pg_relation_size(indexrelid)) as size
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
        ORDER BY idx_tup_read DESC 
        LIMIT 10
      `);
      
      if (indexStats.rows && indexStats.rows.length > 0) {
        console.log('\nTop 10 most used indexes:');
        console.table(indexStats.rows);
      }
      
    } catch (statsError) {
      console.warn('⚠️  Could not retrieve index statistics:', statsError.message);
    }
    
    await strapi.destroy();
    
    if (errorCount === 0) {
      console.log('\n🎉 Database index migration completed successfully!');
      console.log('   Your e-commerce queries should now be significantly faster.');
      process.exit(0);
    } else {
      console.log(`\n⚠️  Migration completed with ${errorCount} errors.`);
      console.log('   Check the errors above and consider running the migration again.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

/**
 * Verify database connection before running migration
 */
async function verifyDatabaseConnection() {
  try {
    console.log('🔍 Verifying database connection...');
    
    const strapi = require('@strapi/strapi')({
      distDir: path.join(__dirname, '../dist'),
    });
    
    await strapi.load();
    
    const result = await strapi.db.connection.raw('SELECT 1 as test');
    
    if (result.rows && result.rows[0] && result.rows[0].test === 1) {
      console.log('✅ Database connection verified');
      await strapi.destroy();
      return true;
    } else {
      throw new Error('Database test query failed');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('\nPlease ensure:');
    console.error('1. PostgreSQL is running');
    console.error('2. Database credentials are correct in .env');
    console.error('3. Database exists and is accessible');
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 E-commerce Database Index Migration');
  console.log('=====================================\n');
  
  // Check if we're in the right directory
  if (!fs.existsSync('package.json')) {
    console.error('❌ Please run this script from the project root directory');
    process.exit(1);
  }
  
  // Verify environment
  if (!process.env.DATABASE_URL && !process.env.DATABASE_HOST) {
    console.error('❌ Database configuration not found');
    console.error('   Please ensure DATABASE_URL or DATABASE_HOST is set in your .env file');
    process.exit(1);
  }
  
  // Verify database connection first
  const connectionOk = await verifyDatabaseConnection();
  if (!connectionOk) {
    process.exit(1);
  }
  
  // Run the migration
  await applyDatabaseIndexes();
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⏹️  Migration interrupted by user');
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('\n💥 Unhandled error:', error);
  process.exit(1);
});

// Execute if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
}