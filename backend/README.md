# Sistema de Gestión de Florería "Encantos Eternos" - Backend

Backend API REST para el sistema de gestión de florería.

## Requisitos

- Node.js 16+
- PostgreSQL 14+
- npm o yarn

## Instalación

1. Instalar dependencias:
```bash
cd backend
npm install
```

2. Configurar variables de entorno:
```bash
cp ../.env.example .env
# Editar .env con tus credenciales
```

3. Inicializar base de datos:
```bash
psql -U postgres -f ../database/schema.sql
psql -U postgres -f ../database/seed.sql
```

## Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

### Tests
```bash
npm test
npm run test:coverage
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## Estructura del Proyecto

```
backend/
├── config/          # Configuración (database, logger)
├── middleware/      # Middleware de Express
├── routes/          # Definición de rutas
├── repositories/    # Capa de acceso a datos
├── services/        # Lógica de negocio
├── utils/           # Utilidades
├── tests/           # Tests unitarios y de integración
└── server.js        # Punto de entrada
```
