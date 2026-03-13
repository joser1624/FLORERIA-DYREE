const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function checkConnection() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('Attempting to connect to database...');
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Port: ${process.env.DB_PORT}`);
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log(`User: ${process.env.DB_USER}`);
    
    const result = await pool.query('SELECT NOW()');
    console.log('✓ Connection successful!');
    console.log('Current time from DB:', result.rows[0].now);
    
    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\nExisting tables:');
    if (tablesResult.rows.length === 0) {
      console.log('  No tables found. Database schema needs to be initialized.');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkConnection();
