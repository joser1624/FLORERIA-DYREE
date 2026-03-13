/**
 * Inventory Repository Tests
 * Tests for inventory data access layer
 * 
 * Validates: Requirements 3.1, 3.3, 3.4
 */

const inventarioRepository = require('../repositories/inventarioRepository');
const { pool } = require('../config/database');

describe('Inventory Repository', () => {
  let testItemId;
  
  afterAll(async () => {
    // Clean up test data
    if (testItemId) {
      await pool.query('DELETE FROM inventario WHERE id = $1', [testItemId]);
    }
  });
  
  describe('create', () => {
    it('should create a new inventory item with required fields', async () => {
      const itemData = {
        nombre: 'Test Roses',
        cantidad: 100,
        unidad: 'unidades',
        minimo_stock: 20,
        costo_unitario: 5.50
      };
      
      const result = await inventarioRepository.create(itemData);
      testItemId = result.id;
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.nombre).toBe(itemData.nombre);
      expect(parseFloat(result.cantidad)).toBe(itemData.cantidad);
      expect(result.unidad).toBe(itemData.unidad);
      expect(parseFloat(result.minimo_stock)).toBe(itemData.minimo_stock);
      expect(parseFloat(result.costo_unitario)).toBe(itemData.costo_unitario);
      expect(result.estado).toBe('ok');
    });
    
    it('should calculate estado as "bajo" when cantidad < minimo_stock', async () => {
      const itemData = {
        nombre: 'Low Stock Item',
        cantidad: 15,
        unidad: 'unidades',
        minimo_stock: 20,
        costo_unitario: 3.00
      };
      
      const result = await inventarioRepository.create(itemData);
      
      expect(result.estado).toBe('bajo');
      
      // Clean up
      await pool.query('DELETE FROM inventario WHERE id = $1', [result.id]);
    });
    
    it('should calculate estado as "critico" when cantidad < minimo_stock * 0.5', async () => {
      const itemData = {
        nombre: 'Critical Stock Item',
        cantidad: 5,
        unidad: 'unidades',
        minimo_stock: 20,
        costo_unitario: 3.00
      };
      
      const result = await inventarioRepository.create(itemData);
      
      expect(result.estado).toBe('critico');
      
      // Clean up
      await pool.query('DELETE FROM inventario WHERE id = $1', [result.id]);
    });
  });
  
  describe('findAll', () => {
    it('should return all inventory items without filters', async () => {
      const results = await inventarioRepository.findAll();
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
    
    it('should filter inventory items by estado', async () => {
      const results = await inventarioRepository.findAll({ estado: 'ok' });
      
      expect(Array.isArray(results)).toBe(true);
      results.forEach(item => {
        expect(item.estado).toBe('ok');
      });
    });
  });
  
  describe('findById', () => {
    it('should return inventory item by id', async () => {
      const result = await inventarioRepository.findById(testItemId);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(testItemId);
      expect(result.nombre).toBe('Test Roses');
    });
    
    it('should return null for non-existent item', async () => {
      const result = await inventarioRepository.findById(999999);
      
      expect(result).toBeNull();
    });
  });
  
  describe('update', () => {
    it('should update inventory item fields', async () => {
      const updateData = {
        nombre: 'Updated Test Roses',
        cantidad: 150,
        costo_unitario: 6.00
      };
      
      const result = await inventarioRepository.update(testItemId, updateData);
      
      expect(result).toBeDefined();
      expect(result.nombre).toBe(updateData.nombre);
      expect(parseFloat(result.cantidad)).toBe(updateData.cantidad);
      expect(parseFloat(result.costo_unitario)).toBe(updateData.costo_unitario);
    });
    
    it('should return null for non-existent item', async () => {
      const result = await inventarioRepository.update(999999, { nombre: 'Test' });
      
      expect(result).toBeNull();
    });
    
    it('should update fecha_actualizacion', async () => {
      const before = await inventarioRepository.findById(testItemId);
      
      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await inventarioRepository.update(testItemId, { cantidad: 160 });
      
      expect(new Date(result.fecha_actualizacion).getTime())
        .toBeGreaterThan(new Date(before.fecha_actualizacion).getTime());
    });
    
    it('should recalculate estado when cantidad changes', async () => {
      // Set to low stock
      const lowStock = await inventarioRepository.update(testItemId, { cantidad: 15 });
      expect(lowStock.estado).toBe('bajo');
      
      // Set to critical stock
      const criticalStock = await inventarioRepository.update(testItemId, { cantidad: 5 });
      expect(criticalStock.estado).toBe('critico');
      
      // Restore to ok
      const okStock = await inventarioRepository.update(testItemId, { cantidad: 100 });
      expect(okStock.estado).toBe('ok');
    });
  });
  
  describe('delete', () => {
    it('should delete inventory item', async () => {
      // Create a temporary item
      const tempItem = await inventarioRepository.create({
        nombre: 'Temp Item',
        cantidad: 50,
        unidad: 'unidades',
        minimo_stock: 10,
        costo_unitario: 2.00
      });
      
      const result = await inventarioRepository.delete(tempItem.id);
      
      expect(result).toBe(true);
      
      const item = await inventarioRepository.findById(tempItem.id);
      expect(item).toBeNull();
    });
    
    it('should return false for non-existent item', async () => {
      const result = await inventarioRepository.delete(999999);
      
      expect(result).toBe(false);
    });
  });
  
  describe('getAlerts', () => {
    let lowStockId;
    let criticalStockId;
    
    beforeAll(async () => {
      // Create items with low and critical stock
      const lowStock = await inventarioRepository.create({
        nombre: 'Low Stock Alert Item',
        cantidad: 15,
        unidad: 'unidades',
        minimo_stock: 20,
        costo_unitario: 3.00
      });
      lowStockId = lowStock.id;
      
      const criticalStock = await inventarioRepository.create({
        nombre: 'Critical Stock Alert Item',
        cantidad: 5,
        unidad: 'unidades',
        minimo_stock: 20,
        costo_unitario: 3.00
      });
      criticalStockId = criticalStock.id;
    });
    
    afterAll(async () => {
      if (lowStockId) {
        await pool.query('DELETE FROM inventario WHERE id = $1', [lowStockId]);
      }
      if (criticalStockId) {
        await pool.query('DELETE FROM inventario WHERE id = $1', [criticalStockId]);
      }
    });
    
    it('should return items with low or critical stock', async () => {
      const results = await inventarioRepository.getAlerts();
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      results.forEach(item => {
        expect(['bajo', 'critico']).toContain(item.estado);
      });
    });
    
    it('should order critical items before low items', async () => {
      const results = await inventarioRepository.getAlerts();
      
      const criticalItems = results.filter(item => item.estado === 'critico');
      const lowItems = results.filter(item => item.estado === 'bajo');
      
      if (criticalItems.length > 0 && lowItems.length > 0) {
        const lastCriticalIndex = results.findIndex(item => item.id === criticalItems[criticalItems.length - 1].id);
        const firstLowIndex = results.findIndex(item => item.id === lowItems[0].id);
        
        expect(lastCriticalIndex).toBeLessThan(firstLowIndex);
      }
    });
  });
  
  describe('decrementQuantity', () => {
    it('should decrement inventory quantity', async () => {
      const before = await inventarioRepository.findById(testItemId);
      const decrementAmount = 10;
      
      const result = await inventarioRepository.decrementQuantity(testItemId, decrementAmount);
      
      expect(result).toBeDefined();
      expect(parseFloat(result.cantidad)).toBe(parseFloat(before.cantidad) - decrementAmount);
    });
    
    it('should return null for non-existent item', async () => {
      const result = await inventarioRepository.decrementQuantity(999999, 10);
      
      expect(result).toBeNull();
    });
    
    it('should update fecha_actualizacion', async () => {
      const before = await inventarioRepository.findById(testItemId);
      
      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await inventarioRepository.decrementQuantity(testItemId, 5);
      
      expect(new Date(result.fecha_actualizacion).getTime())
        .toBeGreaterThan(new Date(before.fecha_actualizacion).getTime());
    });
    
    it('should recalculate estado after decrement', async () => {
      // Set quantity to a known value
      await inventarioRepository.update(testItemId, { cantidad: 25, minimo_stock: 20 });
      
      // Decrement to trigger low stock
      const result = await inventarioRepository.decrementQuantity(testItemId, 10);
      
      expect(result.estado).toBe('bajo');
      
      // Restore
      await inventarioRepository.update(testItemId, { cantidad: 100 });
    });
  });
});
