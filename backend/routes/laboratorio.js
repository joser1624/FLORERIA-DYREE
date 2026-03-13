/**
 * Laboratorio Routes
 * Handles laboratory functionality for creating custom flower arrangements
 * 
 * Validates: Requirements 4.3, 4.4, 4.5, 4.7, 4.9
 */

const express = require('express');
const router = express.Router();
const laboratorioService = require('../services/laboratorioService');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/v1/laboratorio/calcular
 * Calculate cost and suggested price for a custom arrangement
 * Protected endpoint - requires authentication
 * 
 * Headers:
 *   - Authorization: Bearer <token>
 * 
 * Request body:
 *   - ingredientes: Array<{inventario_id: number, cantidad: number}> (required)
 *   - margen_porcentaje: number (required) - Profit margin percentage
 * 
 * Response:
 *   - success: boolean
 *   - costo_total: number
 *   - precio_sugerido: number
 *   - disponible: boolean
 *   - ingredientes_insuficientes: Array<Object> (only if disponible is false)
 * 
 * Validates: Requirements 4.3, 4.4, 4.5, 4.9
 */
router.post('/calcular', authenticateToken, async (req, res, next) => {
  const startTime = Date.now();
  const { ingredientes, margen_porcentaje } = req.body;
  
  try {
    // Validate required fields
    if (!ingredientes || margen_porcentaje === undefined) {
      console.log(`[LABORATORIO] Calculate failed - Missing required fields - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Campos requeridos: ingredientes, margen_porcentaje',
          details: {
            missing_fields: [
              !ingredientes && 'ingredientes',
              margen_porcentaje === undefined && 'margen_porcentaje'
            ].filter(Boolean)
          }
        }
      });
    }
    
    // Validate ingredientes is an array
    if (!Array.isArray(ingredientes)) {
      console.log(`[LABORATORIO] Calculate failed - ingredientes must be an array - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ingredientes debe ser un array',
          details: {
            field: 'ingredientes',
            type: typeof ingredientes
          }
        }
      });
    }
    
    // Validate margen_porcentaje is a number
    if (typeof margen_porcentaje !== 'number' || margen_porcentaje < 0) {
      console.log(`[LABORATORIO] Calculate failed - Invalid margen_porcentaje: ${margen_porcentaje} - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'margen_porcentaje debe ser un número no negativo',
          details: {
            field: 'margen_porcentaje',
            value: margen_porcentaje
          }
        }
      });
    }
    
    console.log(`[LABORATORIO] Calculating arrangement cost - ${ingredientes.length} ingredients - User: ${req.user.username}`);
    
    // Calculate total cost
    const costoTotal = await laboratorioService.calculateCost(ingredientes);
    
    // Calculate suggested price
    const precioSugerido = laboratorioService.calculateSuggestedPrice(costoTotal, margen_porcentaje);
    
    // Validate inventory availability
    const availability = await laboratorioService.validateInventoryAvailability(ingredientes);
    
    const duration = Date.now() - startTime;
    console.log(`[LABORATORIO] Calculation complete - Cost: ${costoTotal}, Price: ${precioSugerido}, Available: ${availability.disponible} - User: ${req.user.username} - Duration: ${duration}ms`);
    
    const response = {
      success: true,
      costo_total: costoTotal,
      precio_sugerido: precioSugerido,
      disponible: availability.disponible
    };
    
    // Include insufficient ingredients only if not available
    if (!availability.disponible) {
      response.ingredientes_insuficientes = availability.ingredientes_insuficientes;
    }
    
    res.status(200).json(response);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[LABORATORIO ERROR] Error calculating arrangement - User: ${req.user.username} - Duration: ${duration}ms`);
    console.error(`[LABORATORIO ERROR] ${error.message}`);
    next(error);
  }
});

/**
 * POST /api/v1/laboratorio/guardar-arreglo
 * Save custom arrangement as a product with recipe
 * Protected endpoint - requires authentication
 * 
 * Headers:
 *   - Authorization: Bearer <token>
 * 
 * Request body:
 *   - nombre: string (required)
 *   - categoria: string (required) - Must be one of: Ramos, Cajas, Arreglos, Sorpresas, Eventos
 *   - precio: number (required)
 *   - descripcion: string (optional)
 *   - imagen_url: string (optional)
 *   - receta: Array<{inventario_id: number, cantidad: number}> (required)
 * 
 * Response:
 *   - success: boolean
 *   - producto: Producto (created product)
 *   - receta: Array<RecetaItem> (saved recipe)
 * 
 * Validates: Requirements 4.7
 */
router.post('/guardar-arreglo', authenticateToken, async (req, res, next) => {
  const startTime = Date.now();
  const { nombre, categoria, precio, descripcion, imagen_url, receta } = req.body;
  
  try {
    // Validate required fields
    if (!nombre || !categoria || precio === undefined || !receta) {
      console.log(`[LABORATORIO] Save arrangement failed - Missing required fields - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Campos requeridos: nombre, categoria, precio, receta',
          details: {
            missing_fields: [
              !nombre && 'nombre',
              !categoria && 'categoria',
              precio === undefined && 'precio',
              !receta && 'receta'
            ].filter(Boolean)
          }
        }
      });
    }
    
    // Validate categoria
    const validCategories = ['Ramos', 'Cajas', 'Arreglos', 'Sorpresas', 'Eventos'];
    if (!validCategories.includes(categoria)) {
      console.log(`[LABORATORIO] Save arrangement failed - Invalid categoria: ${categoria} - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'categoria debe ser uno de: Ramos, Cajas, Arreglos, Sorpresas, Eventos',
          details: {
            field: 'categoria',
            value: categoria,
            valid_values: validCategories
          }
        }
      });
    }
    
    // Validate precio is a positive number
    if (typeof precio !== 'number' || precio <= 0) {
      console.log(`[LABORATORIO] Save arrangement failed - Invalid precio: ${precio} - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'precio debe ser un número positivo',
          details: {
            field: 'precio',
            value: precio,
            constraint: 'precio > 0'
          }
        }
      });
    }
    
    // Validate receta is an array
    if (!Array.isArray(receta) || receta.length === 0) {
      console.log(`[LABORATORIO] Save arrangement failed - receta must be a non-empty array - User: ${req.user.username}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'receta debe ser un array no vacío',
          details: {
            field: 'receta',
            type: typeof receta,
            length: Array.isArray(receta) ? receta.length : undefined
          }
        }
      });
    }
    
    console.log(`[LABORATORIO] Saving arrangement: ${nombre} - User: ${req.user.username}`);
    
    // Calculate cost from recipe
    const costo = await laboratorioService.calculateCost(receta);
    
    // Prepare arrangement data
    const arrangementData = {
      nombre,
      categoria,
      precio,
      costo,
      descripcion: descripcion || null,
      imagen_url: imagen_url || null,
      receta
    };
    
    // Save arrangement
    const result = await laboratorioService.saveArrangement(arrangementData);
    
    const duration = Date.now() - startTime;
    console.log(`[LABORATORIO] Arrangement saved - ID: ${result.producto.id}, Name: ${result.producto.nombre} - User: ${req.user.username} - Duration: ${duration}ms`);
    
    res.status(201).json({
      success: true,
      producto: result.producto,
      receta: result.receta
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[LABORATORIO ERROR] Error saving arrangement - User: ${req.user.username} - Duration: ${duration}ms`);
    console.error(`[LABORATORIO ERROR] ${error.message}`);
    
    // Handle specific error cases
    if (error.message.includes('Insufficient inventory')) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_INVENTORY',
          message: 'Inventario insuficiente para uno o más ingredientes',
          details: {}
        }
      });
    }
    
    next(error);
  }
});

module.exports = router;
