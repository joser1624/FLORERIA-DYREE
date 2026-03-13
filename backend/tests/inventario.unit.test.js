/**
 * Inventory Module Unit Tests
 * Tests for inventario routes and repository with specific scenarios and edge cases
 * 
 * Validates: Requirements 3.2, 3.4, 15.2
 */

const request = require('supertest');
const { query } = require('../config/database');
const { hashPassword } = require('../utils/auth');
const inventarioRepository = require('../repositories/inventarioRepository');

// Import app but don't start the server
const app = require('../server');

describe('Inventory Module - Unit Tests', () => {
  let testUserId;
  let validToken;
  
  // Setup: Create a test user and get auth token
  beforeAll(async () => {
    const hashedPassword = await hashPassword('testpassword123');
    
    const result = await query(
      `INSERT INTO usuarios (username, password_hash, nombre, rol, email, activo)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (username) DO UPDATE 
       SET password_hash = $2, activo = $6
       RETURNING id`,
      ['testuser_inventario_unit', hashedPassword, 'Test User Inventario', 'Administrador', 'testinv@test.com', true]
    );
    
    testUserId = result.rows[0].id;
    
    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'testuser_inventario_unit',
        password: 'testpassword123'
      });
    
    validToken = loginResponse.body.token;
  });
  
  // Cleanup: Remove test data after tests
  afterAll(async () => {
    await query(`DELETE FROM inventario WHERE nombre LIKE 'Unit Test%'`);
    if (testUserId) {
      await query('DELETE FROM usuarios WHERE id = $1', [testUserId]);
    }
  });

  describe('Test de creación de item de inventario', () => {
    it('should create inventory item with all valid fields', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Rosas Rojas',
          cantidad: 100,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 5.50
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.item).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.item.nombre).toBe('Unit Test Rosas Rojas');
      expect(parseFloat(response.body.item.cantidad)).toBe(100);
      expect(response.body.item.unidad).toBe('unidades');
      expect(parseFloat(response.body.item.minimo_stock)).toBe(20);
      expect(parseFloat(response.body.item.costo_unitario)).toBe(5.50);
      expect(response.body.item.estado).toBe('ok');
    });
    
    it('should create inventory item with cantidad = 0', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Item Cero',
          cantidad: 0,
          unidad: 'kg',
          minimo_stock: 10,
          costo_unitario: 3.00
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(parseFloat(response.body.item.cantidad)).toBe(0);
      expect(response.body.item.estado).toBe('critico');
    });
    
    it('should create inventory item with minimo_stock = 0', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Sin Mínimo',
          cantidad: 50,
          unidad: 'unidades',
          minimo_stock: 0,
          costo_unitario: 2.00
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(parseFloat(response.body.item.minimo_stock)).toBe(0);
      expect(response.body.item.estado).toBe('ok');
    });

    it('should create inventory item with costo_unitario = 0', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Costo Cero',
          cantidad: 100,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 0
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(parseFloat(response.body.item.costo_unitario)).toBe(0);
    });
    
    it('should create inventory item with decimal values', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Decimales',
          cantidad: 15.5,
          unidad: 'kg',
          minimo_stock: 10.25,
          costo_unitario: 7.99
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(parseFloat(response.body.item.cantidad)).toBe(15.5);
      expect(parseFloat(response.body.item.minimo_stock)).toBe(10.25);
      expect(parseFloat(response.body.item.costo_unitario)).toBe(7.99);
    });
    
    it('should create inventory item with different units', async () => {
      const units = ['unidades', 'kg', 'gramos', 'litros', 'metros'];
      
      for (const unidad of units) {
        const response = await request(app)
          .post('/api/v1/inventario')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            nombre: `Unit Test ${unidad}`,
            cantidad: 50,
            unidad: unidad,
            minimo_stock: 10,
            costo_unitario: 5.00
          })
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.item.unidad).toBe(unidad);
      }
    });
  });

  describe('Test de rechazo de cantidad negativa', () => {
    it('should reject inventory item with negative cantidad', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Cantidad Negativa',
          cantidad: -10,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 5.00
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('cantidad debe ser un número no negativo');
      expect(response.body.error.details.field).toBe('cantidad');
      expect(response.body.error.details.constraint).toBe('cantidad >= 0');
    });
    
    it('should reject inventory item with negative minimo_stock', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Mínimo Negativo',
          cantidad: 50,
          unidad: 'unidades',
          minimo_stock: -5,
          costo_unitario: 5.00
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('mínimo stock debe ser un número no negativo');
      expect(response.body.error.details.field).toBe('minimo_stock');
    });
    
    it('should reject inventory item with negative costo_unitario', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Costo Negativo',
          cantidad: 50,
          unidad: 'unidades',
          minimo_stock: 10,
          costo_unitario: -3.50
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('costo unitario debe ser un número no negativo');
      expect(response.body.error.details.field).toBe('costo_unitario');
    });

    it('should reject update with negative cantidad', async () => {
      // Create a valid item first
      const createResponse = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Para Actualizar Negativo',
          cantidad: 50,
          unidad: 'unidades',
          minimo_stock: 10,
          costo_unitario: 5.00
        })
        .expect(201);
      
      const itemId = createResponse.body.id;
      
      // Try to update with negative cantidad
      const response = await request(app)
        .put(`/api/v1/inventario/${itemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          cantidad: -20
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('cantidad debe ser un número no negativo');
    });
    
    it('should reject inventory item with non-numeric cantidad', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Cantidad String',
          cantidad: 'invalid',
          unidad: 'unidades',
          minimo_stock: 10,
          costo_unitario: 5.00
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Test de generación de alertas de stock bajo', () => {
    let lowStockId;
    let criticalStockId;
    let okStockId;
    
    beforeAll(async () => {
      // Create items with different stock levels
      const lowStockResponse = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Alerta Bajo',
          cantidad: 15,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 3.00
        })
        .expect(201);
      lowStockId = lowStockResponse.body.id;
      
      const criticalStockResponse = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Alerta Crítico',
          cantidad: 5,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 3.00
        })
        .expect(201);
      criticalStockId = criticalStockResponse.body.id;
      
      const okStockResponse = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Alerta OK',
          cantidad: 100,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 3.00
        })
        .expect(201);
      okStockId = okStockResponse.body.id;
    });
    
    it('should retrieve low stock alerts', async () => {
      const response = await request(app)
        .get('/api/v1/inventario/alertas')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.alertas).toBeDefined();
      expect(Array.isArray(response.body.alertas)).toBe(true);
      
      // Should include our test items with bajo and critico status
      const testAlerts = response.body.alertas.filter(item => 
        item.nombre.startsWith('Unit Test Alerta')
      );
      
      expect(testAlerts.length).toBeGreaterThanOrEqual(2);
      
      // Verify all alerts have bajo or critico status
      response.body.alertas.forEach(item => {
        expect(['bajo', 'critico']).toContain(item.estado);
      });
    });

    it('should not include ok status items in alerts', async () => {
      const response = await request(app)
        .get('/api/v1/inventario/alertas')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      const okItems = response.body.alertas.filter(item => item.estado === 'ok');
      expect(okItems.length).toBe(0);
    });
    
    it('should count alertas in inventory list endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.alertas).toBeDefined();
      expect(typeof response.body.alertas).toBe('number');
      expect(response.body.alertas).toBeGreaterThanOrEqual(2);
    });
    
    it('should filter inventory by estado=bajo', async () => {
      const response = await request(app)
        .get('/api/v1/inventario?estado=bajo')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      response.body.items.forEach(item => {
        expect(item.estado).toBe('bajo');
      });
    });
    
    it('should filter inventory by estado=critico', async () => {
      const response = await request(app)
        .get('/api/v1/inventario?estado=critico')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      response.body.items.forEach(item => {
        expect(item.estado).toBe('critico');
      });
    });
    
    it('should generate alert when updating item to low stock', async () => {
      // Update ok stock item to low stock
      await request(app)
        .put(`/api/v1/inventario/${okStockId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          cantidad: 15
        })
        .expect(200);
      
      // Check alerts now include this item
      const response = await request(app)
        .get('/api/v1/inventario/alertas')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      const updatedItem = response.body.alertas.find(item => item.id === okStockId);
      expect(updatedItem).toBeDefined();
      expect(updatedItem.estado).toBe('bajo');
      
      // Restore to ok
      await request(app)
        .put(`/api/v1/inventario/${okStockId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          cantidad: 100
        })
        .expect(200);
    });
  });

  describe('Test de cálculo de estado (ok/bajo/crítico)', () => {
    it('should calculate estado as "ok" when cantidad >= minimo_stock', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Estado OK',
          cantidad: 100,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 5.00
        })
        .expect(201);
      
      expect(response.body.item.estado).toBe('ok');
      expect(parseFloat(response.body.item.cantidad)).toBeGreaterThanOrEqual(parseFloat(response.body.item.minimo_stock));
    });
    
    it('should calculate estado as "ok" when cantidad equals minimo_stock', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Estado OK Igual',
          cantidad: 20,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 5.00
        })
        .expect(201);
      
      expect(response.body.item.estado).toBe('ok');
      expect(parseFloat(response.body.item.cantidad)).toBe(parseFloat(response.body.item.minimo_stock));
    });
    
    it('should calculate estado as "bajo" when cantidad < minimo_stock but >= minimo_stock * 0.5', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Estado Bajo',
          cantidad: 15,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 5.00
        })
        .expect(201);
      
      expect(response.body.item.estado).toBe('bajo');
      const cantidad = parseFloat(response.body.item.cantidad);
      const minimo = parseFloat(response.body.item.minimo_stock);
      expect(cantidad).toBeLessThan(minimo);
      expect(cantidad).toBeGreaterThanOrEqual(minimo * 0.5);
    });

    it('should calculate estado as "bajo" at boundary (exactly minimo_stock * 0.5)', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Estado Bajo Límite',
          cantidad: 10,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 5.00
        })
        .expect(201);
      
      expect(response.body.item.estado).toBe('bajo');
      expect(parseFloat(response.body.item.cantidad)).toBe(parseFloat(response.body.item.minimo_stock) * 0.5);
    });
    
    it('should calculate estado as "critico" when cantidad < minimo_stock * 0.5', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Estado Crítico',
          cantidad: 5,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 5.00
        })
        .expect(201);
      
      expect(response.body.item.estado).toBe('critico');
      const cantidad = parseFloat(response.body.item.cantidad);
      const minimo = parseFloat(response.body.item.minimo_stock);
      expect(cantidad).toBeLessThan(minimo * 0.5);
    });
    
    it('should calculate estado as "critico" when cantidad is 0', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Estado Crítico Cero',
          cantidad: 0,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 5.00
        })
        .expect(201);
      
      expect(response.body.item.estado).toBe('critico');
      expect(parseFloat(response.body.item.cantidad)).toBe(0);
    });

    it('should recalculate estado when cantidad is updated', async () => {
      // Create item with ok status
      const createResponse = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Recalcular Estado',
          cantidad: 100,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 5.00
        })
        .expect(201);
      
      const itemId = createResponse.body.id;
      expect(createResponse.body.item.estado).toBe('ok');
      
      // Update to bajo
      const bajoResponse = await request(app)
        .put(`/api/v1/inventario/${itemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          cantidad: 15
        })
        .expect(200);
      
      expect(bajoResponse.body.item.estado).toBe('bajo');
      
      // Update to critico
      const criticoResponse = await request(app)
        .put(`/api/v1/inventario/${itemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          cantidad: 5
        })
        .expect(200);
      
      expect(criticoResponse.body.item.estado).toBe('critico');
      
      // Update back to ok
      const okResponse = await request(app)
        .put(`/api/v1/inventario/${itemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          cantidad: 100
        })
        .expect(200);
      
      expect(okResponse.body.item.estado).toBe('ok');
    });
    
    it('should recalculate estado when minimo_stock is updated', async () => {
      // Create item with ok status
      const createResponse = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Recalcular Mínimo',
          cantidad: 50,
          unidad: 'unidades',
          minimo_stock: 20,
          costo_unitario: 5.00
        })
        .expect(201);
      
      const itemId = createResponse.body.id;
      expect(createResponse.body.item.estado).toBe('ok');
      
      // Increase minimo_stock to trigger bajo
      const bajoResponse = await request(app)
        .put(`/api/v1/inventario/${itemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          minimo_stock: 60
        })
        .expect(200);
      
      expect(bajoResponse.body.item.estado).toBe('bajo');
      
      // Increase minimo_stock further to trigger critico
      const criticoResponse = await request(app)
        .put(`/api/v1/inventario/${itemId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          minimo_stock: 120
        })
        .expect(200);
      
      expect(criticoResponse.body.item.estado).toBe('critico');
    });

    it('should handle estado calculation with decimal values', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Estado Decimales',
          cantidad: 7.5,
          unidad: 'kg',
          minimo_stock: 10.0,
          costo_unitario: 5.00
        })
        .expect(201);
      
      // 7.5 < 10 but >= 5 (10 * 0.5), so should be bajo
      expect(response.body.item.estado).toBe('bajo');
    });
    
    it('should calculate estado as "ok" when minimo_stock is 0', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Mínimo Cero',
          cantidad: 50,
          unidad: 'unidades',
          minimo_stock: 0,
          costo_unitario: 5.00
        })
        .expect(201);
      
      expect(response.body.item.estado).toBe('ok');
    });
  });
  
  describe('Repository Unit Tests', () => {
    it('should create inventory item through repository', async () => {
      const itemData = {
        nombre: 'Unit Test Repository Create',
        cantidad: 100,
        unidad: 'unidades',
        minimo_stock: 20,
        costo_unitario: 5.00
      };
      
      const item = await inventarioRepository.create(itemData);
      
      expect(item).toBeDefined();
      expect(item.id).toBeDefined();
      expect(item.nombre).toBe(itemData.nombre);
      expect(parseFloat(item.cantidad)).toBe(itemData.cantidad);
      expect(item.estado).toBe('ok');
      
      // Cleanup
      await query('DELETE FROM inventario WHERE id = $1', [item.id]);
    });

    it('should find inventory item by id through repository', async () => {
      const created = await inventarioRepository.create({
        nombre: 'Unit Test Repository FindById',
        cantidad: 50,
        unidad: 'kg',
        minimo_stock: 10,
        costo_unitario: 3.00
      });
      
      const found = await inventarioRepository.findById(created.id);
      
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.nombre).toBe('Unit Test Repository FindById');
      
      // Cleanup
      await query('DELETE FROM inventario WHERE id = $1', [created.id]);
    });
    
    it('should return null when inventory item not found', async () => {
      const found = await inventarioRepository.findById(999999);
      expect(found).toBeNull();
    });
    
    it('should update inventory item through repository', async () => {
      const created = await inventarioRepository.create({
        nombre: 'Unit Test Repository Update',
        cantidad: 100,
        unidad: 'unidades',
        minimo_stock: 20,
        costo_unitario: 5.00
      });
      
      const updated = await inventarioRepository.update(created.id, {
        nombre: 'Unit Test Repository Updated',
        cantidad: 150
      });
      
      expect(updated).toBeDefined();
      expect(updated.nombre).toBe('Unit Test Repository Updated');
      expect(parseFloat(updated.cantidad)).toBe(150);
      expect(parseFloat(updated.costo_unitario)).toBe(5.00); // Should remain unchanged
      
      // Cleanup
      await query('DELETE FROM inventario WHERE id = $1', [created.id]);
    });
    
    it('should delete inventory item through repository', async () => {
      const created = await inventarioRepository.create({
        nombre: 'Unit Test Repository Delete',
        cantidad: 50,
        unidad: 'unidades',
        minimo_stock: 10,
        costo_unitario: 3.00
      });
      
      const deleted = await inventarioRepository.delete(created.id);
      expect(deleted).toBe(true);
      
      const found = await inventarioRepository.findById(created.id);
      expect(found).toBeNull();
    });
    
    it('should get alerts through repository', async () => {
      const alerts = await inventarioRepository.getAlerts();
      
      expect(Array.isArray(alerts)).toBe(true);
      alerts.forEach(item => {
        expect(['bajo', 'critico']).toContain(item.estado);
      });
    });
  });
});
