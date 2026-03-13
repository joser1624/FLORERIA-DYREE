/**
 * Inventory Endpoints Integration Tests
 * Tests for /api/v1/inventario endpoints
 * 
 * Validates: Requirements 3.1, 3.2, 3.4, 15.2
 */

const request = require('supertest');
const { query } = require('../config/database');
const { hashPassword } = require('../utils/auth');

// Import app but don't start the server
const app = require('../server');

describe('Inventory Endpoints - Integration Tests', () => {
  let testUserId;
  let validToken;
  let testItemId;
  
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
      ['testuser_inventario', hashedPassword, 'Test User', 'Administrador', 'test@test.com', true]
    );
    
    testUserId = result.rows[0].id;
    
    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'testuser_inventario',
        password: 'testpassword123'
      });
    
    validToken = loginResponse.body.token;
  });
  
  // Cleanup: Remove test data after tests
  afterAll(async () => {
    // Delete test inventory items
    await query(`DELETE FROM inventario WHERE nombre LIKE 'Test Item%'`);
    
    // Delete test user
    if (testUserId) {
      await query('DELETE FROM usuarios WHERE id = $1', [testUserId]);
    }
  });
  
  describe('GET /api/v1/inventario', () => {
    beforeAll(async () => {
      // Create test inventory items with different stock levels
      await query(
        `INSERT INTO inventario (nombre, cantidad, unidad, minimo_stock, costo_unitario)
         VALUES 
         ('Test Item OK Stock', 100, 'unidades', 20, 5.50),
         ('Test Item Low Stock', 15, 'unidades', 20, 3.00),
         ('Test Item Critical Stock', 5, 'unidades', 20, 2.50)
         ON CONFLICT DO NOTHING`
      );
    });
    
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/v1/inventario')
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
    
    it('should return all inventory items when no filters are provided', async () => {
      const response = await request(app)
        .get('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.items).toBeDefined();
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.alertas).toBeDefined();
      expect(typeof response.body.alertas).toBe('number');
      
      // Should include test items
      const testItems = response.body.items.filter(item => item.nombre.startsWith('Test Item'));
      expect(testItems.length).toBeGreaterThanOrEqual(3);
    });
    
    it('should filter items by estado=ok', async () => {
      const response = await request(app)
        .get('/api/v1/inventario?estado=ok')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.items).toBeDefined();
      
      // All returned items should have estado 'ok'
      response.body.items.forEach(item => {
        expect(item.estado).toBe('ok');
      });
    });
    
    it('should filter items by estado=bajo', async () => {
      const response = await request(app)
        .get('/api/v1/inventario?estado=bajo')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.items).toBeDefined();
      
      // All returned items should have estado 'bajo'
      response.body.items.forEach(item => {
        expect(item.estado).toBe('bajo');
      });
    });
    
    it('should filter items by estado=critico', async () => {
      const response = await request(app)
        .get('/api/v1/inventario?estado=critico')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.items).toBeDefined();
      
      // All returned items should have estado 'critico'
      response.body.items.forEach(item => {
        expect(item.estado).toBe('critico');
      });
    });
    
    it('should return correct alertas count', async () => {
      const response = await request(app)
        .get('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // Count items with bajo or critico status
      const alertItems = response.body.items.filter(
        item => item.estado === 'bajo' || item.estado === 'critico'
      );
      
      expect(response.body.alertas).toBe(alertItems.length);
    });
  });
  
  describe('GET /api/v1/inventario/alertas', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/v1/inventario/alertas')
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
    
    it('should return only items with low stock alerts (Requirement 3.4)', async () => {
      const response = await request(app)
        .get('/api/v1/inventario/alertas')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.alertas).toBeDefined();
      expect(Array.isArray(response.body.alertas)).toBe(true);
      
      // All returned items should have estado 'bajo' or 'critico'
      response.body.alertas.forEach(item => {
        expect(['bajo', 'critico']).toContain(item.estado);
      });
    });
    
    it('should order alerts with critico first, then bajo', async () => {
      const response = await request(app)
        .get('/api/v1/inventario/alertas')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // Check ordering: all 'critico' items should come before 'bajo' items
      let foundBajo = false;
      response.body.alertas.forEach(item => {
        if (item.estado === 'bajo') {
          foundBajo = true;
        }
        if (foundBajo && item.estado === 'critico') {
          fail('Found critico item after bajo item - incorrect ordering');
        }
      });
    });
  });
  
  describe('GET /api/v1/inventario/:id', () => {
    beforeAll(async () => {
      // Create a test item
      const result = await query(
        `INSERT INTO inventario (nombre, cantidad, unidad, minimo_stock, costo_unitario)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['Test Item Detail', 50, 'kg', 10, 8.75]
      );
      testItemId = result.rows[0].id;
    });
    
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get(`/api/v1/inventario/${testItemId}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
    
    it('should return 404 when item does not exist', async () => {
      const response = await request(app)
        .get('/api/v1/inventario/999999')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('no encontrado');
    });
    
    it('should return item details when item exists', async () => {
      const response = await request(app)
        .get(`/api/v1/inventario/${testItemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.item).toBeDefined();
      expect(response.body.item.id).toBe(testItemId);
      expect(response.body.item.nombre).toBe('Test Item Detail');
      expect(parseFloat(response.body.item.cantidad)).toBe(50);
      expect(response.body.item.unidad).toBe('kg');
      expect(parseFloat(response.body.item.minimo_stock)).toBe(10);
      expect(parseFloat(response.body.item.costo_unitario)).toBe(8.75);
      expect(response.body.item.estado).toBeDefined();
      expect(['ok', 'bajo', 'critico']).toContain(response.body.item.estado);
    });
  });
  
  describe('POST /api/v1/inventario', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .send({
          nombre: 'Test Item',
          cantidad: 100,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 5.00
        })
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
    
    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Item'
          // Missing cantidad, unidad, minimo_stock, costo_unitario
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('requeridos');
    });
    
    it('should return 400 when cantidad is negative (Requirement 15.2)', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Item Negative',
          cantidad: -10,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 5.00
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('cantidad debe ser un número no negativo');
    });
    
    it('should return 400 when minimo_stock is negative', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Item Negative Min',
          cantidad: 100,
          unidad: 'unidades',
          minimo_stock: -5,
          costo_unitario: 5.00
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('mínimo stock debe ser un número no negativo');
    });
    
    it('should return 400 when costo_unitario is negative', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Item Negative Cost',
          cantidad: 100,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: -5.00
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('costo unitario debe ser un número no negativo');
    });
    
    it('should accept cantidad = 0 (Requirement 15.2)', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Item Zero Quantity',
          cantidad: 0,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 5.00
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.item).toBeDefined();
      expect(parseFloat(response.body.item.cantidad)).toBe(0);
    });
    
    it('should create item successfully with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Item Create Success',
          cantidad: 150,
          unidad: 'litros',
          minimo_stock: 30,
          costo_unitario: 12.50
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.item).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.item.nombre).toBe('Test Item Create Success');
      expect(parseFloat(response.body.item.cantidad)).toBe(150);
      expect(response.body.item.unidad).toBe('litros');
      expect(parseFloat(response.body.item.minimo_stock)).toBe(30);
      expect(parseFloat(response.body.item.costo_unitario)).toBe(12.50);
      expect(response.body.item.estado).toBeDefined();
    });
    
    it('should calculate estado correctly on creation', async () => {
      // Create item with critical stock (cantidad < minimo_stock * 0.5)
      const criticalResponse = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Item Critical Estado',
          cantidad: 5,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 5.00
        })
        .expect(201);
      
      expect(criticalResponse.body.item.estado).toBe('critico');
      
      // Create item with low stock (cantidad < minimo_stock but >= minimo_stock * 0.5)
      const lowResponse = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Item Low Estado',
          cantidad: 15,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 5.00
        })
        .expect(201);
      
      expect(lowResponse.body.item.estado).toBe('bajo');
      
      // Create item with ok stock (cantidad >= minimo_stock)
      const okResponse = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Item OK Estado',
          cantidad: 100,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 5.00
        })
        .expect(201);
      
      expect(okResponse.body.item.estado).toBe('ok');
    });
  });
  
  describe('PUT /api/v1/inventario/:id', () => {
    let updateTestItemId;
    
    beforeAll(async () => {
      // Create a test item for updates
      const result = await query(
        `INSERT INTO inventario (nombre, cantidad, unidad, minimo_stock, costo_unitario)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['Test Item Update', 100, 'unidades', 20, 5.00]
      );
      updateTestItemId = result.rows[0].id;
    });
    
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .put(`/api/v1/inventario/${updateTestItemId}`)
        .send({ cantidad: 150 })
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
    
    it('should return 404 when item does not exist', async () => {
      const response = await request(app)
        .put('/api/v1/inventario/999999')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ cantidad: 150 })
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
    
    it('should return 400 when cantidad is negative (Requirement 15.2)', async () => {
      const response = await request(app)
        .put(`/api/v1/inventario/${updateTestItemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ cantidad: -50 })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('cantidad debe ser un número no negativo');
    });
    
    it('should return 400 when minimo_stock is negative', async () => {
      const response = await request(app)
        .put(`/api/v1/inventario/${updateTestItemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ minimo_stock: -10 })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('should return 400 when costo_unitario is negative', async () => {
      const response = await request(app)
        .put(`/api/v1/inventario/${updateTestItemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ costo_unitario: -5.00 })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('should update item successfully with valid data', async () => {
      const response = await request(app)
        .put(`/api/v1/inventario/${updateTestItemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Item Updated Name',
          cantidad: 200,
          costo_unitario: 7.50
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.item).toBeDefined();
      expect(response.body.item.nombre).toBe('Test Item Updated Name');
      expect(parseFloat(response.body.item.cantidad)).toBe(200);
      expect(parseFloat(response.body.item.costo_unitario)).toBe(7.50);
    });
    
    it('should update only specified fields', async () => {
      const response = await request(app)
        .put(`/api/v1/inventario/${updateTestItemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          unidad: 'kg'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.item.unidad).toBe('kg');
      expect(response.body.item.nombre).toBe('Test Item Updated Name'); // Should remain unchanged
    });
    
    it('should recalculate estado when cantidad is updated', async () => {
      // Update to critical level
      const criticalResponse = await request(app)
        .put(`/api/v1/inventario/${updateTestItemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ cantidad: 5 })
        .expect(200);
      
      expect(criticalResponse.body.item.estado).toBe('critico');
      
      // Update to low level
      const lowResponse = await request(app)
        .put(`/api/v1/inventario/${updateTestItemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ cantidad: 15 })
        .expect(200);
      
      expect(lowResponse.body.item.estado).toBe('bajo');
      
      // Update to ok level
      const okResponse = await request(app)
        .put(`/api/v1/inventario/${updateTestItemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ cantidad: 100 })
        .expect(200);
      
      expect(okResponse.body.item.estado).toBe('ok');
    });
  });
  
  describe('DELETE /api/v1/inventario/:id', () => {
    let deleteTestItemId;
    
    beforeEach(async () => {
      // Create a fresh test item for each delete test
      const result = await query(
        `INSERT INTO inventario (nombre, cantidad, unidad, minimo_stock, costo_unitario)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['Test Item Delete', 100, 'unidades', 20, 5.00]
      );
      deleteTestItemId = result.rows[0].id;
    });
    
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .delete(`/api/v1/inventario/${deleteTestItemId}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
    
    it('should return 404 when item does not exist', async () => {
      const response = await request(app)
        .delete('/api/v1/inventario/999999')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
    
    it('should delete item successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/inventario/${deleteTestItemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // Verify item no longer exists
      const result = await query(
        'SELECT COUNT(*) as count FROM inventario WHERE id = $1',
        [deleteTestItemId]
      );
      
      expect(parseInt(result.rows[0].count)).toBe(0);
    });
  });
  
  describe('Inventory Flow', () => {
    it('should complete full CRUD flow: create -> read -> update -> delete', async () => {
      // Step 1: Create item
      const createResponse = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Item Flow',
          cantidad: 80,
          unidad: 'metros',
          minimo_stock: 15,
          costo_unitario: 9.99
        })
        .expect(201);
      
      expect(createResponse.body.success).toBe(true);
      const itemId = createResponse.body.id;
      
      // Step 2: Read item
      const readResponse = await request(app)
        .get(`/api/v1/inventario/${itemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(readResponse.body.success).toBe(true);
      expect(readResponse.body.item.nombre).toBe('Test Item Flow');
      
      // Step 3: Update item
      const updateResponse = await request(app)
        .put(`/api/v1/inventario/${itemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Item Flow Updated',
          cantidad: 120
        })
        .expect(200);
      
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.item.nombre).toBe('Test Item Flow Updated');
      expect(parseFloat(updateResponse.body.item.cantidad)).toBe(120);
      
      // Step 4: Delete item
      const deleteResponse = await request(app)
        .delete(`/api/v1/inventario/${itemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(deleteResponse.body.success).toBe(true);
      
      // Step 5: Verify item is deleted
      await request(app)
        .get(`/api/v1/inventario/${itemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);
    });
  });
});
