/**
 * Laboratorio Service
 * Business logic for the "Laboratorio de Flores" functionality
 * 
 * Validates: Requirements 4.3, 4.5, 4.7, 4.9, 16.1, 16.3
 */

const inventarioRepository = require('../repositories/inventarioRepository');
const productosRepository = require('../repositories/productosRepository');

/**
 * Calculate total cost of an arrangement based on selected ingredients
 * 
 * Formula: sum of (ingredient_quantity * ingredient_cost_per_unit) for all ingredients
 * 
 * @param {Array<Object>} ingredientes - Array of selected ingredients
 * @param {number} ingredientes[].inventario_id - Inventory item ID
 * @param {number} ingredientes[].cantidad - Quantity of ingredient to use
 * @returns {Promise<number>} Total cost of the arrangement
 * 
 * Validates: Requirements 4.3, 16.1
 */
async function calculateCost(ingredientes) {
  try {
    if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
      return 0;
    }

    let totalCost = 0;

    for (const ingrediente of ingredientes) {
      const { inventario_id, cantidad } = ingrediente;

      // Get inventory item to retrieve cost per unit
      const item = await inventarioRepository.findById(inventario_id);

      if (!item) {
        throw new Error(`Inventory item with ID ${inventario_id} not found`);
      }

      // Calculate cost for this ingredient: quantity * cost_per_unit
      const ingredientCost = cantidad * item.costo_unitario;
      totalCost += ingredientCost;
    }

    return totalCost;
  } catch (error) {
    console.error('[LABORATORIO SERVICE] Error in calculateCost:', error.message);
    throw error;
  }
}

/**
 * Calculate suggested selling price based on cost and margin percentage
 * 
 * Formula: cost * (1 + margin/100)
 * 
 * @param {number} cost - Total cost of the arrangement
 * @param {number} margenPorcentaje - Desired profit margin percentage
 * @returns {number} Suggested selling price
 * 
 * Validates: Requirements 4.5, 16.3
 */
function calculateSuggestedPrice(cost, margenPorcentaje) {
  try {
    if (cost < 0) {
      throw new Error('Cost cannot be negative');
    }

    if (margenPorcentaje < 0) {
      throw new Error('Margin percentage cannot be negative');
    }

    // Formula: cost * (1 + margin/100)
    const suggestedPrice = cost * (1 + margenPorcentaje / 100);

    return suggestedPrice;
  } catch (error) {
    console.error('[LABORATORIO SERVICE] Error in calculateSuggestedPrice:', error.message);
    throw error;
  }
}

/**
 * Validate that sufficient inventory exists for all ingredients
 * 
 * @param {Array<Object>} ingredientes - Array of selected ingredients
 * @param {number} ingredientes[].inventario_id - Inventory item ID
 * @param {number} ingredientes[].cantidad - Quantity of ingredient needed
 * @returns {Promise<Object>} Validation result with availability status and details
 * @returns {boolean} result.disponible - Whether all ingredients are available
 * @returns {Array<Object>} result.ingredientes_insuficientes - List of ingredients with insufficient stock
 * 
 * Validates: Requirements 4.9
 */
async function validateInventoryAvailability(ingredientes) {
  try {
    if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
      return {
        disponible: true,
        ingredientes_insuficientes: []
      };
    }

    const ingredientesInsuficientes = [];

    for (const ingrediente of ingredientes) {
      const { inventario_id, cantidad } = ingrediente;

      // Get inventory item to check available quantity
      const item = await inventarioRepository.findById(inventario_id);

      if (!item) {
        throw new Error(`Inventory item with ID ${inventario_id} not found`);
      }

      // Check if available quantity is sufficient
      if (item.cantidad < cantidad) {
        ingredientesInsuficientes.push({
          inventario_id: item.id,
          nombre: item.nombre,
          cantidad_requerida: cantidad,
          cantidad_disponible: item.cantidad,
          unidad: item.unidad
        });
      }
    }

    return {
      disponible: ingredientesInsuficientes.length === 0,
      ingredientes_insuficientes: ingredientesInsuficientes
    };
  } catch (error) {
    console.error('[LABORATORIO SERVICE] Error in validateInventoryAvailability:', error.message);
    throw error;
  }
}

/**
 * Save arrangement as a product with its recipe
 * Creates product and recipe in a database transaction
 * 
 * @param {Object} arrangementData - Arrangement data
 * @param {string} arrangementData.nombre - Product name
 * @param {string} arrangementData.categoria - Category (Ramos, Cajas, Arreglos, Sorpresas, Eventos)
 * @param {number} arrangementData.precio - Selling price
 * @param {number} arrangementData.costo - Total cost
 * @param {string} [arrangementData.descripcion] - Optional description
 * @param {string} [arrangementData.imagen_url] - Optional image URL
 * @param {Array<Object>} arrangementData.receta - Recipe ingredients
 * @param {number} arrangementData.receta[].inventario_id - Inventory item ID
 * @param {number} arrangementData.receta[].cantidad - Quantity of ingredient
 * @returns {Promise<Object>} Created product with recipe
 * 
 * Validates: Requirements 4.7
 */
async function saveArrangement(arrangementData) {
  try {
    const {
      nombre,
      categoria,
      precio,
      costo,
      descripcion,
      imagen_url,
      receta
    } = arrangementData;

    // Validate required fields
    if (!nombre || !categoria || !precio || costo === undefined || !receta) {
      throw new Error('Missing required fields: nombre, categoria, precio, costo, receta');
    }

    if (!Array.isArray(receta) || receta.length === 0) {
      throw new Error('Recipe must be a non-empty array');
    }

    // Validate inventory availability before creating product
    const availability = await validateInventoryAvailability(receta);
    if (!availability.disponible) {
      throw new Error('Insufficient inventory for one or more ingredients');
    }

    // Create product
    const productData = {
      nombre,
      categoria,
      precio,
      costo,
      descripcion: descripcion || null,
      imagen_url: imagen_url || null,
      tiene_receta: true,
      activo: true
    };

    const producto = await productosRepository.create(productData);

    // Save recipe for the product
    const recetaGuardada = await productosRepository.saveRecipe(producto.id, receta);

    // Return product with recipe
    return {
      producto,
      receta: recetaGuardada
    };
  } catch (error) {
    console.error('[LABORATORIO SERVICE] Error in saveArrangement:', error.message);
    throw error;
  }
}

module.exports = {
  calculateCost,
  calculateSuggestedPrice,
  validateInventoryAvailability,
  saveArrangement
};
