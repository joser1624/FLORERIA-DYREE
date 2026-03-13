/**
 * Products Repository Tests
 * Tests for products data access layer
 * 
 * Validates: Requirements 2.1, 2.3, 2.8
 */

const productosRepository = require('../repositories/productosRepository');
const { pool } = require('../config/database');

describe('Products Repository', () => {
  let testProductId;
  let testInventoryId;
  
  beforeAll(async () => {
    // Create a test inventory item for recipe tests
    const inventoryResult = await pool.query(`
      INSERT INTO inventario (nombre, cantidad, unidad, minimo_stock, costo_unitario)
      VALUES ('Test Roses', 100, 'unidades', 10, 5.50)
      RETURNING id
    `);
    testInventoryId = inventoryResult.rows[0].id;
  });
  
  afterAll(async () => {
    // Clean up test data
    if (testProductId) {
      await pool.query('DELETE FROM receta_arreglo WHERE producto_id = $1', [testProductId]);
      await pool.query('DELETE FROM productos WHERE id = $1', [testProductId]);
    }
    if (testInventoryId) {
      await pool.query('DELETE FROM inventario WHERE id = $1', [testInventoryId]);
    }
  });
  
  describe('create', () => {
    it('should create a new product with required fields', async () => {
      const productData = {
        nombre: 'Test Bouquet',
        categoria: 'Ramos',
        precio: 50.00,
        costo: 30.00,
        descripcion: 'A beautiful test bouquet',
        imagen_url: 'https://example.com/test.jpg'
      };
      
      const result = await productosRepository.create(productData);
      testProductId = result.id;
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.nombre).toBe(productData.nombre);
      expect(result.categoria).toBe(productData.categoria);
      expect(parseFloat(result.precio)).toBe(productData.precio);
      expect(parseFloat(result.costo)).toBe(productData.costo);
      expect(result.activo).toBe(true);
      expect(result.tiene_receta).toBe(false);
      expect(result.margen_porcentaje).toBeDefined();
    });
    
    it('should calculate margin percentage correctly', async () => {
      const productData = {
        nombre: 'Margin Test Product',
        categoria: 'Cajas',
        precio: 100.00,
        costo: 50.00
      };
      
      const result = await productosRepository.create(productData);
      const expectedMargin = ((100 - 50) / 50) * 100; // 100%
      
      expect(parseFloat(result.margen_porcentaje)).toBeCloseTo(expectedMargin, 2);
      
      // Clean up
      await pool.query('DELETE FROM productos WHERE id = $1', [result.id]);
    });
  });
  
  describe('findAll', () => {
    it('should return all products without filters', async () => {
      const results = await productosRepository.findAll();
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
    
    it('should filter products by category', async () => {
      const results = await productosRepository.findAll({ categoria: 'Ramos' });
      
      expect(Array.isArray(results)).toBe(true);
      results.forEach(product => {
        expect(product.categoria).toBe('Ramos');
      });
    });
    
    it('should filter products by active status', async () => {
      const results = await productosRepository.findAll({ activo: true });
      
      expect(Array.isArray(results)).toBe(true);
      results.forEach(product => {
        expect(product.activo).toBe(true);
      });
    });
    
    it('should filter by both category and active status', async () => {
      const results = await productosRepository.findAll({ 
        categoria: 'Ramos', 
        activo: true 
      });
      
      expect(Array.isArray(results)).toBe(true);
      results.forEach(product => {
        expect(product.categoria).toBe('Ramos');
        expect(product.activo).toBe(true);
      });
    });
  });
  
  describe('findById', () => {
    it('should return product by id', async () => {
      const result = await productosRepository.findById(testProductId);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(testProductId);
      expect(result.nombre).toBe('Test Bouquet');
      expect(result.receta).toBeDefined();
      expect(Array.isArray(result.receta)).toBe(true);
    });
    
    it('should return null for non-existent product', async () => {
      const result = await productosRepository.findById(999999);
      
      expect(result).toBeNull();
    });
    
    it('should include recipe when product has one', async () => {
      // First save a recipe
      await productosRepository.saveRecipe(testProductId, [
        { inventario_id: testInventoryId, cantidad: 12 }
      ]);
      
      const result = await productosRepository.findById(testProductId);
      
      expect(result.tiene_receta).toBe(true);
      expect(result.receta).toBeDefined();
      expect(result.receta.length).toBe(1);
      expect(result.receta[0].inventario_id).toBe(testInventoryId);
      expect(parseFloat(result.receta[0].cantidad)).toBe(12);
      expect(result.receta[0].inventario_nombre).toBe('Test Roses');
    });
  });
  
  describe('update', () => {
    it('should update product fields', async () => {
      const updateData = {
        nombre: 'Updated Test Bouquet',
        precio: 60.00,
        descripcion: 'Updated description'
      };
      
      const result = await productosRepository.update(testProductId, updateData);
      
      expect(result).toBeDefined();
      expect(result.nombre).toBe(updateData.nombre);
      expect(parseFloat(result.precio)).toBe(updateData.precio);
      expect(result.descripcion).toBe(updateData.descripcion);
    });
    
    it('should return null for non-existent product', async () => {
      const result = await productosRepository.update(999999, { nombre: 'Test' });
      
      expect(result).toBeNull();
    });
    
    it('should update fecha_actualizacion', async () => {
      const before = await productosRepository.findById(testProductId);
      
      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await productosRepository.update(testProductId, { precio: 65.00 });
      
      expect(new Date(result.fecha_actualizacion).getTime())
        .toBeGreaterThan(new Date(before.fecha_actualizacion).getTime());
    });
  });
  
  describe('softDelete', () => {
    it('should mark product as inactive', async () => {
      const result = await productosRepository.softDelete(testProductId);
      
      expect(result).toBe(true);
      
      const product = await productosRepository.findById(testProductId);
      expect(product.activo).toBe(false);
      
      // Restore for other tests
      await productosRepository.update(testProductId, { activo: true });
    });
    
    it('should return false for non-existent product', async () => {
      const result = await productosRepository.softDelete(999999);
      
      expect(result).toBe(false);
    });
    
    it('should not remove product from database', async () => {
      await productosRepository.softDelete(testProductId);
      
      const product = await pool.query('SELECT * FROM productos WHERE id = $1', [testProductId]);
      expect(product.rows.length).toBe(1);
      
      // Restore
      await productosRepository.update(testProductId, { activo: true });
    });
  });
  
  describe('saveRecipe', () => {
    it('should save recipe for product', async () => {
      const receta = [
        { inventario_id: testInventoryId, cantidad: 10 }
      ];
      
      const result = await productosRepository.saveRecipe(testProductId, receta);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].producto_id).toBe(testProductId);
      expect(result[0].inventario_id).toBe(testInventoryId);
      expect(parseFloat(result[0].cantidad)).toBe(10);
    });
    
    it('should replace existing recipe', async () => {
      // Save initial recipe
      await productosRepository.saveRecipe(testProductId, [
        { inventario_id: testInventoryId, cantidad: 5 }
      ]);
      
      // Save new recipe
      const newReceta = [
        { inventario_id: testInventoryId, cantidad: 15 }
      ];
      
      const result = await productosRepository.saveRecipe(testProductId, newReceta);
      
      expect(result.length).toBe(1);
      expect(parseFloat(result[0].cantidad)).toBe(15);
      
      // Verify old recipe was deleted
      const product = await productosRepository.findById(testProductId);
      expect(product.receta.length).toBe(1);
    });
    
    it('should update tiene_receta flag', async () => {
      const receta = [
        { inventario_id: testInventoryId, cantidad: 8 }
      ];
      
      await productosRepository.saveRecipe(testProductId, receta);
      
      const product = await productosRepository.findById(testProductId);
      expect(product.tiene_receta).toBe(true);
    });
    
    it('should handle empty recipe', async () => {
      const result = await productosRepository.saveRecipe(testProductId, []);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
      
      const product = await productosRepository.findById(testProductId);
      expect(product.tiene_receta).toBe(false);
    });
    
    it('should rollback on error', async () => {
      const invalidReceta = [
        { inventario_id: 999999, cantidad: 10 } // Non-existent inventory item
      ];
      
      await expect(
        productosRepository.saveRecipe(testProductId, invalidReceta)
      ).rejects.toThrow();
      
      // Verify no partial changes were made
      const product = await productosRepository.findById(testProductId);
      expect(product.receta.length).toBe(0);
    });
  });
});
