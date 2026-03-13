/**
 * Database Connection Check Script
 * Verifies that the database is accessible and properly configured
 * Uses the database module with validation and error handling
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { pool, query, validateConnection, closePool } = require('../config/database');

async function checkDatabase() {
  try {
    console.log('Checking database connection...');
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Port: ${process.env.DB_PORT}`);
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log(`User: ${process.env.DB_USER}`);
    console.log('');

    // Validate connection using the database module
    await validateConnection();
    console.log('');

    // Check if tables exist
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 0) {
      console.log('⚠ Warning: No tables found in database');
      console.log('  Please run: psql -d ' + process.env.DB_NAME + ' -f database/schema.sql');
      console.log('  Then run: psql -d ' + process.env.DB_NAME + ' -f database/triggers.sql');
    } else {
      console.log(`✓ Found ${tablesResult.rows.length} tables:`);
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    }
    console.log('');

    // Check if triggers exist
    const triggersResult = await query(`
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
      ORDER BY trigger_name
    `);

    if (triggersResult.rows.length === 0) {
      console.log('⚠ Warning: No triggers found in database');
      console.log('  Please run: psql -d ' + process.env.DB_NAME + ' -f database/triggers.sql');
    } else {
      console.log(`✓ Found ${triggersResult.rows.length} triggers:`);
      triggersResult.rows.forEach(row => {
        console.log(`  - ${row.trigger_name} on ${row.event_object_table}`);
      });
    }

    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('✗ Database connection failed:');
    console.error(`  ${error.message}`);
    console.error('');
    console.error('Please check:');
    console.error('  1. PostgreSQL is running');
    console.error('  2. Database exists (create with: createdb ' + process.env.DB_NAME + ')');
    console.error('  3. Credentials are correct in .env file');
    console.error('  4. Database is accessible from this host');
    
    await closePool();
    process.exit(1);
  }
}

checkDatabase();
