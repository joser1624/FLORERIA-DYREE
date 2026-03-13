# Requirements Document

## Introduction

Sistema web completo de gestión para la florería "Detalles y Regalos Encantos Eternos" que integra un frontend público para clientes, un panel administrativo para gestión interna, y un backend API REST con base de datos PostgreSQL. El sistema permite gestionar productos, inventario, ventas, pedidos, clientes, trabajadores, gastos y reportes, además de incluir un laboratorio de flores para crear arreglos personalizados.

## Glossary

- **Sistema**: El sistema web completo de gestión de florería
- **Frontend_Público**: La interfaz web pública accesible desde index.html
- **Panel_Admin**: La interfaz administrativa accesible desde dashboard.html
- **Backend_API**: El servidor Node.js + Express.js que expone endpoints REST
- **Base_Datos**: La base de datos PostgreSQL
- **Usuario**: Persona autenticada con roles (Administrador, Empleado, Dueña)
- **Cliente**: Persona que realiza compras o pedidos
- **Trabajador**: Empleado de la florería que registra ventas
- **Producto**: Artículo floral disponible para venta
- **Arreglo_Personalizado**: Producto creado mediante el Laboratorio de Flores
- **Inventario**: Stock de flores y materiales disponibles
- **Pedido**: Solicitud de compra con estados (pendiente, preparando, listo, entregado, cancelado)
- **Venta**: Transacción completada registrada en el sistema
- **Laboratorio**: Herramienta para construir arreglos florales personalizados
- **Receta**: Composición de flores y materiales que forman un arreglo
- **Margen**: Porcentaje de ganancia sobre el costo de un producto

## Requirements

### Requirement 1: Autenticación de Usuarios

**User Story:** Como administrador del sistema, quiero que los usuarios se autentiquen con credenciales, para que solo personal autorizado acceda al Panel_Admin.

#### Acceptance Criteria

1. THE Backend_API SHALL provide an authentication endpoint that accepts username and password
2. WHEN valid credentials are provided, THE Backend_API SHALL return a session token
3. WHEN invalid credentials are provided, THE Backend_API SHALL return an authentication error
4. THE Backend_API SHALL support three user roles: Administrador, Empleado, and Dueña
5. THE Panel_Admin SHALL require a valid session token for all administrative operations
6. WHEN a session token expires, THE Sistema SHALL redirect the user to the login page

### Requirement 2: Gestión de Productos

**User Story:** Como administrador, quiero gestionar el catálogo de productos, para que los clientes vean productos actualizados en el Frontend_Público.

#### Acceptance Criteria

1. THE Backend_API SHALL provide endpoints for creating, reading, updating, and deleting products
2. WHEN creating a product, THE Backend_API SHALL require name, category, price, cost, and optional image URL
3. WHEN a product is created, THE Backend_API SHALL store it in the Base_Datos
4. THE Backend_API SHALL calculate profit margin as (price - cost) / cost * 100
5. THE Frontend_Público SHALL display all active products with images, names, descriptions, and prices
6. THE Panel_Admin SHALL display products with cost, price, margin, and stock information
7. WHEN a product is updated, THE Sistema SHALL reflect changes in both Frontend_Público and Panel_Admin
8. WHEN a product is deleted, THE Backend_API SHALL mark it as inactive rather than removing it from Base_Datos

### Requirement 3: Gestión de Inventario

**User Story:** Como administrador, quiero controlar el inventario de flores y materiales, para que el sistema alerte cuando el stock esté bajo.

#### Acceptance Criteria

1. THE Backend_API SHALL provide endpoints for managing inventory items (flowers and materials)
2. WHEN creating an inventory item, THE Backend_API SHALL require name, quantity, unit, minimum_stock, and cost_per_unit
3. THE Backend_API SHALL track current quantity for each inventory item
4. WHEN inventory quantity falls below minimum_stock, THE Sistema SHALL generate a low stock alert
5. THE Panel_Admin SHALL display inventory items with status indicators: OK (green), Bajo (yellow), Crítico (red)
6. WHEN a sale is completed, THE Backend_API SHALL automatically decrement inventory quantities based on product recipes
7. THE Backend_API SHALL prevent sales when required inventory items have insufficient quantity

### Requirement 4: Laboratorio de Flores

**User Story:** Como trabajador, quiero crear arreglos florales personalizados, para que pueda ofrecer productos únicos a los clientes.

#### Acceptance Criteria

1. THE Sistema SHALL provide a Laboratorio interface accessible from both Frontend_Público and Panel_Admin
2. THE Laboratorio SHALL display available flowers and materials from Inventario with current stock
3. WHEN a user selects flowers and materials, THE Laboratorio SHALL calculate total cost based on inventory prices
4. THE Laboratorio SHALL allow users to specify quantities for each selected item
5. THE Backend_API SHALL calculate suggested selling price as cost * (1 + Margen)
6. WHERE the user is a Cliente, THE Laboratorio SHALL display estimated price and generate WhatsApp order message
7. WHERE the user is a Trabajador or Administrador, THE Laboratorio SHALL allow saving the arrangement as a new product
8. WHEN an arrangement is saved as a product, THE Backend_API SHALL store the recipe in the Base_Datos
9. THE Backend_API SHALL validate that sufficient inventory exists before allowing arrangement creation

### Requirement 5: Gestión de Pedidos

**User Story:** Como trabajador, quiero gestionar pedidos de clientes, para que pueda rastrear el estado de cada orden desde creación hasta entrega.

#### Acceptance Criteria

1. THE Backend_API SHALL provide endpoints for creating, reading, updating, and deleting orders
2. WHEN creating an order, THE Backend_API SHALL require cliente_id, producto_id, delivery_date, and price
3. THE Backend_API SHALL support five order states: pendiente, preparando, listo, entregado, cancelado
4. WHEN an order is created, THE Backend_API SHALL set initial state to pendiente
5. THE Panel_Admin SHALL display orders with cliente name, phone, product, delivery date, price, and status
6. THE Backend_API SHALL allow updating order status through state transitions
7. WHEN an order state changes to entregado, THE Backend_API SHALL automatically create a sale record
8. THE Panel_Admin SHALL display a badge count of orders in pendiente state
9. THE Backend_API SHALL allow filtering orders by state, date range, and cliente

### Requirement 6: Gestión de Ventas

**User Story:** Como trabajador, quiero registrar ventas completadas, para que el sistema mantenga un historial de transacciones.

#### Acceptance Criteria

1. THE Backend_API SHALL provide endpoints for creating and reading sales records
2. WHEN creating a sale, THE Backend_API SHALL require producto_id, quantity, price, payment_method, and trabajador_id
3. THE Backend_API SHALL support payment methods: Efectivo, Yape, Tarjeta, Transferencia
4. WHEN a sale is created, THE Backend_API SHALL store timestamp, total amount, and associated trabajador
5. WHEN a sale is created, THE Backend_API SHALL decrement inventory based on product recipe
6. THE Panel_Admin SHALL display sales with product name, quantity, price, trabajador, payment method, and timestamp
7. THE Backend_API SHALL calculate daily sales total as sum of all sales for current date
8. THE Backend_API SHALL calculate monthly sales total as sum of all sales for current month

### Requirement 7: Gestión de Clientes

**User Story:** Como administrador, quiero mantener un registro de clientes, para que pueda consultar su historial de compras.

#### Acceptance Criteria

1. THE Backend_API SHALL provide endpoints for creating, reading, updating, and deleting clients
2. WHEN creating a client, THE Backend_API SHALL require name, phone, and optional email and address
3. THE Backend_API SHALL associate each order with a cliente_id
4. THE Panel_Admin SHALL display client list with name, phone, email, and total purchases
5. WHEN viewing a client detail, THE Panel_Admin SHALL display purchase history with dates, products, and amounts
6. THE Backend_API SHALL calculate total purchases per client as sum of all completed orders

### Requirement 8: Gestión de Trabajadores

**User Story:** Como administrador, quiero gestionar trabajadores, para que pueda rastrear ventas realizadas por cada empleado.

#### Acceptance Criteria

1. THE Backend_API SHALL provide endpoints for creating, reading, updating, and deleting workers
2. WHEN creating a worker, THE Backend_API SHALL require name, role, phone, and optional email
3. THE Backend_API SHALL associate each sale with a trabajador_id
4. THE Panel_Admin SHALL display worker list with name, role, phone, and total sales
5. WHEN viewing a worker detail, THE Panel_Admin SHALL display sales history with dates, products, and amounts
6. THE Backend_API SHALL calculate total sales per worker as sum of all sales by that trabajador_id

### Requirement 9: Gestión de Gastos

**User Story:** Como administrador, quiero registrar gastos operativos, para que pueda calcular ganancia neta.

#### Acceptance Criteria

1. THE Backend_API SHALL provide endpoints for creating, reading, updating, and deleting expenses
2. WHEN creating an expense, THE Backend_API SHALL require description, amount, category, and date
3. THE Backend_API SHALL support expense categories: Compras, Transporte, Materiales, Servicios, Otros
4. THE Panel_Admin SHALL display expenses with description, amount, category, and date
5. THE Backend_API SHALL calculate total expenses for a date range as sum of all expense amounts
6. THE Backend_API SHALL calculate net profit as (total sales - total costs - total expenses)

### Requirement 10: Dashboard con KPIs

**User Story:** Como administrador, quiero ver indicadores clave en el dashboard, para que pueda monitorear el desempeño del negocio.

#### Acceptance Criteria

1. THE Panel_Admin SHALL display daily sales total in the dashboard
2. THE Panel_Admin SHALL display monthly sales total in the dashboard
3. THE Panel_Admin SHALL display count of pending orders in the dashboard
4. THE Panel_Admin SHALL display monthly net profit in the dashboard
5. THE Panel_Admin SHALL display percentage change compared to previous period for each KPI
6. THE Panel_Admin SHALL display a chart of daily sales for the current week
7. THE Panel_Admin SHALL display a chart of top 5 best-selling products for the current month
8. THE Backend_API SHALL provide aggregated data endpoints for dashboard KPIs

### Requirement 11: Reportes

**User Story:** Como administrador, quiero generar reportes, para que pueda analizar tendencias de ventas y desempeño.

#### Acceptance Criteria

1. THE Backend_API SHALL provide an endpoint for sales report by date range
2. THE Backend_API SHALL provide an endpoint for best-selling products report
3. THE Backend_API SHALL provide an endpoint for sales by worker report
4. THE Panel_Admin SHALL allow selecting date range for reports
5. WHEN generating a sales report, THE Backend_API SHALL return total sales, total costs, and profit for the period
6. WHEN generating a best-selling products report, THE Backend_API SHALL return products ordered by quantity sold descending
7. WHEN generating a sales by worker report, THE Backend_API SHALL return workers ordered by total sales descending
8. THE Panel_Admin SHALL display reports in tabular format with export option

### Requirement 12: Integración WhatsApp

**User Story:** Como cliente, quiero enviar pedidos por WhatsApp, para que pueda comunicarme directamente con la florería.

#### Acceptance Criteria

1. THE Frontend_Público SHALL display WhatsApp buttons on product cards
2. WHEN a WhatsApp button is clicked, THE Sistema SHALL generate a pre-filled message with product name and price
3. THE Laboratorio SHALL generate WhatsApp messages with arrangement details and estimated price
4. THE Panel_Admin SHALL provide a WhatsApp button to contact customers about orders
5. THE Sistema SHALL use WhatsApp Web API format: wa.me/{phone}?text={encoded_message}
6. THE Sistema SHALL encode special characters in WhatsApp messages according to URL encoding standards

### Requirement 13: Filtrado de Catálogo

**User Story:** Como cliente, quiero filtrar productos por categoría, para que pueda encontrar rápidamente lo que busco.

#### Acceptance Criteria

1. THE Frontend_Público SHALL display category filter buttons above the product catalog
2. THE Frontend_Público SHALL support categories: Todos, Ramos, Cajas, Arreglos, Sorpresas, Eventos
3. WHEN a category filter is selected, THE Frontend_Público SHALL display only products matching that category
4. WHEN "Todos" filter is selected, THE Frontend_Público SHALL display all products
5. THE Frontend_Público SHALL highlight the active filter button
6. THE Frontend_Público SHALL perform filtering on the client side without page reload

### Requirement 14: Búsqueda de Productos y Pedidos

**User Story:** Como trabajador, quiero buscar productos y pedidos, para que pueda encontrar información rápidamente.

#### Acceptance Criteria

1. THE Panel_Admin SHALL provide a search input in the products section
2. THE Panel_Admin SHALL provide a search input in the orders section
3. WHEN text is entered in product search, THE Panel_Admin SHALL filter products by name matching the search term
4. WHEN text is entered in order search, THE Panel_Admin SHALL filter orders by client name matching the search term
5. THE Panel_Admin SHALL perform search filtering in real-time as the user types
6. THE Panel_Admin SHALL display "No results found" message when search returns empty results

### Requirement 15: Validación de Datos

**User Story:** Como administrador, quiero que el sistema valide datos de entrada, para que se mantenga la integridad de la información.

#### Acceptance Criteria

1. WHEN creating or updating a product, THE Backend_API SHALL validate that price is greater than cost
2. WHEN creating or updating an inventory item, THE Backend_API SHALL validate that quantity is non-negative
3. WHEN creating a sale, THE Backend_API SHALL validate that sufficient inventory exists
4. WHEN creating an order, THE Backend_API SHALL validate that delivery_date is not in the past
5. WHEN creating a client or worker, THE Backend_API SHALL validate that phone number has valid format
6. IF validation fails, THEN THE Backend_API SHALL return a descriptive error message with HTTP 400 status
7. THE Panel_Admin SHALL display validation errors to the user in a clear format

### Requirement 16: Cálculo Automático de Costos

**User Story:** Como trabajador, quiero que el sistema calcule automáticamente costos de arreglos, para que no tenga que hacerlo manualmente.

#### Acceptance Criteria

1. WHEN a product has an associated recipe, THE Backend_API SHALL calculate cost as sum of (ingredient_quantity * ingredient_cost_per_unit)
2. THE Laboratorio SHALL display real-time cost calculation as ingredients are added or removed
3. THE Laboratorio SHALL display suggested selling price based on configurable margin percentage
4. THE Backend_API SHALL store calculated cost with the product when saved from Laboratorio
5. WHEN inventory prices change, THE Backend_API SHALL recalculate costs for products using affected ingredients
6. THE Panel_Admin SHALL display both stored cost and current calculated cost for products with recipes

### Requirement 17: Control de Inventario en Ventas

**User Story:** Como administrador, quiero que el inventario se actualice automáticamente al vender, para que el stock siempre esté sincronizado.

#### Acceptance Criteria

1. WHEN a sale is created, THE Backend_API SHALL retrieve the product recipe from Base_Datos
2. WHEN a product recipe exists, THE Backend_API SHALL decrement inventory quantities for each ingredient
3. WHEN a product has no recipe, THE Backend_API SHALL decrement a generic product stock counter
4. IF insufficient inventory exists for any ingredient, THEN THE Backend_API SHALL reject the sale with error message
5. THE Backend_API SHALL perform inventory updates within a database transaction
6. IF the transaction fails, THEN THE Backend_API SHALL rollback all inventory changes
7. THE Panel_Admin SHALL display updated inventory quantities immediately after sale completion

### Requirement 18: Estados de Pedidos

**User Story:** Como trabajador, quiero actualizar estados de pedidos, para que pueda comunicar el progreso al cliente.

#### Acceptance Criteria

1. THE Backend_API SHALL enforce valid state transitions: pendiente → preparando → listo → entregado
2. THE Backend_API SHALL allow transition from any state to cancelado
3. WHEN an invalid state transition is attempted, THE Backend_API SHALL return an error
4. THE Panel_Admin SHALL display state change buttons appropriate for current order state
5. WHEN order state changes, THE Backend_API SHALL record timestamp of the change
6. THE Panel_Admin SHALL display state history for each order showing timestamps
7. WHEN order state changes to entregado, THE Backend_API SHALL mark the order as completed

### Requirement 19: Responsive Design

**User Story:** Como usuario, quiero que el sistema funcione en dispositivos móviles, para que pueda acceder desde cualquier lugar.

#### Acceptance Criteria

1. THE Frontend_Público SHALL display correctly on screen widths from 320px to 1920px
2. THE Panel_Admin SHALL display correctly on screen widths from 768px to 1920px
3. WHEN viewed on mobile devices, THE Frontend_Público SHALL stack product cards vertically
4. WHEN viewed on mobile devices, THE Panel_Admin SHALL collapse the sidebar into a hamburger menu
5. THE Sistema SHALL use responsive CSS units (rem, %, vw, vh) rather than fixed pixel values
6. THE Sistema SHALL ensure touch targets are at least 44x44 pixels on mobile devices

### Requirement 20: Manejo de Errores

**User Story:** Como usuario, quiero recibir mensajes de error claros, para que pueda entender qué salió mal y cómo corregirlo.

#### Acceptance Criteria

1. WHEN a Backend_API operation fails, THE Backend_API SHALL return appropriate HTTP status code
2. WHEN a Backend_API operation fails, THE Backend_API SHALL return a JSON response with error message
3. THE Panel_Admin SHALL display error messages in a visible notification component
4. THE Panel_Admin SHALL display success messages after successful operations
5. IF a network error occurs, THEN THE Panel_Admin SHALL display "Connection error. Please try again."
6. THE Backend_API SHALL log all errors with timestamp, endpoint, and error details
7. THE Backend_API SHALL not expose sensitive information in error messages

### Requirement 21: Configuración de Base de Datos

**User Story:** Como desarrollador, quiero scripts de inicialización de base de datos, para que pueda configurar el sistema rápidamente.

#### Acceptance Criteria

1. THE Sistema SHALL provide a SQL schema file defining all required tables
2. THE schema SHALL define tables: usuarios, trabajadores, clientes, productos, inventario, ventas, detalle_ventas, pedidos, arreglos, receta_arreglo, gastos
3. THE schema SHALL define foreign key relationships between related tables
4. THE schema SHALL define appropriate indexes for frequently queried columns
5. THE Sistema SHALL provide a seed data file with sample records for testing
6. THE Backend_API SHALL validate database connection on startup
7. IF database connection fails, THEN THE Backend_API SHALL log error and exit with non-zero status code

### Requirement 22: Arquitectura API REST

**User Story:** Como desarrollador, quiero una API REST bien estructurada, para que el frontend y backend estén desacoplados.

#### Acceptance Criteria

1. THE Backend_API SHALL follow RESTful conventions for endpoint naming
2. THE Backend_API SHALL use HTTP methods appropriately: GET (read), POST (create), PUT (update), DELETE (delete)
3. THE Backend_API SHALL return JSON responses for all endpoints
4. THE Backend_API SHALL use appropriate HTTP status codes: 200 (success), 201 (created), 400 (bad request), 401 (unauthorized), 404 (not found), 500 (server error)
5. THE Backend_API SHALL implement CORS headers to allow requests from Frontend_Público and Panel_Admin
6. THE Backend_API SHALL version API endpoints using /api/v1/ prefix
7. THE Backend_API SHALL document all endpoints with request/response examples

### Requirement 23: Seguridad

**User Story:** Como administrador, quiero que el sistema sea seguro, para que los datos de clientes y ventas estén protegidos.

#### Acceptance Criteria

1. THE Backend_API SHALL hash passwords using bcrypt before storing in Base_Datos
2. THE Backend_API SHALL validate and sanitize all user inputs to prevent SQL injection
3. THE Backend_API SHALL implement rate limiting to prevent brute force attacks
4. THE Backend_API SHALL use HTTPS in production environment
5. THE Backend_API SHALL set secure HTTP headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
6. THE Backend_API SHALL not log sensitive information (passwords, tokens) in plain text
7. THE Panel_Admin SHALL automatically log out users after 30 minutes of inactivity

### Requirement 24: Variables de Entorno

**User Story:** Como desarrollador, quiero configurar el sistema mediante variables de entorno, para que pueda desplegar en diferentes ambientes.

#### Acceptance Criteria

1. THE Backend_API SHALL read database connection parameters from environment variables
2. THE Backend_API SHALL read server port from environment variable with default value 3000
3. THE Backend_API SHALL read JWT secret from environment variable
4. THE Backend_API SHALL read WhatsApp phone number from environment variable
5. THE Sistema SHALL provide a .env.example file documenting all required variables
6. THE Backend_API SHALL validate that all required environment variables are set on startup
7. IF required environment variables are missing, THEN THE Backend_API SHALL log error and exit

### Requirement 25: Logging

**User Story:** Como administrador, quiero que el sistema registre eventos importantes, para que pueda auditar operaciones y diagnosticar problemas.

#### Acceptance Criteria

1. THE Backend_API SHALL log all authentication attempts with username and timestamp
2. THE Backend_API SHALL log all database operations with query type and execution time
3. THE Backend_API SHALL log all API requests with method, endpoint, status code, and response time
4. THE Backend_API SHALL log all errors with stack trace and context information
5. THE Backend_API SHALL write logs to both console and file
6. THE Backend_API SHALL rotate log files daily and retain logs for 30 days
7. THE Backend_API SHALL use different log levels: ERROR, WARN, INFO, DEBUG
