/**
 * Database Connection Tests
 * Tests for database configuration, connection validation, and error handling
 * 
 * Validates: Requirements 21.6, 21.7, 24.1
 */

const { pool, query, validateConnection, closePool } = require('../config/database');

describe('Database Connection Module', () => {
  afterAll(async () => {
    // Close pool after all tests
    await closePool();
  });

  describe('Connection Pool Configuration', () => {
    it('should create a connection pool with correct configuration', () => {
      expect(pool).toBeDefined();
      expect(pool.options.host).toBe(process.env.DB_HOST);
      expect(pool.options.port).toBe(parseInt(process.env.DB_PORT, 10));
      expect(pool.options.database).toBe(process.env.DB_NAME);
      expect(pool.options.user).toBe(process.env.DB_USER);
      expect(pool.options.max).toBe(20);
      expect(pool.options.idleTimeoutMillis).toBe(30000);
      expect(pool.options.connectionTimeoutMillis).toBe(2000);
    });
  });

  describe('Connection Validation', () => {
    it('should validate database connection successfully', async () => {
      const result = await validateConnection();
      expect(result).toBe(true);
    });

    it('should execute a simple query', async () => {
      const result = await query('SELECT 1 as test');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].test).toBe(1);
    });

    it('should execute a query with parameters', async () => {
      const result = await query('SELECT $1::text as message', ['Hello Database']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].message).toBe('Hello Database');
    });
  });

  describe('Query Execution', () => {
    it('should return current timestamp', async () => {
      const result = await query('SELECT NOW() as current_time');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].current_time).toBeInstanceOf(Date);
    });

    it('should return PostgreSQL version', async () => {
      const result = await query('SELECT version() as pg_version');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].pg_version).toContain('PostgreSQL');
    });

    it('should handle query errors gracefully', async () => {
      await expect(query('SELECT * FROM non_existent_table')).rejects.toThrow();
    });
  });

  describe('Connection Pool Management', () => {
    it('should acquire and release clients from pool', async () => {
      const client = await pool.connect();
      expect(client).toBeDefined();
      
      const result = await client.query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
      
      client.release();
    });

    it('should handle multiple concurrent queries', async () => {
      const queries = Array(10).fill(null).map((_, i) => 
        query('SELECT $1::int as number', [i])
      );
      
      const results = await Promise.all(queries);
      
      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.rows[0].number).toBe(i);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle syntax errors in queries', async () => {
      await expect(query('INVALID SQL SYNTAX')).rejects.toThrow();
    });

    it('should handle invalid parameter types', async () => {
      // PostgreSQL should handle type conversion or throw error
      const result = await query('SELECT $1::int as number', ['123']);
      expect(result.rows[0].number).toBe(123);
    });
  });

  describe('Environment Variables', () => {
    it('should read database configuration from environment variables', () => {
      expect(process.env.DB_HOST).toBeDefined();
      expect(process.env.DB_PORT).toBeDefined();
      expect(process.env.DB_NAME).toBeDefined();
      expect(process.env.DB_USER).toBeDefined();
      expect(process.env.DB_PASSWORD).toBeDefined();
    });
  });
});
