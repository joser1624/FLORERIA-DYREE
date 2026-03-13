-- ============================================================================
-- Sistema de Gestión de Florería "Encantos Eternos"
-- Database Triggers and Functions
-- PostgreSQL 14+
-- ============================================================================

-- ============================================================================
-- Función 1: actualizar_inventario_venta()
-- Descripción: Decrementa el stock de inventario cuando se registra una venta
-- Requisitos: 5.7, 6.5, 17.2, 18.5
-- ============================================================================
CREATE OR REPLACE FUNCTION actualizar_inventario_venta()
RETURNS TRIGGER AS $$
DECLARE
  receta_record RECORD;
  cantidad_total DECIMAL(10,2);
BEGIN
  -- Obtener la receta del producto vendido
  FOR receta_record IN 
    SELECT ra.inventario_id, ra.cantidad, i.nombre
    FROM receta_arreglo ra
    JOIN inventario i ON i.id = ra.inventario_id
    WHERE ra.producto_id = NEW.producto_id
  LOOP
    -- Calcular cantidad total a decrementar (cantidad de receta * cantidad vendida)
    cantidad_total := receta_record.cantidad * NEW.cantidad;
    
    -- Decrementar inventario
    UPDATE inventario
    SET cantidad = cantidad - cantidad_total,
        fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id = receta_record.inventario_id;
    
    -- Registrar en detalle_ventas
    INSERT INTO detalle_ventas (venta_id, inventario_id, cantidad_usada, costo_unitario)
    SELECT NEW.id, receta_record.inventario_id, cantidad_total, i.costo_unitario
    FROM inventario i
    WHERE i.id = receta_record.inventario_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Trigger 1: trigger_actualizar_inventario
-- Descripción: Ejecuta actualizar_inventario_venta() después de insertar venta
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_actualizar_inventario ON ventas;
CREATE TRIGGER trigger_actualizar_inventario
AFTER INSERT ON ventas
FOR EACH ROW
EXECUTE FUNCTION actualizar_inventario_venta();

-- ============================================================================
-- Función 2: crear_venta_pedido_entregado()
-- Descripción: Crea automáticamente una venta cuando un pedido se marca como entregado
-- Requisitos: 5.7, 6.5, 17.2, 18.5
-- ============================================================================
CREATE OR REPLACE FUNCTION crear_venta_pedido_entregado()
RETURNS TRIGGER AS $$
DECLARE
  default_trabajador_id INTEGER;
BEGIN
  -- Verificar si el estado cambió a 'entregado' y no era 'entregado' antes
  IF NEW.estado = 'entregado' AND (OLD.estado IS NULL OR OLD.estado != 'entregado') THEN
    -- Obtener el primer trabajador activo disponible
    SELECT id INTO default_trabajador_id 
    FROM trabajadores 
    WHERE activo = true 
    ORDER BY id 
    LIMIT 1;
    
    -- Si no hay trabajadores, no crear la venta (esto debería manejarse en la aplicación)
    IF default_trabajador_id IS NOT NULL THEN
      -- Crear registro en ventas
      -- Nota: En una implementación real, el trabajador_id debería venir del contexto del usuario
      INSERT INTO ventas (
        producto_id,
        cantidad,
        precio_unitario,
        metodo_pago,
        trabajador_id,
        pedido_id,
        fecha_venta
      )
      VALUES (
        NEW.producto_id,
        1, -- Cantidad por defecto 1 para pedidos
        NEW.precio,
        'Efectivo', -- Método de pago por defecto
        default_trabajador_id,
        NEW.id,
        CURRENT_TIMESTAMP
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Trigger 2: trigger_venta_pedido_entregado
-- Descripción: Ejecuta crear_venta_pedido_entregado() después de actualizar pedido
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_venta_pedido_entregado ON pedidos;
CREATE TRIGGER trigger_venta_pedido_entregado
AFTER UPDATE ON pedidos
FOR EACH ROW
EXECUTE FUNCTION crear_venta_pedido_entregado();

-- ============================================================================
-- Función 3: registrar_historial_estado()
-- Descripción: Registra cambios de estado de pedidos para auditoría
-- Requisitos: 5.7, 6.5, 17.2, 18.5
-- ============================================================================
CREATE OR REPLACE FUNCTION registrar_historial_estado()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar si el estado cambió
  IF NEW.estado != OLD.estado THEN
    INSERT INTO historial_estados_pedido (
      pedido_id,
      estado_anterior,
      estado_nuevo,
      fecha_cambio,
      usuario_id
    )
    VALUES (
      NEW.id,
      OLD.estado,
      NEW.estado,
      CURRENT_TIMESTAMP,
      NULL -- En una implementación real, esto debería venir del contexto del usuario
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Trigger 3: trigger_historial_estado
-- Descripción: Ejecuta registrar_historial_estado() después de actualizar pedido
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_historial_estado ON pedidos;
CREATE TRIGGER trigger_historial_estado
AFTER UPDATE ON pedidos
FOR EACH ROW
EXECUTE FUNCTION registrar_historial_estado();

-- ============================================================================
-- Función 4: actualizar_total_compras_cliente()
-- Descripción: Actualiza el total de compras del cliente cuando un pedido se entrega
-- Requisitos: 5.7, 6.5, 17.2, 18.5
-- ============================================================================
CREATE OR REPLACE FUNCTION actualizar_total_compras_cliente()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar si el estado cambió a 'entregado' y no era 'entregado' antes
  IF NEW.estado = 'entregado' AND (OLD.estado IS NULL OR OLD.estado != 'entregado') THEN
    UPDATE clientes
    SET total_compras = total_compras + NEW.precio
    WHERE id = NEW.cliente_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Trigger 4: trigger_total_compras
-- Descripción: Ejecuta actualizar_total_compras_cliente() después de actualizar pedido
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_total_compras ON pedidos;
CREATE TRIGGER trigger_total_compras
AFTER UPDATE ON pedidos
FOR EACH ROW
EXECUTE FUNCTION actualizar_total_compras_cliente();

-- ============================================================================
-- Fin de triggers y funciones
-- ============================================================================
