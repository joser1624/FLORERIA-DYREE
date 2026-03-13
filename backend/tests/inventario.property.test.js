/**
 * Inventory Property-Based Tests
 * Property tests for inventory management
 * 
 * Feature: sistema-gestion-floreria
 */

const fc = require('fast-check');
const inventarioRepository = require('../repositories/inventarioRepository');
const { pool } = require('../config/database');

describe('Inventory - Property-Based Tests', () => {
  
  // Clean up test data after all tests
  const testItemIds = [];
  
  afterAll(async () => {
    // Clean up all test items
    for (const id of testItemIds) {
      try {
        await pool.query('DELETE FROM inventario WHERE id = $1', [id]);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  });

  // **Validates: Requirements 3.4**
  // Feature: sistema-gestion-floreria, Property 7: Low Stock Alert Generation
  describe('Property 7: Low Stock Alert Generation', () => {
    it('should generate low stock alert for any inventory item where cantidad < minimo_stock', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 3, maxLength: 50 }),
            minimo_stock: fc.float({ min: Math.fround(10), max: Math.fround(100), noNaN: true }),
            cantidad: fc.float({ min: Math.fround(0), max: Math.fround(9.99), noNaN: true }), // Always less than minimo_stock
            unidad: fc.constantFrom('unidades', 'kg', 'gramos', 'litros', 'metros'),
            costo_unitario: fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true })
          }),
          async (itemData) => {
            // Precondition: cantidad must be less than minimo_stock
            fc.pre(itemData.cantidad < itemData.minimo_stock);
            
            // Create inventory item
            const createdItem = await inventarioRepository.create(itemData);
            testItemIds.push(createdItem.id);
            
            // Get alerts
            const alerts = await inventarioRepository.getAlerts();
            
            // The created item should be in the alerts list
            const foundInAlerts = alerts.some(alert => alert.id === createdItem.id);
            
            // The item's estado should be either 'bajo' or 'critico'
            const hasLowStockStatus = createdItem.estado === 'bajo' || createdItem.estado === 'critico';
            
            return foundInAlerts && hasLowStockStatus;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should NOT generate alert for any inventory item where cantidad >= minimo_stock', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 3, maxLength: 50 }),
            minimo_stock: fc.float({ min: Math.fround(10), max: Math.fround(100), noNaN: true }),
            cantidad_multiplier: fc.float({ min: Math.fround(1.0), max: Math.fround(5.0), noNaN: true }), // Will multiply minimo_stock
            unidad: fc.constantFrom('unidades', 'kg', 'gramos', 'litros', 'metros'),
            costo_unitario: fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true })
          }),
          async (data) => {
            const itemData = {
              nombre: data.nombre,
              minimo_stock: data.minimo_stock,
              cantidad: data.minimo_stock * data.cantidad_multiplier, // Always >= minimo_stock
              unidad: data.unidad,
              costo_unitario: data.costo_unitario
            };
            
            // Precondition: cantidad must be >= minimo_stock
            fc.pre(itemData.cantidad >= itemData.minimo_stock);
            
            // Create inventory item
            const createdItem = await inventarioRepository.create(itemData);
            testItemIds.push(createdItem.id);
            
            // The item's estado should be 'ok'
            const hasOkStatus = createdItem.estado === 'ok';
            
            // Get alerts
            const alerts = await inventarioRepository.getAlerts();
            
            // The created item should NOT be in the alerts list
            const notFoundInAlerts = !alerts.some(alert => alert.id === createdItem.id);
            
            return hasOkStatus && notFoundInAlerts;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should classify estado as "critico" when cantidad < minimo_stock * 0.5', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 3, maxLength: 50 }),
            minimo_stock: fc.float({ min: Math.fround(20), max: Math.fround(100), noNaN: true }),
            cantidad_factor: fc.float({ min: Math.fround(0.01), max: Math.fround(0.49), noNaN: true }), // Less than 0.5
            unidad: fc.constantFrom('unidades', 'kg', 'gramos', 'litros', 'metros'),
            costo_unitario: fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true })
          }),
          async (data) => {
            const itemData = {
              nombre: data.nombre,
              minimo_stock: data.minimo_stock,
              cantidad: data.minimo_stock * data.cantidad_factor, // Less than minimo_stock * 0.5
              unidad: data.unidad,
              costo_unitario: data.costo_unitario
            };
            
            // Precondition: cantidad must be less than minimo_stock * 0.5
            fc.pre(itemData.cantidad < itemData.minimo_stock * 0.5);
            
            // Create inventory item
            const createdItem = await inventarioRepository.create(itemData);
            testItemIds.push(createdItem.id);
            
            // The item's estado should be 'critico'
            return createdItem.estado === 'critico';
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should classify estado as "bajo" when minimo_stock * 0.5 < cantidad < minimo_stock', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 3, maxLength: 50 }),
            minimo_stock: fc.float({ min: Math.fround(20), max: Math.fround(100), noNaN: true }),
            cantidad_factor: fc.float({ min: Math.fround(0.51), max: Math.fround(0.99), noNaN: true }), // Between 0.51 and 0.99
            unidad: fc.constantFrom('unidades', 'kg', 'gramos', 'litros', 'metros'),
            costo_unitario: fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true })
          }),
          async (data) => {
            const itemData = {
              nombre: data.nombre,
              minimo_stock: data.minimo_stock,
              cantidad: data.minimo_stock * data.cantidad_factor,
              unidad: data.unidad,
              costo_unitario: data.costo_unitario
            };
            
            // Precondition: cantidad must be strictly greater than minimo_stock * 0.5 and less than minimo_stock
            fc.pre(
              itemData.cantidad > itemData.minimo_stock * 0.5 && 
              itemData.cantidad < itemData.minimo_stock
            );
            
            // Create inventory item
            const createdItem = await inventarioRepository.create(itemData);
            testItemIds.push(createdItem.id);
            
            // The item's estado should be 'bajo'
            return createdItem.estado === 'bajo';
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // **Validates: Requirements 15.2**
  // Feature: sistema-gestion-floreria, Property 21: Non-Negative Quantity Validation
  describe('Property 21: Non-Negative Quantity Validation', () => {
    it('should reject creation of inventory item with negative quantity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 3, maxLength: 50 }),
            cantidad: fc.float({ min: Math.fround(-1000), max: Math.fround(-0.01), noNaN: true }), // Negative values
            unidad: fc.constantFrom('unidades', 'kg', 'gramos', 'litros', 'metros'),
            minimo_stock: fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true }),
            costo_unitario: fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true })
          }),
          async (itemData) => {
            // Precondition: cantidad must be negative
            fc.pre(itemData.cantidad < 0);
            
            try {
              // Attempt to create inventory item with negative quantity
              await inventarioRepository.create(itemData);
              
              // If no error is thrown, the test fails
              return false;
            } catch (error) {
              // Should throw an error (database constraint violation)
              // PostgreSQL CHECK constraint should prevent negative quantities
              return true;
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject update of inventory item to negative quantity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 3, maxLength: 50 }),
            initial_cantidad: fc.float({ min: Math.fround(10), max: Math.fround(100), noNaN: true }),
            negative_cantidad: fc.float({ min: Math.fround(-1000), max: Math.fround(-0.01), noNaN: true }),
            unidad: fc.constantFrom('unidades', 'kg', 'gramos', 'litros', 'metros'),
            minimo_stock: fc.float({ min: Math.fround(1), max: Math.fround(50), noNaN: true }),
            costo_unitario: fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true })
          }),
          async (data) => {
            // Precondition: negative_cantidad must be negative
            fc.pre(data.negative_cantidad < 0);
            
            // Create inventory item with valid positive quantity
            const createdItem = await inventarioRepository.create({
              nombre: data.nombre,
              cantidad: data.initial_cantidad,
              unidad: data.unidad,
              minimo_stock: data.minimo_stock,
              costo_unitario: data.costo_unitario
            });
            testItemIds.push(createdItem.id);
            
            try {
              // Attempt to update to negative quantity
              await inventarioRepository.update(createdItem.id, {
                cantidad: data.negative_cantidad
              });
              
              // If no error is thrown, the test fails
              return false;
            } catch (error) {
              // Should throw an error (database constraint violation)
              return true;
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should accept creation of inventory item with zero quantity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 3, maxLength: 50 }),
            unidad: fc.constantFrom('unidades', 'kg', 'gramos', 'litros', 'metros'),
            minimo_stock: fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true }),
            costo_unitario: fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true })
          }),
          async (data) => {
            const itemData = {
              nombre: data.nombre,
              cantidad: 0, // Zero is valid (non-negative)
              unidad: data.unidad,
              minimo_stock: data.minimo_stock,
              costo_unitario: data.costo_unitario
            };
            
            try {
              // Create inventory item with zero quantity
              const createdItem = await inventarioRepository.create(itemData);
              testItemIds.push(createdItem.id);
              
              // Should succeed and return item with cantidad = 0
              return parseFloat(createdItem.cantidad) === 0;
            } catch (error) {
              // Should not throw an error for zero quantity
              return false;
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should accept creation of inventory item with any positive quantity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 3, maxLength: 50 }),
            cantidad: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }), // Positive values
            unidad: fc.constantFrom('unidades', 'kg', 'gramos', 'litros', 'metros'),
            minimo_stock: fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true }),
            costo_unitario: fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true })
          }),
          async (itemData) => {
            // Precondition: cantidad must be positive
            fc.pre(itemData.cantidad > 0);
            
            try {
              // Create inventory item with positive quantity
              const createdItem = await inventarioRepository.create(itemData);
              testItemIds.push(createdItem.id);
              
              // Should succeed and return item with correct cantidad
              const quantityMatches = Math.abs(parseFloat(createdItem.cantidad) - itemData.cantidad) < 0.01;
              return quantityMatches;
            } catch (error) {
              // Should not throw an error for positive quantity
              return false;
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject update to negative quantity via decrementQuantity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 3, maxLength: 50 }),
            initial_cantidad: fc.float({ min: Math.fround(10), max: Math.fround(50), noNaN: true }),
            decrement_amount: fc.float({ min: Math.fround(51), max: Math.fround(1000), noNaN: true }), // More than initial
            unidad: fc.constantFrom('unidades', 'kg', 'gramos', 'litros', 'metros'),
            minimo_stock: fc.float({ min: Math.fround(1), max: Math.fround(50), noNaN: true }),
            costo_unitario: fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true })
          }),
          async (data) => {
            // Precondition: decrement_amount must be greater than initial_cantidad
            fc.pre(data.decrement_amount > data.initial_cantidad);
            
            // Create inventory item with valid positive quantity
            const createdItem = await inventarioRepository.create({
              nombre: data.nombre,
              cantidad: data.initial_cantidad,
              unidad: data.unidad,
              minimo_stock: data.minimo_stock,
              costo_unitario: data.costo_unitario
            });
            testItemIds.push(createdItem.id);
            
            try {
              // Attempt to decrement by more than available (would result in negative)
              await inventarioRepository.decrementQuantity(createdItem.id, data.decrement_amount);
              
              // If no error is thrown, the test fails
              return false;
            } catch (error) {
              // Should throw an error (database constraint violation)
              return true;
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
