/**
 * Tests for Database Triggers
 * Feature: sistema-gestion-floreria
 * Task: 2.4 - Escribir tests para triggers de base de datos
 * 
 * These tests validate that database triggers work correctly:
 * 1. Test de actualización de inventario al crear venta
 * 2. Test de creación de venta al marcar pedido como entregado
 * 3. Test de registro de historial de estados
 * 4. Test de actualización de total_compras del cliente
 */

const { Pool } = require('pg');

// Database connection pool for testing
let pool;

// Setup and teardown
beforeAll(async () => {
  // Create connection pool
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'floreria_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  // Verify connection
  try {
    await pool.query('SELECT NOW()');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
});

afterAll(async () => {
  // Close pool
  if (pool) {
    await pool.end();
  }
});

// Helper function to clean up test data
async function cleanupTestData(client) {
  await client.query('DELETE FROM detalle_ventas WHERE venta_id IN (SELECT id FROM ventas WHERE trabajador_id = 9999)');
  await client.query('DELETE FROM ventas WHERE trabajador_id = 9999');
  await client.query('DELETE FROM historial_estados_pedido WHERE pedido_id IN (SELECT id FROM pedidos WHERE cliente_id = 9999)');
  await client.query('DELETE FROM pedidos WHERE cliente_id = 9999');
  await client.query('DELETE FROM receta_arreglo WHERE producto_id = 9999');
  await client.query('DELETE FROM productos WHERE id = 9999');
  await client.query('DELETE FROM inventario WHERE id IN (9999, 9998)');
  await client.query('DELETE FROM clientes WHERE id = 9999');
  await client.query('DELETE FROM trabajadores WHERE id = 9999');
}

// Helper function to setup test data
async function setupTestData(client) {
  // Insert test trabajador
  await client.query(`
    INSERT INTO trabajadores (id, nombre, rol, telefono, email)
    VALUES (9999, 'Test Trabajador', 'Vendedor', '999999999', 'test@test.com')
    ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre
  `);

  // Insert test cliente
  await client.query(`
    INSERT INTO clientes (id, nombre, telefono, email, direccion, total_compras)
    VALUES (9999, 'Test Cliente', '888888888', 'cliente@test.com', 'Test Address', 0)
    ON CONFLICT (id) DO UPDATE SET total_compras = 0
  `);

  // Insert test inventario items
  await client.query(`
    INSERT INTO inventario (id, nombre, cantidad, unidad, minimo_stock, costo_unitario)
    VALUES 
      (9999, 'Test Rosas', 100, 'unidad', 20, 2.50),
      (9998, 'Test Papel', 50, 'unidad', 10, 1.00)
    ON CONFLICT (id) DO UPDATE SET 
      cantidad = EXCLUDED.cantidad,
      costo_unitario = EXCLUDED.costo_unitario
  `);

  // Insert test producto with recipe
  await client.query(`
    INSERT INTO productos (id, nombre, categoria, descripcion, precio, costo, tiene_receta)
    VALUES (9999, 'Test Ramo', 'Ramos', 'Test product', 80.00, 35.00, true)
    ON CONFLICT (id) DO UPDATE SET 
      precio = EXCLUDED.precio,
      costo = EXCLUDED.costo,
      tiene_receta = EXCLUDED.tiene_receta
  `);

  // Insert recipe
  await client.query(`
    INSERT INTO receta_arreglo (producto_id, inventario_id, cantidad)
    VALUES 
      (9999, 9999, 12),
      (9999, 9998, 1)
    ON CONFLICT (producto_id, inventario_id) DO UPDATE SET cantidad = EXCLUDED.cantidad
  `);
}

describe('Trigger Tests', () => {
  
  /**
   * Test 1: Actualización de inventario al crear venta
   * 
   * Validates that when a sale is created, the inventory is automatically
   * decremented based on the product recipe.
   */
  describe('Test 1: Actualización de inventario al crear venta', () => {
    
    it('should decrement inventory when a sale is created', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Setup test data
        await cleanupTestData(client);
        await setupTestData(client);
        
        // Get initial inventory quantities
        const initialInventory = await client.query(`
          SELECT id, nombre, cantidad 
          FROM inventario 
          WHERE id IN (9999, 9998)
          ORDER BY id DESC
        `);
        
        const initialRosas = parseFloat(initialInventory.rows[0].cantidad);
        const initialPapel = parseFloat(initialInventory.rows[1].cantidad);
        
        // Create a sale
        const saleResult = await client.query(`
          INSERT INTO ventas (producto_id, cantidad, precio_unitario, metodo_pago, trabajador_id)
          VALUES (9999, 2, 80.00, 'Efectivo', 9999)
          RETURNING id
        `);
        
        const ventaId = saleResult.rows[0].id;
        
        // Get final inventory quantities
        const finalInventory = await client.query(`
          SELECT id, nombre, cantidad 
          FROM inventario 
          WHERE id IN (9999, 9998)
          ORDER BY id DESC
        `);
        
        const finalRosas = parseFloat(finalInventory.rows[0].cantidad);
        const finalPapel = parseFloat(finalInventory.rows[1].cantidad);
        
        // Verify inventory was decremented correctly
        // Recipe: 12 rosas + 1 papel per unit, sold 2 units
        expect(finalRosas).toBe(initialRosas - (12 * 2));
        expect(finalPapel).toBe(initialPapel - (1 * 2));
        
        // Verify detalle_ventas was created
        const detalleResult = await client.query(`
          SELECT COUNT(*) as count
          FROM detalle_ventas
          WHERE venta_id = $1
        `, [ventaId]);
        
        expect(parseInt(detalleResult.rows[0].count)).toBe(2); // 2 ingredients in recipe
        
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });

    it('should create detalle_ventas records with correct costs', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Setup test data
        await cleanupTestData(client);
        await setupTestData(client);
        
        // Create a sale
        const saleResult = await client.query(`
          INSERT INTO ventas (producto_id, cantidad, precio_unitario, metodo_pago, trabajador_id)
          VALUES (9999, 1, 80.00, 'Efectivo', 9999)
          RETURNING id
        `);
        
        const ventaId = saleResult.rows[0].id;
        
        // Get detalle_ventas records
        const detalleResult = await client.query(`
          SELECT dv.inventario_id, dv.cantidad_usada, dv.costo_unitario, dv.costo_total, i.nombre
          FROM detalle_ventas dv
          JOIN inventario i ON i.id = dv.inventario_id
          WHERE dv.venta_id = $1
          ORDER BY dv.inventario_id DESC
        `, [ventaId]);
        
        expect(detalleResult.rows.length).toBe(2);
        
        // Verify rosas details
        const rosasDetail = detalleResult.rows[0];
        expect(rosasDetail.nombre).toBe('Test Rosas');
        expect(parseFloat(rosasDetail.cantidad_usada)).toBe(12);
        expect(parseFloat(rosasDetail.costo_unitario)).toBe(2.50);
        expect(parseFloat(rosasDetail.costo_total)).toBe(12 * 2.50);
        
        // Verify papel details
        const papelDetail = detalleResult.rows[1];
        expect(papelDetail.nombre).toBe('Test Papel');
        expect(parseFloat(papelDetail.cantidad_usada)).toBe(1);
        expect(parseFloat(papelDetail.costo_unitario)).toBe(1.00);
        expect(parseFloat(papelDetail.costo_total)).toBe(1 * 1.00);
        
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });
  });

  /**
   * Test 2: Creación de venta al marcar pedido como entregado
   * 
   * Validates that when an order status changes to 'entregado',
   * a sale is automatically created.
   */
  describe('Test 2: Creación de venta al marcar pedido como entregado', () => {
    
    it('should create a sale when order status changes to entregado', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Setup test data
        await cleanupTestData(client);
        await setupTestData(client);
        
        // Create a pedido
        const pedidoResult = await client.query(`
          INSERT INTO pedidos (cliente_id, producto_id, fecha_entrega, precio, estado)
          VALUES (9999, 9999, CURRENT_DATE + INTERVAL '3 days', 80.00, 'pendiente')
          RETURNING id
        `);
        
        const pedidoId = pedidoResult.rows[0].id;
        
        // Verify no sale exists yet
        let ventaCheck = await client.query(`
          SELECT COUNT(*) as count
          FROM ventas
          WHERE pedido_id = $1
        `, [pedidoId]);
        
        expect(parseInt(ventaCheck.rows[0].count)).toBe(0);
        
        // Update pedido status to entregado
        await client.query(`
          UPDATE pedidos
          SET estado = 'entregado'
          WHERE id = $1
        `, [pedidoId]);
        
        // Verify sale was created
        ventaCheck = await client.query(`
          SELECT v.*, p.precio as pedido_precio
          FROM ventas v
          JOIN pedidos p ON p.id = v.pedido_id
          WHERE v.pedido_id = $1
        `, [pedidoId]);
        
        expect(ventaCheck.rows.length).toBe(1);
        
        const venta = ventaCheck.rows[0];
        expect(venta.producto_id).toBe(9999);
        expect(parseInt(venta.cantidad)).toBe(1);
        expect(parseFloat(venta.precio_unitario)).toBe(80.00);
        expect(venta.metodo_pago).toBe('Efectivo');
        expect(venta.pedido_id).toBe(pedidoId);
        
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });

    it('should not create duplicate sales if status is updated multiple times', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Setup test data
        await cleanupTestData(client);
        await setupTestData(client);
        
        // Create a pedido
        const pedidoResult = await client.query(`
          INSERT INTO pedidos (cliente_id, producto_id, fecha_entrega, precio, estado)
          VALUES (9999, 9999, CURRENT_DATE + INTERVAL '3 days', 80.00, 'pendiente')
          RETURNING id
        `);
        
        const pedidoId = pedidoResult.rows[0].id;
        
        // Update to entregado
        await client.query(`
          UPDATE pedidos SET estado = 'entregado' WHERE id = $1
        `, [pedidoId]);
        
        // Update again (should not create another sale)
        await client.query(`
          UPDATE pedidos SET notas = 'Updated notes' WHERE id = $1
        `, [pedidoId]);
        
        // Verify only one sale exists
        const ventaCheck = await client.query(`
          SELECT COUNT(*) as count
          FROM ventas
          WHERE pedido_id = $1
        `, [pedidoId]);
        
        expect(parseInt(ventaCheck.rows[0].count)).toBe(1);
        
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });
  });

  /**
   * Test 3: Registro de historial de estados
   * 
   * Validates that state changes in orders are recorded in the
   * historial_estados_pedido table.
   */
  describe('Test 3: Registro de historial de estados', () => {
    
    it('should record state changes in historial_estados_pedido', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Setup test data
        await cleanupTestData(client);
        await setupTestData(client);
        
        // Create a pedido
        const pedidoResult = await client.query(`
          INSERT INTO pedidos (cliente_id, producto_id, fecha_entrega, precio, estado)
          VALUES (9999, 9999, CURRENT_DATE + INTERVAL '3 days', 80.00, 'pendiente')
          RETURNING id
        `);
        
        const pedidoId = pedidoResult.rows[0].id;
        
        // Change state to preparando
        await client.query(`
          UPDATE pedidos SET estado = 'preparando' WHERE id = $1
        `, [pedidoId]);
        
        // Change state to listo
        await client.query(`
          UPDATE pedidos SET estado = 'listo' WHERE id = $1
        `, [pedidoId]);
        
        // Change state to entregado
        await client.query(`
          UPDATE pedidos SET estado = 'entregado' WHERE id = $1
        `, [pedidoId]);
        
        // Get historial records
        const historialResult = await client.query(`
          SELECT estado_anterior, estado_nuevo, fecha_cambio
          FROM historial_estados_pedido
          WHERE pedido_id = $1
          ORDER BY fecha_cambio ASC
        `, [pedidoId]);
        
        expect(historialResult.rows.length).toBe(3);
        
        // Verify first transition
        expect(historialResult.rows[0].estado_anterior).toBe('pendiente');
        expect(historialResult.rows[0].estado_nuevo).toBe('preparando');
        
        // Verify second transition
        expect(historialResult.rows[1].estado_anterior).toBe('preparando');
        expect(historialResult.rows[1].estado_nuevo).toBe('listo');
        
        // Verify third transition
        expect(historialResult.rows[2].estado_anterior).toBe('listo');
        expect(historialResult.rows[2].estado_nuevo).toBe('entregado');
        
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });

    it('should not record historial when state does not change', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Setup test data
        await cleanupTestData(client);
        await setupTestData(client);
        
        // Create a pedido
        const pedidoResult = await client.query(`
          INSERT INTO pedidos (cliente_id, producto_id, fecha_entrega, precio, estado)
          VALUES (9999, 9999, CURRENT_DATE + INTERVAL '3 days', 80.00, 'pendiente')
          RETURNING id
        `);
        
        const pedidoId = pedidoResult.rows[0].id;
        
        // Update other fields without changing state
        await client.query(`
          UPDATE pedidos SET notas = 'Test notes' WHERE id = $1
        `, [pedidoId]);
        
        // Get historial records
        const historialResult = await client.query(`
          SELECT COUNT(*) as count
          FROM historial_estados_pedido
          WHERE pedido_id = $1
        `, [pedidoId]);
        
        expect(parseInt(historialResult.rows[0].count)).toBe(0);
        
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });

    it('should record timestamp for each state change', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Setup test data
        await cleanupTestData(client);
        await setupTestData(client);
        
        // Create a pedido
        const pedidoResult = await client.query(`
          INSERT INTO pedidos (cliente_id, producto_id, fecha_entrega, precio, estado)
          VALUES (9999, 9999, CURRENT_DATE + INTERVAL '3 days', 80.00, 'pendiente')
          RETURNING id
        `);
        
        const pedidoId = pedidoResult.rows[0].id;
        
        // Allow a small buffer before the update (1 second)
        const beforeUpdate = new Date(Date.now() - 1000);
        
        // Change state
        await client.query(`
          UPDATE pedidos SET estado = 'preparando' WHERE id = $1
        `, [pedidoId]);
        
        // Allow a small buffer after the update (1 second)
        const afterUpdate = new Date(Date.now() + 1000);
        
        // Get historial record
        const historialResult = await client.query(`
          SELECT fecha_cambio
          FROM historial_estados_pedido
          WHERE pedido_id = $1
        `, [pedidoId]);
        
        expect(historialResult.rows.length).toBe(1);
        
        const fechaCambio = new Date(historialResult.rows[0].fecha_cambio);
        
        // Verify timestamp is within reasonable range (with 1 second buffer on each side)
        expect(fechaCambio.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
        expect(fechaCambio.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
        
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });
  });

  /**
   * Test 4: Actualización de total_compras del cliente
   * 
   * Validates that when an order is marked as 'entregado',
   * the client's total_compras is updated.
   */
  describe('Test 4: Actualización de total_compras del cliente', () => {
    
    it('should update client total_compras when order is delivered', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Setup test data
        await cleanupTestData(client);
        await setupTestData(client);
        
        // Get initial total_compras
        const initialResult = await client.query(`
          SELECT total_compras
          FROM clientes
          WHERE id = 9999
        `);
        
        const initialTotal = parseFloat(initialResult.rows[0].total_compras);
        
        // Create a pedido
        const pedidoResult = await client.query(`
          INSERT INTO pedidos (cliente_id, producto_id, fecha_entrega, precio, estado)
          VALUES (9999, 9999, CURRENT_DATE + INTERVAL '3 days', 80.00, 'pendiente')
          RETURNING id
        `);
        
        const pedidoId = pedidoResult.rows[0].id;
        
        // Update pedido status to entregado
        await client.query(`
          UPDATE pedidos SET estado = 'entregado' WHERE id = $1
        `, [pedidoId]);
        
        // Get final total_compras
        const finalResult = await client.query(`
          SELECT total_compras
          FROM clientes
          WHERE id = 9999
        `);
        
        const finalTotal = parseFloat(finalResult.rows[0].total_compras);
        
        // Verify total_compras was updated
        expect(finalTotal).toBe(initialTotal + 80.00);
        
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });

    it('should accumulate multiple orders for the same client', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Setup test data
        await cleanupTestData(client);
        await setupTestData(client);
        
        // Get initial total_compras
        const initialResult = await client.query(`
          SELECT total_compras FROM clientes WHERE id = 9999
        `);
        
        const initialTotal = parseFloat(initialResult.rows[0].total_compras);
        
        // Create first pedido
        await client.query(`
          INSERT INTO pedidos (cliente_id, producto_id, fecha_entrega, precio, estado)
          VALUES (9999, 9999, CURRENT_DATE + INTERVAL '3 days', 80.00, 'pendiente')
        `);
        
        // Create second pedido
        await client.query(`
          INSERT INTO pedidos (cliente_id, producto_id, fecha_entrega, precio, estado)
          VALUES (9999, 9999, CURRENT_DATE + INTERVAL '4 days', 120.00, 'pendiente')
        `);
        
        // Mark both as entregado
        await client.query(`
          UPDATE pedidos SET estado = 'entregado' WHERE cliente_id = 9999
        `);
        
        // Get final total_compras
        const finalResult = await client.query(`
          SELECT total_compras FROM clientes WHERE id = 9999
        `);
        
        const finalTotal = parseFloat(finalResult.rows[0].total_compras);
        
        // Verify total_compras accumulated both orders
        expect(finalTotal).toBe(initialTotal + 80.00 + 120.00);
        
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });

    it('should not update total_compras if order is not entregado', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Setup test data
        await cleanupTestData(client);
        await setupTestData(client);
        
        // Get initial total_compras
        const initialResult = await client.query(`
          SELECT total_compras FROM clientes WHERE id = 9999
        `);
        
        const initialTotal = parseFloat(initialResult.rows[0].total_compras);
        
        // Create a pedido
        await client.query(`
          INSERT INTO pedidos (cliente_id, producto_id, fecha_entrega, precio, estado)
          VALUES (9999, 9999, CURRENT_DATE + INTERVAL '3 days', 80.00, 'pendiente')
        `);
        
        // Update to preparando (not entregado)
        await client.query(`
          UPDATE pedidos SET estado = 'preparando' WHERE cliente_id = 9999
        `);
        
        // Get final total_compras
        const finalResult = await client.query(`
          SELECT total_compras FROM clientes WHERE id = 9999
        `);
        
        const finalTotal = parseFloat(finalResult.rows[0].total_compras);
        
        // Verify total_compras was NOT updated
        expect(finalTotal).toBe(initialTotal);
        
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });
  });
});
