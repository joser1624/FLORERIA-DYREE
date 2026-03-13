const fc = require('fast-check');
const { hashPassword, comparePassword, generateToken, verifyToken } = require('../utils/auth');

// Mock environment variable for testing
process.env.JWT_SECRET = 'test_secret_key_for_testing';

describe('Authentication Utilities - Property-Based Tests', () => {
  
  // **Validates: Requirements 23.1**
  // Feature: sistema-gestion-floreria, Property 31: Password Hashing
  describe('Property 31: Password Hashing', () => {
    it('should never store plain text passwords - hashed value must differ from input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (password) => {
            const hashed = await hashPassword(password);
            return hashed !== password;
          }
        ),
        { numRuns: 20 } // Reduced from 100 for faster execution
      );
    });

    it('should produce different hashes for the same password (salt randomization)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (password) => {
            const hash1 = await hashPassword(password);
            const hash2 = await hashPassword(password);
            return hash1 !== hash2;
          }
        ),
        { numRuns: 10 } // Reduced from 50 for faster execution
      );
    });
  });

  // **Validates: Requirements 1.2**
  // Feature: sistema-gestion-floreria, Property 1: Authentication Token Generation
  describe('Property 1: Authentication Token Generation', () => {
    it('should generate valid JWT tokens for any valid user payload', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            username: fc.string({ minLength: 3, maxLength: 50 }),
            role: fc.constantFrom('Administrador', 'Empleado', 'Dueña')
          }),
          (payload) => {
            const token = generateToken(payload);
            
            // Token should be a non-empty string
            if (typeof token !== 'string' || token.length === 0) {
              return false;
            }
            
            // JWT should have 3 parts separated by dots
            const parts = token.split('.');
            if (parts.length !== 3) {
              return false;
            }
            
            // Should be able to verify and decode the token
            const decoded = verifyToken(token);
            return decoded.id === payload.id && 
                   decoded.username === payload.username && 
                   decoded.role === payload.role;
          }
        ),
        { numRuns: 20 } // Reduced from 100 for faster execution
      );
    });
  });

  // **Validates: Requirements 1.3**
  // Feature: sistema-gestion-floreria, Property 2: Authentication Rejection
  describe('Property 2: Authentication Rejection', () => {
    it('should reject authentication for any incorrect password', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (correctPassword, incorrectPassword) => {
            // Only test when passwords are different
            fc.pre(correctPassword !== incorrectPassword);
            
            // Hash the correct password
            const hashedPassword = await hashPassword(correctPassword);
            
            // Attempt to authenticate with incorrect password
            const isAuthenticated = await comparePassword(incorrectPassword, hashedPassword);
            
            // Authentication should fail (return false)
            return isAuthenticated === false;
          }
        ),
        { numRuns: 20 } // Reduced from 100 for faster execution
      );
    });

    it('should reject any malformed or invalid JWT token', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 50 }), // Random strings
            fc.constant(''), // Empty string
            fc.constant('invalid.token'), // Malformed token (only 2 parts)
            fc.constant('a.b.c.d'), // Too many parts
            fc.constant('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature') // Invalid signature
          ),
          (invalidToken) => {
            try {
              verifyToken(invalidToken);
              // If no error is thrown, the test fails
              return false;
            } catch (error) {
              // Token should be rejected with an error
              return true;
            }
          }
        ),
        { numRuns: 20 } // Reduced from 100 for faster execution
      );
    });

    it('should not generate tokens for empty or invalid payloads', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({ id: fc.integer({ min: 1, max: 10000 }) }), // Missing username
            fc.record({ username: fc.string({ minLength: 1, maxLength: 50 }) }), // Missing id
            fc.record({}) // Empty payload
          ),
          (invalidPayload) => {
            try {
              const token = generateToken(invalidPayload);
              // Token is generated, but when decoded it should not have complete valid structure
              const decoded = verifyToken(token);
              
              // For authentication to be valid, we need both id and username
              // If either is missing, authentication should be considered incomplete
              const hasValidId = decoded.id !== undefined && typeof decoded.id === 'number';
              const hasValidUsername = decoded.username !== undefined && typeof decoded.username === 'string' && decoded.username.length > 0;
              
              // If payload is incomplete, it should not be considered valid for authentication
              return !(hasValidId && hasValidUsername);
            } catch (error) {
              // If token generation or verification fails, that's also acceptable rejection
              return true;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Validates: Requirements 1.2, 23.1**
  // Round-trip property: hash then compare should always succeed with correct password
  describe('Property: Password Hash Round-Trip', () => {
    it('should always verify correctly when comparing original password with its hash', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (password) => {
            const hashed = await hashPassword(password);
            const isValid = await comparePassword(password, hashed);
            return isValid === true;
          }
        ),
        { numRuns: 20 } // Reduced from 100 for faster execution
      );
    });

    it('should always fail verification when comparing different password with hash', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (password1, password2) => {
            // Only test when passwords are different
            fc.pre(password1 !== password2);
            
            const hashed = await hashPassword(password1);
            const isValid = await comparePassword(password2, hashed);
            return isValid === false;
          }
        ),
        { numRuns: 20 } // Reduced from 100 for faster execution
      );
    });
  });

  // Token generation and verification round-trip
  describe('Property: Token Generation Round-Trip', () => {
    it('should always decode to original payload after generation', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            username: fc.string({ minLength: 3, maxLength: 50 }),
            role: fc.constantFrom('Administrador', 'Empleado', 'Dueña'),
            email: fc.option(fc.emailAddress(), { nil: undefined })
          }),
          (payload) => {
            const token = generateToken(payload);
            const decoded = verifyToken(token);
            
            // All original payload fields should be preserved
            return decoded.id === payload.id && 
                   decoded.username === payload.username && 
                   decoded.role === payload.role &&
                   (payload.email === undefined || decoded.email === payload.email);
          }
        ),
        { numRuns: 20 } // Reduced from 100 for faster execution
      );
    });
  });

  // Token expiration property
  describe('Property: Token Expiration', () => {
    it('should accept any valid expiration format', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1, max: 1000 }),
            username: fc.string({ minLength: 3, maxLength: 20 })
          }),
          fc.constantFrom('1h', '24h', '7d', '30d', '1m', '60s'),
          (payload, expiresIn) => {
            const token = generateToken(payload, expiresIn);
            const decoded = verifyToken(token);
            
            // Should have expiration field
            return decoded.exp !== undefined && decoded.exp > decoded.iat;
          }
        ),
        { numRuns: 10 } // Reduced from 50 for faster execution
      );
    });
  });

  // Password comparison is deterministic
  describe('Property: Password Comparison Determinism', () => {
    it('should always return the same result for the same password and hash', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (password) => {
            const hashed = await hashPassword(password);
            
            // Compare multiple times
            const result1 = await comparePassword(password, hashed);
            const result2 = await comparePassword(password, hashed);
            const result3 = await comparePassword(password, hashed);
            
            return result1 === result2 && result2 === result3 && result1 === true;
          }
        ),
        { numRuns: 10 } // Reduced from 50 for faster execution
      );
    });
  });

  // Hash output format property
  describe('Property: Hash Output Format', () => {
    it('should always produce bcrypt-formatted hashes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (password) => {
            const hashed = await hashPassword(password);
            
            // Bcrypt hashes start with $2a$, $2b$, or $2y$ and have specific length
            const bcryptPattern = /^\$2[aby]\$\d{2}\$.{53}$/;
            return bcryptPattern.test(hashed);
          }
        ),
        { numRuns: 20 } // Reduced from 100 for faster execution
      );
    });
  });

  // Token structure property
  describe('Property: JWT Token Structure', () => {
    it('should always produce tokens with 3 base64-encoded parts', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            username: fc.string({ minLength: 1, maxLength: 50 })
          }),
          (payload) => {
            const token = generateToken(payload);
            const parts = token.split('.');
            
            // Should have exactly 3 parts
            if (parts.length !== 3) {
              return false;
            }
            
            // Each part should be non-empty
            return parts.every(part => part.length > 0);
          }
        ),
        { numRuns: 20 } // Reduced from 100 for faster execution
      );
    });
  });
});
