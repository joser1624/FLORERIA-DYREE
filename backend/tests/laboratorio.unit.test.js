/**
 * Unit Tests for Laboratorio Service
 * Tests core functionality of the Laboratorio de Flores
 * 
 * Validates: Requirements 4.3, 4.5, 4.7, 4.9, 16.1, 16.3
 */

const laboratorioService = require('../services/laboratorioService');
const inventarioRepository = require('../repositories/inventarioRepository');
const productosRepository = require('../repositories/productosRepository');

// Mock the repositories
jest.mock('../repositories/inventarioRepository');
jest.mock('../repositories/productosRepository');

describe('Laboratorio Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateCost', () => {
    it('should calculate total cost correctly for single ingredient', async () => {
      const ingredientes = [
        { inventario_id: 1, cantidad: 10 }
      ];

      inventarioRepository.findById.mockResolvedValue({
        id: 1,
        nombre: 'Rosas rojas',
        costo_unitario: 2.5,
        cantidad: 100
      });

      const cost = await laboratorioService.calculateCost(ingredientes);

      expect(cost).toBe(25); // 10 * 2.5
      expect(inventarioRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should calculate total cost correctly for multiple ingredients', async () => {
      const ingredientes = [
        { inventario_id: 1, cantidad: 10 },
        { inventario_id: 2, cantidad: 5 },
        { inventario_id: 3, cantidad: 2 }
      ];

      inventarioRepository.findById
        .mockResolvedValueOnce({ id: 1, costo_unitario: 2.5, cantidad: 100 })
        .mockResolvedValueOnce({ id: 2, costo_unitario: 3.0, cantidad: 50 })
        .mockResolvedValueOnce({ id: 3, costo_unitario: 10.0, cantidad: 20 });

      const cost = await laboratorioService.calculateCost(ingredientes);

      expect(cost).toBe(60); // (10*2.5) + (5*3.0) + (2*10.0) = 25 + 15 + 20
    });

    it('should return 0 for empty ingredients array', async () => {
      const cost = await laboratorioService.calculateCost([]);
      expect(cost).toBe(0);
    });

    it('should throw error if inventory item not found', async () => {
      const ingredientes = [
        { inventario_id: 999, cantidad: 10 }
      ];

      inventarioRepository.findById.mockResolvedValue(null);

      await expect(laboratorioService.calculateCost(ingredientes))
        .rejects.toThrow('Inventory item with ID 999 not found');
    });

    it('should handle decimal quantities correctly', async () => {
      const ingredientes = [
        { inventario_id: 1, cantidad: 2.5 }
      ];

      inventarioRepository.findById.mockResolvedValue({
        id: 1,
        costo_unitario: 4.0,
        cantidad: 100
      });

      const cost = await laboratorioService.calculateCost(ingredientes);

      expect(cost).toBe(10); // 2.5 * 4.0
    });
  });

  describe('calculateSuggestedPrice', () => {
    it('should calculate suggested price with 50% margin', () => {
      const cost = 100;
      const margin = 50;

      const price = laboratorioService.calculateSuggestedPrice(cost, margin);

      expect(price).toBe(150); // 100 * (1 + 50/100) = 100 * 1.5
    });

    it('should calculate suggested price with 30% margin', () => {
      const cost = 50;
      const margin = 30;

      const price = laboratorioService.calculateSuggestedPrice(cost, margin);

      expect(price).toBe(65); // 50 * (1 + 30/100) = 50 * 1.3
    });

    it('should handle 0% margin', () => {
      const cost = 100;
      const margin = 0;

      const price = laboratorioService.calculateSuggestedPrice(cost, margin);

      expect(price).toBe(100); // 100 * (1 + 0/100) = 100
    });

    it('should handle decimal margins', () => {
      const cost = 100;
      const margin = 25.5;

      const price = laboratorioService.calculateSuggestedPrice(cost, margin);

      expect(price).toBeCloseTo(125.5, 2); // 100 * (1 + 25.5/100)
    });

    it('should throw error for negative cost', () => {
      expect(() => laboratorioService.calculateSuggestedPrice(-10, 50))
        .toThrow('Cost cannot be negative');
    });

    it('should throw error for negative margin', () => {
      expect(() => laboratorioService.calculateSuggestedPrice(100, -10))
        .toThrow('Margin percentage cannot be negative');
    });
  });

  describe('validateInventoryAvailability', () => {
    it('should return disponible=true when all ingredients are available', async () => {
      const ingredientes = [
        { inventario_id: 1, cantidad: 10 },
        { inventario_id: 2, cantidad: 5 }
      ];

      inventarioRepository.findById
        .mockResolvedValueOnce({ id: 1, nombre: 'Rosas', cantidad: 50, unidad: 'unidades' })
        .mockResolvedValueOnce({ id: 2, nombre: 'Lirios', cantidad: 20, unidad: 'unidades' });

      const result = await laboratorioService.validateInventoryAvailability(ingredientes);

      expect(result.disponible).toBe(true);
      expect(result.ingredientes_insuficientes).toHaveLength(0);
    });

    it('should return disponible=false when one ingredient is insufficient', async () => {
      const ingredientes = [
        { inventario_id: 1, cantidad: 10 },
        { inventario_id: 2, cantidad: 25 }
      ];

      inventarioRepository.findById
        .mockResolvedValueOnce({ id: 1, nombre: 'Rosas', cantidad: 50, unidad: 'unidades' })
        .mockResolvedValueOnce({ id: 2, nombre: 'Lirios', cantidad: 20, unidad: 'unidades' });

      const result = await laboratorioService.validateInventoryAvailability(ingredientes);

      expect(result.disponible).toBe(false);
      expect(result.ingredientes_insuficientes).toHaveLength(1);
      expect(result.ingredientes_insuficientes[0]).toEqual({
        inventario_id: 2,
        nombre: 'Lirios',
        cantidad_requerida: 25,
        cantidad_disponible: 20,
        unidad: 'unidades'
      });
    });

    it('should return disponible=false when multiple ingredients are insufficient', async () => {
      const ingredientes = [
        { inventario_id: 1, cantidad: 60 },
        { inventario_id: 2, cantidad: 25 }
      ];

      inventarioRepository.findById
        .mockResolvedValueOnce({ id: 1, nombre: 'Rosas', cantidad: 50, unidad: 'unidades' })
        .mockResolvedValueOnce({ id: 2, nombre: 'Lirios', cantidad: 20, unidad: 'unidades' });

      const result = await laboratorioService.validateInventoryAvailability(ingredientes);

      expect(result.disponible).toBe(false);
      expect(result.ingredientes_insuficientes).toHaveLength(2);
    });

    it('should return disponible=true for empty ingredients array', async () => {
      const result = await laboratorioService.validateInventoryAvailability([]);

      expect(result.disponible).toBe(true);
      expect(result.ingredientes_insuficientes).toHaveLength(0);
    });

    it('should throw error if inventory item not found', async () => {
      const ingredientes = [
        { inventario_id: 999, cantidad: 10 }
      ];

      inventarioRepository.findById.mockResolvedValue(null);

      await expect(laboratorioService.validateInventoryAvailability(ingredientes))
        .rejects.toThrow('Inventory item with ID 999 not found');
    });

    it('should handle exact quantity match', async () => {
      const ingredientes = [
        { inventario_id: 1, cantidad: 50 }
      ];

      inventarioRepository.findById.mockResolvedValue({
        id: 1,
        nombre: 'Rosas',
        cantidad: 50,
        unidad: 'unidades'
      });

      const result = await laboratorioService.validateInventoryAvailability(ingredientes);

      expect(result.disponible).toBe(true);
      expect(result.ingredientes_insuficientes).toHaveLength(0);
    });
  });

  describe('saveArrangement', () => {
    it('should create product and save recipe successfully', async () => {
      const arrangementData = {
        nombre: 'Arreglo Especial',
        categoria: 'Arreglos',
        precio: 150,
        costo: 100,
        descripcion: 'Un arreglo hermoso',
        imagen_url: 'http://example.com/image.jpg',
        receta: [
          { inventario_id: 1, cantidad: 10 },
          { inventario_id: 2, cantidad: 5 }
        ]
      };

      // Mock inventory availability check
      inventarioRepository.findById
        .mockResolvedValueOnce({ id: 1, cantidad: 50, unidad: 'unidades' })
        .mockResolvedValueOnce({ id: 2, cantidad: 20, unidad: 'unidades' });

      // Mock product creation
      const mockProducto = {
        id: 1,
        nombre: 'Arreglo Especial',
        categoria: 'Arreglos',
        precio: 150,
        costo: 100,
        tiene_receta: true
      };
      productosRepository.create.mockResolvedValue(mockProducto);

      // Mock recipe save
      const mockReceta = [
        { id: 1, producto_id: 1, inventario_id: 1, cantidad: 10 },
        { id: 2, producto_id: 1, inventario_id: 2, cantidad: 5 }
      ];
      productosRepository.saveRecipe.mockResolvedValue(mockReceta);

      const result = await laboratorioService.saveArrangement(arrangementData);

      expect(result.producto).toEqual(mockProducto);
      expect(result.receta).toEqual(mockReceta);
      expect(productosRepository.create).toHaveBeenCalledWith({
        nombre: 'Arreglo Especial',
        categoria: 'Arreglos',
        precio: 150,
        costo: 100,
        descripcion: 'Un arreglo hermoso',
        imagen_url: 'http://example.com/image.jpg',
        tiene_receta: true,
        activo: true
      });
      expect(productosRepository.saveRecipe).toHaveBeenCalledWith(1, arrangementData.receta);
    });

    it('should throw error if required fields are missing', async () => {
      const arrangementData = {
        nombre: 'Arreglo Especial',
        categoria: 'Arreglos'
        // Missing precio, costo, receta
      };

      await expect(laboratorioService.saveArrangement(arrangementData))
        .rejects.toThrow('Missing required fields');
    });

    it('should throw error if receta is empty', async () => {
      const arrangementData = {
        nombre: 'Arreglo Especial',
        categoria: 'Arreglos',
        precio: 150,
        costo: 100,
        receta: []
      };

      await expect(laboratorioService.saveArrangement(arrangementData))
        .rejects.toThrow('Recipe must be a non-empty array');
    });

    it('should throw error if inventory is insufficient', async () => {
      const arrangementData = {
        nombre: 'Arreglo Especial',
        categoria: 'Arreglos',
        precio: 150,
        costo: 100,
        receta: [
          { inventario_id: 1, cantidad: 100 }
        ]
      };

      // Mock insufficient inventory
      inventarioRepository.findById.mockResolvedValue({
        id: 1,
        nombre: 'Rosas',
        cantidad: 50,
        unidad: 'unidades'
      });

      await expect(laboratorioService.saveArrangement(arrangementData))
        .rejects.toThrow('Insufficient inventory for one or more ingredients');
    });

    it('should handle optional fields correctly', async () => {
      const arrangementData = {
        nombre: 'Arreglo Simple',
        categoria: 'Ramos',
        precio: 80,
        costo: 50,
        receta: [
          { inventario_id: 1, cantidad: 5 }
        ]
        // No descripcion or imagen_url
      };

      inventarioRepository.findById.mockResolvedValue({
        id: 1,
        cantidad: 50,
        unidad: 'unidades'
      });

      const mockProducto = { id: 1, nombre: 'Arreglo Simple' };
      productosRepository.create.mockResolvedValue(mockProducto);
      productosRepository.saveRecipe.mockResolvedValue([]);

      await laboratorioService.saveArrangement(arrangementData);

      expect(productosRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          descripcion: null,
          imagen_url: null
        })
      );
    });
  });
});
