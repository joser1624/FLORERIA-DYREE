/**
 * Authentication Endpoints Integration Tests
 * Tests for /api/v1/auth endpoints
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.5, 1.6, 25.1
 */

const request = require('supertest');
const { query } = require('../config/database');
const { hashPassword } = require('../utils/auth');

// Import app but don't start the server
const app = require('../server');

describe('Authentication Endpoints - Integration Tests', () => {
  let testUserId;
  let validToken;
  
  // Setup: Create a test user before running tests
  beforeAll(async () => {
    // Create test user with known credentials
    const hashedPassword = await hashPassword('testpassword123');
    
    const result = await query(
      `INSERT INTO usuarios (username, password_hash, nombre, rol, email, activo)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (username) DO UPDATE 
       SET password_hash = $2, activo = $6
       RETURNING id`,
      ['testuser_auth', hashedPassword, 'Test User', 'Empleado', 'test@test.com', true]
    );
    
    testUserId = result.rows[0].id;
  });
  
  // Cleanup: Remove test user after tests
  afterAll(async () => {
    if (testUserId) {
      await query('DELETE FROM usuarios WHERE id = $1', [testUserId]);
    }
  });
  
  describe('POST /api/v1/auth/login', () => {
    it('should return 400 when username is missing', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'somepassword' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
      expect(response.body.error.message).toContain('requeridos');
    });
    
    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'testuser' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });
    
    it('should return 401 when user does not exist', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'nonexistentuser',
          password: 'somepassword'
        })
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('inválidas');
    });
    
    it('should return 401 when password is incorrect', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser_auth',
          password: 'wrongpassword'
        })
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
    
    it('should return 401 when user is inactive', async () => {
      // Create inactive user
      const hashedPassword = await hashPassword('password123');
      const result = await query(
        `INSERT INTO usuarios (username, password_hash, nombre, rol, activo)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (username) DO UPDATE SET activo = $5
         RETURNING id`,
        ['inactive_user', hashedPassword, 'Inactive User', 'Empleado', false]
      );
      
      const inactiveUserId = result.rows[0].id;
      
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'inactive_user',
          password: 'password123'
        })
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('inactivo');
      
      // Cleanup
      await query('DELETE FROM usuarios WHERE id = $1', [inactiveUserId]);
    });
    
    it('should return token and user data when credentials are valid', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser_auth',
          password: 'testpassword123'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.split('.').length).toBe(3); // JWT format
      
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(testUserId);
      expect(response.body.user.username).toBe('testuser_auth');
      expect(response.body.user.nombre).toBe('Test User');
      expect(response.body.user.rol).toBe('Empleado');
      expect(response.body.user.email).toBe('test@test.com');
      
      // Store token for subsequent tests
      validToken = response.body.token;
    });
    
    it('should update ultima_sesion timestamp on successful login', async () => {
      const beforeLogin = new Date();
      
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser_auth',
          password: 'testpassword123'
        })
        .expect(200);
      
      const result = await query(
        'SELECT ultima_sesion FROM usuarios WHERE id = $1',
        [testUserId]
      );
      
      const ultimaSesion = new Date(result.rows[0].ultima_sesion);
      expect(ultimaSesion.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });
  });
  
  describe('GET /api/v1/auth/verify', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/v1/auth/verify')
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('requerido');
    });
    
    it('should return 401 when token is invalid', async () => {
      const response = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('inválido');
    });
    
    it('should return 401 when token is expired', async () => {
      const { generateToken } = require('../utils/auth');
      
      // Generate a token that expires immediately
      const payload = { id: testUserId, username: 'testuser_auth', role: 'Empleado' };
      const expiredToken = generateToken(payload, '0s');
      
      // Wait a bit to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('expirado');
    });
    
    it('should return user data when token is valid', async () => {
      // First login to get a valid token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser_auth',
          password: 'testpassword123'
        });
      
      const token = loginResponse.body.token;
      
      const response = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(testUserId);
      expect(response.body.user.username).toBe('testuser_auth');
      expect(response.body.user.rol).toBe('Empleado');
    });
    
    it('should return 401 when user is deactivated after token was issued', async () => {
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser_auth',
          password: 'testpassword123'
        });
      
      const token = loginResponse.body.token;
      
      // Deactivate user
      await query('UPDATE usuarios SET activo = false WHERE id = $1', [testUserId]);
      
      // Try to verify token
      const response = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.valid).toBe(false);
      
      // Reactivate user for other tests
      await query('UPDATE usuarios SET activo = true WHERE id = $1', [testUserId]);
    });
  });
  
  describe('POST /api/v1/auth/logout', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
    
    it('should return success when valid token is provided', async () => {
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser_auth',
          password: 'testpassword123'
        });
      
      const token = loginResponse.body.token;
      
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('exitosamente');
    });
  });
  
  describe('Authentication Flow', () => {
    it('should complete full authentication flow: login -> verify -> logout', async () => {
      // Step 1: Login
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser_auth',
          password: 'testpassword123'
        })
        .expect(200);
      
      expect(loginResponse.body.success).toBe(true);
      const token = loginResponse.body.token;
      
      // Step 2: Verify token
      const verifyResponse = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(verifyResponse.body.valid).toBe(true);
      expect(verifyResponse.body.user.username).toBe('testuser_auth');
      
      // Step 3: Logout
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(logoutResponse.body.success).toBe(true);
    });
  });
});
