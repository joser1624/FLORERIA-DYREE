# Database Trigger Tests

This directory contains tests for the database triggers implemented in the florería system.

## Prerequisites

Before running the tests, you need to:

1. **Create a test database**:
   ```bash
   createdb floreria_test
   ```

2. **Initialize the test database with schema and triggers**:
   ```bash
   psql -d floreria_test -f ../database/schema.sql
   psql -d floreria_test -f ../database/triggers.sql
   ```

3. **Configure environment variables** (optional):
   Create a `.env.test` file in the backend directory or set environment variables:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=floreria_test
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

## Running the Tests

### Run all tests:
```bash
npm test
```

### Run only trigger tests:
```bash
npm test triggers.test.js
```

### Run with coverage:
```bash
npm run test:coverage
```

## Test Coverage

The trigger tests cover the following scenarios:

### Test 1: Actualización de inventario al crear venta
- Verifies that inventory is decremented when a sale is created
- Verifies that detalle_ventas records are created with correct costs
- Tests multiple quantity sales

### Test 2: Creación de venta al marcar pedido como entregado
- Verifies that a sale is automatically created when order status changes to 'entregado'
- Verifies that duplicate sales are not created
- Tests the complete order-to-sale conversion flow

### Test 3: Registro de historial de estados
- Verifies that state changes are recorded in historial_estados_pedido
- Verifies that timestamps are recorded correctly
- Verifies that no historial is created when state doesn't change

### Test 4: Actualización de total_compras del cliente
- Verifies that client's total_compras is updated when order is delivered
- Verifies that multiple orders accumulate correctly
- Verifies that total_compras is not updated for non-delivered orders

## Test Data

The tests use isolated test data with IDs 9999 and 9998 to avoid conflicts with production data. All test data is cleaned up after each test using transactions (ROLLBACK).

## Troubleshooting

### Connection errors
- Verify PostgreSQL is running: `pg_isready`
- Check database exists: `psql -l | grep floreria_test`
- Verify credentials in environment variables

### Schema errors
- Ensure schema.sql has been applied to the test database
- Ensure triggers.sql has been applied to the test database
- Check for any migration conflicts

### Test failures
- Check that triggers are properly installed: `psql -d floreria_test -c "\df"`
- Verify table structure matches schema: `psql -d floreria_test -c "\d+ ventas"`
- Review test output for specific error messages
