-- ============================================================================
-- Sistema de Gestión de Florería "Encantos Eternos"
-- Database Schema
-- PostgreSQL 14+
-- ============================================================================

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS detalle_ventas CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS historial_estados_pedido CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS receta_arreglo CASCADE;
DROP TABLE IF EXISTS gastos CASCADE;
DROP TABLE IF EXISTS inventario CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS trabajadores CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- ============================================================================
-- Tabla: usuarios
-- Descripción: Usuarios del sistema con roles y autenticación
-- ============================================================================
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('Administrador', 'Empleado', 'Dueña')),
  email VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ultima_sesion TIMESTAMP
);

-- Índices para usuarios
CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);

-- ============================================================================
-- Tabla: trabajadores
-- Descripción: Empleados de la florería que registran ventas
-- ============================================================================
CREATE TABLE trabajadores (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  rol VARCHAR(50) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  fecha_contratacion DATE DEFAULT CURRENT_DATE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para trabajadores
CREATE INDEX idx_trabajadores_nombre ON trabajadores(nombre);
CREATE INDEX idx_trabajadores_activo ON trabajadores(activo);

-- ============================================================================
-- Tabla: clientes
-- Descripción: Clientes con historial de compras
-- ============================================================================
CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  direccion TEXT,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_compras DECIMAL(10,2) DEFAULT 0
);

-- Índices para clientes
CREATE INDEX idx_clientes_nombre ON clientes(nombre);
CREATE INDEX idx_clientes_telefono ON clientes(telefono);

-- ============================================================================
-- Tabla: productos
-- Descripción: Catálogo de productos florales con categorías y márgenes
-- ============================================================================
CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('Ramos', 'Cajas', 'Arreglos', 'Sorpresas', 'Eventos')),
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL CHECK (precio > 0),
  costo DECIMAL(10,2) NOT NULL CHECK (costo >= 0),
  margen_porcentaje DECIMAL(5,2) GENERATED ALWAYS AS ((precio - costo) / costo * 100) STORED,
  imagen_url TEXT,
  activo BOOLEAN DEFAULT true,
  tiene_receta BOOLEAN DEFAULT false,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para productos
CREATE INDEX idx_productos_categoria ON productos(categoria);
CREATE INDEX idx_productos_activo ON productos(activo);
CREATE INDEX idx_productos_nombre ON productos(nombre);
CREATE INDEX idx_productos_tiene_receta ON productos(tiene_receta);

-- ============================================================================
-- Tabla: inventario
-- Descripción: Stock de flores y materiales con alertas de stock bajo
-- ============================================================================
CREATE TABLE inventario (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL CHECK (cantidad >= 0),
  unidad VARCHAR(20) NOT NULL,
  minimo_stock DECIMAL(10,2) NOT NULL CHECK (minimo_stock >= 0),
  costo_unitario DECIMAL(10,2) NOT NULL CHECK (costo_unitario >= 0),
  estado VARCHAR(20) GENERATED ALWAYS AS (
    CASE 
      WHEN cantidad < minimo_stock * 0.5 THEN 'critico'
      WHEN cantidad < minimo_stock THEN 'bajo'
      ELSE 'ok'
    END
  ) STORED,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para inventario
CREATE INDEX idx_inventario_estado ON inventario(estado);
CREATE INDEX idx_inventario_nombre ON inventario(nombre);

-- ============================================================================
-- Tabla: receta_arreglo
-- Descripción: Composición de productos (ingredientes y cantidades)
-- ============================================================================
CREATE TABLE receta_arreglo (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  inventario_id INTEGER NOT NULL REFERENCES inventario(id) ON DELETE RESTRICT,
  cantidad DECIMAL(10,2) NOT NULL CHECK (cantidad > 0),
  UNIQUE(producto_id, inventario_id)
);

-- Índices para receta_arreglo
CREATE INDEX idx_receta_producto ON receta_arreglo(producto_id);
CREATE INDEX idx_receta_inventario ON receta_arreglo(inventario_id);

-- ============================================================================
-- Tabla: pedidos
-- Descripción: Pedidos de clientes con estados y fechas de entrega
-- ============================================================================
CREATE TABLE pedidos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  fecha_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_entrega DATE NOT NULL,
  precio DECIMAL(10,2) NOT NULL CHECK (precio > 0),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' 
    CHECK (estado IN ('pendiente', 'preparando', 'listo', 'entregado', 'cancelado')),
  notas TEXT,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para pedidos
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_producto ON pedidos(producto_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_fecha_entrega ON pedidos(fecha_entrega);
CREATE INDEX idx_pedidos_fecha_pedido ON pedidos(fecha_pedido);

-- ============================================================================
-- Tabla: historial_estados_pedido
-- Descripción: Auditoría de cambios de estado en pedidos
-- ============================================================================
CREATE TABLE historial_estados_pedido (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(20),
  estado_nuevo VARCHAR(20) NOT NULL,
  fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usuario_id INTEGER REFERENCES usuarios(id)
);

-- Índices para historial_estados_pedido
CREATE INDEX idx_historial_pedido ON historial_estados_pedido(pedido_id);
CREATE INDEX idx_historial_fecha ON historial_estados_pedido(fecha_cambio);

-- ============================================================================
-- Tabla: ventas
-- Descripción: Registro de ventas con métodos de pago
-- ============================================================================
CREATE TABLE ventas (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario > 0),
  precio_total DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('Efectivo', 'Yape', 'Tarjeta', 'Transferencia')),
  trabajador_id INTEGER NOT NULL REFERENCES trabajadores(id) ON DELETE RESTRICT,
  pedido_id INTEGER REFERENCES pedidos(id),
  fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para ventas
CREATE INDEX idx_ventas_fecha ON ventas(fecha_venta);
CREATE INDEX idx_ventas_trabajador ON ventas(trabajador_id);
CREATE INDEX idx_ventas_producto ON ventas(producto_id);
CREATE INDEX idx_ventas_pedido ON ventas(pedido_id);
CREATE INDEX idx_ventas_metodo_pago ON ventas(metodo_pago);

-- ============================================================================
-- Tabla: detalle_ventas
-- Descripción: Tracking de inventario usado en cada venta
-- ============================================================================
CREATE TABLE detalle_ventas (
  id SERIAL PRIMARY KEY,
  venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  inventario_id INTEGER NOT NULL REFERENCES inventario(id) ON DELETE RESTRICT,
  cantidad_usada DECIMAL(10,2) NOT NULL CHECK (cantidad_usada > 0),
  costo_unitario DECIMAL(10,2) NOT NULL,
  costo_total DECIMAL(10,2) GENERATED ALWAYS AS (cantidad_usada * costo_unitario) STORED
);

-- Índices para detalle_ventas
CREATE INDEX idx_detalle_venta ON detalle_ventas(venta_id);
CREATE INDEX idx_detalle_inventario ON detalle_ventas(inventario_id);

-- ============================================================================
-- Tabla: gastos
-- Descripción: Gastos operativos con categorías
-- ============================================================================
CREATE TABLE gastos (
  id SERIAL PRIMARY KEY,
  descripcion VARCHAR(200) NOT NULL,
  monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
  categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('Compras', 'Transporte', 'Materiales', 'Servicios', 'Otros')),
  fecha DATE NOT NULL,
  usuario_id INTEGER REFERENCES usuarios(id),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para gastos
CREATE INDEX idx_gastos_fecha ON gastos(fecha);
CREATE INDEX idx_gastos_categoria ON gastos(categoria);
CREATE INDEX idx_gastos_usuario ON gastos(usuario_id);

-- ============================================================================
-- Comentarios de documentación
-- ============================================================================

COMMENT ON TABLE usuarios IS 'Usuarios del sistema con roles y autenticación JWT';
COMMENT ON TABLE trabajadores IS 'Empleados de la florería que registran ventas';
COMMENT ON TABLE clientes IS 'Clientes con historial de compras';
COMMENT ON TABLE productos IS 'Catálogo de productos florales con categorías y márgenes calculados';
COMMENT ON TABLE inventario IS 'Stock de flores y materiales con alertas de stock bajo';
COMMENT ON TABLE receta_arreglo IS 'Composición de productos (ingredientes y cantidades)';
COMMENT ON TABLE pedidos IS 'Pedidos de clientes con estados y fechas de entrega';
COMMENT ON TABLE historial_estados_pedido IS 'Auditoría de cambios de estado en pedidos';
COMMENT ON TABLE ventas IS 'Registro de ventas con métodos de pago';
COMMENT ON TABLE detalle_ventas IS 'Tracking de inventario usado en cada venta';
COMMENT ON TABLE gastos IS 'Gastos operativos con categorías';

-- ============================================================================
-- Fin del schema
-- ============================================================================
