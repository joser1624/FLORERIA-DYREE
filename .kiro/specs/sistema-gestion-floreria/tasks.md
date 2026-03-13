# Plan de Implementación: Sistema de Gestión de Florería "Encantos Eternos"

## Descripción General

Este plan cubre la implementación completa del sistema de gestión de florería, incluyendo:
- Backend API REST con Node.js + Express.js
- Base de datos PostgreSQL con 11 tablas, triggers y funciones
- Frontend público (index.html) para clientes
- Panel administrativo (dashboard.html) para gestión interna
- Sistema de autenticación JWT
- Laboratorio de flores para arreglos personalizados
- Control automático de inventario
- Integración con WhatsApp
- Dashboard con KPIs y reportes

## Tareas

- [x] 1. Configuración inicial del proyecto
  - Crear estructura de directorios (backend/, frontend/, database/)
  - Inicializar proyecto Node.js con package.json
  - Instalar dependencias: express, pg, bcrypt, jsonwebtoken, dotenv, cors
  - Instalar dependencias de desarrollo: jest, supertest, fast-check, eslint, nodemon
  - Crear archivo .env.example con variables requeridas
  - Configurar ESLint para el proyecto
  - _Requisitos: 21.5, 24.5_

- [x] 2. Configuración de base de datos PostgreSQL
  - [x] 2.1 Crear schema de base de datos
    - Crear archivo database/schema.sql con definición de 11 tablas
    - Definir tabla usuarios con roles y autenticación
    - Definir tabla trabajadores con información de empleados
    - Definir tabla clientes con historial de compras
    - Definir tabla productos con categorías y márgenes calculados
    - Definir tabla inventario con alertas de stock
    - Definir tabla receta_arreglo para composición de productos
    - Definir tabla pedidos con estados y fechas
    - Definir tabla historial_estados_pedido para auditoría
    - Definir tabla ventas con métodos de pago
    - Definir tabla detalle_ventas para tracking de inventario
    - Definir tabla gastos con categorías
    - Crear índices para columnas frecuentemente consultadas
    - Definir foreign keys con ON DELETE apropiados
    - _Requisitos: 21.1, 21.2, 21.3, 21.4_


  - [x] 2.2 Escribir property test para schema de base de datos
    - **Property 31: Password Hashing**
    - **Valida: Requisitos 23.1**

  - [x] 2.3 Crear triggers y funciones de base de datos
    - Crear función actualizar_inventario_venta() para decrementar stock
    - Crear trigger trigger_actualizar_inventario en tabla ventas
    - Crear función crear_venta_pedido_entregado() para conversión automática
    - Crear trigger trigger_venta_pedido_entregado en tabla pedidos
    - Crear función registrar_historial_estado() para auditoría
    - Crear trigger trigger_historial_estado en tabla pedidos
    - Crear función actualizar_total_compras_cliente() para totales
    - Crear trigger trigger_total_compras en tabla pedidos
    - _Requisitos: 5.7, 6.5, 17.2, 18.5_

  - [x] 2.4 Escribir tests para triggers de base de datos
    - Test de actualización de inventario al crear venta
    - Test de creación de venta al marcar pedido como entregado
    - Test de registro de historial de estados
    - Test de actualización de total_compras del cliente

  - [x] 2.5 Crear archivo de datos de prueba (seed data)
    - Crear database/seed.sql con datos de ejemplo
    - Incluir usuarios de prueba con diferentes roles
    - Incluir productos de ejemplo en todas las categorías
    - Incluir items de inventario con diferentes estados
    - Incluir clientes y trabajadores de ejemplo
    - _Requisitos: 21.5_

- [x] 3. Implementar módulo de conexión a base de datos
  - Crear backend/config/database.js para configuración de conexión
  - Leer parámetros de conexión desde variables de entorno
  - Implementar pool de conexiones con pg
  - Validar conexión al iniciar la aplicación
  - Implementar logging de errores de conexión
  - Implementar manejo de desconexión y reconexión
  - _Requisitos: 21.6, 21.7, 24.1_

- [x] 4. Implementar servidor Express y middleware base
  - Crear backend/server.js con configuración de Express
  - Configurar CORS para permitir requests desde frontend
  - Configurar body-parser para JSON
  - Configurar headers de seguridad (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
  - Implementar middleware de logging de requests
  - Implementar middleware de manejo de errores global
  - Configurar puerto desde variable de entorno con default 3000
  - _Requisitos: 22.5, 23.5, 24.2, 25.3_


- [ ] 5. Implementar módulo de autenticación
  - [x] 5.1 Crear utilidades de autenticación
    - Crear backend/utils/auth.js con funciones de bcrypt y JWT
    - Implementar función hashPassword() usando bcrypt
    - Implementar función comparePassword() para validación
    - Implementar función generateToken() para crear JWT
    - Implementar función verifyToken() para validar JWT
    - Leer JWT_SECRET desde variable de entorno
    - _Requisitos: 1.2, 23.1, 24.3_

  - [x] 5.2 Escribir property tests para autenticación
    - **Property 1: Authentication Token Generation**
    - **Valida: Requisitos 1.2**
    - **Property 2: Authentication Rejection**
    - **Valida: Requisitos 1.3**

  - [x] 5.3 Crear middleware de autenticación
    - Crear backend/middleware/auth.js
    - Implementar middleware authenticateToken() que valida JWT
    - Extraer token del header Authorization
    - Verificar token y adjuntar usuario a req.user
    - Retornar 401 si token es inválido o ausente
    - _Requisitos: 1.5, 1.6_

  - [x] 5.4 Escribir property test para protección de endpoints
    - **Property 3: Protected Endpoints Require Authentication**
    - **Valida: Requisitos 1.5**

  - [x] 5.4 Implementar endpoints de autenticación
    - Crear backend/routes/auth.js
    - Implementar POST /api/v1/auth/login
    - Validar credenciales contra tabla usuarios
    - Retornar token JWT y datos de usuario
    - Implementar POST /api/v1/auth/logout
    - Implementar GET /api/v1/auth/verify para validar token
    - Registrar intentos de autenticación en logs
    - _Requisitos: 1.1, 1.2, 1.3, 25.1_

  - [x] 5.5 Escribir unit tests para endpoints de autenticación
    - Test de login exitoso con credenciales válidas
    - Test de login fallido con credenciales inválidas
    - Test de verificación de token válido
    - Test de verificación de token expirado

- [x] 6. Checkpoint - Verificar autenticación
  - Asegurar que todos los tests pasen, preguntar al usuario si surgen dudas.


- [ ] 7. Implementar módulo de productos
  - [x] 7.1 Crear repositorio de productos
    - Crear backend/repositories/productosRepository.js
    - Implementar función findAll() con filtros de categoría y activo
    - Implementar función findById() que incluye receta si existe
    - Implementar función create() para insertar producto
    - Implementar función update() para modificar producto
    - Implementar función softDelete() que marca activo=false
    - Implementar función saveRecipe() para guardar receta_arreglo
    - _Requisitos: 2.1, 2.3, 2.8_

  - [x] 7.2 Escribir property tests para productos
    - **Property 4: Product Creation Round-Trip**
    - **Valida: Requisitos 2.3**
    - **Property 5: Profit Margin Calculation**
    - **Valida: Requisitos 2.4**
    - **Property 6: Soft Delete Preservation**
    - **Valida: Requisitos 2.8**

  - [x] 7.3 Implementar endpoints de productos
    - Crear backend/routes/productos.js
    - Implementar GET /api/v1/productos con query params
    - Implementar GET /api/v1/productos/:id
    - Implementar POST /api/v1/productos con validación
    - Validar que precio > costo antes de crear/actualizar
    - Implementar PUT /api/v1/productos/:id
    - Implementar DELETE /api/v1/productos/:id (soft delete)
    - Proteger endpoints con middleware authenticateToken
    - _Requisitos: 2.1, 2.2, 2.3, 2.7, 15.1_

  - [x] 7.4 Escribir property test para validación de precio
    - **Property 20: Price Greater Than Cost Validation**
    - **Valida: Requisitos 15.1**

  - [~] 7.5 Escribir unit tests para módulo de productos
    - Test de creación de producto con datos válidos
    - Test de rechazo de producto con precio <= costo
    - Test de actualización de producto
    - Test de soft delete
    - Test de filtrado por categoría

- [ ] 8. Implementar módulo de inventario
  - [~] 8.1 Crear repositorio de inventario
    - Crear backend/repositories/inventarioRepository.js
    - Implementar función findAll() con filtro de estado
    - Implementar función findById()
    - Implementar función create() para insertar item
    - Implementar función update() para modificar item
    - Implementar función delete() para eliminar item
    - Implementar función getAlerts() para items con stock bajo
    - Implementar función decrementQuantity() para actualizar stock
    - _Requisitos: 3.1, 3.3, 3.4_


  - [~] 8.2 Escribir property tests para inventario
    - **Property 7: Low Stock Alert Generation**
    - **Valida: Requisitos 3.4**
    - **Property 21: Non-Negative Quantity Validation**
    - **Valida: Requisitos 15.2**

  - [~] 8.3 Implementar endpoints de inventario
    - Crear backend/routes/inventario.js
    - Implementar GET /api/v1/inventario con query params
    - Implementar GET /api/v1/inventario/:id
    - Implementar POST /api/v1/inventario con validación
    - Validar que cantidad >= 0 antes de crear/actualizar
    - Implementar PUT /api/v1/inventario/:id
    - Implementar DELETE /api/v1/inventario/:id
    - Implementar GET /api/v1/inventario/alertas
    - Proteger endpoints con middleware authenticateToken
    - _Requisitos: 3.1, 3.2, 3.4, 15.2_

  - [~] 8.4 Escribir unit tests para módulo de inventario
    - Test de creación de item de inventario
    - Test de rechazo de cantidad negativa
    - Test de generación de alertas de stock bajo
    - Test de cálculo de estado (ok/bajo/crítico)

- [ ] 9. Implementar módulo de laboratorio de flores
  - [~] 9.1 Crear servicio de laboratorio
    - Crear backend/services/laboratorioService.js
    - Implementar función calculateCost() que suma ingredientes
    - Implementar función calculateSuggestedPrice() con margen
    - Implementar función validateInventoryAvailability()
    - Implementar función saveArrangement() que crea producto y receta
    - _Requisitos: 4.3, 4.5, 4.7, 4.9, 16.1, 16.3_

  - [~] 9.2 Escribir property tests para laboratorio
    - **Property 10: Arrangement Cost Calculation**
    - **Valida: Requisitos 4.3, 16.1**
    - **Property 11: Suggested Price Calculation**
    - **Valida: Requisitos 4.5, 16.3**
    - **Property 12: Arrangement Recipe Persistence**
    - **Valida: Requisitos 4.8**
    - **Property 13: Arrangement Validation Against Inventory**
    - **Valida: Requisitos 4.9**

  - [~] 9.3 Implementar endpoints de laboratorio
    - Crear backend/routes/laboratorio.js
    - Implementar POST /api/v1/laboratorio/calcular
    - Validar disponibilidad de inventario
    - Retornar costo total y precio sugerido
    - Implementar POST /api/v1/laboratorio/guardar-arreglo
    - Crear producto y guardar receta en transacción
    - Proteger endpoints con middleware authenticateToken
    - _Requisitos: 4.3, 4.4, 4.5, 4.7, 4.9_


  - [~] 9.4 Escribir unit tests para módulo de laboratorio
    - Test de cálculo de costo con múltiples ingredientes
    - Test de cálculo de precio sugerido con margen
    - Test de validación de inventario insuficiente
    - Test de guardado de arreglo con receta

- [ ] 10. Checkpoint - Verificar productos, inventario y laboratorio
  - Asegurar que todos los tests pasen, preguntar al usuario si surgen dudas.

- [ ] 11. Implementar módulo de pedidos
  - [~] 11.1 Crear repositorio de pedidos
    - Crear backend/repositories/pedidosRepository.js
    - Implementar función findAll() con filtros de estado, fecha y cliente
    - Implementar función findById() que incluye historial de estados
    - Implementar función create() para insertar pedido
    - Implementar función update() para modificar pedido
    - Implementar función updateStatus() para cambiar estado
    - Implementar función delete() para eliminar pedido
    - Implementar función countPending() para contar pendientes
    - _Requisitos: 5.1, 5.2, 5.6, 5.8, 5.9_

  - [~] 11.2 Escribir property tests para pedidos
    - **Property 14: Order Initial State**
    - **Valida: Requisitos 5.4**
    - **Property 15: Order to Sale Conversion**
    - **Valida: Requisitos 5.7, 18.7**
    - **Property 16: Pending Orders Count Accuracy**
    - **Valida: Requisitos 5.8**
    - **Property 17: Order Filtering**
    - **Valida: Requisitos 5.9**
    - **Property 27: Valid State Transitions**
    - **Valida: Requisitos 18.1, 18.2, 18.3**

  - [~] 11.3 Implementar servicio de gestión de estados
    - Crear backend/services/pedidosService.js
    - Implementar función validateStateTransition()
    - Validar transiciones: pendiente → preparando → listo → entregado
    - Permitir transición a cancelado desde cualquier estado
    - Retornar error para transiciones inválidas
    - _Requisitos: 18.1, 18.2, 18.3_

  - [~] 11.4 Implementar endpoints de pedidos
    - Crear backend/routes/pedidos.js
    - Implementar GET /api/v1/pedidos con query params
    - Implementar GET /api/v1/pedidos/:id
    - Implementar POST /api/v1/pedidos con validación
    - Validar que fecha_entrega no esté en el pasado
    - Establecer estado inicial como 'pendiente'
    - Implementar PUT /api/v1/pedidos/:id
    - Validar transiciones de estado antes de actualizar
    - Implementar DELETE /api/v1/pedidos/:id
    - Implementar GET /api/v1/pedidos/pendientes/count
    - Proteger endpoints con middleware authenticateToken
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8, 15.4, 18.3_


  - [~] 11.5 Escribir property test para validación de fecha
    - **Property 22: Future Delivery Date Validation**
    - **Valida: Requisitos 15.4**

  - [~] 11.6 Escribir property test para timestamp de cambio de estado
    - **Property 28: State Change Timestamp Recording**
    - **Valida: Requisitos 18.5**

  - [~] 11.7 Escribir unit tests para módulo de pedidos
    - Test de creación de pedido con estado inicial pendiente
    - Test de transición válida de estado
    - Test de rechazo de transición inválida
    - Test de conteo de pedidos pendientes
    - Test de filtrado por estado y fecha

- [ ] 12. Implementar módulo de ventas
  - [~] 12.1 Crear repositorio de ventas
    - Crear backend/repositories/ventasRepository.js
    - Implementar función findAll() con filtros de fecha y trabajador
    - Implementar función findById() que incluye detalles
    - Implementar función create() para insertar venta
    - Implementar función getDailyTotal() para totales diarios
    - Implementar función getMonthlyTotal() para totales mensuales
    - _Requisitos: 6.1, 6.2, 6.7, 6.8_

  - [~] 12.2 Escribir property tests para ventas
    - **Property 8: Inventory Decrement on Sale**
    - **Valida: Requisitos 3.6, 6.5, 17.2**
    - **Property 9: Sale Rejection for Insufficient Inventory**
    - **Valida: Requisitos 3.7, 15.3, 17.4**
    - **Property 18: Daily Sales Total Calculation**
    - **Valida: Requisitos 6.7**
    - **Property 19: Monthly Sales Total Calculation**
    - **Valida: Requisitos 6.8**
    - **Property 26: Sale Transaction Atomicity**
    - **Valida: Requisitos 17.5, 17.6**

  - [~] 12.3 Crear servicio de ventas con transacciones
    - Crear backend/services/ventasService.js
    - Implementar función createSaleWithInventoryUpdate()
    - Iniciar transacción de base de datos
    - Validar inventario suficiente antes de crear venta
    - Crear registro en tabla ventas
    - Obtener receta del producto
    - Decrementar inventario según receta
    - Registrar en detalle_ventas
    - Commit de transacción si todo es exitoso
    - Rollback de transacción en caso de error
    - _Requisitos: 6.5, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_


  - [~] 12.4 Implementar endpoints de ventas
    - Crear backend/routes/ventas.js
    - Implementar GET /api/v1/ventas con query params
    - Implementar GET /api/v1/ventas/:id
    - Implementar POST /api/v1/ventas
    - Validar inventario suficiente antes de crear
    - Llamar a servicio de ventas con transacción
    - Implementar GET /api/v1/ventas/totales/dia
    - Implementar GET /api/v1/ventas/totales/mes
    - Proteger endpoints con middleware authenticateToken
    - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.7, 6.8_

  - [~] 12.5 Escribir unit tests para módulo de ventas
    - Test de creación de venta con actualización de inventario
    - Test de rechazo de venta por inventario insuficiente
    - Test de rollback en caso de error
    - Test de cálculo de totales diarios
    - Test de cálculo de totales mensuales

- [ ] 13. Implementar módulo de clientes
  - [~] 13.1 Crear repositorio de clientes
    - Crear backend/repositories/clientesRepository.js
    - Implementar función findAll() con búsqueda por nombre
    - Implementar función findById() que incluye historial de compras
    - Implementar función create() para insertar cliente
    - Implementar función update() para modificar cliente
    - Implementar función delete() para eliminar cliente
    - Implementar función getTotalPurchases() para calcular total
    - _Requisitos: 7.1, 7.2, 7.3, 7.4, 7.6_

  - [~] 13.2 Escribir property test para validación de teléfono
    - **Property 23: Phone Number Format Validation**
    - **Valida: Requisitos 15.5**

  - [~] 13.3 Implementar endpoints de clientes
    - Crear backend/routes/clientes.js
    - Implementar GET /api/v1/clientes con query params
    - Implementar GET /api/v1/clientes/:id
    - Implementar POST /api/v1/clientes con validación
    - Validar formato de teléfono antes de crear/actualizar
    - Implementar PUT /api/v1/clientes/:id
    - Implementar DELETE /api/v1/clientes/:id
    - Proteger endpoints con middleware authenticateToken
    - _Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5, 15.5_

  - [~] 13.4 Escribir unit tests para módulo de clientes
    - Test de creación de cliente
    - Test de validación de formato de teléfono
    - Test de búsqueda por nombre
    - Test de cálculo de total de compras


- [ ] 14. Implementar módulo de trabajadores
  - [~] 14.1 Crear repositorio de trabajadores
    - Crear backend/repositories/trabajadoresRepository.js
    - Implementar función findAll()
    - Implementar función findById() que incluye historial de ventas
    - Implementar función create() para insertar trabajador
    - Implementar función update() para modificar trabajador
    - Implementar función delete() para eliminar trabajador
    - Implementar función getTotalSales() para calcular total
    - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.6_

  - [~] 14.2 Implementar endpoints de trabajadores
    - Crear backend/routes/trabajadores.js
    - Implementar GET /api/v1/trabajadores
    - Implementar GET /api/v1/trabajadores/:id
    - Implementar POST /api/v1/trabajadores con validación
    - Validar formato de teléfono antes de crear/actualizar
    - Implementar PUT /api/v1/trabajadores/:id
    - Implementar DELETE /api/v1/trabajadores/:id
    - Proteger endpoints con middleware authenticateToken
    - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5, 15.5_

  - [~] 14.3 Escribir unit tests para módulo de trabajadores
    - Test de creación de trabajador
    - Test de validación de formato de teléfono
    - Test de cálculo de total de ventas

- [ ] 15. Implementar módulo de gastos
  - [~] 15.1 Crear repositorio de gastos
    - Crear backend/repositories/gastosRepository.js
    - Implementar función findAll() con filtros de fecha y categoría
    - Implementar función findById()
    - Implementar función create() para insertar gasto
    - Implementar función update() para modificar gasto
    - Implementar función delete() para eliminar gasto
    - Implementar función getTotalByPeriod() para totales
    - Implementar función getTotalByCategory() para totales por categoría
    - _Requisitos: 9.1, 9.2, 9.3, 9.5_

  - [~] 15.2 Implementar endpoints de gastos
    - Crear backend/routes/gastos.js
    - Implementar GET /api/v1/gastos con query params
    - Implementar GET /api/v1/gastos/:id
    - Implementar POST /api/v1/gastos con validación
    - Implementar PUT /api/v1/gastos/:id
    - Implementar DELETE /api/v1/gastos/:id
    - Implementar GET /api/v1/gastos/totales
    - Proteger endpoints con middleware authenticateToken
    - _Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [~] 15.3 Escribir unit tests para módulo de gastos
    - Test de creación de gasto
    - Test de filtrado por categoría
    - Test de cálculo de totales por período


- [ ] 16. Checkpoint - Verificar módulos de negocio
  - Asegurar que todos los tests pasen, preguntar al usuario si surgen dudas.

- [ ] 17. Implementar módulo de reportes
  - [~] 17.1 Crear servicio de reportes
    - Crear backend/services/reportesService.js
    - Implementar función getSalesReport() con filtros de fecha
    - Calcular total_ventas, total_costos y ganancia_bruta
    - Implementar función getBestSellingProducts()
    - Ordenar productos por cantidad vendida descendente
    - Implementar función getSalesByWorker()
    - Ordenar trabajadores por total de ventas descendente
    - Implementar función getNetProfit()
    - Calcular ganancia_neta = total_ventas - total_costos - total_gastos
    - Calcular margen_neto = ganancia_neta / total_ventas * 100
    - _Requisitos: 11.1, 11.2, 11.3, 11.5, 11.6, 11.7, 9.6_

  - [~] 17.2 Implementar endpoints de reportes
    - Crear backend/routes/reportes.js
    - Implementar GET /api/v1/reportes/ventas
    - Implementar GET /api/v1/reportes/productos-mas-vendidos
    - Implementar GET /api/v1/reportes/ventas-por-trabajador
    - Implementar GET /api/v1/reportes/ganancia-neta
    - Proteger endpoints con middleware authenticateToken
    - _Requisitos: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [~] 17.3 Escribir unit tests para módulo de reportes
    - Test de reporte de ventas por período
    - Test de productos más vendidos
    - Test de ventas por trabajador
    - Test de cálculo de ganancia neta

- [ ] 18. Implementar middleware de validación y manejo de errores
  - [~] 18.1 Crear middleware de validación
    - Crear backend/middleware/validation.js
    - Implementar función validateProduct() para productos
    - Implementar función validateInventoryItem() para inventario
    - Implementar función validateOrder() para pedidos
    - Implementar función validateSale() para ventas
    - Implementar función validateClient() para clientes
    - Implementar función validateWorker() para trabajadores
    - Implementar función validateExpense() para gastos
    - Sanitizar inputs para prevenir SQL injection
    - _Requisitos: 15.1, 15.2, 15.3, 15.4, 15.5, 23.2_

  - [~] 18.2 Escribir property tests para validación
    - **Property 24: Validation Error Response Format**
    - **Valida: Requisitos 15.6**
    - **Property 32: SQL Injection Prevention**
    - **Valida: Requisitos 23.2**


  - [~] 18.3 Crear middleware de manejo de errores
    - Crear backend/middleware/errorHandler.js
    - Implementar función errorHandler() para capturar errores
    - Retornar formato JSON consistente con success, error, code, message
    - Mapear errores a códigos HTTP apropiados
    - 400 para errores de validación
    - 401 para errores de autenticación
    - 403 para errores de autorización
    - 404 para recursos no encontrados
    - 409 para conflictos (inventario insuficiente, transiciones inválidas)
    - 500 para errores internos
    - Registrar errores en logs con stack trace
    - No exponer información sensible en mensajes de error
    - _Requisitos: 20.1, 20.2, 20.6, 20.7, 22.4, 25.4_

  - [~] 18.4 Escribir property tests para manejo de errores
    - **Property 29: JSON Response Format**
    - **Valida: Requisitos 22.3**
    - **Property 30: HTTP Status Code Appropriateness**
    - **Valida: Requisitos 22.4**
    - **Property 33: Sensitive Data Exclusion from Logs**
    - **Valida: Requisitos 23.6**

  - [~] 18.5 Escribir unit tests para manejo de errores
    - Test de formato de respuesta de error
    - Test de códigos HTTP apropiados
    - Test de logging de errores

- [ ] 19. Implementar sistema de logging
  - [~] 19.1 Configurar Winston para logging
    - Crear backend/config/logger.js
    - Configurar niveles de log: ERROR, WARN, INFO, DEBUG
    - Configurar transporte a consola para desarrollo
    - Configurar transporte a archivo para producción
    - Implementar rotación diaria de archivos de log
    - Retener logs por 30 días
    - _Requisitos: 25.5, 25.6_

  - [~] 19.2 Implementar logging en módulos
    - Registrar intentos de autenticación con username y timestamp
    - Registrar operaciones de base de datos con query type y tiempo
    - Registrar requests de API con método, endpoint, status y tiempo
    - Registrar errores con stack trace y contexto
    - No registrar contraseñas ni tokens en logs
    - _Requisitos: 25.1, 25.2, 25.3, 25.4, 23.6_

  - [~] 19.3 Escribir unit tests para sistema de logging
    - Test de logging de autenticación
    - Test de logging de requests
    - Test de exclusión de datos sensibles


- [ ] 20. Implementar rate limiting y seguridad adicional
  - [~] 20.1 Configurar rate limiting
    - Instalar express-rate-limit
    - Crear backend/middleware/rateLimiter.js
    - Configurar límite de 100 requests por 15 minutos por IP
    - Aplicar rate limiting más estricto a endpoint de login (5 intentos por 15 minutos)
    - _Requisitos: 23.3_

  - [~] 20.2 Implementar middleware de seguridad adicional
    - Instalar helmet
    - Configurar helmet para headers de seguridad
    - Implementar sanitización de inputs adicional
    - Configurar HTTPS en producción (documentar en README)
    - _Requisitos: 23.2, 23.4, 23.5_

  - [~] 20.3 Escribir tests de seguridad
    - Test de rate limiting en login
    - Test de headers de seguridad
    - Test de prevención de SQL injection

- [ ] 21. Checkpoint - Verificar backend completo
  - Asegurar que todos los tests pasen, preguntar al usuario si surgen dudas.

- [ ] 22. Implementar Frontend Público (index.html)
  - [~] 22.1 Crear estructura HTML base
    - Crear index.html con estructura semántica
    - Incluir Bootstrap 5 desde CDN
    - Crear navbar con logo, navegación y botones
    - Crear hero section con llamados a acción
    - Crear sección de eventos
    - Crear sección de sorpresas
    - Crear sección de promociones
    - Crear sección de catálogo completo con filtros
    - Crear footer con información de contacto
    - _Requisitos: 2.5, 13.1_

  - [~] 22.2 Implementar estilos CSS personalizados
    - Crear frontend/css/styles.css
    - Definir variables CSS para colores de marca
    - Implementar estilos para cards de productos
    - Implementar estilos para botones de WhatsApp
    - Implementar estilos para filtros de categoría
    - Asegurar diseño responsive con media queries
    - _Requisitos: 19.1, 19.5_

  - [~] 22.3 Implementar JavaScript para catálogo
    - Crear frontend/js/catalog.js
    - Implementar función fetchProducts() para obtener productos de API
    - Implementar función renderProducts() para mostrar productos
    - Implementar función filterByCategory() para filtrado client-side
    - Implementar event listeners para botones de filtro
    - Destacar filtro activo visualmente
    - _Requisitos: 2.5, 13.2, 13.3, 13.4, 13.5, 13.6_


  - [~] 22.4 Implementar integración con WhatsApp
    - Crear frontend/js/whatsapp.js
    - Implementar función generateWhatsAppMessage() para productos
    - Implementar función generateWhatsAppLink() con formato wa.me
    - Codificar caracteres especiales según URL encoding
    - Leer número de WhatsApp desde configuración
    - Agregar event listeners a botones de WhatsApp
    - _Requisitos: 12.1, 12.2, 12.5, 12.6_

  - [~] 22.5 Implementar Laboratorio de Flores en frontend público
    - Crear frontend/js/laboratorio.js
    - Implementar función fetchInventory() para obtener inventario disponible
    - Implementar función renderInventoryItems() para mostrar flores y materiales
    - Implementar función addIngredient() para agregar a selección
    - Implementar función calculateCost() para cálculo en tiempo real
    - Implementar función generateArrangementMessage() para WhatsApp
    - Mostrar precio estimado al cliente
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 12.3_

  - [~] 22.6 Implementar modal de login
    - Crear modal de login en index.html
    - Implementar función login() para autenticación
    - Guardar token JWT en localStorage
    - Redirigir a dashboard.html si login es exitoso
    - Mostrar mensajes de error si login falla
    - _Requisitos: 1.1, 1.2, 1.3_

  - [~] 22.7 Implementar responsive design para móviles
    - Ajustar grid de productos para diferentes tamaños de pantalla
    - Apilar cards verticalmente en móviles
    - Asegurar touch targets de al menos 44x44 pixels
    - Probar en diferentes resoluciones (320px - 1920px)
    - _Requisitos: 19.1, 19.3, 19.5, 19.6_

- [ ] 23. Implementar Panel Administrativo (dashboard.html)
  - [~] 23.1 Crear estructura HTML base del dashboard
    - Crear dashboard.html con estructura de sidebar + main content
    - Crear sidebar con navegación por secciones
    - Crear topbar con título, fecha, notificaciones y WhatsApp
    - Crear sección de dashboard con KPIs
    - Crear secciones para: pedidos, ventas, productos, inventario, clientes, trabajadores, gastos, reportes, usuarios
    - Incluir Bootstrap 5 y Chart.js desde CDN
    - _Requisitos: 10.1, 10.2, 10.3, 10.4_

  - [~] 23.2 Implementar estilos CSS del dashboard
    - Crear frontend/css/dashboard.css
    - Implementar estilos para sidebar y navegación
    - Implementar estilos para cards de KPIs
    - Implementar estilos para tablas de datos
    - Implementar estilos para modales de formularios
    - Implementar estilos para notificaciones toast
    - Asegurar diseño responsive (colapsar sidebar en móviles)
    - _Requisitos: 19.2, 19.4_


  - [~] 23.3 Implementar JavaScript base del dashboard
    - Crear frontend/js/dashboard.js
    - Implementar función checkAuth() para validar token
    - Redirigir a index.html si no hay token válido
    - Implementar función logout() para cerrar sesión
    - Implementar función showSection() para navegación entre secciones
    - Implementar función showNotification() para mensajes toast
    - Implementar auto-logout después de 30 minutos de inactividad
    - _Requisitos: 1.5, 1.6, 20.3, 20.4, 23.7_

  - [~] 23.4 Implementar módulo de Dashboard con KPIs
    - Crear frontend/js/modules/dashboardKPIs.js
    - Implementar función fetchDailyTotal() para ventas del día
    - Implementar función fetchMonthlyTotal() para ventas del mes
    - Implementar función fetchPendingOrders() para pedidos pendientes
    - Implementar función fetchNetProfit() para ganancia neta
    - Implementar función calculatePercentageChange() para comparación con período anterior
    - Implementar función renderKPIs() para mostrar indicadores
    - _Requisitos: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [~] 23.5 Implementar gráficos del dashboard
    - Crear frontend/js/modules/dashboardCharts.js
    - Implementar función renderWeeklySalesChart() con Chart.js
    - Obtener datos de ventas diarias de la semana actual
    - Implementar función renderTopProductsChart() con Chart.js
    - Obtener top 5 productos más vendidos del mes
    - Configurar colores y estilos de gráficos
    - _Requisitos: 10.6, 10.7_

  - [~] 23.6 Implementar módulo de gestión de pedidos
    - Crear frontend/js/modules/pedidos.js
    - Implementar función fetchOrders() con filtros
    - Implementar función renderOrdersTable() para mostrar pedidos
    - Implementar función filterOrders() por estado
    - Implementar función searchOrders() por nombre de cliente
    - Implementar función updateOrderStatus() para cambiar estado
    - Mostrar botones de estado apropiados según estado actual
    - Implementar función showOrderHistory() para historial de estados
    - Mostrar badge con conteo de pedidos pendientes
    - _Requisitos: 5.5, 5.6, 5.8, 14.2, 14.3, 14.4, 14.5, 18.4, 18.6_

  - [~] 23.7 Implementar módulo de gestión de ventas
    - Crear frontend/js/modules/ventas.js
    - Implementar función fetchSales() para obtener ventas
    - Implementar función renderSalesTable() para mostrar ventas
    - Implementar función showSaleForm() para modal de nueva venta
    - Implementar función createSale() para registrar venta
    - Validar inventario suficiente antes de enviar
    - Mostrar mensaje de error si inventario insuficiente
    - Actualizar KPIs después de crear venta
    - _Requisitos: 6.6, 17.7_


  - [~] 23.8 Implementar módulo de gestión de productos
    - Crear frontend/js/modules/productos.js
    - Implementar función fetchProducts() para obtener productos
    - Implementar función renderProductsTable() para mostrar productos
    - Implementar función searchProducts() por nombre
    - Implementar función showProductForm() para modal de crear/editar
    - Implementar función createProduct() para crear producto
    - Implementar función updateProduct() para actualizar producto
    - Implementar función deleteProduct() para eliminar (soft delete)
    - Validar que precio > costo antes de enviar
    - Mostrar costo, precio, margen y stock en tabla
    - _Requisitos: 2.6, 2.7, 14.1_

  - [~] 23.9 Implementar módulo de gestión de inventario
    - Crear frontend/js/modules/inventario.js
    - Implementar función fetchInventory() para obtener inventario
    - Implementar función renderInventoryTable() para mostrar items
    - Implementar función showInventoryForm() para modal de crear/editar
    - Implementar función createInventoryItem() para crear item
    - Implementar función updateInventoryItem() para actualizar item
    - Implementar función deleteInventoryItem() para eliminar item
    - Mostrar indicadores de estado con colores (OK verde, Bajo amarillo, Crítico rojo)
    - Mostrar alertas de stock bajo en topbar
    - _Requisitos: 3.5_

  - [~] 23.10 Implementar Laboratorio de Flores en dashboard
    - Crear frontend/js/modules/laboratorioAdmin.js
    - Reutilizar lógica de laboratorio del frontend público
    - Implementar función saveArrangementAsProduct() para guardar como producto
    - Enviar receta completa al backend
    - Mostrar formulario para nombre, categoría, descripción e imagen
    - Actualizar catálogo de productos después de guardar
    - _Requisitos: 4.7, 4.8_

  - [~] 23.11 Implementar módulo de gestión de clientes
    - Crear frontend/js/modules/clientes.js
    - Implementar función fetchClients() para obtener clientes
    - Implementar función renderClientsTable() para mostrar clientes
    - Implementar función showClientForm() para modal de crear/editar
    - Implementar función createClient() para crear cliente
    - Implementar función updateClient() para actualizar cliente
    - Implementar función deleteClient() para eliminar cliente
    - Implementar función showClientHistory() para historial de compras
    - Mostrar nombre, teléfono, email y total de compras en tabla
    - _Requisitos: 7.4, 7.5_

  - [~] 23.12 Implementar módulo de gestión de trabajadores
    - Crear frontend/js/modules/trabajadores.js
    - Implementar función fetchWorkers() para obtener trabajadores
    - Implementar función renderWorkersTable() para mostrar trabajadores
    - Implementar función showWorkerForm() para modal de crear/editar
    - Implementar función createWorker() para crear trabajador
    - Implementar función updateWorker() para actualizar trabajador
    - Implementar función deleteWorker() para eliminar trabajador
    - Implementar función showWorkerHistory() para historial de ventas
    - Mostrar nombre, rol, teléfono y total de ventas en tabla
    - _Requisitos: 8.4, 8.5_


  - [~] 23.13 Implementar módulo de gestión de gastos
    - Crear frontend/js/modules/gastos.js
    - Implementar función fetchExpenses() para obtener gastos
    - Implementar función renderExpensesTable() para mostrar gastos
    - Implementar función showExpenseForm() para modal de crear/editar
    - Implementar función createExpense() para crear gasto
    - Implementar función updateExpense() para actualizar gasto
    - Implementar función deleteExpense() para eliminar gasto
    - Implementar filtros por categoría
    - Mostrar descripción, monto, categoría y fecha en tabla
    - _Requisitos: 9.4_

  - [~] 23.14 Implementar módulo de reportes
    - Crear frontend/js/modules/reportes.js
    - Implementar función showReportForm() para seleccionar tipo y fechas
    - Implementar función generateSalesReport() para reporte de ventas
    - Implementar función generateBestSellingReport() para productos más vendidos
    - Implementar función generateWorkerSalesReport() para ventas por trabajador
    - Implementar función renderReportTable() para mostrar resultados
    - Implementar función exportReport() para exportar a CSV
    - _Requisitos: 11.4, 11.5, 11.6, 11.7, 11.8_

  - [~] 23.15 Implementar módulo de gestión de usuarios
    - Crear frontend/js/modules/usuarios.js
    - Implementar función fetchUsers() para obtener usuarios
    - Implementar función renderUsersTable() para mostrar usuarios
    - Implementar función showUserForm() para modal de crear/editar
    - Implementar función createUser() para crear usuario
    - Implementar función updateUser() para actualizar usuario
    - Implementar función deleteUser() para eliminar usuario
    - No mostrar contraseñas en tabla
    - Validar roles permitidos (Administrador, Empleado, Dueña)
    - _Requisitos: 1.4_

  - [~] 23.16 Implementar manejo de errores en frontend
    - Implementar función handleAPIError() para procesar errores de API
    - Mostrar notificaciones toast para errores (rojo)
    - Mostrar notificaciones toast para éxito (verde)
    - Mostrar notificaciones toast para advertencias (amarillo)
    - Duración: 5 segundos para errores, 3 segundos para éxito
    - Incluir botón de cerrar manual
    - Mostrar mensaje "Connection error. Please try again." para errores de red
    - _Requisitos: 20.3, 20.4, 20.5_

- [ ] 24. Checkpoint - Verificar frontend completo
  - Asegurar que todos los tests pasen, preguntar al usuario si surgen dudas.


- [ ] 25. Implementar tests de integración
  - [~] 25.1 Escribir test de flujo completo de pedido
    - Crear cliente
    - Crear pedido
    - Cambiar estado a preparando
    - Cambiar estado a listo
    - Cambiar estado a entregado
    - Verificar que se creó la venta
    - Verificar que se actualizó el inventario

  - [~] 25.2 Escribir test de flujo de venta directa
    - Crear venta
    - Verificar actualización de inventario
    - Verificar registro en detalle_ventas
    - Verificar totales diarios

  - [~] 25.3 Escribir test de flujo de laboratorio
    - Seleccionar ingredientes
    - Calcular costo
    - Guardar como producto
    - Verificar receta guardada
    - Realizar venta del producto
    - Verificar inventario actualizado

  - [~] 25.4 Escribir test de recálculo de costos
    - **Property 25: Recipe Cost Recalculation on Price Change**
    - **Valida: Requisitos 16.5**

- [ ] 26. Crear documentación del proyecto
  - [~] 26.1 Crear README.md principal
    - Descripción del proyecto
    - Stack tecnológico utilizado
    - Requisitos previos (Node.js, PostgreSQL)
    - Instrucciones de instalación
    - Configuración de variables de entorno
    - Instrucciones para inicializar base de datos
    - Instrucciones para ejecutar en desarrollo
    - Instrucciones para ejecutar tests
    - Estructura de directorios del proyecto
    - _Requisitos: 21.5, 24.5_

  - [~] 26.2 Crear documentación de API
    - Crear docs/API.md con documentación de endpoints
    - Documentar todos los endpoints con ejemplos de request/response
    - Documentar códigos de error y sus significados
    - Documentar headers requeridos (Authorization)
    - Documentar formatos de validación
    - _Requisitos: 22.7_

  - [~] 26.3 Crear guía de despliegue
    - Crear docs/DEPLOYMENT.md
    - Documentar configuración de HTTPS en producción
    - Documentar configuración de variables de entorno
    - Documentar backup de base de datos
    - Documentar monitoreo de logs
    - _Requisitos: 23.4_


- [ ] 27. Configurar scripts de npm y utilidades
  - [~] 27.1 Configurar scripts en package.json
    - Script "start" para ejecutar servidor en producción
    - Script "dev" para ejecutar con nodemon en desarrollo
    - Script "test" para ejecutar todos los tests con Jest
    - Script "test:unit" para ejecutar solo unit tests
    - Script "test:integration" para ejecutar solo integration tests
    - Script "test:coverage" para generar reporte de cobertura
    - Script "lint" para ejecutar ESLint
    - Script "db:init" para inicializar base de datos con schema
    - Script "db:seed" para cargar datos de prueba

  - [~] 27.2 Crear script de inicialización de base de datos
    - Crear scripts/initDB.js
    - Leer y ejecutar database/schema.sql
    - Verificar que todas las tablas se crearon correctamente
    - Registrar resultado en consola

  - [~] 27.3 Crear script de seed de datos
    - Crear scripts/seedDB.js
    - Leer y ejecutar database/seed.sql
    - Verificar que los datos se insertaron correctamente
    - Registrar resultado en consola

- [ ] 28. Optimización y mejoras finales
  - [~] 28.1 Optimizar consultas de base de datos
    - Revisar queries frecuentes y agregar índices si es necesario
    - Implementar paginación en endpoints que retornan listas grandes
    - Implementar caching para datos que cambian poco (productos, inventario)

  - [~] 28.2 Optimizar rendimiento del frontend
    - Minificar archivos CSS y JavaScript para producción
    - Implementar lazy loading de imágenes de productos
    - Implementar debouncing en búsquedas en tiempo real
    - Reducir llamadas a API innecesarias

  - [~] 28.3 Mejorar accesibilidad
    - Agregar atributos ARIA a elementos interactivos
    - Asegurar contraste de colores adecuado
    - Agregar labels a todos los inputs de formularios
    - Asegurar navegación por teclado funcional

- [ ] 29. Checkpoint final - Verificar sistema completo
  - Ejecutar todos los tests (unit, property-based, integration)
  - Verificar cobertura de código >= 80%
  - Ejecutar npm audit para verificar vulnerabilidades
  - Probar flujos completos en navegador
  - Verificar responsive design en diferentes dispositivos
  - Asegurar que todos los tests pasen, preguntar al usuario si surgen dudas.


## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los checkpoints aseguran validación incremental del progreso
- Los property tests validan propiedades universales de corrección
- Los unit tests validan casos específicos y condiciones de borde
- Los tests de integración validan flujos completos del sistema
- La implementación sigue el orden: base de datos → backend → frontend
- Todos los endpoints de API están protegidos con autenticación JWT
- El sistema usa transacciones para operaciones que afectan múltiples tablas
- Los triggers de base de datos automatizan actualizaciones de inventario y conversión de pedidos

## Resumen de Cobertura

Este plan cubre:
- ✅ 11 tablas de base de datos con relaciones, índices y constraints
- ✅ 4 triggers y funciones de PostgreSQL para automatización
- ✅ 10 módulos de backend con endpoints REST completos
- ✅ Sistema de autenticación JWT con roles
- ✅ Validación de datos y manejo de errores robusto
- ✅ Sistema de logging completo con rotación de archivos
- ✅ Rate limiting y seguridad (bcrypt, SQL injection prevention, headers)
- ✅ Frontend público con catálogo, filtros y laboratorio de flores
- ✅ Panel administrativo con dashboard, KPIs, gráficos y gestión completa
- ✅ Integración con WhatsApp para comunicación con clientes
- ✅ Tests: unit, property-based e integration
- ✅ Documentación completa (README, API, deployment)
- ✅ Scripts de inicialización y utilidades

Total de requisitos cubiertos: 25/25 (100%)
