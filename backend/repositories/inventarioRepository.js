/**
 * Inventory Repository
 * Data access layer for inventory management
 * 
 * Validates: Requirements 3.1, 3.3, 3.4
 */

const { pool } = require('../config/database');

/**
 * Find all inventory items with optional filters
 * 
 * @param {Object} filters - Optional filters
 * @param {string} filters.estado - Filter by status (ok, bajo, critico)
 * @returns {Promise<Array>} Array of inventory items
 */
async function findAll(filters = {}) {
  try {
    let query = `
      SELECT 
        id,
        nombre,
        cantidad,
        unidad,
        minimo_stock,
        costo_unitario,
        estado,
        fecha_creacion,
        fecha_actualizacion
      FROM inventario
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    // Apply status filter if provided
    if (filters.estado) {
      query += ` AND estado = $${paramCount}`;
      params.push(filters.estado);
      paramCount++;
    }
    
    query += ' ORDER BY fecha_creacion DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[INVENTARIO REPOSITORY] Error in findAll:', error.message);
    throw error;
  }
}

/**
 * Find inventory item by ID
 * 
 * @param {number} id - Inventory item ID
 * @returns {Promise<Object|null>} Inventory item object, or null if not found
 */
async function findById(id) {
  try {
    const query = `
      SELECT 
        id,
        nombre,
        cantidad,
        unidad,
        minimo_stock,
        costo_unitario,
        estado,
        fecha_creacion,
        fecha_actualizacion
      FROM inventario
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('[INVENTARIO REPOSITORY] Error in findById:', error.message);
    throw error;
  }
}

/**
 * Create a new inventory item
 * 
 * @param {Object} itemData - Inventory item data
 * @param {string} itemData.nombre - Item name
 * @param {number} itemData.cantidad - Current quantity
 * @param {string} itemData.unidad - Unit of measurement
 * @param {number} itemData.minimo_stock - Minimum stock threshold
 * @param {number} itemData.costo_unitario - Cost per unit
 * @returns {Promise<Object>} Created inventory item with ID
 */
async function create(itemData) {
  try {
    const query = `
      INSERT INTO inventario (
        nombre,
        cantidad,
        unidad,
        minimo_stock,
        costo_unitario
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id,
        nombre,
        cantidad,
        unidad,
        minimo_stock,
        costo_unitario,
        estado,
        fecha_creacion,
        fecha_actualizacion
    `;
    
    const params = [
      itemData.nombre,
      itemData.cantidad,
      itemData.unidad,
      itemData.minimo_stock,
      itemData.costo_unitario
    ];
    
    const result = await pool.query(query, params);
    return result.rows[0];
  } catch (error) {
    console.error('[INVENTARIO REPOSITORY] Error in create:', error.message);
    throw error;
  }
}

/**
 * Update an existing inventory item
 * 
 * @param {number} id - Inventory item ID
 * @param {Object} itemData - Inventory item data to update
 * @param {string} [itemData.nombre] - Item name
 * @param {number} [itemData.cantidad] - Current quantity
 * @param {string} [itemData.unidad] - Unit of measurement
 * @param {number} [itemData.minimo_stock] - Minimum stock threshold
 * @param {number} [itemData.costo_unitario] - Cost per unit
 * @returns {Promise<Object|null>} Updated inventory item, or null if not found
 */
async function update(id, itemData) {
  try {
    // Build dynamic update query based on provided fields
    const fields = [];
    const params = [];
    let paramCount = 1;
    
    if (itemData.nombre !== undefined) {
      fields.push(`nombre = $${paramCount}`);
      params.push(itemData.nombre);
      paramCount++;
    }
    
    if (itemData.cantidad !== undefined) {
      fields.push(`cantidad = $${paramCount}`);
      params.push(itemData.cantidad);
      paramCount++;
    }
    
    if (itemData.unidad !== undefined) {
      fields.push(`unidad = $${paramCount}`);
      params.push(itemData.unidad);
      paramCount++;
    }
    
    if (itemData.minimo_stock !== undefined) {
      fields.push(`minimo_stock = $${paramCount}`);
      params.push(itemData.minimo_stock);
      paramCount++;
    }
    
    if (itemData.costo_unitario !== undefined) {
      fields.push(`costo_unitario = $${paramCount}`);
      params.push(itemData.costo_unitario);
      paramCount++;
    }
    
    // Always update fecha_actualizacion
    fields.push(`fecha_actualizacion = CURRENT_TIMESTAMP`);
    
    if (fields.length === 1) {
      // Only fecha_actualizacion would be updated, nothing to do
      return await findById(id);
    }
    
    const query = `
      UPDATE inventario
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id,
        nombre,
        cantidad,
        unidad,
        minimo_stock,
        costo_unitario,
        estado,
        fecha_creacion,
        fecha_actualizacion
    `;
    
    params.push(id);
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('[INVENTARIO REPOSITORY] Error in update:', error.message);
    throw error;
  }
}

/**
 * Delete an inventory item
 * 
 * @param {number} id - Inventory item ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deleteItem(id) {
  try {
    const query = `
      DELETE FROM inventario
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('[INVENTARIO REPOSITORY] Error in deleteItem:', error.message);
    throw error;
  }
}

/**
 * Get inventory items with low stock alerts
 * Returns items where estado is 'bajo' or 'critico'
 * 
 * @returns {Promise<Array>} Array of inventory items with low stock
 */
async function getAlerts() {
  try {
    const query = `
      SELECT 
        id,
        nombre,
        cantidad,
        unidad,
        minimo_stock,
        costo_unitario,
        estado,
        fecha_creacion,
        fecha_actualizacion
      FROM inventario
      WHERE estado IN ('bajo', 'critico')
      ORDER BY 
        CASE estado
          WHEN 'critico' THEN 1
          WHEN 'bajo' THEN 2
        END,
        nombre
    `;
    
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('[INVENTARIO REPOSITORY] Error in getAlerts:', error.message);
    throw error;
  }
}

/**
 * Decrement inventory quantity
 * Used when processing sales
 * 
 * @param {number} id - Inventory item ID
 * @param {number} cantidad - Quantity to decrement
 * @returns {Promise<Object|null>} Updated inventory item, or null if not found
 */
async function decrementQuantity(id, cantidad) {
  try {
    const query = `
      UPDATE inventario
      SET 
        cantidad = cantidad - $1,
        fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING 
        id,
        nombre,
        cantidad,
        unidad,
        minimo_stock,
        costo_unitario,
        estado,
        fecha_creacion,
        fecha_actualizacion
    `;
    
    const result = await pool.query(query, [cantidad, id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('[INVENTARIO REPOSITORY] Error in decrementQuantity:', error.message);
    throw error;
  }
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  delete: deleteItem,
  getAlerts,
  decrementQuantity
};
