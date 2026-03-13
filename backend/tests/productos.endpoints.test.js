/**
 * Products Endpoints Integration Tests
 * Tests for /api/v1/productos endpoints
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.7, 2.8, 15.1
 */

const request = require('supertest');
const { query } = require('../config/database');
const { hashPassword } = require('../utils/auth');

// Import app but don't start the server
const app = require('../server');

describe('Products Endpoints - Integration Tests', () => {
  let testUserId;
  let validToken;
  let testProductId;
  
  // Setup: Create a test user and get auth token
  beforeAll(async () => {
    // Create test user with known credentials
    const hashedPassword = await hashPassword('testpassword123');
    
    const result = await query(
      `INSERT INTO usuarios (username, password_hash, nombre, rol, email, activo)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (username) DO UPDATE 
       SET password_hash = $2, activo = $6
       RETURNING id`,
      ['testuser_productos', hashedPassword, 'Test User', 'Administrador', 'test@test.com', true]
    );
    
    testUserId = result.rows[0].id;
    
    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'testuser_productos',
        password: 'testpassword123'
      });
    
    validToken = loginResponse.body.token;
  });
  
  // Cleanup: Remove test data after tests
  afterAll(async () => {
    // Delete test products
    await query(`DELETE FROM productos WHERE nombre LIKE 'Test Product%'`);
    
    // Delete test user
    if (testUserId) {
      await query('DELETE FROM usuarios WHERE id = $1', [testUserId]);
    }
  });
  
  describe('GET /api/v1/productos', () => {
    beforeAll(async () => {
      // Create test products for filtering
      await query(
        `INSERT INTO productos (nombre, categoria, precio, costo, activo)
         VALUES 
         ('Test Product Ramo', 'Ramos', 100, 50, true),
         ('Test Product Caja', 'Cajas', 150, 75, true),
         ('Test Product Inactive', 'Arreglos', 200, 100, false)
         ON CONFLICT DO NOTHING`
      );
    });
    
    it('should return all active products when no filters are provided', async () => {
      const response = await request(app)
        .get('/api/v1/productos')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.productos).toBeDefined();
      expect(Array.isArray(response.body.productos)).toBe(true);
      
      // Should include active test products
      const testProducts = response.body.productos.filter(p => p.nombre.startsWith('Test Product'));
      expect(testProducts.length).toBeGreaterThanOrEqual(2);
    });
    
    it('should filter products by categoria', async () => {
      const response = await request(app)
        .get('/api/v1/productos?categoria=Ramos')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.productos).toBeDefined();
      
      // All returned products should be in Ramos category
      response.body.productos.forEach(producto => {
        expect(producto.categoria).toBe('Ramos');
      });
    });
    
    it('should filter products by activo status', async () => {
      const response = await request(app)
        .get('/api/v1/productos?activo=false')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.productos).toBeDefined();
      
      // All returned products should be inactive
      response.body.productos.forEach(producto => {
        expect(producto.activo).toBe(false);
      });
    });
    
    it('should filter products by both categoria and activo', async () => {
      const response = await request(app)
        .get('/api/v1/productos?categoria=Cajas&activo=true')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.productos).toBeDefined();
      
      // All returned products should match both filters
      response.body.productos.forEach(producto => {
        expect(producto.categoria).toBe('Cajas');
        expect(producto.activo).toBe(true);
      });
    });
  });
  
  describe('GET /api/v1/productos/:id', () => {
    beforeAll(async () => {
      // Create a test product
      const result = await query(
        `INSERT INTO productos (nombre, categoria, precio, costo, descripcion, activo)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        ['Test Product Detail', 'Ramos', 120, 60, 'Test description', true]
      );
      testProductId = result.rows[0].id;
    });
    
    it('should return 404 when product does not exist', async () => {
      const response = await request(app)
        .get('/api/v1/productos/999999')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('no encontrado');
    });
    
    it('should return product details when product exists', async () => {
      const response = await request(app)
        .get(`/api/v1/productos/${testProductId}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.producto).toBeDefined();
      expect(response.body.producto.id).toBe(testProductId);
      expect(response.body.producto.nombre).toBe('Test Product Detail');
      expect(response.body.producto.categoria).toBe('Ramos');
      expect(parseFloat(response.body.producto.precio)).toBe(120);
      expect(parseFloat(response.body.producto.costo)).toBe(60);
      expect(response.body.producto.descripcion).toBe('Test description');
      expect(response.body.producto.margen_porcentaje).toBeDefined();
      expect(response.body.producto.receta).toBeDefined();
    });
  });
  
  describe('POST /api/v1/productos', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .post('/api/v1/productos')
        .send({
          nombre: 'Test Product',
          categoria: 'Ramos',
          precio: 100,
          costo: 50
        })
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
    
    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Product'
          // Missing categoria, precio, costo
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('requeridos');
    });
    
    it('should return 400 when precio <= costo (Requirement 15.1)', async () => {
      const response = await request(app)
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Product Invalid Price',
          categoria: 'Ramos',
          precio: 50,
          costo: 100
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('precio debe ser mayor que el costo');
    });
    
    it('should return 400 when precio equals costo', async () => {
      const response = await request(app)
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Product Equal Price',
          categoria: 'Ramos',
          precio: 100,
          costo: 100
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('precio debe ser mayor que el costo');
    });
    
    it('should return 400 when categoria is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Product Invalid Category',
          categoria: 'InvalidCategory',
          precio: 100,
          costo: 50
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('inválida');
    });
    
    it('should return 400 when precio or costo are negative', async () => {
      const response = await request(app)
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Product Negative',
          categoria: 'Ramos',
          precio: -100,
          costo: 50
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('should create product successfully with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Product Create Success',
          categoria: 'Ramos',
          precio: 150,
          costo: 75,
          descripcion: 'Beautiful test bouquet',
          imagen_url: 'https://example.com/image.jpg'
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.producto).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.producto.nombre).toBe('Test Product Create Success');
      expect(response.body.producto.categoria).toBe('Ramos');
      expect(parseFloat(response.body.producto.precio)).toBe(150);
      expect(parseFloat(response.body.producto.costo)).toBe(75);
      expect(response.body.producto.descripcion).toBe('Beautiful test bouquet');
      expect(response.body.producto.imagen_url).toBe('https://example.com/image.jpg');
      expect(response.body.producto.activo).toBe(true);
      expect(response.body.producto.margen_porcentaje).toBeDefined();
    });
    
    it('should create product with minimal required fields', async () => {
      const response = await request(app)
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Product Minimal',
          categoria: 'Cajas',
          precio: 200,
          costo: 100
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.producto.nombre).toBe('Test Product Minimal');
      expect(response.body.producto.descripcion).toBeNull();
      expect(response.body.producto.imagen_url).toBeNull();
    });
  });
  
  describe('PUT /api/v1/productos/:id', () => {
    let updateTestProductId;
    
    beforeAll(async () => {
      // Create a test product for updates
      const result = await query(
        `INSERT INTO productos (nombre, categoria, precio, costo, activo)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['Test Product Update', 'Ramos', 100, 50, true]
      );
      updateTestProductId = result.rows[0].id;
    });
    
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .put(`/api/v1/productos/${updateTestProductId}`)
        .send({ nombre: 'Updated Name' })
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
    
    it('should return 404 when product does not exist', async () => {
      const response = await request(app)
        .put('/api/v1/productos/999999')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ nombre: 'Updated Name' })
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
    
    it('should return 400 when updated precio <= costo (Requirement 15.1)', async () => {
      const response = await request(app)
        .put(`/api/v1/productos/${updateTestProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          precio: 40,
          costo: 50
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('precio debe ser mayor que el costo');
    });
    
    it('should return 400 when updating only precio makes it <= existing costo', async () => {
      const response = await request(app)
        .put(`/api/v1/productos/${updateTestProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          precio: 40 // Current costo is 50
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('should return 400 when updating only costo makes it >= existing precio', async () => {
      const response = await request(app)
        .put(`/api/v1/productos/${updateTestProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          costo: 150 // Current precio is 100
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('should return 400 when categoria is invalid', async () => {
      const response = await request(app)
        .put(`/api/v1/productos/${updateTestProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          categoria: 'InvalidCategory'
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('should update product successfully with valid data', async () => {
      const response = await request(app)
        .put(`/api/v1/productos/${updateTestProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Product Updated Name',
          descripcion: 'Updated description',
          precio: 150,
          costo: 70
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.producto).toBeDefined();
      expect(response.body.producto.nombre).toBe('Test Product Updated Name');
      expect(response.body.producto.descripcion).toBe('Updated description');
      expect(parseFloat(response.body.producto.precio)).toBe(150);
      expect(parseFloat(response.body.producto.costo)).toBe(70);
    });
    
    it('should update only specified fields', async () => {
      const response = await request(app)
        .put(`/api/v1/productos/${updateTestProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          categoria: 'Cajas'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.producto.categoria).toBe('Cajas');
      expect(response.body.producto.nombre).toBe('Test Product Updated Name'); // Should remain unchanged
    });
    
    it('should update activo status', async () => {
      const response = await request(app)
        .put(`/api/v1/productos/${updateTestProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          activo: false
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.producto.activo).toBe(false);
    });
  });
  
  describe('DELETE /api/v1/productos/:id', () => {
    let deleteTestProductId;
    
    beforeEach(async () => {
      // Create a fresh test product for each delete test
      const result = await query(
        `INSERT INTO productos (nombre, categoria, precio, costo, activo)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['Test Product Delete', 'Ramos', 100, 50, true]
      );
      deleteTestProductId = result.rows[0].id;
    });
    
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .delete(`/api/v1/productos/${deleteTestProductId}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
    
    it('should return 404 when product does not exist', async () => {
      const response = await request(app)
        .delete('/api/v1/productos/999999')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
    
    it('should soft delete product (mark activo=false) - Requirement 2.8', async () => {
      const response = await request(app)
        .delete(`/api/v1/productos/${deleteTestProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // Verify product still exists in database but is inactive
      const result = await query(
        'SELECT id, activo FROM productos WHERE id = $1',
        [deleteTestProductId]
      );
      
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].activo).toBe(false);
    });
    
    it('should not physically delete product from database', async () => {
      await request(app)
        .delete(`/api/v1/productos/${deleteTestProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      // Verify product record still exists
      const result = await query(
        'SELECT COUNT(*) as count FROM productos WHERE id = $1',
        [deleteTestProductId]
      );
      
      expect(parseInt(result.rows[0].count)).toBe(1);
    });
  });
  
  describe('Products Flow', () => {
    it('should complete full CRUD flow: create -> read -> update -> delete', async () => {
      // Step 1: Create product
      const createResponse = await request(app)
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Product Flow',
          categoria: 'Arreglos',
          precio: 180,
          costo: 90,
          descripcion: 'Flow test product'
        })
        .expect(201);
      
      expect(createResponse.body.success).toBe(true);
      const productId = createResponse.body.id;
      
      // Step 2: Read product
      const readResponse = await request(app)
        .get(`/api/v1/productos/${productId}`)
        .expect(200);
      
      expect(readResponse.body.success).toBe(true);
      expect(readResponse.body.producto.nombre).toBe('Test Product Flow');
      
      // Step 3: Update product
      const updateResponse = await request(app)
        .put(`/api/v1/productos/${productId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Product Flow Updated',
          precio: 200
        })
        .expect(200);
      
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.producto.nombre).toBe('Test Product Flow Updated');
      expect(parseFloat(updateResponse.body.producto.precio)).toBe(200);
      
      // Step 4: Soft delete product
      const deleteResponse = await request(app)
        .delete(`/api/v1/productos/${productId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(deleteResponse.body.success).toBe(true);
      
      // Step 5: Verify product is inactive but still exists
      const verifyResponse = await request(app)
        .get(`/api/v1/productos/${productId}`)
        .expect(200);
      
      expect(verifyResponse.body.producto.activo).toBe(false);
    });
  });
});
