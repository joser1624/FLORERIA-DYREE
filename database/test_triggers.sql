-- ============================================================================
-- Test script for triggers and functions
-- ============================================================================

-- Setup: Insert test data
BEGIN;

-- Insert test usuario
INSERT INTO usuarios (username, password_hash, nombre, rol, email)
VALUES ('test_user', '$2b$10$test', 'Test User', 'Administrador', 'test@test.com')
ON CONFLICT (username) DO NOTHING;

-- Insert test trabajador
INSERT INTO trabajadores (nombre, rol, telefono, email)
VALUES ('Juan Pérez', 'Vendedor', '987654321', 'juan@test.com')
ON CONFLICT DO NOTHING;

-- Insert test cliente
INSERT INTO clientes (nombre, telefono, email, direccion)
VALUES ('María García', '912345678', 'maria@test.com', 'Av. Test 123')
ON CONFLICT DO NOTHING;

-- Insert test inventario items
INSERT INTO inventario (nombre, cantidad, unidad, minimo_stock, costo_unitario)
VALUES 
  ('Rosas rojas', 100, 'unidad', 20, 2.50),
  ('Papel de regalo', 50, 'unidad', 10, 1.00)
ON CONFLICT DO NOTHING;

-- Insert test producto with recipe
INSERT INTO productos (nombre, categoria, descripcion, precio, costo, tiene_receta)
VALUES ('Ramo de 12 rosas', 'Ramos', 'Hermoso ramo de rosas rojas', 80.00, 35.00, true)
ON CONFLICT DO NOTHING;

-- Get IDs for testing
DO $$
DECLARE
  v_producto_id INTEGER;
  v_cliente_id INTEGER;
  v_trabajador_id INTEGER;
  v_inventario_rosa_id INTEGER;
  v_inventario_papel_id INTEGER;
  v_pedido_id INTEGER;
  v_cantidad_inicial_rosas DECIMAL(10,2);
  v_cantidad_inicial_papel DECIMAL(10,2);
  v_total_compras_inicial DECIMAL(10,2);
BEGIN
  -- Get IDs
  SELECT id INTO v_producto_id FROM productos WHERE nombre = 'Ramo de 12 rosas' LIMIT 1;
  SELECT id INTO v_cliente_id FROM clientes WHERE nombre = 'María García' LIMIT 1;
  SELECT id INTO v_trabajador_id FROM trabajadores WHERE nombre = 'Juan Pérez' LIMIT 1;
  SELECT id INTO v_inventario_rosa_id FROM inventario WHERE nombre = 'Rosas rojas' LIMIT 1;
  SELECT id INTO v_inventario_papel_id FROM inventario WHERE nombre = 'Papel de regalo' LIMIT 1;
  
  -- Create recipe for the product
  DELETE FROM receta_arreglo WHERE producto_id = v_producto_id;
  INSERT INTO receta_arreglo (producto_id, inventario_id, cantidad)
  VALUES 
    (v_producto_id, v_inventario_rosa_id, 12),
    (v_producto_id, v_inventario_papel_id, 1);
  
  -- Get initial quantities
  SELECT cantidad INTO v_cantidad_inicial_rosas FROM inventario WHERE id = v_inventario_rosa_id;
  SELECT cantidad INTO v_cantidad_inicial_papel FROM inventario WHERE id = v_inventario_papel_id;
  SELECT total_compras INTO v_total_compras_inicial FROM clientes WHERE id = v_cliente_id;
  
  RAISE NOTICE 'Initial inventory - Rosas: %, Papel: %', v_cantidad_inicial_rosas, v_cantidad_inicial_papel;
  RAISE NOTICE 'Initial total_compras for client: %', v_total_compras_inicial;
  
  -- Test 1: Create a pedido
  INSERT INTO pedidos (cliente_id, producto_id, fecha_entrega, precio, estado, notas)
  VALUES (v_cliente_id, v_producto_id, CURRENT_DATE + INTERVAL '3 days', 80.00, 'pendiente', 'Test pedido')
  RETURNING id INTO v_pedido_id;
  
  RAISE NOTICE 'Created pedido with ID: %', v_pedido_id;
  
  -- Test 2: Update pedido state to 'preparando' (should trigger historial)
  UPDATE pedidos SET estado = 'preparando' WHERE id = v_pedido_id;
  RAISE NOTICE 'Updated pedido to preparando';
  
  -- Test 3: Update pedido state to 'entregado' (should trigger venta creation and total_compras update)
  UPDATE pedidos SET estado = 'entregado' WHERE id = v_pedido_id;
  RAISE NOTICE 'Updated pedido to entregado';
  
  -- Verify results
  RAISE NOTICE '=== VERIFICATION ===';
  
  -- Check if venta was created
  IF EXISTS (SELECT 1 FROM ventas WHERE pedido_id = v_pedido_id) THEN
    RAISE NOTICE 'SUCCESS: Venta was created for pedido %', v_pedido_id;
  ELSE
    RAISE NOTICE 'FAIL: Venta was NOT created for pedido %', v_pedido_id;
  END IF;
  
  -- Check if historial was recorded
  IF EXISTS (SELECT 1 FROM historial_estados_pedido WHERE pedido_id = v_pedido_id) THEN
    RAISE NOTICE 'SUCCESS: Historial estados was recorded';
    RAISE NOTICE 'Historial count: %', (SELECT COUNT(*) FROM historial_estados_pedido WHERE pedido_id = v_pedido_id);
  ELSE
    RAISE NOTICE 'FAIL: Historial estados was NOT recorded';
  END IF;
  
  -- Check if inventory was decremented
  DECLARE
    v_cantidad_final_rosas DECIMAL(10,2);
    v_cantidad_final_papel DECIMAL(10,2);
  BEGIN
    SELECT cantidad INTO v_cantidad_final_rosas FROM inventario WHERE id = v_inventario_rosa_id;
    SELECT cantidad INTO v_cantidad_final_papel FROM inventario WHERE id = v_inventario_papel_id;
    
    IF v_cantidad_final_rosas = v_cantidad_inicial_rosas - 12 THEN
      RAISE NOTICE 'SUCCESS: Rosas inventory decremented correctly (% -> %)', v_cantidad_inicial_rosas, v_cantidad_final_rosas;
    ELSE
      RAISE NOTICE 'FAIL: Rosas inventory NOT decremented correctly (% -> %, expected %)', v_cantidad_inicial_rosas, v_cantidad_final_rosas, v_cantidad_inicial_rosas - 12;
    END IF;
    
    IF v_cantidad_final_papel = v_cantidad_inicial_papel - 1 THEN
      RAISE NOTICE 'SUCCESS: Papel inventory decremented correctly (% -> %)', v_cantidad_inicial_papel, v_cantidad_final_papel;
    ELSE
      RAISE NOTICE 'FAIL: Papel inventory NOT decremented correctly (% -> %, expected %)', v_cantidad_inicial_papel, v_cantidad_final_papel, v_cantidad_inicial_papel - 1;
    END IF;
  END;
  
  -- Check if total_compras was updated
  DECLARE
    v_total_compras_final DECIMAL(10,2);
  BEGIN
    SELECT total_compras INTO v_total_compras_final FROM clientes WHERE id = v_cliente_id;
    
    IF v_total_compras_final = v_total_compras_inicial + 80.00 THEN
      RAISE NOTICE 'SUCCESS: Client total_compras updated correctly (% -> %)', v_total_compras_inicial, v_total_compras_final;
    ELSE
      RAISE NOTICE 'FAIL: Client total_compras NOT updated correctly (% -> %, expected %)', v_total_compras_inicial, v_total_compras_final, v_total_compras_inicial + 80.00;
    END IF;
  END;
  
  -- Check if detalle_ventas was created
  IF EXISTS (SELECT 1 FROM detalle_ventas dv JOIN ventas v ON v.id = dv.venta_id WHERE v.pedido_id = v_pedido_id) THEN
    RAISE NOTICE 'SUCCESS: Detalle_ventas records were created';
    RAISE NOTICE 'Detalle_ventas count: %', (SELECT COUNT(*) FROM detalle_ventas dv JOIN ventas v ON v.id = dv.venta_id WHERE v.pedido_id = v_pedido_id);
  ELSE
    RAISE NOTICE 'FAIL: Detalle_ventas records were NOT created';
  END IF;
  
END $$;

ROLLBACK;

-- Display message
SELECT 'Test completed. All changes rolled back.' AS status;
