/**
 * Database Configuration
 * PostgreSQL connection pool configuration with validation, logging, and reconnection handling
 * 
 * Validates: Requirements 21.6, 21.7, 24.1
 */

const { Pool } = require('pg');

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`[DATABASE ERROR] Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('[DATABASE ERROR] Please set all required database environment variables');
  process.exit(1);
}

// Create connection pool with configuration from environment variables
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Connection event logging
pool.on('connect', (client) => {
  console.log(`[DATABASE] Connection established to ${process.env.DB_NAME} at ${process.env.DB_HOST}:${process.env.DB_PORT}`);
});

// Error event logging and handling
pool.on('error', (err, client) => {
  console.error('[DATABASE ERROR] Unexpected error on idle client:', err.message);
  console.error('[DATABASE ERROR] Stack trace:', err.stack);
  
  // Log additional connection details for debugging
  if (err.code) {
    console.error(`[DATABASE ERROR] Error code: ${err.code}`);
  }
  
  // Don't exit immediately - allow reconnection attempts
  console.log('[DATABASE] Pool will attempt to reconnect on next query');
});

// Acquire event logging (optional, for debugging)
pool.on('acquire', (client) => {
  if (process.env.NODE_ENV === 'development' && process.env.DB_DEBUG === 'true') {
    console.log('[DATABASE] Client acquired from pool');
  }
});

// Release event logging (optional, for debugging)
pool.on('release', (err, client) => {
  if (err) {
    console.error('[DATABASE ERROR] Error releasing client:', err.message);
  } else if (process.env.NODE_ENV === 'development' && process.env.DB_DEBUG === 'true') {
    console.log('[DATABASE] Client released back to pool');
  }
});

// Remove event logging (when client is removed from pool)
pool.on('remove', (client) => {
  if (process.env.NODE_ENV === 'development' && process.env.DB_DEBUG === 'true') {
    console.log('[DATABASE] Client removed from pool');
  }
});

/**
 * Validate database connection on startup
 * Tests the connection and logs success or failure
 * Exits with non-zero status code if connection fails
 * 
 * @returns {Promise<void>}
 */
async function validateConnection() {
  try {
    console.log('[DATABASE] Validating database connection...');
    
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    
    console.log('[DATABASE] ✓ Connection validated successfully');
    console.log(`[DATABASE] PostgreSQL version: ${result.rows[0].pg_version.split(',')[0]}`);
    console.log(`[DATABASE] Server time: ${result.rows[0].current_time}`);
    
    client.release();
    
    return true;
  } catch (err) {
    console.error('[DATABASE ERROR] ✗ Failed to validate database connection');
    console.error(`[DATABASE ERROR] Error: ${err.message}`);
    console.error(`[DATABASE ERROR] Code: ${err.code || 'N/A'}`);
    console.error('[DATABASE ERROR] Stack trace:', err.stack);
    console.error('[DATABASE ERROR] Connection details:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER
    });
    
    // Exit with non-zero status code as per requirement 21.7
    process.exit(1);
  }
}

/**
 * Execute a query with automatic reconnection handling
 * 
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params) {
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await pool.query(text, params);
      return result;
    } catch (err) {
      lastError = err;
      
      // Check if error is connection-related
      const isConnectionError = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'].includes(err.code);
      
      if (isConnectionError && attempt < maxRetries) {
        console.error(`[DATABASE ERROR] Connection error on attempt ${attempt}/${maxRetries}: ${err.message}`);
        console.log(`[DATABASE] Retrying query in ${attempt * 1000}ms...`);
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      } else {
        // Not a connection error or max retries reached
        break;
      }
    }
  }
  
  // All retries failed
  console.error('[DATABASE ERROR] Query failed after all retry attempts');
  console.error('[DATABASE ERROR] Last error:', lastError.message);
  throw lastError;
}

/**
 * Gracefully close all connections in the pool
 * Should be called when shutting down the application
 * 
 * @returns {Promise<void>}
 */
async function closePool() {
  try {
    console.log('[DATABASE] Closing connection pool...');
    await pool.end();
    console.log('[DATABASE] ✓ Connection pool closed successfully');
  } catch (err) {
    console.error('[DATABASE ERROR] Error closing connection pool:', err.message);
    throw err;
  }
}

// Handle process termination signals for graceful shutdown
process.on('SIGINT', async () => {
  console.log('[DATABASE] Received SIGINT signal, closing database connections...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[DATABASE] Received SIGTERM signal, closing database connections...');
  await closePool();
  process.exit(0);
});

module.exports = {
  pool,
  query,
  validateConnection,
  closePool
};
