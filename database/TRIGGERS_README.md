# Database Triggers and Functions - Sistema de Gestión de Florería

## Overview

This document describes the database triggers and functions implemented for the florería management system. These triggers automate critical business logic at the database level.

## Implemented Functions and Triggers

### 1. Inventory Update on Sale

**Function:** `actualizar_inventario_venta()`
**Trigger:** `trigger_actualizar_inventario` (AFTER INSERT ON ventas)

**Purpose:** Automatically decrements inventory quantities when a sale is registered.

**Behavior:**
- Retrieves the product recipe from `receta_arreglo` table
- For each ingredient in the recipe:
  - Calculates total quantity needed (recipe quantity × sale quantity)
  - Decrements inventory quantity
  - Updates `fecha_actualizacion` timestamp
  - Creates a record in `detalle_ventas` for tracking

**Requirements Validated:** 5.7, 6.5, 17.2, 18.5

---

### 2. Automatic Sale Creation on Order Delivery

**Function:** `crear_venta_pedido_entregado()`
**Trigger:** `trigger_venta_pedido_entregado` (AFTER UPDATE ON pedidos)

**Purpose:** Automatically creates a sale record when an order status changes to 'entregado'.

**Behavior:**
- Detects when order state changes to 'entregado'
- Creates a new record in `ventas` table with:
  - Product from the order
  - Quantity: 1 (default for orders)
  - Price from the order
  - Default payment method: 'Efectivo'
  - Links the sale to the order via `pedido_id`

**Note:** Currently uses default trabajador_id = 1. In production, this should come from the user context.

**Requirements Validated:** 5.7, 6.5, 17.2, 18.5

---

### 3. Order State History Tracking

**Function:** `registrar_historial_estado()`
**Trigger:** `trigger_historial_estado` (AFTER UPDATE ON pedidos)

**Purpose:** Records all state changes for orders in an audit trail.

**Behavior:**
- Detects when order state changes
- Creates a record in `historial_estados_pedido` with:
  - Previous state
  - New state
  - Timestamp of change
  - User who made the change (currently NULL, should come from context)

**Requirements Validated:** 5.7, 6.5, 17.2, 18.5

---

### 4. Client Total Purchases Update

**Function:** `actualizar_total_compras_cliente()`
**Trigger:** `trigger_total_compras` (AFTER UPDATE ON pedidos)

**Purpose:** Updates the client's total purchases amount when an order is delivered.

**Behavior:**
- Detects when order state changes to 'entregado'
- Increments the client's `total_compras` field by the order price

**Requirements Validated:** 5.7, 6.5, 17.2, 18.5

---

## Trigger Execution Flow

### Complete Order-to-Sale Flow

When an order is marked as 'entregado', the following sequence occurs:

1. **Order Update** → `UPDATE pedidos SET estado = 'entregado'`

2. **Trigger: trigger_historial_estado**
   - Records state change in `historial_estados_pedido`

3. **Trigger: trigger_venta_pedido_entregado**
   - Creates new sale record in `ventas`

4. **Trigger: trigger_actualizar_inventario** (fired by sale creation)
   - Decrements inventory for each ingredient
   - Creates `detalle_ventas` records

5. **Trigger: trigger_total_compras**
   - Updates client's `total_compras`

### Direct Sale Flow

When a sale is created directly (not from an order):

1. **Sale Creation** → `INSERT INTO ventas`

2. **Trigger: trigger_actualizar_inventario**
   - Decrements inventory for each ingredient
   - Creates `detalle_ventas` records

---

## Testing

A comprehensive test script is provided in `database/test_triggers.sql` that:

1. Creates test data (users, workers, clients, inventory, products)
2. Creates a product recipe
3. Creates an order
4. Updates order through state transitions
5. Verifies all triggers executed correctly:
   - ✅ Sale was created
   - ✅ Inventory was decremented
   - ✅ State history was recorded
   - ✅ Client total purchases was updated
   - ✅ Sale details were created

**To run tests:**
```bash
psql -U postgres -d floreria_encantos_eternos -f database/test_triggers.sql
```

All tests use a transaction that is rolled back, so no data is permanently modified.

---

## Installation

To install these triggers and functions:

```bash
psql -U postgres -d floreria_encantos_eternos -f database/triggers.sql
```

---

## Verification

To verify triggers are installed:

```sql
-- List all functions
\df+ actualizar_inventario_venta
\df+ crear_venta_pedido_entregado
\df+ registrar_historial_estado
\df+ actualizar_total_compras_cliente

-- List all triggers
SELECT tgname, tgrelid::regclass, tgfoid::regproc 
FROM pg_trigger 
WHERE tgname LIKE 'trigger_%' 
  AND tgrelid::regclass::text IN ('ventas', 'pedidos');
```

Expected output:
- 4 functions created
- 4 triggers created (1 on ventas, 3 on pedidos)

---

## Future Improvements

1. **User Context:** Pass actual user_id from application context instead of using NULL or default values
2. **Error Handling:** Add more robust error handling and logging
3. **Configurable Defaults:** Make default values (trabajador_id, metodo_pago) configurable
4. **Rollback Support:** Add logic to handle order state rollbacks (e.g., from 'entregado' back to 'listo')
5. **Notification System:** Integrate with notification system for low inventory alerts

---

## Related Files

- `database/schema.sql` - Main database schema
- `database/triggers.sql` - Trigger and function definitions
- `database/test_triggers.sql` - Comprehensive test suite
