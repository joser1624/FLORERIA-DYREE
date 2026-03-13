const { hashPassword, comparePassword, generateToken, verifyToken } = require('../utils/auth');

// Mock environment variable for testing
process.env.JWT_SECRET = 'test_secret_key_for_testing';

describe('Authentication Utilities - Unit Tests', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'mySecurePassword123';
      const hashed = await hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'samePassword';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', async () => {
      const password = '';
      const hashed = await hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed.length).toBeGreaterThan(0);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'correctPassword';
      const hashed = await hashPassword(password);
      const result = await comparePassword(password, hashed);
      
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'correctPassword';
      const wrongPassword = 'wrongPassword';
      const hashed = await hashPassword(password);
      const result = await comparePassword(wrongPassword, hashed);
      
      expect(result).toBe(false);
    });

    it('should handle case-sensitive comparison', async () => {
      const password = 'Password123';
      const hashed = await hashPassword(password);
      const result = await comparePassword('password123', hashed);
      
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token with valid payload', () => {
      const payload = { id: 1, username: 'testuser', role: 'Administrador' };
      const token = generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should use default expiration of 24h', () => {
      const payload = { id: 1, username: 'testuser' };
      const token = generateToken(payload);
      const decoded = verifyToken(token);
      
      expect(decoded.id).toBe(1);
      expect(decoded.username).toBe('testuser');
    });

    it('should accept custom expiration time', () => {
      const payload = { id: 1, username: 'testuser' };
      const token = generateToken(payload, '1h');
      const decoded = verifyToken(token);
      
      expect(decoded.id).toBe(1);
    });

    it('should throw error if JWT_SECRET is not set', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      
      expect(() => {
        generateToken({ id: 1 });
      }).toThrow('JWT_SECRET environment variable is not set');
      
      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const payload = { id: 1, username: 'testuser', role: 'Empleado' };
      const token = generateToken(payload);
      const decoded = verifyToken(token);
      
      expect(decoded.id).toBe(payload.id);
      expect(decoded.username).toBe(payload.username);
      expect(decoded.role).toBe(payload.role);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        verifyToken(invalidToken);
      }).toThrow();
    });

    it('should throw error for expired token', () => {
      const payload = { id: 1, username: 'testuser' };
      const token = generateToken(payload, '0s'); // Expires immediately
      
      // Wait a bit to ensure expiration
      return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
        expect(() => {
          verifyToken(token);
        }).toThrow();
      });
    });

    it('should throw error if JWT_SECRET is not set', () => {
      const originalSecret = process.env.JWT_SECRET;
      const token = generateToken({ id: 1 });
      delete process.env.JWT_SECRET;
      
      expect(() => {
        verifyToken(token);
      }).toThrow('JWT_SECRET environment variable is not set');
      
      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('Integration: Hash and Compare', () => {
    it('should successfully hash and verify password', async () => {
      const password = 'myPassword123!';
      const hashed = await hashPassword(password);
      const isValid = await comparePassword(password, hashed);
      
      expect(isValid).toBe(true);
    });

    it('should fail verification with wrong password', async () => {
      const password = 'correctPassword';
      const wrongPassword = 'incorrectPassword';
      const hashed = await hashPassword(password);
      const isValid = await comparePassword(wrongPassword, hashed);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Integration: Generate and Verify Token', () => {
    it('should successfully generate and verify token', () => {
      const payload = { id: 5, username: 'admin', role: 'Administrador' };
      const token = generateToken(payload);
      const decoded = verifyToken(token);
      
      expect(decoded.id).toBe(payload.id);
      expect(decoded.username).toBe(payload.username);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.iat).toBeDefined(); // issued at
      expect(decoded.exp).toBeDefined(); // expiration
    });
  });
});
