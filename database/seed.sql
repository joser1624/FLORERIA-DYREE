-- ============================================================================
-- Sistema de Gestión de Florería "Encantos Eternos"
-- Seed Data (Datos de Prueba)
-- PostgreSQL 14+
-- ============================================================================

-- Limpiar datos existentes (en orden inverso de dependencias)
TRUNCATE TABLE detalle_ventas, ventas, historial_estados_pedido, pedidos, 
             receta_arreglo, gastos, inventario, productos, clientes, 
             trabajadores, usuarios RESTART IDENTITY CASCADE;

-- ============================================================================
-- Usuarios de prueba con diferentes roles
-- ============================================================================
-- Contraseña para todos: "password123" (hash bcrypt)
INSERT INTO usuarios (username, password_hash, nombre, rol, email, activo) VALUES
('admin', '$2b$10$rKvVJKJ5fZQXhP0LZ0FqLOxKx5YJ5fZQXhP0LZ0FqLOxKx5YJ5fZQX', 'María González', 'Administrador', 'admin@encantoseternos.com', true),
('empleado1', '$2b$10$rKvVJKJ5fZQXhP0LZ0FqLOxKx5YJ5fZQXhP0LZ0FqLOxKx5YJ5fZQX', 'Carlos Ramírez', 'Empleado', 'carlos@encantoseternos.com', true),
('duena', '$2b$10$rKvVJKJ5fZQXhP0LZ0FqLOxKx5YJ5fZQXhP0LZ0FqLOxKx5YJ5fZQX', 'Ana Flores', 'Dueña', 'ana@encantoseternos.com', true),
('empleado2', '$2b$10$rKvVJKJ5fZQXhP0LZ0FqLOxKx5YJ5fZQXhP0LZ0FqLOxKx5YJ5fZQX', 'Laura Mendoza', 'Empleado', 'laura@encantoseternos.com', true),
('admin_inactivo', '$2b$10$rKvVJKJ5fZQXhP0LZ0FqLOxKx5YJ5fZQXhP0LZ0FqLOxKx5YJ5fZQX', 'Usuario Inactivo', 'Administrador', 'inactivo@encantoseternos.com', false);

-- ============================================================================
-- Trabajadores de ejemplo
-- ============================================================================
INSERT INTO trabajadores (nombre, rol, telefono, email, activo, fecha_contratacion) VALUES
('Carlos Ramírez', 'Vendedor', '987654321', 'carlos@encantoseternos.com', true, '2023-01-15'),
('Laura Mendoza', 'Florista', '987654322', 'laura@encantoseternos.com', true, '2023-03-20'),
('Pedro Sánchez', 'Vendedor', '987654323', 'pedro@encantoseternos.com', true, '2023-06-10'),
('Sofía Torres', 'Florista', '987654324', 'sofia@encantoseternos.com', true, '2023-08-05'),
('Miguel Ángel', 'Repartidor', '987654325', 'miguel@encantoseternos.com', false, '2022-11-01');

-- ============================================================================
-- Clientes de ejemplo
-- ============================================================================
INSERT INTO clientes (nombre, telefono, email, direccion, total_compras) VALUES
('Juan Pérez', '999111222', 'juan.perez@email.com', 'Av. Principal 123, Lima', 450.00),
('María López', '999222333', 'maria.lopez@email.com', 'Jr. Las Flores 456, Miraflores', 780.50),
('Roberto García', '999333444', 'roberto.garcia@email.com', 'Calle Los Rosales 789, San Isidro', 320.00),
('Carmen Silva', '999444555', 'carmen.silva@email.com', 'Av. Arequipa 1010, Lince', 1250.00),
('Luis Martínez', '999555666', 'luis.martinez@email.com', 'Jr. Tulipanes 234, Surco', 0.00),
('Ana Rodríguez', '999666777', 'ana.rodriguez@email.com', 'Calle Orquídeas 567, La Molina', 890.00),
('Diego Fernández', '999777888', NULL, 'Av. Javier Prado 890, San Borja', 150.00),
('Patricia Vega', '999888999', 'patricia.vega@email.com', NULL, 0.00);

-- ============================================================================
-- Inventario de flores y materiales
-- ============================================================================
INSERT INTO inventario (nombre, cantidad, unidad, minimo_stock, costo_unitario) VALUES
-- Flores
('Rosas Rojas', 150.00, 'unidades', 50.00, 2.50),
('Rosas Blancas', 120.00, 'unidades', 50.00, 2.50),
('Rosas Rosadas', 100.00, 'unidades', 50.00, 2.50),
('Girasoles', 80.00, 'unidades', 30.00, 3.00),
('Lirios', 60.00, 'unidades', 30.00, 3.50),
('Tulipanes', 45.00, 'unidades', 40.00, 2.80),
('Orquídeas', 25.00, 'unidades', 20.00, 8.00),
('Claveles', 200.00, 'unidades', 80.00, 1.50),
('Margaritas', 150.00, 'unidades', 60.00, 1.80),
('Hortensias', 40.00, 'unidades', 25.00, 4.50),
-- Materiales
('Papel Celofán', 50.00, 'metros', 20.00, 0.80),
('Cinta Decorativa', 30.00, 'metros', 15.00, 0.50),
('Cajas de Regalo Pequeñas', 35.00, 'unidades', 20.00, 3.00),
('Cajas de Regalo Medianas', 25.00, 'unidades', 15.00, 4.50),
('Cajas de Regalo Grandes', 15.00, 'unidades', 10.00, 6.00),
('Tarjetas de Dedicatoria', 100.00, 'unidades', 50.00, 0.30),
('Lazos Decorativos', 60.00, 'unidades', 30.00, 0.80),
('Espuma Floral', 20.00, 'bloques', 10.00, 2.00),
('Jarrones Pequeños', 18.00, 'unidades', 12.00, 5.00),
('Jarrones Medianos', 12.00, 'unidades', 8.00, 7.50),
('Globos Metálicos', 40.00, 'unidades', 20.00, 2.50),
('Peluches Pequeños', 15.00, 'unidades', 10.00, 8.00),
('Chocolates Premium', 25.00, 'cajas', 15.00, 12.00);

-- ============================================================================
-- Productos de ejemplo en todas las categorías
-- ============================================================================
INSERT INTO productos (nombre, categoria, descripcion, precio, costo, imagen_url, activo, tiene_receta) VALUES
-- Ramos
('Ramo de 12 Rosas Rojas', 'Ramos', 'Clásico ramo de rosas rojas, perfecto para expresar amor', 85.00, 45.00, 'https://example.com/ramo-rosas-rojas.jpg', true, true),
('Ramo Primaveral', 'Ramos', 'Mezcla de tulipanes y margaritas en colores vibrantes', 65.00, 35.00, 'https://example.com/ramo-primaveral.jpg', true, true),
('Ramo de Girasoles', 'Ramos', 'Alegre ramo de girasoles que ilumina cualquier espacio', 70.00, 38.00, 'https://example.com/ramo-girasoles.jpg', true, true),
('Ramo Elegante de Lirios', 'Ramos', 'Sofisticado ramo de lirios blancos', 95.00, 52.00, 'https://example.com/ramo-lirios.jpg', true, true),
-- Cajas
('Caja de Rosas Rosadas', 'Cajas', 'Hermosa caja con rosas rosadas y chocolates', 120.00, 65.00, 'https://example.com/caja-rosas-rosadas.jpg', true, true),
('Caja Sorpresa Romántica', 'Cajas', 'Caja con rosas, peluche y chocolates premium', 150.00, 85.00, 'https://example.com/caja-romantica.jpg', true, true),
('Caja de Orquídeas', 'Cajas', 'Elegante caja con orquídeas exóticas', 180.00, 98.00, 'https://example.com/caja-orquideas.jpg', true, true),
-- Arreglos
('Arreglo Floral Clásico', 'Arreglos', 'Arreglo en jarrón con flores mixtas de temporada', 110.00, 60.00, 'https://example.com/arreglo-clasico.jpg', true, true),
('Arreglo de Hortensias', 'Arreglos', 'Espectacular arreglo de hortensias azules', 135.00, 72.00, 'https://example.com/arreglo-hortensias.jpg', true, true),
('Arreglo Tropical', 'Arreglos', 'Exótico arreglo con flores tropicales', 145.00, 78.00, 'https://example.com/arreglo-tropical.jpg', true, true),
-- Sorpresas
('Sorpresa con Globos y Flores', 'Sorpresas', 'Combinación de rosas rojas con globos metálicos', 95.00, 52.00, 'https://example.com/sorpresa-globos.jpg', true, true),
('Sorpresa Dulce', 'Sorpresas', 'Ramo pequeño con chocolates y peluche', 75.00, 42.00, 'https://example.com/sorpresa-dulce.jpg', true, true),
('Sorpresa Deluxe', 'Sorpresas', 'Gran sorpresa con flores, globos, peluche y chocolates', 200.00, 110.00, 'https://example.com/sorpresa-deluxe.jpg', true, true),
-- Eventos
('Centro de Mesa Elegante', 'Eventos', 'Centro de mesa para bodas y eventos especiales', 180.00, 95.00, 'https://example.com/centro-mesa.jpg', true, true),
('Arco Floral para Eventos', 'Eventos', 'Impresionante arco floral para ceremonias', 850.00, 450.00, 'https://example.com/arco-floral.jpg', true, false),
('Ramo de Novia Premium', 'Eventos', 'Exclusivo ramo de novia con rosas y orquídeas', 320.00, 175.00, 'https://example.com/ramo-novia.jpg', true, true),
-- Productos inactivos
('Producto Descontinuado', 'Ramos', 'Este producto ya no está disponible', 50.00, 30.00, NULL, false, false);

-- ============================================================================
-- Recetas de arreglos (composición de productos)
-- ============================================================================
INSERT INTO receta_arreglo (producto_id, inventario_id, cantidad) VALUES
-- Ramo de 12 Rosas Rojas (producto_id: 1)
(1, 1, 12.00),  -- 12 Rosas Rojas
(1, 11, 1.00),  -- 1 metro Papel Celofán
(1, 12, 0.50),  -- 0.5 metros Cinta Decorativa
(1, 16, 1.00),  -- 1 Tarjeta
-- Ramo Primaveral (producto_id: 2)
(2, 6, 8.00),   -- 8 Tulipanes
(2, 9, 10.00),  -- 10 Margaritas
(2, 11, 1.00),  -- Papel Celofán
(2, 17, 1.00),  -- Lazo Decorativo
-- Ramo de Girasoles (producto_id: 3)
(3, 4, 10.00),  -- 10 Girasoles
(3, 11, 1.00),  -- Papel Celofán
(3, 12, 0.50),  -- Cinta Decorativa
-- Ramo Elegante de Lirios (producto_id: 4)
(4, 5, 12.00),  -- 12 Lirios
(4, 11, 1.50),  -- Papel Celofán
(4, 17, 2.00),  -- Lazos Decorativos
-- Caja de Rosas Rosadas (producto_id: 5)
(5, 3, 15.00),  -- 15 Rosas Rosadas
(5, 14, 1.00),  -- Caja Mediana
(5, 23, 1.00),  -- Chocolates Premium
(5, 16, 1.00),  -- Tarjeta
-- Caja Sorpresa Romántica (producto_id: 6)
(6, 1, 10.00),  -- 10 Rosas Rojas
(6, 14, 1.00),  -- Caja Mediana
(6, 22, 1.00),  -- Peluche Pequeño
(6, 23, 1.00),  -- Chocolates Premium
-- Caja de Orquídeas (producto_id: 7)
(7, 7, 8.00),   -- 8 Orquídeas
(7, 15, 1.00),  -- Caja Grande
(7, 17, 2.00),  -- Lazos Decorativos
-- Arreglo Floral Clásico (producto_id: 8)
(8, 1, 6.00),   -- Rosas Rojas
(8, 5, 4.00),   -- Lirios
(8, 8, 8.00),   -- Claveles
(8, 18, 1.00),  -- Espuma Floral
(8, 19, 1.00),  -- Jarrón Pequeño
-- Arreglo de Hortensias (producto_id: 9)
(9, 10, 6.00),  -- Hortensias
(9, 18, 1.00),  -- Espuma Floral
(9, 20, 1.00),  -- Jarrón Mediano
-- Sorpresa con Globos y Flores (producto_id: 11)
(11, 1, 6.00),  -- Rosas Rojas
(11, 21, 3.00), -- Globos Metálicos
(11, 11, 1.00), -- Papel Celofán
-- Sorpresa Dulce (producto_id: 12)
(12, 2, 5.00),  -- Rosas Blancas
(12, 22, 1.00), -- Peluche
(12, 23, 1.00), -- Chocolates
-- Centro de Mesa Elegante (producto_id: 14)
(14, 2, 10.00), -- Rosas Blancas
(14, 5, 6.00),  -- Lirios
(14, 18, 2.00), -- Espuma Floral
(14, 20, 1.00), -- Jarrón Mediano
-- Ramo de Novia Premium (producto_id: 16)
(16, 2, 20.00), -- Rosas Blancas
(16, 7, 5.00),  -- Orquídeas
(16, 12, 2.00), -- Cinta Decorativa
(16, 17, 3.00); -- Lazos Decorativos

-- ============================================================================
-- Pedidos de ejemplo con diferentes estados
-- ============================================================================
INSERT INTO pedidos (cliente_id, producto_id, fecha_pedido, fecha_entrega, precio, estado, notas) VALUES
-- Pedidos pendientes
(5, 1, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_DATE + INTERVAL '1 day', 85.00, 'pendiente', 'Entregar en la mañana'),
(8, 12, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_DATE + INTERVAL '2 days', 75.00, 'pendiente', 'Incluir tarjeta con mensaje: Feliz cumpleaños'),
-- Pedidos en preparación
(2, 6, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_DATE, 150.00, 'preparando', 'Cliente prefiere rosas rosadas'),
(4, 14, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_DATE + INTERVAL '3 days', 180.00, 'preparando', 'Para evento de aniversario'),
-- Pedidos listos
(3, 3, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_DATE, 70.00, 'listo', 'Listo para recoger'),
-- Pedidos entregados (históricos)
(1, 1, CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_DATE - INTERVAL '14 days', 85.00, 'entregado', 'Entregado sin problemas'),
(2, 5, CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_DATE - INTERVAL '19 days', 120.00, 'entregado', NULL),
(4, 8, CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_DATE - INTERVAL '24 days', 110.00, 'entregado', NULL),
(1, 2, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_DATE - INTERVAL '29 days', 65.00, 'entregado', NULL),
(6, 11, CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_DATE - INTERVAL '9 days', 95.00, 'entregado', 'Cliente muy satisfecho'),
-- Pedidos cancelados
(7, 4, CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_DATE - INTERVAL '5 days', 95.00, 'cancelado', 'Cliente canceló por cambio de planes');

-- ============================================================================
-- Ventas de ejemplo
-- ============================================================================
INSERT INTO ventas (producto_id, cantidad, precio_unitario, metodo_pago, trabajador_id, pedido_id, fecha_venta) VALUES
-- Ventas del mes actual
(1, 1, 85.00, 'Yape', 1, NULL, CURRENT_TIMESTAMP - INTERVAL '2 days'),
(2, 2, 65.00, 'Efectivo', 2, NULL, CURRENT_TIMESTAMP - INTERVAL '3 days'),
(3, 1, 70.00, 'Tarjeta', 1, NULL, CURRENT_TIMESTAMP - INTERVAL '5 days'),
(5, 1, 120.00, 'Transferencia', 3, NULL, CURRENT_TIMESTAMP - INTERVAL '7 days'),
(8, 1, 110.00, 'Yape', 2, NULL, CURRENT_TIMESTAMP - INTERVAL '10 days'),
(11, 1, 95.00, 'Efectivo', 1, NULL, CURRENT_TIMESTAMP - INTERVAL '12 days'),
(12, 2, 75.00, 'Yape', 4, NULL, CURRENT_TIMESTAMP - INTERVAL '15 days'),
-- Ventas asociadas a pedidos entregados
(1, 1, 85.00, 'Efectivo', 1, 6, CURRENT_DATE - INTERVAL '14 days'),
(5, 1, 120.00, 'Yape', 2, 7, CURRENT_DATE - INTERVAL '19 days'),
(8, 1, 110.00, 'Tarjeta', 1, 8, CURRENT_DATE - INTERVAL '24 days'),
(2, 1, 65.00, 'Efectivo', 3, 9, CURRENT_DATE - INTERVAL '29 days'),
(11, 1, 95.00, 'Transferencia', 2, 10, CURRENT_DATE - INTERVAL '9 days');

-- ============================================================================
-- Detalle de ventas (inventario usado)
-- ============================================================================
-- Nota: En producción, esto se generaría automáticamente por triggers
-- Aquí incluimos algunos ejemplos para demostración
INSERT INTO detalle_ventas (venta_id, inventario_id, cantidad_usada, costo_unitario) VALUES
-- Venta 1: Ramo de 12 Rosas Rojas
(1, 1, 12.00, 2.50),
(1, 11, 1.00, 0.80),
(1, 12, 0.50, 0.50),
-- Venta 2: 2x Ramo Primaveral
(2, 6, 16.00, 2.80),
(2, 9, 20.00, 1.80),
(2, 11, 2.00, 0.80),
-- Venta 3: Ramo de Girasoles
(3, 4, 10.00, 3.00),
(3, 11, 1.00, 0.80),
-- Venta 4: Caja de Rosas Rosadas
(4, 3, 15.00, 2.50),
(4, 14, 1.00, 4.50),
(4, 23, 1.00, 12.00);

-- ============================================================================
-- Gastos operativos de ejemplo
-- ============================================================================
INSERT INTO gastos (descripcion, monto, categoria, fecha, usuario_id) VALUES
-- Gastos del mes actual
('Compra de rosas importadas', 450.00, 'Compras', CURRENT_DATE - INTERVAL '5 days', 1),
('Transporte de flores del mercado', 35.00, 'Transporte', CURRENT_DATE - INTERVAL '5 days', 1),
('Cajas y materiales de empaque', 180.00, 'Materiales', CURRENT_DATE - INTERVAL '8 days', 1),
('Servicio de agua y luz', 120.00, 'Servicios', CURRENT_DATE - INTERVAL '10 days', 3),
('Compra de orquídeas', 280.00, 'Compras', CURRENT_DATE - INTERVAL '12 days', 1),
('Reparación de refrigerador', 150.00, 'Otros', CURRENT_DATE - INTERVAL '15 days', 3),
('Transporte de pedido especial', 25.00, 'Transporte', CURRENT_DATE - INTERVAL '18 days', 1),
('Cintas y lazos decorativos', 95.00, 'Materiales', CURRENT_DATE - INTERVAL '20 days', 1),
-- Gastos del mes anterior
('Compra de flores de temporada', 520.00, 'Compras', CURRENT_DATE - INTERVAL '35 days', 1),
('Servicio de internet', 80.00, 'Servicios', CURRENT_DATE - INTERVAL '40 days', 3),
('Publicidad en redes sociales', 200.00, 'Otros', CURRENT_DATE - INTERVAL '45 days', 3);

-- ============================================================================
-- Historial de estados de pedidos
-- ============================================================================
INSERT INTO historial_estados_pedido (pedido_id, estado_anterior, estado_nuevo, usuario_id) VALUES
-- Pedido 3 (preparando)
(3, 'pendiente', 'preparando', 1),
-- Pedido 4 (preparando)
(4, 'pendiente', 'preparando', 2),
-- Pedido 5 (listo)
(5, 'pendiente', 'preparando', 1),
(5, 'preparando', 'listo', 1),
-- Pedidos entregados
(6, 'pendiente', 'preparando', 1),
(6, 'preparando', 'listo', 1),
(6, 'listo', 'entregado', 1),
(7, 'pendiente', 'preparando', 2),
(7, 'preparando', 'listo', 2),
(7, 'listo', 'entregado', 2),
-- Pedido cancelado
(11, 'pendiente', 'cancelado', 1);

-- ============================================================================
-- Actualizar secuencias para evitar conflictos
-- ============================================================================
SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios));
SELECT setval('trabajadores_id_seq', (SELECT MAX(id) FROM trabajadores));
SELECT setval('clientes_id_seq', (SELECT MAX(id) FROM clientes));
SELECT setval('productos_id_seq', (SELECT MAX(id) FROM productos));
SELECT setval('inventario_id_seq', (SELECT MAX(id) FROM inventario));
SELECT setval('receta_arreglo_id_seq', (SELECT MAX(id) FROM receta_arreglo));
SELECT setval('pedidos_id_seq', (SELECT MAX(id) FROM pedidos));
SELECT setval('ventas_id_seq', (SELECT MAX(id) FROM ventas));
SELECT setval('detalle_ventas_id_seq', (SELECT MAX(id) FROM detalle_ventas));
SELECT setval('gastos_id_seq', (SELECT MAX(id) FROM gastos));
SELECT setval('historial_estados_pedido_id_seq', (SELECT MAX(id) FROM historial_estados_pedido));

-- ============================================================================
-- Verificación de datos insertados
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Seed data insertado exitosamente:';
  RAISE NOTICE '- % usuarios', (SELECT COUNT(*) FROM usuarios);
  RAISE NOTICE '- % trabajadores', (SELECT COUNT(*) FROM trabajadores);
  RAISE NOTICE '- % clientes', (SELECT COUNT(*) FROM clientes);
  RAISE NOTICE '- % productos', (SELECT COUNT(*) FROM productos);
  RAISE NOTICE '- % items de inventario', (SELECT COUNT(*) FROM inventario);
  RAISE NOTICE '- % recetas', (SELECT COUNT(*) FROM receta_arreglo);
  RAISE NOTICE '- % pedidos', (SELECT COUNT(*) FROM pedidos);
  RAISE NOTICE '- % ventas', (SELECT COUNT(*) FROM ventas);
  RAISE NOTICE '- % detalles de ventas', (SELECT COUNT(*) FROM detalle_ventas);
  RAISE NOTICE '- % gastos', (SELECT COUNT(*) FROM gastos);
  RAISE NOTICE '- % registros de historial', (SELECT COUNT(*) FROM historial_estados_pedido);
END $$;

-- ============================================================================
-- Fin del seed data
-- ============================================================================
