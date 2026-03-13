/**
 * Laboratorio Endpoints Integration Tests
 * Tests for /api/v1/laboratorio endpoints
 * 
 * Validates: Requirements 4.3, 4.4, 4.5, 4.7, 4.9
 */

const request = require('supertest');
const { query } = require('../config/database');
const { hashPassword } = require('../utils/auth');

// Import app but don't start the server
const app = require('../server');

describe('Laboratorio Endpoints - Integration Tests', () => {
  let testUserId;
  let validToken;
  let testInventarioIds = [];
  
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
      ['testuser_laboratorio', hashedPassword, 'Test User Lab', 'Administrador', 'testlab@test.com', true]
    );
    
    testUserId = result.rows[0].id;
    
    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'testuser_laboratorio',
        password: 'testpassword123'
      });
    
    validToken = loginResponse.body.token;
    
    // Create test inventory items for laboratorio tests
    const item1 = await query(
      `INSERT INTO inventario (nombre, cantidad, unidad, minimo_stock, costo_unitario)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['Test Rosas Rojas Lab', 100, 'unidades', 20, 2.50]
    );
    testInventarioIds.push(item1.rows[0].id);
    
    const item2 = await query(
      `INSERT INTO inventario (nombre, cantidad, unidad, minimo_stock, costo_unitario)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['Test Cinta Lab', 50, 'metros', 10, 0.50]
    );
    testInventarioIds.push(item2.rows[0].id);
    
    const item3 = await query(
      `INSERT INTO inventario (nombre, cantidad, unidad, minimo_stock, costo_unitario)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['Test Papel Lab', 10, 'hojas', 5, 1.00]
    );
    testInventarioIds.push(item3.rows[0].id);
  });
  
  // Cleanup: Remove test data after tests
  afterAll(async () => {
    // Delete test products
    await query(`DELETE FROM productos WHERE nombre LIKE 'Test Arreglo%'`);
    
    // Delete test inventory items
    await query(`DELETE FROM inventario WHERE nombre LIKE 'Test%Lab'`);
    
    // Delete test user
    if (testUserId) {
      await query('DELETE FROM usuarios WHERE id = $1', [testUserId]);
    }
  });
  
  describe('POST /api/v1/laboratorio/calcular', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/calcular')
        .send({
          ingredientes: [
            { inventario_id: testInventarioIds[0], cantidad: 12 }
          ],
          margen_porcentaje: 50
        })
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
    
    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/calcular')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          ingredientes: [
            { inventario_id: testInventarioIds[0], cantidad: 12 }
          ]
          // Missing margen_porcentaje
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('requeridos');
    });
    
    it('should return 400 when ingredientes is not an array', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/calcular')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          ingredientes: 'not an array',
          margen_porcentaje: 50
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('array');
    });
    
    it('should return 400 when margen_porcentaje is negative', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/calcular')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          ingredientes: [
            { inventario_id: testInventarioIds[0], cantidad: 12 }
          ],
          margen_porcentaje: -10
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('no negativo');
    });
    
    it('should calculate cost correctly for single ingredient (Requirement 4.3)', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/calcular')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          ingredientes: [
            { inventario_id: testInventarioIds[0], cantidad: 12 }
          ],
          margen_porcentaje: 50
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.costo_total).toBeDefined();
      expect(response.body.precio_sugerido).toBeDefined();
      expect(response.body.disponible).toBeDefined();
      
      // Cost should be 12 * 2.50 = 30
      expect(response.body.costo_total).toBe(30);
    });
    
    it('should calculate cost correctly for multiple ingredients (Requirement 4.3)', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/calcular')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          ingredientes: [
            { inventario_id: testInventarioIds[0], cantidad: 12 }, // 12 * 2.50 = 30
            { inventario_id: testInventarioIds[1], cantidad: 5 },  // 5 * 0.50 = 2.5
            { inventario_id: testInventarioIds[2], cantidad: 3 }   // 3 * 1.00 = 3
          ],
          margen_porcentaje: 50
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // Total cost should be 30 + 2.5 + 3 = 35.5
      expect(response.body.costo_total).toBe(35.5);
    });
    
    it('should calculate suggested price correctly (Requirement 4.5)', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/calcular')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          ingredientes: [
            { inventario_id: testInventarioIds[0], cantidad: 10 } // 10 * 2.50 = 25
          ],
          margen_porcentaje: 60
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.costo_total).toBe(25);
      
      // Suggested price should be 25 * (1 + 60/100) = 25 * 1.6 = 40
      expect(response.body.precio_sugerido).toBe(40);
    });
    
    it('should validate inventory availability when sufficient stock exists (Requirement 4.9)', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/calcular')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          ingredientes: [
            { inventario_id: testInventarioIds[0], cantidad: 10 }, // Available: 100
            { inventario_id: testInventarioIds[1], cantidad: 5 }   // Available: 50
          ],
          margen_porcentaje: 50
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.disponible).toBe(true);
      expect(response.body.ingredientes_insuficientes).toBeUndefined();
    });
    
    it('should detect insufficient inventory (Requirement 4.9)', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/calcular')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          ingredientes: [
            { inventario_id: testInventarioIds[0], cantidad: 150 }, // Available: 100 (insufficient)
            { inventario_id: testInventarioIds[1], cantidad: 5 }
          ],
          margen_porcentaje: 50
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.disponible).toBe(false);
      expect(response.body.ingredientes_insuficientes).toBeDefined();
      expect(Array.isArray(response.body.ingredientes_insuficientes)).toBe(true);
      expect(response.body.ingredientes_insuficientes.length).toBeGreaterThan(0);
      
      // Check that insufficient ingredient details are provided
      const insufficientItem = response.body.ingredientes_insuficientes[0];
      expect(insufficientItem.inventario_id).toBe(testInventarioIds[0]);
      expect(insufficientItem.nombre).toBeDefined();
      expect(insufficientItem.cantidad_requerida).toBe(150);
      expect(insufficientItem.cantidad_disponible).toBeDefined();
    });
    
    it('should handle zero margin percentage', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/calcular')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          ingredientes: [
            { inventario_id: testInventarioIds[0], cantidad: 10 }
          ],
          margen_porcentaje: 0
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.costo_total).toBe(25);
      expect(response.body.precio_sugerido).toBe(25); // Same as cost with 0% margin
    });
  });
  
  describe('POST /api/v1/laboratorio/guardar-arreglo', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/guardar-arreglo')
        .send({
          nombre: 'Test Arreglo',
          categoria: 'Arreglos',
          precio: 50,
          receta: [
            { inventario_id: testInventarioIds[0], cantidad: 12 }
          ]
        })
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
    
    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/guardar-arreglo')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Arreglo'
          // Missing categoria, precio, receta
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('requeridos');
    });
    
    it('should return 400 when categoria is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/guardar-arreglo')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Arreglo',
          categoria: 'InvalidCategory',
          precio: 50,
          receta: [
            { inventario_id: testInventarioIds[0], cantidad: 12 }
          ]
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('categoria');
    });
    
    it('should return 400 when precio is not positive', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/guardar-arreglo')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Arreglo',
          categoria: 'Arreglos',
          precio: 0,
          receta: [
            { inventario_id: testInventarioIds[0], cantidad: 12 }
          ]
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('precio');
    });
    
    it('should return 400 when receta is not an array', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/guardar-arreglo')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Arreglo',
          categoria: 'Arreglos',
          precio: 50,
          receta: 'not an array'
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('array');
    });
    
    it('should return 400 when receta is empty', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/guardar-arreglo')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Arreglo',
          categoria: 'Arreglos',
          precio: 50,
          receta: []
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('vacío');
    });
    
    it('should save arrangement successfully with valid data (Requirement 4.7)', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/guardar-arreglo')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Arreglo Rosas',
          categoria: 'Arreglos',
          precio: 50,
          descripcion: 'Hermoso arreglo de rosas rojas',
          imagen_url: 'https://example.com/arreglo.jpg',
          receta: [
            { inventario_id: testInventarioIds[0], cantidad: 12 },
            { inventario_id: testInventarioIds[1], cantidad: 2 }
          ]
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.producto).toBeDefined();
      expect(response.body.receta).toBeDefined();
      
      // Verify product details
      expect(response.body.producto.nombre).toBe('Test Arreglo Rosas');
      expect(response.body.producto.categoria).toBe('Arreglos');
      expect(parseFloat(response.body.producto.precio)).toBe(50);
      expect(response.body.producto.descripcion).toBe('Hermoso arreglo de rosas rojas');
      expect(response.body.producto.imagen_url).toBe('https://example.com/arreglo.jpg');
      expect(response.body.producto.tiene_receta).toBe(true);
      
      // Verify recipe
      expect(Array.isArray(response.body.receta)).toBe(true);
      expect(response.body.receta.length).toBe(2);
    });
    
    it('should calculate and store cost automatically', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/guardar-arreglo')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Arreglo Cost Calc',
          categoria: 'Ramos',
          precio: 60,
          receta: [
            { inventario_id: testInventarioIds[0], cantidad: 10 } // 10 * 2.50 = 25
          ]
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.producto.costo).toBeDefined();
      expect(parseFloat(response.body.producto.costo)).toBe(25);
    });
    
    it('should return 409 when insufficient inventory exists', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/guardar-arreglo')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Arreglo Insufficient',
          categoria: 'Arreglos',
          precio: 100,
          receta: [
            { inventario_id: testInventarioIds[0], cantidad: 200 } // Available: 100
          ]
        })
        .expect(409);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_INVENTORY');
    });
    
    it('should save arrangement without optional fields', async () => {
      const response = await request(app)
        .post('/api/v1/laboratorio/guardar-arreglo')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Arreglo Minimal',
          categoria: 'Cajas',
          precio: 45,
          receta: [
            { inventario_id: testInventarioIds[1], cantidad: 10 }
          ]
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.producto.nombre).toBe('Test Arreglo Minimal');
      expect(response.body.producto.descripcion).toBeNull();
      expect(response.body.producto.imagen_url).toBeNull();
    });
  });
  
  describe('Laboratorio Flow', () => {
    it('should complete full flow: calculate -> validate -> save arrangement', async () => {
      // Step 1: Calculate cost and price
      const calculateResponse = await request(app)
        .post('/api/v1/laboratorio/calcular')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          ingredientes: [
            { inventario_id: testInventarioIds[0], cantidad: 15 },
            { inventario_id: testInventarioIds[1], cantidad: 3 },
            { inventario_id: testInventarioIds[2], cantidad: 2 }
          ],
          margen_porcentaje: 70
        })
        .expect(200);
      
      expect(calculateResponse.body.success).toBe(true);
      expect(calculateResponse.body.disponible).toBe(true);
      
      const costoTotal = calculateResponse.body.costo_total;
      const precioSugerido = calculateResponse.body.precio_sugerido;
      
      // Step 2: Save arrangement with calculated price
      const saveResponse = await request(app)
        .post('/api/v1/laboratorio/guardar-arreglo')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Test Arreglo Flow Complete',
          categoria: 'Eventos',
          precio: precioSugerido,
          descripcion: 'Arreglo creado mediante flujo completo',
          receta: [
            { inventario_id: testInventarioIds[0], cantidad: 15 },
            { inventario_id: testInventarioIds[1], cantidad: 3 },
            { inventario_id: testInventarioIds[2], cantidad: 2 }
          ]
        })
        .expect(201);
      
      expect(saveResponse.body.success).toBe(true);
      expect(parseFloat(saveResponse.body.producto.costo)).toBe(costoTotal);
      expect(parseFloat(saveResponse.body.producto.precio)).toBe(precioSugerido);
      
      // Step 3: Verify product was created with recipe
      const productId = saveResponse.body.producto.id;
      const verifyResult = await query(
        'SELECT * FROM productos WHERE id = $1',
        [productId]
      );
      
      expect(verifyResult.rows.length).toBe(1);
      expect(verifyResult.rows[0].tiene_receta).toBe(true);
      
      // Step 4: Verify recipe was saved
      const recipeResult = await query(
        'SELECT * FROM receta_arreglo WHERE producto_id = $1',
        [productId]
      );
      
      expect(recipeResult.rows.length).toBe(3);
    });
  });
});
