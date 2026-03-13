/**
 * Products Property-Based Tests
 * Property-based tests using fast-check to validate universal properties
 * 
 * Validates: Requirements 2.3, 2.4, 2.8, 15.1
 */

const fc = require('fast-check');
const request = require('supertest');
const productosRepository = require('../repositories/productosRepository');
const { pool } = require('../config/database');
const app = require('../server');

describe('Products - Property-Based Tests', () => {
  let testInventoryId;
  let createdProductIds = [];
  
  beforeAll(async () => {
    // Create a test inventory item for recipe tests
    const inventoryResult = await pool.query(`
      INSERT INTO inventario (nombre, cantidad, unidad, minimo_stock, costo_unitario)
      VALUES ('PBT Test Roses', 1000, 'unidades', 10, 5.50)
      RETURNING id
    `);
    testInventoryId = inventoryResult.rows[0].id;
  });
  
  afterAll(async () => {
    // Clean up all created products
    for (const productId of createdProductIds) {
      await pool.query('DELETE FROM receta_arreglo WHERE producto_id = $1', [productId]);
      await pool.query('DELETE FROM productos WHERE id = $1', [productId]);
    }
    
    // Clean up test inventory (must delete recipes first due to foreign key constraint)
    if (testInventoryId) {
      await pool.query('DELETE FROM receta_arreglo WHERE inventario_id = $1', [testInventoryId]);
      await pool.query('DELETE FROM inventario WHERE id = $1', [testInventoryId]);
    }
    
    // Close database connection pool
    await pool.end();
  });
  
  afterEach(() => {
    // Clear the list after cleanup
    createdProductIds = [];
  });

  // **Validates: Requirements 2.3**
  // Feature: sistema-gestion-floreria, Property 4: Product Creation Round-Trip
  describe('Property 4: Product Creation Round-Trip', () => {
    it('should retrieve the same data after creating a product', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 100 }),
            categoria: fc.constantFrom('Ramos', 'Cajas', 'Arreglos', 'Sorpresas', 'Eventos'),
            precio: fc.float({ min: Math.fround(1), max: Math.fround(9999.99), noNaN: true }),
            costo: fc.float({ min: Math.fround(0.01), max: Math.fround(9998.99), noNaN: true }),
            descripcion: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
            imagen_url: fc.option(fc.webUrl(), { nil: null })
          }),
          async (productData) => {
            // Round to 2 decimal places to match DECIMAL(10,2) database constraint
            productData.precio = Math.round(productData.precio * 100) / 100;
            productData.costo = Math.round(productData.costo * 100) / 100;
            
            // Precondition: price must be greater than cost for valid product
            // Also ensure margin doesn't exceed 999.99% (DECIMAL(5,2) constraint)
            // Margin = ((precio - costo) / costo) * 100 < 1000
            // This means precio / costo < 11
            fc.pre(productData.precio > productData.costo && productData.precio / productData.costo < 11);
            
            // Create product
            const created = await productosRepository.create(productData);
            createdProductIds.push(created.id);
            
            // Retrieve product
            const retrieved = await productosRepository.findById(created.id);
            
            // Verify all fields match
            const nameMatches = retrieved.nombre === productData.nombre;
            const categoryMatches = retrieved.categoria === productData.categoria;
            const priceMatches = Math.abs(parseFloat(retrieved.precio) - productData.precio) < 0.01;
            const costMatches = Math.abs(parseFloat(retrieved.costo) - productData.costo) < 0.01;
            // Normalize empty strings to null for comparison
            const expectedDescription = productData.descripcion === '' ? null : productData.descripcion;
            const descriptionMatches = retrieved.descripcion === expectedDescription;
            const imageMatches = retrieved.imagen_url === productData.imagen_url;
            
            return nameMatches && categoryMatches && priceMatches && 
                   costMatches && descriptionMatches && imageMatches;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should preserve product data through update operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 100 }),
            categoria: fc.constantFrom('Ramos', 'Cajas', 'Arreglos', 'Sorpresas', 'Eventos'),
            precio: fc.float({ min: Math.fround(1), max: Math.fround(9999.99), noNaN: true }),
            costo: fc.float({ min: Math.fround(0.01), max: Math.fround(9998.99), noNaN: true })
          }),
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 100 }),
            precio: fc.float({ min: Math.fround(1), max: Math.fround(9999.99), noNaN: true })
          }),
          async (initialData, updateData) => {
            // Round to 2 decimal places
            initialData.precio = Math.round(initialData.precio * 100) / 100;
            initialData.costo = Math.round(initialData.costo * 100) / 100;
            updateData.precio = Math.round(updateData.precio * 100) / 100;
            
            // Preconditions: ensure margin doesn't exceed 999.99%
            fc.pre(initialData.precio > initialData.costo && initialData.precio / initialData.costo < 11);
            fc.pre(updateData.precio > initialData.costo && updateData.precio / initialData.costo < 11);
            
            // Create product
            const created = await productosRepository.create(initialData);
            createdProductIds.push(created.id);
            
            // Update product
            await productosRepository.update(created.id, updateData);
            
            // Retrieve updated product
            const retrieved = await productosRepository.findById(created.id);
            
            // Verify updated fields match
            const nameMatches = retrieved.nombre === updateData.nombre;
            const priceMatches = Math.abs(parseFloat(retrieved.precio) - updateData.precio) < 0.01;
            
            // Verify non-updated fields are preserved
            const categoryPreserved = retrieved.categoria === initialData.categoria;
            const costPreserved = Math.abs(parseFloat(retrieved.costo) - initialData.costo) < 0.01;
            
            return nameMatches && priceMatches && categoryPreserved && costPreserved;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // **Validates: Requirements 2.4**
  // Feature: sistema-gestion-floreria, Property 5: Profit Margin Calculation
  describe('Property 5: Profit Margin Calculation', () => {
    it('should calculate margin as ((price - cost) / cost) * 100 for any valid price and cost', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.float({ min: Math.fround(0.01), max: Math.fround(5000), noNaN: true }), // cost
          fc.float({ min: Math.fround(0.02), max: Math.fround(9999.99), noNaN: true }), // price
          async (costo, precio) => {
            // Round to 2 decimal places
            costo = Math.round(costo * 100) / 100;
            precio = Math.round(precio * 100) / 100;
            
            // Precondition: price must be greater than cost
            // Also ensure margin doesn't exceed 999.99% (DECIMAL(5,2) constraint)
            fc.pre(precio > costo && precio / costo < 11);
            
            const productData = {
              nombre: 'Margin Test Product',
              categoria: 'Ramos',
              precio: precio,
              costo: costo
            };
            
            const created = await productosRepository.create(productData);
            createdProductIds.push(created.id);
            
            // Calculate expected margin
            const expectedMargin = ((precio - costo) / costo) * 100;
            const actualMargin = parseFloat(created.margen_porcentaje);
            
            // Allow small floating point tolerance
            return Math.abs(actualMargin - expectedMargin) < 0.01;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should recalculate margin when price or cost is updated', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }), // initial cost
          fc.float({ min: Math.fround(0.02), max: Math.fround(2000), noNaN: true }), // initial price
          fc.float({ min: Math.fround(0.02), max: Math.fround(2000), noNaN: true }), // new price
          async (initialCosto, initialPrecio, newPrecio) => {
            // Round to 2 decimal places
            initialCosto = Math.round(initialCosto * 100) / 100;
            initialPrecio = Math.round(initialPrecio * 100) / 100;
            newPrecio = Math.round(newPrecio * 100) / 100;
            
            // Preconditions: ensure margin doesn't exceed 999.99%
            fc.pre(initialPrecio > initialCosto && initialPrecio / initialCosto < 11);
            fc.pre(newPrecio > initialCosto && newPrecio / initialCosto < 11);
            
            // Create product
            const created = await productosRepository.create({
              nombre: 'Margin Update Test',
              categoria: 'Cajas',
              precio: initialPrecio,
              costo: initialCosto
            });
            createdProductIds.push(created.id);
            
            // Update price
            await productosRepository.update(created.id, { precio: newPrecio });
            
            // Retrieve updated product
            const updated = await productosRepository.findById(created.id);
            
            // Calculate expected new margin
            const expectedMargin = ((newPrecio - initialCosto) / initialCosto) * 100;
            const actualMargin = parseFloat(updated.margen_porcentaje);
            
            return Math.abs(actualMargin - expectedMargin) < 0.01;
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain margin calculation accuracy across different price ranges', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { min: Math.fround(0.01), max: Math.fround(1) },      // Very small prices
            { min: Math.fround(1), max: Math.fround(100) },       // Small prices
            { min: Math.fround(100), max: Math.fround(1000) },    // Medium prices
            { min: Math.fround(1000), max: Math.fround(5000) }    // Large prices (reduced max)
          ),
          fc.float({ min: Math.fround(1.1), max: Math.fround(3), noNaN: true }), // price multiplier
          async (priceRange, multiplier) => {
            let costo = Math.random() * (priceRange.max - priceRange.min) + priceRange.min;
            let precio = costo * multiplier;
            
            // Round to 2 decimal places
            costo = Math.round(costo * 100) / 100;
            precio = Math.round(precio * 100) / 100;
            
            // Ensure price > cost after rounding
            fc.pre(precio > costo);
            
            const created = await productosRepository.create({
              nombre: 'Range Test Product',
              categoria: 'Arreglos',
              precio: precio,
              costo: costo
            });
            createdProductIds.push(created.id);
            
            const expectedMargin = ((precio - costo) / costo) * 100;
            const actualMargin = parseFloat(created.margen_porcentaje);
            
            // Use relative tolerance for very small numbers
            const tolerance = costo < 1 ? 0.1 : 0.01;
            return Math.abs(actualMargin - expectedMargin) < tolerance;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // **Validates: Requirements 2.8**
  // Feature: sistema-gestion-floreria, Property 6: Soft Delete Preservation
  describe('Property 6: Soft Delete Preservation', () => {
    it('should preserve product data in database after soft delete', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 100 }),
            categoria: fc.constantFrom('Ramos', 'Cajas', 'Arreglos', 'Sorpresas', 'Eventos'),
            precio: fc.float({ min: Math.fround(1), max: Math.fround(9999.99), noNaN: true }),
            costo: fc.float({ min: Math.fround(0.01), max: Math.fround(9998.99), noNaN: true }),
            descripcion: fc.option(fc.string({ maxLength: 200 }), { nil: null })
          }),
          async (productData) => {
            // Round to 2 decimal places
            productData.precio = Math.round(productData.precio * 100) / 100;
            productData.costo = Math.round(productData.costo * 100) / 100;
            
            fc.pre(productData.precio > productData.costo && productData.precio / productData.costo < 11);
            
            // Create product
            const created = await productosRepository.create(productData);
            createdProductIds.push(created.id);
            
            // Soft delete
            const deleteResult = await productosRepository.softDelete(created.id);
            
            if (!deleteResult) {
              return false;
            }
            
            // Verify product still exists in database
            const directQuery = await pool.query(
              'SELECT * FROM productos WHERE id = $1',
              [created.id]
            );
            
            if (directQuery.rows.length === 0) {
              return false; // Product was hard deleted, not soft deleted
            }
            
            const deletedProduct = directQuery.rows[0];
            
            // Verify activo flag is false
            if (deletedProduct.activo !== false) {
              return false;
            }
            
            // Verify all other data is preserved
            const namePreserved = deletedProduct.nombre === productData.nombre;
            const categoryPreserved = deletedProduct.categoria === productData.categoria;
            const pricePreserved = Math.abs(parseFloat(deletedProduct.precio) - productData.precio) < 0.01;
            const costPreserved = Math.abs(parseFloat(deletedProduct.costo) - productData.costo) < 0.01;
            // Normalize empty strings to null for comparison
            const expectedDescription = productData.descripcion === '' ? null : productData.descripcion;
            const descriptionPreserved = deletedProduct.descripcion === expectedDescription;
            
            return namePreserved && categoryPreserved && pricePreserved && 
                   costPreserved && descriptionPreserved;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should mark activo=false without removing record from database', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constantFrom('Ramos', 'Cajas', 'Arreglos', 'Sorpresas', 'Eventos'),
          fc.float({ min: Math.fround(10), max: Math.fround(1000), noNaN: true }),
          fc.float({ min: Math.fround(1), max: Math.fround(999), noNaN: true }),
          async (nombre, categoria, precio, costo) => {
            // Round to 2 decimal places
            precio = Math.round(precio * 100) / 100;
            costo = Math.round(costo * 100) / 100;
            
            fc.pre(precio > costo && precio / costo < 11);
            
            // Create product
            const created = await productosRepository.create({
              nombre,
              categoria,
              precio,
              costo
            });
            createdProductIds.push(created.id);
            
            // Get initial count of products
            const countBefore = await pool.query('SELECT COUNT(*) FROM productos WHERE id = $1', [created.id]);
            const recordsBefore = parseInt(countBefore.rows[0].count);
            
            // Soft delete
            await productosRepository.softDelete(created.id);
            
            // Get count after delete
            const countAfter = await pool.query('SELECT COUNT(*) FROM productos WHERE id = $1', [created.id]);
            const recordsAfter = parseInt(countAfter.rows[0].count);
            
            // Record count should remain the same
            if (recordsBefore !== recordsAfter || recordsAfter !== 1) {
              return false;
            }
            
            // Verify activo is false
            const product = await pool.query('SELECT activo FROM productos WHERE id = $1', [created.id]);
            return product.rows[0].activo === false;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should preserve recipe data after soft delete', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 100 }),
            categoria: fc.constantFrom('Arreglos', 'Ramos'),
            precio: fc.float({ min: Math.fround(50), max: Math.fround(500), noNaN: true }),
            costo: fc.float({ min: Math.fround(10), max: Math.fround(499), noNaN: true })
          }),
          fc.integer({ min: 1, max: 50 }), // recipe quantity
          async (productData, recipeQuantity) => {
            // Round to 2 decimal places
            productData.precio = Math.round(productData.precio * 100) / 100;
            productData.costo = Math.round(productData.costo * 100) / 100;
            
            fc.pre(productData.precio > productData.costo && productData.precio / productData.costo < 11);
            
            // Create product
            const created = await productosRepository.create(productData);
            createdProductIds.push(created.id);
            
            // Add recipe
            await productosRepository.saveRecipe(created.id, [
              { inventario_id: testInventoryId, cantidad: recipeQuantity }
            ]);
            
            // Soft delete product
            await productosRepository.softDelete(created.id);
            
            // Verify recipe still exists
            const recipeQuery = await pool.query(
              'SELECT * FROM receta_arreglo WHERE producto_id = $1',
              [created.id]
            );
            
            if (recipeQuery.rows.length === 0) {
              return false; // Recipe was deleted
            }
            
            // Verify recipe data is intact
            const recipe = recipeQuery.rows[0];
            return recipe.inventario_id === testInventoryId && 
                   Math.abs(parseFloat(recipe.cantidad) - recipeQuantity) < 0.01;
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should allow reactivation of soft-deleted products', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 100 }),
            categoria: fc.constantFrom('Ramos', 'Cajas', 'Arreglos', 'Sorpresas', 'Eventos'),
            precio: fc.float({ min: Math.fround(1), max: Math.fround(5000), noNaN: true }),
            costo: fc.float({ min: Math.fround(0.01), max: Math.fround(4999), noNaN: true })
          }),
          async (productData) => {
            // Round to 2 decimal places
            productData.precio = Math.round(productData.precio * 100) / 100;
            productData.costo = Math.round(productData.costo * 100) / 100;
            
            fc.pre(productData.precio > productData.costo && productData.precio / productData.costo < 11);
            
            // Create product
            const created = await productosRepository.create(productData);
            createdProductIds.push(created.id);
            
            // Soft delete
            await productosRepository.softDelete(created.id);
            
            // Reactivate by updating activo to true
            const reactivated = await productosRepository.update(created.id, { activo: true });
            
            if (!reactivated) {
              return false;
            }
            
            // Verify product is active again
            const retrieved = await productosRepository.findById(created.id);
            
            // Verify activo is true and all data is preserved
            return retrieved.activo === true &&
                   retrieved.nombre === productData.nombre &&
                   retrieved.categoria === productData.categoria &&
                   Math.abs(parseFloat(retrieved.precio) - productData.precio) < 0.01 &&
                   Math.abs(parseFloat(retrieved.costo) - productData.costo) < 0.01;
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  // **Validates: Requirements 15.1**
  // Feature: sistema-gestion-floreria, Property 20: Price Greater Than Cost Validation
  describe('Property 20: Price Greater Than Cost Validation', () => {
    let validToken;
    let testUserId;
    
    beforeAll(async () => {
      // Create test user and get auth token for API tests
      const { hashPassword } = require('../utils/auth');
      const hashedPassword = await hashPassword('testpassword_prop20');
      
      const result = await pool.query(
        `INSERT INTO usuarios (username, password_hash, nombre, rol, email, activo)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (username) DO UPDATE 
         SET password_hash = $2, activo = $6
         RETURNING id`,
        ['testuser_prop20', hashedPassword, 'Test User Prop20', 'Administrador', 'prop20@test.com', true]
      );
      
      testUserId = result.rows[0].id;
      
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser_prop20',
          password: 'testpassword_prop20'
        });
      
      validToken = loginResponse.body.token;
    });
    
    afterAll(async () => {
      // Clean up test user
      if (testUserId) {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [testUserId]);
      }
    });
    
    it('should reject product creation when precio <= costo', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 100 }),
            categoria: fc.constantFrom('Ramos', 'Cajas', 'Arreglos', 'Sorpresas', 'Eventos'),
            precio: fc.float({ min: Math.fround(0.01), max: Math.fround(5000), noNaN: true }),
            costo: fc.float({ min: Math.fround(0.01), max: Math.fround(5000), noNaN: true }),
            descripcion: fc.option(fc.string({ maxLength: 200 }), { nil: null })
          }),
          async (productData) => {
            // Round to 2 decimal places
            productData.precio = Math.round(productData.precio * 100) / 100;
            productData.costo = Math.round(productData.costo * 100) / 100;
            
            // Precondition: precio must be <= costo (invalid case)
            fc.pre(productData.precio <= productData.costo);
            
            // Attempt to create product via API - should fail with 400
            const response = await request(app)
              .post('/api/v1/productos')
              .set('Authorization', `Bearer ${validToken}`)
              .send(productData);
            
            // Should return 400 Bad Request
            if (response.status !== 400) {
              // If product was created, clean it up
              if (response.body.producto && response.body.producto.id) {
                createdProductIds.push(response.body.producto.id);
              }
              return false;
            }
            
            // Verify error message mentions precio/costo validation
            const errorMessage = response.body.error?.message || '';
            const isValidationError = errorMessage.includes('precio') || 
                                     errorMessage.includes('costo') ||
                                     errorMessage.includes('mayor');
            
            return isValidationError;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject product update when precio <= costo', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 100 }),
            categoria: fc.constantFrom('Ramos', 'Cajas', 'Arreglos', 'Sorpresas', 'Eventos'),
            initialPrecio: fc.float({ min: Math.fround(10), max: Math.fround(1000), noNaN: true }),
            initialCosto: fc.float({ min: Math.fround(1), max: Math.fround(999), noNaN: true }),
            newPrecio: fc.float({ min: Math.fround(0.01), max: Math.fround(5000), noNaN: true }),
            newCosto: fc.float({ min: Math.fround(0.01), max: Math.fround(5000), noNaN: true })
          }),
          async (testData) => {
            // Round to 2 decimal places
            testData.initialPrecio = Math.round(testData.initialPrecio * 100) / 100;
            testData.initialCosto = Math.round(testData.initialCosto * 100) / 100;
            testData.newPrecio = Math.round(testData.newPrecio * 100) / 100;
            testData.newCosto = Math.round(testData.newCosto * 100) / 100;
            
            // Precondition: initial values must be valid (precio > costo)
            fc.pre(testData.initialPrecio > testData.initialCosto && testData.initialPrecio / testData.initialCosto < 11);
            
            // Create a valid product first via API
            const createResponse = await request(app)
              .post('/api/v1/productos')
              .set('Authorization', `Bearer ${validToken}`)
              .send({
                nombre: testData.nombre,
                categoria: testData.categoria,
                precio: testData.initialPrecio,
                costo: testData.initialCosto
              });
            
            if (createResponse.status !== 201) {
              return false; // Failed to create test product
            }
            
            const productId = createResponse.body.producto.id;
            createdProductIds.push(productId);
            
            // Now try to update with invalid pricing (precio <= costo)
            // We'll test different scenarios:
            // 1. Update precio to be <= existing costo
            // 2. Update costo to be >= existing precio
            // 3. Update both to invalid combination
            
            const scenarios = [];
            
            // Scenario 1: Update precio to be <= existing costo
            if (testData.newPrecio <= testData.initialCosto) {
              scenarios.push({ precio: testData.newPrecio });
            }
            
            // Scenario 2: Update costo to be >= existing precio
            if (testData.newCosto >= testData.initialPrecio) {
              scenarios.push({ costo: testData.newCosto });
            }
            
            // Scenario 3: Update both to invalid combination
            if (testData.newPrecio <= testData.newCosto) {
              scenarios.push({ precio: testData.newPrecio, costo: testData.newCosto });
            }
            
            // If no invalid scenarios, skip this test case
            fc.pre(scenarios.length > 0);
            
            // Pick one scenario to test
            const updateData = scenarios[Math.floor(Math.random() * scenarios.length)];
            
            // Attempt to update via API - should fail with 400
            const updateResponse = await request(app)
              .put(`/api/v1/productos/${productId}`)
              .set('Authorization', `Bearer ${validToken}`)
              .send(updateData);
            
            // Should return 400 Bad Request
            if (updateResponse.status !== 400) {
              return false;
            }
            
            // Verify error message mentions precio/costo validation
            const errorMessage = updateResponse.body.error?.message || '';
            const isValidationError = errorMessage.includes('precio') || 
                                     errorMessage.includes('costo') ||
                                     errorMessage.includes('mayor');
            
            return isValidationError;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should accept product creation when precio > costo', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 100 }),
            categoria: fc.constantFrom('Ramos', 'Cajas', 'Arreglos', 'Sorpresas', 'Eventos'),
            precio: fc.float({ min: Math.fround(1), max: Math.fround(5000), noNaN: true }),
            costo: fc.float({ min: Math.fround(0.01), max: Math.fround(4999), noNaN: true })
          }),
          async (productData) => {
            // Round to 2 decimal places
            productData.precio = Math.round(productData.precio * 100) / 100;
            productData.costo = Math.round(productData.costo * 100) / 100;
            
            // Precondition: precio must be > costo (valid case)
            fc.pre(productData.precio > productData.costo && productData.precio / productData.costo < 11);
            
            // Attempt to create product via API - should succeed
            const response = await request(app)
              .post('/api/v1/productos')
              .set('Authorization', `Bearer ${validToken}`)
              .send(productData);
            
            // Should return 201 Created
            if (response.status !== 201) {
              return false;
            }
            
            // Clean up created product
            if (response.body.producto && response.body.producto.id) {
              createdProductIds.push(response.body.producto.id);
            }
            
            // Verify product was created successfully with precio > costo
            const producto = response.body.producto;
            return producto && producto.id && parseFloat(producto.precio) > parseFloat(producto.costo);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should accept product update when precio > costo', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 100 }),
            categoria: fc.constantFrom('Ramos', 'Cajas', 'Arreglos', 'Sorpresas', 'Eventos'),
            initialPrecio: fc.float({ min: Math.fround(10), max: Math.fround(1000), noNaN: true }),
            initialCosto: fc.float({ min: Math.fround(1), max: Math.fround(999), noNaN: true }),
            newPrecio: fc.float({ min: Math.fround(10), max: Math.fround(2000), noNaN: true }),
            newCosto: fc.float({ min: Math.fround(1), max: Math.fround(1999), noNaN: true })
          }),
          async (testData) => {
            // Round to 2 decimal places
            testData.initialPrecio = Math.round(testData.initialPrecio * 100) / 100;
            testData.initialCosto = Math.round(testData.initialCosto * 100) / 100;
            testData.newPrecio = Math.round(testData.newPrecio * 100) / 100;
            testData.newCosto = Math.round(testData.newCosto * 100) / 100;
            
            // Preconditions: both initial and new values must be valid
            fc.pre(testData.initialPrecio > testData.initialCosto && testData.initialPrecio / testData.initialCosto < 11);
            fc.pre(testData.newPrecio > testData.newCosto && testData.newPrecio / testData.newCosto < 11);
            
            // Create a valid product first via API
            const createResponse = await request(app)
              .post('/api/v1/productos')
              .set('Authorization', `Bearer ${validToken}`)
              .send({
                nombre: testData.nombre,
                categoria: testData.categoria,
                precio: testData.initialPrecio,
                costo: testData.initialCosto
              });
            
            if (createResponse.status !== 201) {
              return false; // Failed to create test product
            }
            
            const productId = createResponse.body.producto.id;
            createdProductIds.push(productId);
            
            // Update with valid pricing via API
            const updateResponse = await request(app)
              .put(`/api/v1/productos/${productId}`)
              .set('Authorization', `Bearer ${validToken}`)
              .send({
                precio: testData.newPrecio,
                costo: testData.newCosto
              });
            
            // Should return 200 OK
            if (updateResponse.status !== 200) {
              return false;
            }
            
            // Verify update was successful and constraint is maintained
            const updated = updateResponse.body.producto;
            return updated && parseFloat(updated.precio) > parseFloat(updated.costo);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should reject when precio equals costo (boundary case)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 100 }),
            categoria: fc.constantFrom('Ramos', 'Cajas', 'Arreglos', 'Sorpresas', 'Eventos'),
            value: fc.float({ min: Math.fround(1), max: Math.fround(5000), noNaN: true })
          }),
          async (testData) => {
            // Round to 2 decimal places
            const value = Math.round(testData.value * 100) / 100;
            
            // Set precio = costo (boundary case)
            const productData = {
              nombre: testData.nombre,
              categoria: testData.categoria,
              precio: value,
              costo: value
            };
            
            // Attempt to create product via API - should fail with 400
            const response = await request(app)
              .post('/api/v1/productos')
              .set('Authorization', `Bearer ${validToken}`)
              .send(productData);
            
            // Should return 400 Bad Request
            if (response.status !== 400) {
              // If product was created, clean it up
              if (response.body.producto && response.body.producto.id) {
                createdProductIds.push(response.body.producto.id);
              }
              return false;
            }
            
            // Verify error message mentions precio/costo validation
            const errorMessage = response.body.error?.message || '';
            const isValidationError = errorMessage.includes('precio') || 
                                     errorMessage.includes('costo') ||
                                     errorMessage.includes('mayor');
            
            return isValidationError;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
