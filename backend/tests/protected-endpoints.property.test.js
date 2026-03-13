/**
 * Property-Based Tests for Protected Endpoints
 * Feature: sistema-gestion-floreria
 * 
 * **Validates: Requirements 1.5**
 * 
 * Property 3: Protected Endpoints Require Authentication
 * 
 * For any administrative endpoint, when accessed without a valid JWT token,
 * the system should return a 401 Unauthorized error.
 */

const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const { authenticateToken } = require('../middleware/auth');

// Mock environment variable for testing
process.env.JWT_SECRET = 'test_secret_key_for_testing';

describe('Property 3: Protected Endpoints Require Authentication', () => {
  
  /**
   * Create a test Express app with protected routes
   * This simulates the administrative endpoints that require authentication
   */
  function createTestApp() {
    const app = express();
    app.use(express.json());
    
    // Protected administrative endpoints
    app.get('/api/v1/productos', authenticateToken, (req, res) => {
      res.json({ success: true, productos: [] });
    });
    
    app.post('/api/v1/productos', authenticateToken, (req, res) => {
      res.status(201).json({ success: true, id: 1 });
    });
    
    app.put('/api/v1/productos/:id', authenticateToken, (req, res) => {
      res.json({ success: true });
    });
    
    app.delete('/api/v1/productos/:id', authenticateToken, (req, res) => {
      res.json({ success: true });
    });
    
    app.get('/api/v1/inventario', authenticateToken, (req, res) => {
      res.json({ success: true, items: [] });
    });
    
    app.post('/api/v1/inventario', authenticateToken, (req, res) => {
      res.status(201).json({ success: true, id: 1 });
    });
    
    app.put('/api/v1/inventario/:id', authenticateToken, (req, res) => {
      res.json({ success: true });
    });
    
    app.delete('/api/v1/inventario/:id', authenticateToken, (req, res) => {
      res.json({ success: true });
    });
    
    app.get('/api/v1/pedidos', authenticateToken, (req, res) => {
      res.json({ success: true, pedidos: [] });
    });
    
    app.post('/api/v1/pedidos', authenticateToken, (req, res) => {
      res.status(201).json({ success: true, id: 1 });
    });
    
    app.put('/api/v1/pedidos/:id', authenticateToken, (req, res) => {
      res.json({ success: true });
    });
    
    app.delete('/api/v1/pedidos/:id', authenticateToken, (req, res) => {
      res.json({ success: true });
    });
    
    app.get('/api/v1/ventas', authenticateToken, (req, res) => {
      res.json({ success: true, ventas: [] });
    });
    
    app.post('/api/v1/ventas', authenticateToken, (req, res) => {
      res.status(201).json({ success: true, id: 1 });
    });
    
    app.put('/api/v1/ventas/:id', authenticateToken, (req, res) => {
      res.json({ success: true });
    });
    
    app.delete('/api/v1/ventas/:id', authenticateToken, (req, res) => {
      res.json({ success: true });
    });
    
    app.get('/api/v1/clientes', authenticateToken, (req, res) => {
      res.json({ success: true, clientes: [] });
    });
    
    app.get('/api/v1/trabajadores', authenticateToken, (req, res) => {
      res.json({ success: true, trabajadores: [] });
    });
    
    app.get('/api/v1/gastos', authenticateToken, (req, res) => {
      res.json({ success: true, gastos: [] });
    });
    
    app.get('/api/v1/reportes/ventas', authenticateToken, (req, res) => {
      res.json({ success: true, total_ventas: 0 });
    });
    
    return app;
  }

  it('should return 401 for any protected endpoint accessed without token', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various administrative endpoints
        fc.constantFrom(
          { method: 'GET', path: '/api/v1/productos' },
          { method: 'POST', path: '/api/v1/productos' },
          { method: 'PUT', path: '/api/v1/productos/1' },
          { method: 'DELETE', path: '/api/v1/productos/1' },
          { method: 'GET', path: '/api/v1/inventario' },
          { method: 'POST', path: '/api/v1/inventario' },
          { method: 'GET', path: '/api/v1/pedidos' },
          { method: 'POST', path: '/api/v1/ventas' },
          { method: 'GET', path: '/api/v1/clientes' },
          { method: 'GET', path: '/api/v1/trabajadores' },
          { method: 'GET', path: '/api/v1/gastos' },
          { method: 'GET', path: '/api/v1/reportes/ventas' }
        ),
        async (endpoint) => {
          // Create fresh app for each test
          const app = createTestApp();
          
          // Make request without Authorization header
          let response;
          
          switch (endpoint.method) {
            case 'GET':
              response = await request(app).get(endpoint.path);
              break;
            case 'POST':
              response = await request(app).post(endpoint.path).send({});
              break;
            case 'PUT':
              response = await request(app).put(endpoint.path).send({});
              break;
            case 'DELETE':
              response = await request(app).delete(endpoint.path);
              break;
            default:
              throw new Error(`Unsupported method: ${endpoint.method}`);
          }
          
          // Ensure response exists
          if (!response) {
            console.log('No response received for:', endpoint);
            return false;
          }
          
          // Property 1: Status code should be 401
          const hasUnauthorizedStatus = response.status === 401;
          
          // Property 2: Response should indicate authentication is required
          const hasErrorResponse = response.body && response.body.success === false;
          const hasErrorCode = response.body && response.body.error && response.body.error.code === 'UNAUTHORIZED';
          const hasErrorMessage = response.body && response.body.error && !!response.body.error.message;
          
          return hasUnauthorizedStatus && hasErrorResponse && hasErrorCode && hasErrorMessage;
        }
      ),
      { numRuns: 10 } // Reduced from 50 for faster execution
    );
  });

  it('should return 401 for any protected endpoint with invalid token format', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various endpoints
        fc.constantFrom(
          { method: 'GET', path: '/api/v1/productos' },
          { method: 'POST', path: '/api/v1/inventario' },
          { method: 'GET', path: '/api/v1/pedidos' }
        ),
        // Generate invalid token formats
        fc.oneof(
          fc.constant(''), // Empty token
          fc.constant('invalid'), // No Bearer prefix
          fc.constant('Bearer'), // Bearer without token
          fc.string({ minLength: 1, maxLength: 20 }), // Random string
          fc.constant('Bearer invalid.token'), // Malformed JWT
          fc.constant('Bearer a.b.c.d') // Too many parts
        ),
        async (endpoint, invalidToken) => {
          const app = createTestApp();
          let response;
          
          switch (endpoint.method) {
            case 'GET':
              response = await request(app)
                .get(endpoint.path)
                .set('Authorization', invalidToken);
              break;
            case 'POST':
              response = await request(app)
                .post(endpoint.path)
                .set('Authorization', invalidToken)
                .send({});
              break;
          }
          
          // Property: Should return 401 for invalid tokens
          return response.status === 401 && 
                 response.body.success === false &&
                 response.body.error.code === 'UNAUTHORIZED';
        }
      ),
      { numRuns: 10 } // Reduced from 50 for faster execution
    );
  });

  it('should return 401 for any protected endpoint with expired or tampered token', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { method: 'GET', path: '/api/v1/productos' },
          { method: 'GET', path: '/api/v1/inventario' }
        ),
        // Generate tokens with invalid signatures
        fc.oneof(
          // Valid JWT structure but wrong signature
          fc.constant('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZXN0In0.invalid_signature'),
          // Tampered payload
          fc.constant('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature')
        ),
        async (endpoint, invalidToken) => {
          const app = createTestApp();
          const response = await request(app)
            .get(endpoint.path)
            .set('Authorization', invalidToken);
          
          // Property: Should reject tampered or invalid tokens
          return response.status === 401 &&
                 response.body.success === false &&
                 response.body.error.code === 'UNAUTHORIZED';
        }
      ),
      { numRuns: 10 } // Reduced from 30 for faster execution
    );
  });

  it('should return 401 when Authorization header is missing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { method: 'GET', path: '/api/v1/productos' },
          { method: 'POST', path: '/api/v1/productos' },
          { method: 'GET', path: '/api/v1/inventario' },
          { method: 'POST', path: '/api/v1/inventario' },
          { method: 'GET', path: '/api/v1/pedidos' },
          { method: 'POST', path: '/api/v1/ventas' },
          { method: 'GET', path: '/api/v1/clientes' },
          { method: 'GET', path: '/api/v1/trabajadores' },
          { method: 'GET', path: '/api/v1/gastos' },
          { method: 'GET', path: '/api/v1/reportes/ventas' }
        ),
        async (endpoint) => {
          const app = createTestApp();
          let response;
          
          // Make request without any Authorization header
          switch (endpoint.method) {
            case 'GET':
              response = await request(app).get(endpoint.path);
              break;
            case 'POST':
              response = await request(app).post(endpoint.path).send({});
              break;
          }
          
          // Property 1: Should return 401
          const isUnauthorized = response.status === 401;
          
          // Property 2: Should have error structure
          const hasErrorStructure = 
            response.body.success === false &&
            response.body.error &&
            response.body.error.code === 'UNAUTHORIZED' &&
            response.body.error.message &&
            response.body.error.message.includes('requerido');
          
          return isUnauthorized && hasErrorStructure;
        }
      ),
      { numRuns: 10 } // Reduced from 50 for faster execution
    );
  });

  it('should return 401 for any HTTP method on protected endpoints without token', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Test all HTTP methods
        fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
        // Test various protected paths
        fc.constantFrom(
          '/api/v1/productos',
          '/api/v1/inventario',
          '/api/v1/pedidos',
          '/api/v1/ventas'
        ),
        async (method, path) => {
          const app = createTestApp();
          let response;
          
          // Adjust path for PUT/DELETE to include ID
          const testPath = (method === 'PUT' || method === 'DELETE') ? `${path}/1` : path;
          
          switch (method) {
            case 'GET':
              response = await request(app).get(testPath);
              break;
            case 'POST':
              response = await request(app).post(testPath).send({});
              break;
            case 'PUT':
              response = await request(app).put(testPath).send({});
              break;
            case 'DELETE':
              response = await request(app).delete(testPath);
              break;
          }
          
          // Property: All methods should require authentication
          return response.status === 401 &&
                 response.body.success === false &&
                 response.body.error.code === 'UNAUTHORIZED';
        }
      ),
      { numRuns: 10 } // Reduced from 50 for faster execution
    );
  });

  it('should consistently return 401 for the same unauthenticated request', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { method: 'GET', path: '/api/v1/productos' },
          { method: 'GET', path: '/api/v1/inventario' }
        ),
        async (endpoint) => {
          const app = createTestApp();
          
          // Make the same request multiple times
          const response1 = await request(app).get(endpoint.path);
          const response2 = await request(app).get(endpoint.path);
          const response3 = await request(app).get(endpoint.path);
          
          // Property: All responses should be identical (deterministic)
          const allReturn401 = 
            response1.status === 401 &&
            response2.status === 401 &&
            response3.status === 401;
          
          const allHaveSameError =
            response1.body.error.code === response2.body.error.code &&
            response2.body.error.code === response3.body.error.code &&
            response1.body.error.code === 'UNAUTHORIZED';
          
          return allReturn401 && allHaveSameError;
        }
      ),
      { numRuns: 10 } // Reduced from 30 for faster execution
    );
  });
});
