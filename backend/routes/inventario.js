/**
 * Inventory Routes
 * Handles inventory CRUD operations with authentication and validation
 * 
 * Validates: Requirements 3.1, 3.2, 3.4, 15.2
 */

const express = require('express');
const router = express.Router();
const inventarioRepository = require('../repositories/inventarioRepository');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/v1/inventario
 * Get all inventory items with optional filters
 * Protected endpoint - requires authentication
 * 
 * Headers:
 *   - Authorization: Bearer <token>
 * 
 * Query parameters:
 *   - estado: string (optional) - Filter by status (ok, bajo, critico)
 * 
 * Response:
 *   - success: boolean
 *   - items: Array<InventarioItem>
 *   - alertas: number (count of items with bajo or critico status)
 * 
 * Validates: Requirements 3.1
 */
router.get('/', authenticateToken, async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const filters = {};
    
    // Parse query parameters
    if (req.query.estado) {
      filters.estado = req.query.estado;
    }
    
    console.log(`[INVENTARIO] Fetching inventory items with filters:`, filters);
    
    const items = await inventarioRepository.findAll(filters);
    
    // Count alerts (items with bajo or critico status)
    const alertas = items.filter(item => item.estado === 'bajo' || item.estado === 'critico').length;
    
    const duration = Date.now() - startTime;
    console.log(`[INVENTARIO] Retrieved ${items.length} items (${alertas} alerts) - Duration: ${duration}ms`);
    
    res.status(200).json({
      success: true,
      items,
      alertas
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[INVENTARIO ERROR] Error fetching inventory - Duration: ${duration}ms`);
    console.error(`[INVENTARIO ERROR] ${error.message}`);
    next(error);
  }
});

/**
 * GET /api/v1/inventario/alertas
 * Get inventory items with low stock alerts
 * Protected endpoint - requires authentication
 * 
 * Headers:
 *   - Authorization: Bearer <token>
 * 
 * Response:
 *   - success: boolean
 *   - alertas: Array<InventarioItem> (items with estado 'bajo' or 'critico')
 * 
 * Validates: Requirements 3.4
 */
router.get('/alertas', authenticateToken, async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    console.log(`[INVENTARIO] Fetching low stock alerts`);
    
    const alertas = await inventarioRepository.getAlerts();
    
    const duration = Date.now() - startTime;
    console.log(`[INVENTARIO] Retrieved ${alertas.length} alerts - Duration: ${duration}ms`);
    
    res.status(200).json({
      success: true,
      alertas
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[INVENTARIO ERROR] Error fetching alerts - Duration: ${duration}ms`);
    console.error(`[INVENTARIO ERROR] ${error.message}`);
    next(error);
  }
});

/**
 * GET /api/v1/inventario/:id
 * Get inventory item by ID
 * Protected endpoint - requires authentication
 * 
 * Headers:
 *   - Authorization: Bearer <token>
 * 
 * Path parameters:
 *   - id: number (required) - Inventory item ID
 * 
 * Response:
 *   - success: boolean
 *   - item: InventarioItem
 * 
 * Validates: Requirements 3.1
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  const startTime = Date.now();
  const { id } = req.params;
  
  try {
    console.log(`[INVENTARIO] Fetching inventory item ID: ${id}`);
    
    const item = await inventarioRepository.findById(parseInt(id));
    
    if (!item) {
      const duration = Date.now() - startTime;
      console.log(`[INVENTARIO] Item not found - ID: ${id} - Duration: ${duration}ms`);
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Item de inventario no encontrado',
          details: {
            resource: 'inventario',
            id: parseInt(id)
          }
        }
      });
    }
    
    const duration = Date.now() - startTime;
    console.log(`[INVENTARIO] Retrieved item: ${item.nombre} - Duration: ${duration}ms`);
    
    res.status(200).json({
      success: true,
      item
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[INVENTARIO ERROR] Error fetching item ID: ${id} - Duration: ${duration}ms`);
    console.error(`[INVENTARIO ERROR] ${error.message}`);
    next(error);
  }
});

/**
 * POST /api/v1/inventario
 * Create a new inventory item
 * Protected endpoint - requires authentication
 * 
 * Headers:
 *   - Authorization: Bearer <token>
 * 
 * Request body:
 *   - nombre: string (required)
 *   - cantidad: number (required) - Must be >= 0
 *   - unidad: string (required)
 *   - minimo_stock: number (required) - Must be >= 0
 *   - costo_unitario: number (required) - Must be >= 0
 * 
 * Response:
 *   - success: boolean
 *   - item: InventarioItem (created item with ID)
 * 
 * Validates: Requirements 3.2, 15.2
 */
router.post('/', authenticateToken, async (req, res, next) => {
  const startTime = Date.now();
  const { nombre, cantidad, unidad, minimo_stock, costo_unitario } = req.body;
  
  try {
    // Validate required fields
    if (!nombre || cantidad === undefined || !unidad || minimo_stock === undefined || costo_unitario === undefined) {
      console.log(`[INVENTARIO] Create failed - Missing required fields - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Campos requeridos: nombre, cantidad, unidad, minimo_stock, costo_unitario',
          details: {
            missing_fields: [
              !nombre && 'nombre',
              cantidad === undefined && 'cantidad',
              !unidad && 'unidad',
              minimo_stock === undefined && 'minimo_stock',
              costo_unitario === undefined && 'costo_unitario'
            ].filter(Boolean)
          }
        }
      });
    }
    
    // Validate cantidad >= 0 (Requirement 15.2)
    if (typeof cantidad !== 'number' || cantidad < 0) {
      console.log(`[INVENTARIO] Create failed - Invalid cantidad: ${cantidad} - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'La cantidad debe ser un número no negativo',
          details: {
            field: 'cantidad',
            value: cantidad,
            constraint: 'cantidad >= 0'
          }
        }
      });
    }
    
    // Validate minimo_stock >= 0
    if (typeof minimo_stock !== 'number' || minimo_stock < 0) {
      console.log(`[INVENTARIO] Create failed - Invalid minimo_stock: ${minimo_stock} - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El mínimo stock debe ser un número no negativo',
          details: {
            field: 'minimo_stock',
            value: minimo_stock,
            constraint: 'minimo_stock >= 0'
          }
        }
      });
    }
    
    // Validate costo_unitario >= 0
    if (typeof costo_unitario !== 'number' || costo_unitario < 0) {
      console.log(`[INVENTARIO] Create failed - Invalid costo_unitario: ${costo_unitario} - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El costo unitario debe ser un número no negativo',
          details: {
            field: 'costo_unitario',
            value: costo_unitario,
            constraint: 'costo_unitario >= 0'
          }
        }
      });
    }
    
    console.log(`[INVENTARIO] Creating item: ${nombre} - User: ${req.user.username}`);
    
    const itemData = {
      nombre,
      cantidad,
      unidad,
      minimo_stock,
      costo_unitario
    };
    
    const item = await inventarioRepository.create(itemData);
    
    const duration = Date.now() - startTime;
    console.log(`[INVENTARIO] Item created - ID: ${item.id}, Name: ${item.nombre} - User: ${req.user.username} - Duration: ${duration}ms`);
    
    res.status(201).json({
      success: true,
      item,
      id: item.id
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[INVENTARIO ERROR] Error creating item - User: ${req.user.username} - Duration: ${duration}ms`);
    console.error(`[INVENTARIO ERROR] ${error.message}`);
    next(error);
  }
});

/**
 * PUT /api/v1/inventario/:id
 * Update an existing inventory item
 * Protected endpoint - requires authentication
 * 
 * Headers:
 *   - Authorization: Bearer <token>
 * 
 * Path parameters:
 *   - id: number (required) - Inventory item ID
 * 
 * Request body (all fields optional):
 *   - nombre: string
 *   - cantidad: number - Must be >= 0
 *   - unidad: string
 *   - minimo_stock: number - Must be >= 0
 *   - costo_unitario: number - Must be >= 0
 * 
 * Response:
 *   - success: boolean
 *   - item: InventarioItem (updated item)
 * 
 * Validates: Requirements 3.2, 15.2
 */
router.put('/:id', authenticateToken, async (req, res, next) => {
  const startTime = Date.now();
  const { id } = req.params;
  const { nombre, cantidad, unidad, minimo_stock, costo_unitario } = req.body;
  
  try {
    console.log(`[INVENTARIO] Updating item ID: ${id} - User: ${req.user.username}`);
    
    // Check if item exists
    const existingItem = await inventarioRepository.findById(parseInt(id));
    if (!existingItem) {
      const duration = Date.now() - startTime;
      console.log(`[INVENTARIO] Update failed - Item not found - ID: ${id} - Duration: ${duration}ms`);
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Item de inventario no encontrado',
          details: {
            resource: 'inventario',
            id: parseInt(id)
          }
        }
      });
    }
    
    // Validate cantidad >= 0 if provided (Requirement 15.2)
    if (cantidad !== undefined && (typeof cantidad !== 'number' || cantidad < 0)) {
      console.log(`[INVENTARIO] Update failed - Invalid cantidad: ${cantidad} - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'La cantidad debe ser un número no negativo',
          details: {
            field: 'cantidad',
            value: cantidad,
            constraint: 'cantidad >= 0'
          }
        }
      });
    }
    
    // Validate minimo_stock >= 0 if provided
    if (minimo_stock !== undefined && (typeof minimo_stock !== 'number' || minimo_stock < 0)) {
      console.log(`[INVENTARIO] Update failed - Invalid minimo_stock: ${minimo_stock} - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El mínimo stock debe ser un número no negativo',
          details: {
            field: 'minimo_stock',
            value: minimo_stock,
            constraint: 'minimo_stock >= 0'
          }
        }
      });
    }
    
    // Validate costo_unitario >= 0 if provided
    if (costo_unitario !== undefined && (typeof costo_unitario !== 'number' || costo_unitario < 0)) {
      console.log(`[INVENTARIO] Update failed - Invalid costo_unitario: ${costo_unitario} - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El costo unitario debe ser un número no negativo',
          details: {
            field: 'costo_unitario',
            value: costo_unitario,
            constraint: 'costo_unitario >= 0'
          }
        }
      });
    }
    
    const updateData = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (cantidad !== undefined) updateData.cantidad = cantidad;
    if (unidad !== undefined) updateData.unidad = unidad;
    if (minimo_stock !== undefined) updateData.minimo_stock = minimo_stock;
    if (costo_unitario !== undefined) updateData.costo_unitario = costo_unitario;
    
    const item = await inventarioRepository.update(parseInt(id), updateData);
    
    const duration = Date.now() - startTime;
    console.log(`[INVENTARIO] Item updated - ID: ${id}, Name: ${item.nombre} - User: ${req.user.username} - Duration: ${duration}ms`);
    
    res.status(200).json({
      success: true,
      item
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[INVENTARIO ERROR] Error updating item ID: ${id} - User: ${req.user.username} - Duration: ${duration}ms`);
    console.error(`[INVENTARIO ERROR] ${error.message}`);
    next(error);
  }
});

/**
 * DELETE /api/v1/inventario/:id
 * Delete an inventory item
 * Protected endpoint - requires authentication
 * 
 * Headers:
 *   - Authorization: Bearer <token>
 * 
 * Path parameters:
 *   - id: number (required) - Inventory item ID
 * 
 * Response:
 *   - success: boolean
 * 
 * Validates: Requirements 3.1
 */
router.delete('/:id', authenticateToken, async (req, res, next) => {
  const startTime = Date.now();
  const { id } = req.params;
  
  try {
    console.log(`[INVENTARIO] Deleting item ID: ${id} - User: ${req.user.username}`);
    
    const deleted = await inventarioRepository.delete(parseInt(id));
    
    if (!deleted) {
      const duration = Date.now() - startTime;
      console.log(`[INVENTARIO] Delete failed - Item not found - ID: ${id} - Duration: ${duration}ms`);
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Item de inventario no encontrado',
          details: {
            resource: 'inventario',
            id: parseInt(id)
          }
        }
      });
    }
    
    const duration = Date.now() - startTime;
    console.log(`[INVENTARIO] Item deleted - ID: ${id} - User: ${req.user.username} - Duration: ${duration}ms`);
    
    res.status(200).json({
      success: true
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[INVENTARIO ERROR] Error deleting item ID: ${id} - User: ${req.user.username} - Duration: ${duration}ms`);
    console.error(`[INVENTARIO ERROR] ${error.message}`);
    next(error);
  }
});

module.exports = router;
