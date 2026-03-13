/**
 * Express Server Configuration
 * Main server file with middleware setup, security headers, logging, and error handling
 * 
 * Validates: Requirements 22.5, 23.5, 24.2, 25.3
 */

require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const { validateConnection } = require('./config/database');

// Validate required environment variables
const requiredEnvVars = ['PORT', 'NODE_ENV'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`[SERVER ERROR] Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('[SERVER ERROR] Please set all required environment variables');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================

// CORS Configuration - Allow requests from frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser - Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security Headers Middleware
app.use((req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS protection in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Remove X-Powered-By header to hide Express
  res.removeHeader('X-Powered-By');
  
  next();
});

// Request Logging Middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Log request details
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  
  // Capture response finish event to log response time and status
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    
    console.log(
      `[${logLevel}] ${req.method} ${req.path} - Status: ${res.statusCode} - ${duration}ms`
    );
  });
  
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API version endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    message: 'Florería Encantos Eternos API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      productos: '/api/v1/productos',
      inventario: '/api/v1/inventario',
      pedidos: '/api/v1/pedidos',
      ventas: '/api/v1/ventas',
      clientes: '/api/v1/clientes',
      trabajadores: '/api/v1/trabajadores',
      gastos: '/api/v1/gastos',
      reportes: '/api/v1/reportes',
      laboratorio: '/api/v1/laboratorio'
    }
  });
});

// Mount route modules
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/productos', require('./routes/productos'));
app.use('/api/v1/inventario', require('./routes/inventario'));
app.use('/api/v1/laboratorio', require('./routes/laboratorio'));
// TODO: Mount remaining route modules as they are implemented
// app.use('/api/v1/pedidos', require('./routes/pedidos'));
// app.use('/api/v1/ventas', require('./routes/ventas'));
// app.use('/api/v1/clientes', require('./routes/clientes'));
// app.use('/api/v1/trabajadores', require('./routes/trabajadores'));
// app.use('/api/v1/gastos', require('./routes/gastos'));
// app.use('/api/v1/reportes', require('./routes/reportes'));

// 404 Handler - Route not found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      details: {
        method: req.method,
        path: req.path
      }
    }
  });
});

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================

app.use((err, req, res, next) => {
  // Log error details
  console.error('[ERROR] Unhandled error occurred:');
  console.error(`[ERROR] Message: ${err.message}`);
  console.error(`[ERROR] Stack: ${err.stack}`);
  console.error(`[ERROR] Request: ${req.method} ${req.path}`);
  
  // Determine status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Determine error code
  let errorCode = 'INTERNAL_ERROR';
  if (statusCode === 400) errorCode = 'BAD_REQUEST';
  else if (statusCode === 401) errorCode = 'UNAUTHORIZED';
  else if (statusCode === 403) errorCode = 'FORBIDDEN';
  else if (statusCode === 404) errorCode = 'NOT_FOUND';
  else if (statusCode === 409) errorCode = 'CONFLICT';
  
  // Build error response
  const errorResponse = {
    success: false,
    error: {
      code: err.code || errorCode,
      message: err.message || 'An unexpected error occurred',
      details: {}
    }
  };
  
  // Include additional details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.details = {
      stack: err.stack,
      ...err.details
    };
  } else {
    // In production, only include safe details
    if (err.details) {
      errorResponse.error.details = err.details;
    }
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    console.log('[SERVER] Starting Florería Encantos Eternos API Server...');
    console.log(`[SERVER] Environment: ${process.env.NODE_ENV}`);
    console.log(`[SERVER] Port: ${PORT}`);
    
    // Validate database connection before starting server
    console.log('[SERVER] Validating database connection...');
    await validateConnection();
    
    // Start listening
    app.listen(PORT, () => {
      console.log('[SERVER] ✓ Server started successfully');
      console.log(`[SERVER] ✓ Listening on http://localhost:${PORT}`);
      console.log(`[SERVER] ✓ API available at http://localhost:${PORT}/api/v1`);
      console.log(`[SERVER] ✓ Health check at http://localhost:${PORT}/health`);
      console.log('[SERVER] Ready to accept requests');
    });
  } catch (error) {
    console.error('[SERVER ERROR] Failed to start server');
    console.error(`[SERVER ERROR] ${error.message}`);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message);
  console.error('[FATAL] Stack:', err.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise);
  console.error('[FATAL] Reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SERVER] SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
