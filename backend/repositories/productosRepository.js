/**
 * Products Repository
 * Data access layer for products management
 * 
 * Validates: Requirements 2.1, 2.3, 2.8
 */

const { pool } = require('../config/database');

/**
 * Find all products with optional filters
 * 
 * @param {Object} filters - Optional filters
 * @param {string} filters.categoria - Filter by category (Ramos, Cajas, Arreglos, Sorpresas, Eventos)
 * @param {boolean} filters.activo - Filter by active status
 * @returns {Promise<Array>} Array of products
 */
async function findAll(filters = {}) {
  try {
    let query = `
      SELECT 
        id,
        nombre,
        categoria,
        descripcion,
        precio,
        costo,
        margen_porcentaje,
        imagen_url,
        activo,
        tiene_receta,
        fecha_creacion,
        fecha_actualizacion
      FROM productos
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    // Apply category filter if provided
    if (filters.categoria) {
      query += ` AND categoria = $${paramCount}`;
      params.push(filters.categoria);
      paramCount++;
    }
    
    // Apply active filter if provided
    if (filters.activo !== undefined) {
      query += ` AND activo = $${paramCount}`;
      params.push(filters.activo);
      paramCount++;
    }
    
    query += ' ORDER BY fecha_creacion DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[PRODUCTOS REPOSITORY] Error in findAll:', error.message);
    throw error;
  }
}

/**
 * Find product by ID, including recipe if exists
 * 
 * @param {number} id - Product ID
 * @returns {Promise<Object|null>} Product object with recipe, or null if not found
 */
async function findById(id) {
  try {
    // Get product details
    const productQuery = `
      SELECT 
        id,
        nombre,
        categoria,
        descripcion,
        precio,
        costo,
        margen_porcentaje,
        imagen_url,
        activo,
        tiene_receta,
        fecha_creacion,
        fecha_actualizacion
      FROM productos
      WHERE id = $1
    `;
    
    const productResult = await pool.query(productQuery, [id]);
    
    if (productResult.rows.length === 0) {
      return null;
    }
    
    const producto = productResult.rows[0];
    
    // Get recipe if product has one
    if (producto.tiene_receta) {
      const recipeQuery = `
        SELECT 
          ra.id,
          ra.inventario_id,
          ra.cantidad,
          i.nombre as inventario_nombre,
          i.unidad,
          i.costo_unitario
        FROM receta_arreglo ra
        JOIN inventario i ON ra.inventario_id = i.id
        WHERE ra.producto_id = $1
        ORDER BY ra.id
      `;
      
      const recipeResult = await pool.query(recipeQuery, [id]);
      producto.receta = recipeResult.rows;
    } else {
      producto.receta = [];
    }
    
    return producto;
  } catch (error) {
    console.error('[PRODUCTOS REPOSITORY] Error in findById:', error.message);
    throw error;
  }
}

/**
 * Create a new product
 * 
 * @param {Object} productData - Product data
 * @param {string} productData.nombre - Product name
 * @param {string} productData.categoria - Category (Ramos, Cajas, Arreglos, Sorpresas, Eventos)
 * @param {number} productData.precio - Selling price
 * @param {number} productData.costo - Cost
 * @param {string} [productData.descripcion] - Optional description
 * @param {string} [productData.imagen_url] - Optional image URL
 * @param {boolean} [productData.tiene_receta] - Whether product has a recipe
 * @returns {Promise<Object>} Created product with ID
 */
async function create(productData) {
  try {
    const query = `
      INSERT INTO productos (
        nombre,
        categoria,
        descripcion,
        precio,
        costo,
        imagen_url,
        tiene_receta,
        activo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id,
        nombre,
        categoria,
        descripcion,
        precio,
        costo,
        margen_porcentaje,
        imagen_url,
        activo,
        tiene_receta,
        fecha_creacion,
        fecha_actualizacion
    `;
    
    const params = [
      productData.nombre,
      productData.categoria,
      productData.descripcion || null,
      productData.precio,
      productData.costo,
      productData.imagen_url || null,
      productData.tiene_receta || false,
      productData.activo !== undefined ? productData.activo : true
    ];
    
    const result = await pool.query(query, params);
    return result.rows[0];
  } catch (error) {
    console.error('[PRODUCTOS REPOSITORY] Error in create:', error.message);
    throw error;
  }
}

/**
 * Update an existing product
 * 
 * @param {number} id - Product ID
 * @param {Object} productData - Product data to update
 * @param {string} [productData.nombre] - Product name
 * @param {string} [productData.categoria] - Category
 * @param {string} [productData.descripcion] - Description
 * @param {number} [productData.precio] - Selling price
 * @param {number} [productData.costo] - Cost
 * @param {string} [productData.imagen_url] - Image URL
 * @param {boolean} [productData.activo] - Active status
 * @param {boolean} [productData.tiene_receta] - Whether product has a recipe
 * @returns {Promise<Object|null>} Updated product, or null if not found
 */
async function update(id, productData) {
  try {
    // Build dynamic update query based on provided fields
    const fields = [];
    const params = [];
    let paramCount = 1;
    
    if (productData.nombre !== undefined) {
      fields.push(`nombre = $${paramCount}`);
      params.push(productData.nombre);
      paramCount++;
    }
    
    if (productData.categoria !== undefined) {
      fields.push(`categoria = $${paramCount}`);
      params.push(productData.categoria);
      paramCount++;
    }
    
    if (productData.descripcion !== undefined) {
      fields.push(`descripcion = $${paramCount}`);
      params.push(productData.descripcion);
      paramCount++;
    }
    
    if (productData.precio !== undefined) {
      fields.push(`precio = $${paramCount}`);
      params.push(productData.precio);
      paramCount++;
    }
    
    if (productData.costo !== undefined) {
      fields.push(`costo = $${paramCount}`);
      params.push(productData.costo);
      paramCount++;
    }
    
    if (productData.imagen_url !== undefined) {
      fields.push(`imagen_url = $${paramCount}`);
      params.push(productData.imagen_url);
      paramCount++;
    }
    
    if (productData.activo !== undefined) {
      fields.push(`activo = $${paramCount}`);
      params.push(productData.activo);
      paramCount++;
    }
    
    if (productData.tiene_receta !== undefined) {
      fields.push(`tiene_receta = $${paramCount}`);
      params.push(productData.tiene_receta);
      paramCount++;
    }
    
    // Always update fecha_actualizacion
    fields.push(`fecha_actualizacion = CURRENT_TIMESTAMP`);
    
    if (fields.length === 1) {
      // Only fecha_actualizacion would be updated, nothing to do
      return await findById(id);
    }
    
    const query = `
      UPDATE productos
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id,
        nombre,
        categoria,
        descripcion,
        precio,
        costo,
        margen_porcentaje,
        imagen_url,
        activo,
        tiene_receta,
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
    console.error('[PRODUCTOS REPOSITORY] Error in update:', error.message);
    throw error;
  }
}

/**
 * Soft delete a product (marks activo=false)
 * 
 * @param {number} id - Product ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function softDelete(id) {
  try {
    const query = `
      UPDATE productos
      SET activo = false, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('[PRODUCTOS REPOSITORY] Error in softDelete:', error.message);
    throw error;
  }
}

/**
 * Save recipe for a product
 * Replaces existing recipe if any
 * 
 * @param {number} productoId - Product ID
 * @param {Array<Object>} receta - Array of recipe items
 * @param {number} receta[].inventario_id - Inventory item ID
 * @param {number} receta[].cantidad - Quantity of ingredient
 * @returns {Promise<Array>} Saved recipe items
 */
async function saveRecipe(productoId, receta) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete existing recipe
    await client.query('DELETE FROM receta_arreglo WHERE producto_id = $1', [productoId]);
    
    // Insert new recipe items
    const savedItems = [];
    
    for (const item of receta) {
      const query = `
        INSERT INTO receta_arreglo (producto_id, inventario_id, cantidad)
        VALUES ($1, $2, $3)
        RETURNING id, producto_id, inventario_id, cantidad
      `;
      
      const result = await client.query(query, [
        productoId,
        item.inventario_id,
        item.cantidad
      ]);
      
      savedItems.push(result.rows[0]);
    }
    
    // Update product to mark it has a recipe
    await client.query(
      'UPDATE productos SET tiene_receta = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $2',
      [receta.length > 0, productoId]
    );
    
    await client.query('COMMIT');
    
    return savedItems;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[PRODUCTOS REPOSITORY] Error in saveRecipe:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  softDelete,
  saveRecipe
};
