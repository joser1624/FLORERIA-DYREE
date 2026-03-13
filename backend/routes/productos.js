/**
 * Products Routes
 * Handles product CRUD operations with authentication and validation
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.7, 15.1
 */

const express = require('express');
const router = express.Router();
const productosRepository = require('../repositories/productosRepository');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/v1/productos
 * Get all products with optional filters
 * 
 * Query parameters:
 *   - categoria: string (optional) - Filter by category (Ramos, Cajas, Arreglos, Sorpresas, Eventos)
 *   - activo: boolean (optional) - Filter by active status
 * 
 * Response:
 *   - success: boolean
 *   - productos: Array<Producto>
 * 
 * Validates: Requirements 2.1
 */
router.get('/', async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const filters = {};
    
    // Parse query parameters
    if (req.query.categoria) {
      filters.categoria = req.query.categoria;
    }
    
    if (req.query.activo !== undefined) {
      filters.activo = req.query.activo === 'true';
    }
    
    console.log(`[PRODUCTOS] Fetching products with filters:`, filters);
    
    const productos = await productosRepository.findAll(filters);
    
    const duration = Date.now() - startTime;
    console.log(`[PRODUCTOS] Retrieved ${productos.length} products - Duration: ${duration}ms`);
    
    res.status(200).json({
      success: true,
      productos
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PRODUCTOS ERROR] Error fetching products - Duration: ${duration}ms`);
    console.error(`[PRODUCTOS ERROR] ${error.message}`);
    next(error);
  }
});

/**
 * GET /api/v1/productos/:id
 * Get product by ID, including recipe if exists
 * 
 * Path parameters:
 *   - id: number (required) - Product ID
 * 
 * Response:
 *   - success: boolean
 *   - producto: Producto (with receta array if tiene_receta=true)
 * 
 * Validates: Requirements 2.1
 */
router.get('/:id', async (req, res, next) => {
  const startTime = Date.now();
  const { id } = req.params;
  
  try {
    console.log(`[PRODUCTOS] Fetching product ID: ${id}`);
    
    const producto = await productosRepository.findById(parseInt(id));
    
    if (!producto) {
      const duration = Date.now() - startTime;
      console.log(`[PRODUCTOS] Product not found - ID: ${id} - Duration: ${duration}ms`);
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Producto no encontrado',
          details: {
            resource: 'producto',
            id: parseInt(id)
          }
        }
      });
    }
    
    const duration = Date.now() - startTime;
    console.log(`[PRODUCTOS] Retrieved product: ${producto.nombre} - Duration: ${duration}ms`);
    
    res.status(200).json({
      success: true,
      producto
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PRODUCTOS ERROR] Error fetching product ID: ${id} - Duration: ${duration}ms`);
    console.error(`[PRODUCTOS ERROR] ${error.message}`);
    next(error);
  }
});

/**
 * POST /api/v1/productos
 * Create a new product
 * Protected endpoint - requires authentication
 * 
 * Headers:
 *   - Authorization: Bearer <token>
 * 
 * Request body:
 *   - nombre: string (required)
 *   - categoria: string (required) - One of: Ramos, Cajas, Arreglos, Sorpresas, Eventos
 *   - precio: number (required) - Must be greater than costo
 *   - costo: number (required) - Must be >= 0
 *   - descripcion: string (optional)
 *   - imagen_url: string (optional)
 *   - tiene_receta: boolean (optional)
 * 
 * Response:
 *   - success: boolean
 *   - producto: Producto (created product with ID)
 * 
 * Validates: Requirements 2.2, 2.3, 15.1
 */
router.post('/', authenticateToken, async (req, res, next) => {
  const startTime = Date.now();
  const { nombre, categoria, precio, costo, descripcion, imagen_url, tiene_receta } = req.body;
  
  try {
    // Validate required fields
    if (!nombre || !categoria || precio === undefined || costo === undefined) {
      console.log(`[PRODUCTOS] Create failed - Missing required fields - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Campos requeridos: nombre, categoria, precio, costo',
          details: {
            missing_fields: [
              !nombre && 'nombre',
              !categoria && 'categoria',
              precio === undefined && 'precio',
              costo === undefined && 'costo'
            ].filter(Boolean)
          }
        }
      });
    }
    
    // Validate precio > costo (Requirement 15.1)
    if (precio <= costo) {
      console.log(`[PRODUCTOS] Create failed - Invalid pricing - precio: ${precio}, costo: ${costo} - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El precio debe ser mayor que el costo',
          details: {
            field: 'precio',
            value: precio,
            constraint: 'precio > costo',
            costo: costo
          }
        }
      });
    }
    
    // Validate categoria
    const validCategories = ['Ramos', 'Cajas', 'Arreglos', 'Sorpresas', 'Eventos'];
    if (!validCategories.includes(categoria)) {
      console.log(`[PRODUCTOS] Create failed - Invalid category: ${categoria} - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Categoría inválida',
          details: {
            field: 'categoria',
            value: categoria,
            valid_values: validCategories
          }
        }
      });
    }
    
    // Validate numeric values
    if (typeof precio !== 'number' || typeof costo !== 'number' || precio < 0 || costo < 0) {
      console.log(`[PRODUCTOS] Create failed - Invalid numeric values - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Precio y costo deben ser números positivos',
          details: {}
        }
      });
    }
    
    console.log(`[PRODUCTOS] Creating product: ${nombre} - User: ${req.user.username}`);
    
    const productData = {
      nombre,
      categoria,
      precio,
      costo,
      descripcion,
      imagen_url,
      tiene_receta
    };
    
    const producto = await productosRepository.create(productData);
    
    const duration = Date.now() - startTime;
    console.log(`[PRODUCTOS] Product created - ID: ${producto.id}, Name: ${producto.nombre} - User: ${req.user.username} - Duration: ${duration}ms`);
    
    res.status(201).json({
      success: true,
      producto,
      id: producto.id
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PRODUCTOS ERROR] Error creating product - User: ${req.user.username} - Duration: ${duration}ms`);
    console.error(`[PRODUCTOS ERROR] ${error.message}`);
    next(error);
  }
});

/**
 * PUT /api/v1/productos/:id
 * Update an existing product
 * Protected endpoint - requires authentication
 * 
 * Headers:
 *   - Authorization: Bearer <token>
 * 
 * Path parameters:
 *   - id: number (required) - Product ID
 * 
 * Request body (all fields optional):
 *   - nombre: string
 *   - categoria: string - One of: Ramos, Cajas, Arreglos, Sorpresas, Eventos
 *   - precio: number - Must be greater than costo if both provided
 *   - costo: number - Must be >= 0
 *   - descripcion: string
 *   - imagen_url: string
 *   - activo: boolean
 *   - tiene_receta: boolean
 * 
 * Response:
 *   - success: boolean
 *   - producto: Producto (updated product)
 * 
 * Validates: Requirements 2.7, 15.1
 */
router.put('/:id', authenticateToken, async (req, res, next) => {
  const startTime = Date.now();
  const { id } = req.params;
  const { nombre, categoria, precio, costo, descripcion, imagen_url, activo, tiene_receta } = req.body;
  
  try {
    console.log(`[PRODUCTOS] Updating product ID: ${id} - User: ${req.user.username}`);
    
    // Check if product exists
    const existingProduct = await productosRepository.findById(parseInt(id));
    if (!existingProduct) {
      const duration = Date.now() - startTime;
      console.log(`[PRODUCTOS] Update failed - Product not found - ID: ${id} - Duration: ${duration}ms`);
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Producto no encontrado',
          details: {
            resource: 'producto',
            id: parseInt(id)
          }
        }
      });
    }
    
    // Validate precio > costo if both are provided (Requirement 15.1)
    const finalPrecio = precio !== undefined ? precio : parseFloat(existingProduct.precio);
    const finalCosto = costo !== undefined ? costo : parseFloat(existingProduct.costo);
    
    if (finalPrecio <= finalCosto) {
      console.log(`[PRODUCTOS] Update failed - Invalid pricing - precio: ${finalPrecio}, costo: ${finalCosto} - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El precio debe ser mayor que el costo',
          details: {
            field: 'precio',
            value: finalPrecio,
            constraint: 'precio > costo',
            costo: finalCosto
          }
        }
      });
    }
    
    // Validate categoria if provided
    if (categoria) {
      const validCategories = ['Ramos', 'Cajas', 'Arreglos', 'Sorpresas', 'Eventos'];
      if (!validCategories.includes(categoria)) {
        console.log(`[PRODUCTOS] Update failed - Invalid category: ${categoria} - User: ${req.user.username}`);
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Categoría inválida',
            details: {
              field: 'categoria',
              value: categoria,
              valid_values: validCategories
            }
          }
        });
      }
    }
    
    // Validate numeric values if provided
    if ((precio !== undefined && (typeof precio !== 'number' || precio < 0)) ||
        (costo !== undefined && (typeof costo !== 'number' || costo < 0))) {
      console.log(`[PRODUCTOS] Update failed - Invalid numeric values - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Precio y costo deben ser números positivos',
          details: {}
        }
      });
    }
    
    const updateData = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (categoria !== undefined) updateData.categoria = categoria;
    if (precio !== undefined) updateData.precio = precio;
    if (costo !== undefined) updateData.costo = costo;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (imagen_url !== undefined) updateData.imagen_url = imagen_url;
    if (activo !== undefined) updateData.activo = activo;
    if (tiene_receta !== undefined) updateData.tiene_receta = tiene_receta;
    
    const producto = await productosRepository.update(parseInt(id), updateData);
    
    const duration = Date.now() - startTime;
    console.log(`[PRODUCTOS] Product updated - ID: ${id}, Name: ${producto.nombre} - User: ${req.user.username} - Duration: ${duration}ms`);
    
    res.status(200).json({
      success: true,
      producto
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PRODUCTOS ERROR] Error updating product ID: ${id} - User: ${req.user.username} - Duration: ${duration}ms`);
    console.error(`[PRODUCTOS ERROR] ${error.message}`);
    next(error);
  }
});

/**
 * DELETE /api/v1/productos/:id
 * Soft delete a product (marks activo=false)
 * Protected endpoint - requires authentication
 * 
 * Headers:
 *   - Authorization: Bearer <token>
 * 
 * Path parameters:
 *   - id: number (required) - Product ID
 * 
 * Response:
 *   - success: boolean
 * 
 * Validates: Requirements 2.8
 */
router.delete('/:id', authenticateToken, async (req, res, next) => {
  const startTime = Date.now();
  const { id } = req.params;
  
  try {
    console.log(`[PRODUCTOS] Soft deleting product ID: ${id} - User: ${req.user.username}`);
    
    const deleted = await productosRepository.softDelete(parseInt(id));
    
    if (!deleted) {
      const duration = Date.now() - startTime;
      console.log(`[PRODUCTOS] Delete failed - Product not found - ID: ${id} - Duration: ${duration}ms`);
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Producto no encontrado',
          details: {
            resource: 'producto',
            id: parseInt(id)
          }
        }
      });
    }
    
    const duration = Date.now() - startTime;
    console.log(`[PRODUCTOS] Product soft deleted - ID: ${id} - User: ${req.user.username} - Duration: ${duration}ms`);
    
    res.status(200).json({
      success: true
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PRODUCTOS ERROR] Error deleting product ID: ${id} - User: ${req.user.username} - Duration: ${duration}ms`);
    console.error(`[PRODUCTOS ERROR] ${error.message}`);
    next(error);
  }
});

module.exports = router;
