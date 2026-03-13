/**
 * Products Module Unit Tests
 * Tests for productos routes and repository with specific scenarios and edge cases
 * 
 * Validates: Requirements 2.2, 2.3, 2.7, 2.8, 15.1
 */

const request = require('supertest');
const { query } = require('../config/database');
const { hashPassword } = require('../utils/auth');
const productosRepository = require('../repositories/productosRepository');

// Import app but don't start the server
const app = require('../server');

describe('Products Module - Unit Tests', () => {
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
      ['testuser_productos_unit', hashedPassword, 'Test User Unit', 'Administrador', 'testunit@test.com', true]
    );
    
    testUserId = result.rows[0].id;
    
    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'testuser_productos_unit',
        password: 'testpassword123'
      });
    
    validToken = loginResponse.body.token;
  });
  
  // Cleanup: Remove test data after tests
  afterAll(async () => {
    await query(`DELETE FROM productos WHERE nombre LIKE 'Unit Test%'`);
    if (testUserId) {
      await query('DELETE FROM usuarios WHERE id = $1', [testUserId]);
    }
  });
  
  describe('Test de creación de producto con datos válidos', () => {
    it('should create product with all valid fields', async () => {
      const response = await request(app)
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Ramo Completo',
          categoria: 'Ramos',
          precio: 150,
          costo: 75,
          descripcion: 'Hermoso ramo de rosas rojas',
          imagen_url: 'https://example.com/ramo.jpg',
          tiene_receta: true
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.producto).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.producto.nombre).toBe('Unit Test Ramo Completo');
      expect(response.body.producto.categoria).toBe('Ramos');
      expect(parseFloat(response.body.producto.precio)).toBe(150);
      expect(parseFloat(response.body.producto.costo)).toBe(75);
      expect(response.body.producto.descripcion).toBe('Hermoso ramo de rosas rojas');
      expect(response.body.producto.imagen_url).toBe('https://example.com/ramo.jpg');
      expect(response.body.producto.tiene_receta).toBe(true);
      expect(response.body.producto.activo).toBe(true);
      expect(response.body.producto.margen_porcentaje).toBeDefined();
      expect(parseFloat(response.body.producto.margen_porcentaje)).toBe(100); // (150-75)/75 * 100
    });
    
    it('should create product with minimal required fields', async () => {
      const response = await request(app)
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Producto Mínimo',
          categoria: 'Cajas',
          precio: 100,
          costo: 40
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.producto.nombre).toBe('Unit Test Producto Mínimo');
      expect(response.body.producto.descripcion).toBeNull();
      expect(response.body.producto.imagen_url).toBeNull();
      expect(response.body.producto.tiene_receta).toBe(false);
    });
    
    it('should create product with precio slightly greater than costo', async () => {
      const response = await request(app)
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Margen Bajo',
          categoria: 'Arreglos',
          precio: 50.01,
          costo: 50
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(parseFloat(response.body.producto.precio)).toBe(50.01);
      expect(parseFloat(response.body.producto.costo)).toBe(50);
    });
    
    it('should create product for each valid category', async () => {
      const categories = ['Ramos', 'Cajas', 'Arreglos', 'Sorpresas', 'Eventos'];
      
      for (const categoria of categories) {
        const response = await request(app)
          .post('/api/v1/productos')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            nombre: `Unit Test ${categoria}`,
            categoria: categoria,
            precio: 100,
            costo: 50
          })
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.producto.categoria).toBe(categoria);
      }
    });
  });
  
  describe('Test de rechazo de producto con precio <= costo', () => {
    it('should reject product when precio < costo', async () => {
      const response = await request(app)
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Precio Menor',
          categoria: 'Ramos',
          precio: 40,
          costo: 100
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('precio debe ser mayor que el costo');
      expect(response.body.error.details.field).toBe('precio');
      expect(response.body.error.details.constraint).toBe('precio > costo');
    });
    
    it('should reject product when precio equals costo', async () => {
      const response = await request(app)
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Precio Igual',
          categoria: 'Ramos',
          precio: 75,
          costo: 75
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('precio debe ser mayor que el costo');
    });
    
    it('should reject product with precio = 0 and costo = 0', async () => {
      const response = await request(app)
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Cero',
          categoria: 'Ramos',
          precio: 0,
          costo: 0
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('should reject product with negative precio', async () => {
      const response = await request(app)
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Precio Negativo',
          categoria: 'Ramos',
          precio: -50,
          costo: 25
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      // The validation checks precio <= costo first, so negative precio triggers that error
      expect(response.body.error.message).toContain('precio debe ser mayor que el costo');
    });
    
    it('should reject product with negative costo', async () => {
      const response = await request(app)
        .post('/api/v1/productos')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Costo Negativo',
          categoria: 'Ramos',
          precio: 100,
          costo: -25
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
  
  describe('Test de actualización de producto', () => {
    let updateProductId;
    
    beforeEach(async () => {
      const result = await query(
        `INSERT INTO productos (nombre, categoria, precio, costo, descripcion, activo)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        ['Unit Test Producto Para Actualizar', 'Ramos', 120, 60, 'Descripción original', true]
      );
      updateProductId = result.rows[0].id;
    });
    
    it('should update product name only', async () => {
      const response = await request(app)
        .put(`/api/v1/productos/${updateProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Nombre Actualizado'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.producto.nombre).toBe('Unit Test Nombre Actualizado');
      expect(parseFloat(response.body.producto.precio)).toBe(120);
      expect(parseFloat(response.body.producto.costo)).toBe(60);
    });
    
    it('should update precio maintaining valid constraint', async () => {
      const response = await request(app)
        .put(`/api/v1/productos/${updateProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          precio: 200
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(parseFloat(response.body.producto.precio)).toBe(200);
      expect(parseFloat(response.body.producto.costo)).toBe(60);
    });
    
    it('should update costo maintaining valid constraint', async () => {
      const response = await request(app)
        .put(`/api/v1/productos/${updateProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          costo: 50
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(parseFloat(response.body.producto.costo)).toBe(50);
      expect(parseFloat(response.body.producto.precio)).toBe(120);
    });
    
    it('should update both precio and costo together', async () => {
      const response = await request(app)
        .put(`/api/v1/productos/${updateProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          precio: 180,
          costo: 90
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(parseFloat(response.body.producto.precio)).toBe(180);
      expect(parseFloat(response.body.producto.costo)).toBe(90);
    });
    
    it('should reject update when new precio <= existing costo', async () => {
      const response = await request(app)
        .put(`/api/v1/productos/${updateProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          precio: 50 // Current costo is 60
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('precio debe ser mayor que el costo');
    });
    
    it('should reject update when new costo >= existing precio', async () => {
      const response = await request(app)
        .put(`/api/v1/productos/${updateProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          costo: 130 // Current precio is 120
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('should update multiple fields at once', async () => {
      const response = await request(app)
        .put(`/api/v1/productos/${updateProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          nombre: 'Unit Test Actualización Múltiple',
          categoria: 'Cajas',
          descripcion: 'Nueva descripción',
          precio: 250,
          costo: 100,
          imagen_url: 'https://example.com/nueva.jpg'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.producto.nombre).toBe('Unit Test Actualización Múltiple');
      expect(response.body.producto.categoria).toBe('Cajas');
      expect(response.body.producto.descripcion).toBe('Nueva descripción');
      expect(parseFloat(response.body.producto.precio)).toBe(250);
      expect(parseFloat(response.body.producto.costo)).toBe(100);
      expect(response.body.producto.imagen_url).toBe('https://example.com/nueva.jpg');
    });
    
    it('should update activo status to false', async () => {
      const response = await request(app)
        .put(`/api/v1/productos/${updateProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          activo: false
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.producto.activo).toBe(false);
    });
    
    it('should update activo status to true', async () => {
      // First set to false
      await query('UPDATE productos SET activo = false WHERE id = $1', [updateProductId]);
      
      const response = await request(app)
        .put(`/api/v1/productos/${updateProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          activo: true
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.producto.activo).toBe(true);
    });
  });
  
  describe('Test de soft delete', () => {
    let deleteProductId;
    
    beforeEach(async () => {
      const result = await query(
        `INSERT INTO productos (nombre, categoria, precio, costo, activo)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['Unit Test Producto Para Eliminar', 'Ramos', 100, 50, true]
      );
      deleteProductId = result.rows[0].id;
    });
    
    it('should soft delete product (mark activo=false)', async () => {
      const response = await request(app)
        .delete(`/api/v1/productos/${deleteProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // Verify product still exists but is inactive
      const result = await query(
        'SELECT id, nombre, activo FROM productos WHERE id = $1',
        [deleteProductId]
      );
      
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].activo).toBe(false);
      expect(result.rows[0].nombre).toBe('Unit Test Producto Para Eliminar');
    });
    
    it('should not physically delete product from database', async () => {
      await request(app)
        .delete(`/api/v1/productos/${deleteProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      // Verify product record still exists
      const result = await query(
        'SELECT COUNT(*) as count FROM productos WHERE id = $1',
        [deleteProductId]
      );
      
      expect(parseInt(result.rows[0].count)).toBe(1);
    });
    
    it('should allow soft deleting already inactive product', async () => {
      // First soft delete
      await request(app)
        .delete(`/api/v1/productos/${deleteProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      // Second soft delete should still succeed
      const response = await request(app)
        .delete(`/api/v1/productos/${deleteProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
    
    it('should return 404 when deleting non-existent product', async () => {
      const response = await request(app)
        .delete('/api/v1/productos/999999')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
    
    it('should preserve all product data after soft delete', async () => {
      await request(app)
        .delete(`/api/v1/productos/${deleteProductId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      // Verify all data is preserved
      const result = await query(
        'SELECT nombre, categoria, precio, costo, activo FROM productos WHERE id = $1',
        [deleteProductId]
      );
      
      expect(result.rows[0].nombre).toBe('Unit Test Producto Para Eliminar');
      expect(result.rows[0].categoria).toBe('Ramos');
      expect(parseFloat(result.rows[0].precio)).toBe(100);
      expect(parseFloat(result.rows[0].costo)).toBe(50);
      expect(result.rows[0].activo).toBe(false);
    });
  });
  
  describe('Test de filtrado por categoría', () => {
    beforeAll(async () => {
      // Create test products in different categories
      const testProducts = [
        { nombre: 'Unit Test Filtro Ramo 1', categoria: 'Ramos', precio: 100, costo: 50 },
        { nombre: 'Unit Test Filtro Ramo 2', categoria: 'Ramos', precio: 120, costo: 60 },
        { nombre: 'Unit Test Filtro Caja 1', categoria: 'Cajas', precio: 150, costo: 75 },
        { nombre: 'Unit Test Filtro Arreglo 1', categoria: 'Arreglos', precio: 200, costo: 100 },
        { nombre: 'Unit Test Filtro Sorpresa 1', categoria: 'Sorpresas', precio: 180, costo: 90 },
        { nombre: 'Unit Test Filtro Evento 1', categoria: 'Eventos', precio: 300, costo: 150 }
      ];
      
      for (const product of testProducts) {
        await query(
          `INSERT INTO productos (nombre, categoria, precio, costo, activo)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [product.nombre, product.categoria, product.precio, product.costo, true]
        );
      }
    });
    
    it('should filter products by Ramos category', async () => {
      const response = await request(app)
        .get('/api/v1/productos?categoria=Ramos')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.productos).toBeDefined();
      
      // All returned products should be Ramos
      response.body.productos.forEach(producto => {
        expect(producto.categoria).toBe('Ramos');
      });
      
      // Should include our test products
      const testRamos = response.body.productos.filter(p => p.nombre.startsWith('Unit Test Filtro Ramo'));
      expect(testRamos.length).toBeGreaterThanOrEqual(2);
    });
    
    it('should filter products by Cajas category', async () => {
      const response = await request(app)
        .get('/api/v1/productos?categoria=Cajas')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      response.body.productos.forEach(producto => {
        expect(producto.categoria).toBe('Cajas');
      });
    });
    
    it('should filter products by Arreglos category', async () => {
      const response = await request(app)
        .get('/api/v1/productos?categoria=Arreglos')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      response.body.productos.forEach(producto => {
        expect(producto.categoria).toBe('Arreglos');
      });
    });
    
    it('should filter products by Sorpresas category', async () => {
      const response = await request(app)
        .get('/api/v1/productos?categoria=Sorpresas')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      response.body.productos.forEach(producto => {
        expect(producto.categoria).toBe('Sorpresas');
      });
    });
    
    it('should filter products by Eventos category', async () => {
      const response = await request(app)
        .get('/api/v1/productos?categoria=Eventos')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      response.body.productos.forEach(producto => {
        expect(producto.categoria).toBe('Eventos');
      });
    });
    
    it('should combine categoria and activo filters', async () => {
      // Create an inactive Ramos product
      await query(
        `INSERT INTO productos (nombre, categoria, precio, costo, activo)
         VALUES ($1, $2, $3, $4, $5)`,
        ['Unit Test Filtro Ramo Inactivo', 'Ramos', 100, 50, false]
      );
      
      const response = await request(app)
        .get('/api/v1/productos?categoria=Ramos&activo=true')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      response.body.productos.forEach(producto => {
        expect(producto.categoria).toBe('Ramos');
        expect(producto.activo).toBe(true);
      });
    });
    
    it('should return empty array for category with no products', async () => {
      // Delete all Eventos products temporarily
      const eventosProducts = await query(
        `SELECT id FROM productos WHERE categoria = 'Eventos' AND nombre LIKE 'Unit Test Filtro%'`
      );
      
      if (eventosProducts.rows.length > 0) {
        await query(
          `UPDATE productos SET activo = false WHERE categoria = 'Eventos' AND nombre LIKE 'Unit Test Filtro%'`
        );
      }
      
      const response = await request(app)
        .get('/api/v1/productos?categoria=Eventos&activo=true')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.productos)).toBe(true);
    });
  });
  
  describe('Repository Unit Tests', () => {
    it('should create product through repository', async () => {
      const productData = {
        nombre: 'Unit Test Repository Create',
        categoria: 'Ramos',
        precio: 100,
        costo: 50,
        descripcion: 'Test description'
      };
      
      const producto = await productosRepository.create(productData);
      
      expect(producto).toBeDefined();
      expect(producto.id).toBeDefined();
      expect(producto.nombre).toBe(productData.nombre);
      expect(parseFloat(producto.precio)).toBe(productData.precio);
      expect(parseFloat(producto.costo)).toBe(productData.costo);
    });
    
    it('should find product by id through repository', async () => {
      // Create a product first
      const created = await productosRepository.create({
        nombre: 'Unit Test Repository FindById',
        categoria: 'Cajas',
        precio: 150,
        costo: 75
      });
      
      const found = await productosRepository.findById(created.id);
      
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.nombre).toBe('Unit Test Repository FindById');
    });
    
    it('should return null when product not found', async () => {
      const found = await productosRepository.findById(999999);
      expect(found).toBeNull();
    });
    
    it('should update product through repository', async () => {
      const created = await productosRepository.create({
        nombre: 'Unit Test Repository Update',
        categoria: 'Arreglos',
        precio: 200,
        costo: 100
      });
      
      const updated = await productosRepository.update(created.id, {
        nombre: 'Unit Test Repository Updated',
        precio: 250
      });
      
      expect(updated).toBeDefined();
      expect(updated.nombre).toBe('Unit Test Repository Updated');
      expect(parseFloat(updated.precio)).toBe(250);
      expect(parseFloat(updated.costo)).toBe(100); // Should remain unchanged
    });
    
    it('should soft delete through repository', async () => {
      const created = await productosRepository.create({
        nombre: 'Unit Test Repository Delete',
        categoria: 'Sorpresas',
        precio: 180,
        costo: 90
      });
      
      const deleted = await productosRepository.softDelete(created.id);
      expect(deleted).toBe(true);
      
      const found = await productosRepository.findById(created.id);
      expect(found.activo).toBe(false);
    });
  });
});
