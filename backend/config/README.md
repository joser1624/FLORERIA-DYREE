# Database Configuration Module

## Overview

The database configuration module (`database.js`) provides a robust PostgreSQL connection pool with:
- Environment variable validation
- Connection validation on startup
- Comprehensive error logging
- Automatic reconnection handling
- Graceful shutdown support

## Requirements

This module validates the following requirements:
- **Requirement 21.6**: Validates database connection on startup
- **Requirement 21.7**: Logs errors and exits with non-zero status if connection fails
- **Requirement 24.1**: Reads database connection parameters from environment variables

## Environment Variables

Required environment variables:
- `DB_HOST` - Database host (e.g., localhost)
- `DB_PORT` - Database port (e.g., 5432)
- `DB_NAME` - Database name (e.g., floreria_encantos_eternos)
- `DB_USER` - Database user (e.g., postgres)
- `DB_PASSWORD` - Database password

Optional environment variables:
- `DB_DEBUG` - Set to 'true' to enable verbose connection logging (development only)
- `NODE_ENV` - Set to 'development' for additional logging

## Usage

### Basic Query Execution

```javascript
const { query } = require('./config/database');

// Simple query
const result = await query('SELECT * FROM productos WHERE activo = true');
console.log(result.rows);

// Query with parameters
const result = await query(
  'SELECT * FROM productos WHERE id = $1',
  [productId]
);
```

### Connection Validation

```javascript
const { validateConnection } = require('./config/database');

// Validate connection on application startup
async function startServer() {
  await validateConnection(); // Exits with code 1 if connection fails
  
  // Start your server here
  app.listen(3000);
}
```

### Using the Pool Directly

```javascript
const { pool } = require('./config/database');

// For transactions or advanced usage
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO productos ...');
  await client.query('INSERT INTO receta_arreglo ...');
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

### Graceful Shutdown

```javascript
const { closePool } = require('./config/database');

// Close pool when shutting down
process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});
```

## Features

### Automatic Reconnection

The `query()` function automatically retries failed queries up to 3 times with exponential backoff for connection-related errors (ECONNREFUSED, ENOTFOUND, ETIMEDOUT, ECONNRESET).

### Error Logging

All database errors are logged with:
- Error message
- Error code (if available)
- Stack trace
- Connection details (for connection failures)

### Connection Pool Configuration

- **Max connections**: 20
- **Idle timeout**: 30 seconds
- **Connection timeout**: 2 seconds

### Event Logging

The module logs the following events:
- Connection established
- Unexpected errors on idle clients
- Client acquisition/release (development mode with DB_DEBUG=true)
- Client removal from pool (development mode with DB_DEBUG=true)

## Testing

Run the database tests:
```bash
npm test -- database.test.js
```

Check database connection:
```bash
node scripts/check-db.js
```

## Error Handling

### Missing Environment Variables

If required environment variables are missing, the module will:
1. Log an error message listing the missing variables
2. Exit with code 1

### Connection Failure

If the database connection fails during validation:
1. Log detailed error information
2. Log connection details (host, port, database, user)
3. Exit with code 1

### Query Errors

Query errors are thrown and should be handled by the calling code:
```javascript
try {
  const result = await query('SELECT * FROM productos');
} catch (err) {
  console.error('Query failed:', err.message);
  // Handle error appropriately
}
```

## Best Practices

1. **Always use parameterized queries** to prevent SQL injection:
   ```javascript
   // Good
   await query('SELECT * FROM productos WHERE id = $1', [id]);
   
   // Bad - vulnerable to SQL injection
   await query(`SELECT * FROM productos WHERE id = ${id}`);
   ```

2. **Use transactions for multi-step operations**:
   ```javascript
   const client = await pool.connect();
   try {
     await client.query('BEGIN');
     // Multiple queries here
     await client.query('COMMIT');
   } catch (err) {
     await client.query('ROLLBACK');
     throw err;
   } finally {
     client.release();
   }
   ```

3. **Always release clients** when using the pool directly:
   ```javascript
   const client = await pool.connect();
   try {
     // Use client
   } finally {
     client.release(); // Always release, even if error occurs
   }
   ```

4. **Validate connection on startup** to fail fast if database is unavailable:
   ```javascript
   await validateConnection();
   ```

## Troubleshooting

### "Missing required environment variables"

Ensure all required environment variables are set in your `.env` file:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=floreria_encantos_eternos
DB_USER=postgres
DB_PASSWORD=your_password
```

### "Failed to validate database connection"

Check:
1. PostgreSQL is running: `pg_isready`
2. Database exists: `psql -l | grep floreria_encantos_eternos`
3. Credentials are correct
4. Database is accessible from your host

### Connection timeout errors

If you're experiencing connection timeouts:
1. Check network connectivity
2. Verify PostgreSQL is accepting connections
3. Check firewall settings
4. Increase `connectionTimeoutMillis` in the pool configuration if needed
