const { authenticateToken } = require('../middleware/auth');
const { generateToken } = require('../utils/auth');

// Mock environment variable for testing
process.env.JWT_SECRET = 'test_secret_key_for_testing';

describe('Authentication Middleware - Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    // Mock request object
    req = {
      headers: {}
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Mock next function
    next = jest.fn();
  });

  describe('authenticateToken', () => {
    it('should attach user data to req.user when valid token is provided', () => {
      const payload = { id: 1, username: 'testuser', role: 'Administrador' };
      const token = generateToken(payload);
      req.headers['authorization'] = `Bearer ${token}`;

      authenticateToken(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(payload.id);
      expect(req.user.username).toBe(payload.username);
      expect(req.user.role).toBe(payload.role);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is missing', () => {
      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token de autenticación requerido',
          details: {}
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is missing from Authorization header', () => {
      req.headers['authorization'] = 'Bearer ';

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token de autenticación requerido',
          details: {}
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', () => {
      req.headers['authorization'] = 'Bearer invalid.token.here';

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token de autenticación inválido o expirado',
          details: {}
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', async () => {
      const payload = { id: 1, username: 'testuser', role: 'Empleado' };
      const token = generateToken(payload, '0s'); // Expires immediately

      // Wait to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      req.headers['authorization'] = `Bearer ${token}`;

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token de autenticación inválido o expirado',
          details: {}
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle Authorization header without Bearer prefix', () => {
      const payload = { id: 1, username: 'testuser', role: 'Dueña' };
      const token = generateToken(payload);
      req.headers['authorization'] = token; // Missing "Bearer " prefix

      authenticateToken(req, res, next);

      // Should fail because split(' ')[1] will be undefined
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token de autenticación requerido',
          details: {}
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should work with different user roles', () => {
      const roles = ['Administrador', 'Empleado', 'Dueña'];

      roles.forEach(role => {
        // Reset mocks
        req = { headers: {} };
        res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        };
        next = jest.fn();

        const payload = { id: 1, username: 'testuser', role };
        const token = generateToken(payload);
        req.headers['authorization'] = `Bearer ${token}`;

        authenticateToken(req, res, next);

        expect(req.user.role).toBe(role);
        expect(next).toHaveBeenCalledTimes(1);
      });
    });

    it('should preserve all payload fields in req.user', () => {
      const payload = {
        id: 42,
        username: 'admin',
        role: 'Administrador',
        email: 'admin@example.com',
        customField: 'customValue'
      };
      const token = generateToken(payload);
      req.headers['authorization'] = `Bearer ${token}`;

      authenticateToken(req, res, next);

      expect(req.user.id).toBe(payload.id);
      expect(req.user.username).toBe(payload.username);
      expect(req.user.role).toBe(payload.role);
      expect(req.user.email).toBe(payload.email);
      expect(req.user.customField).toBe(payload.customField);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should handle malformed Authorization header gracefully', () => {
      req.headers['authorization'] = 'InvalidFormat';

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should not modify request if authentication fails', () => {
      req.headers['authorization'] = 'Bearer invalid.token';
      const originalReq = { ...req };

      authenticateToken(req, res, next);

      expect(req.user).toBeUndefined();
      expect(req.headers).toEqual(originalReq.headers);
    });
  });

  describe('Integration: Middleware with Express-like flow', () => {
    it('should allow request to proceed when authenticated', () => {
      const payload = { id: 1, username: 'testuser', role: 'Administrador' };
      const token = generateToken(payload);
      req.headers['authorization'] = `Bearer ${token}`;

      authenticateToken(req, res, next);

      // Verify middleware called next() to continue the chain
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(); // Called without arguments

      // Verify response methods were not called
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();

      // Verify user data is available for downstream handlers
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(payload.id);
    });

    it('should block request when not authenticated', () => {
      authenticateToken(req, res, next);

      // Verify middleware did not call next()
      expect(next).not.toHaveBeenCalled();

      // Verify response was sent
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalled();
    });
  });
});
