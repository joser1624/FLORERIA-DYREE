/**
 * Authentication Routes
 * Handles user authentication, token generation, and session management
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 25.1
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { comparePassword, generateToken, verifyToken } = require('../utils/auth');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/v1/auth/login
 * Authenticate user and generate JWT token
 * 
 * Request body:
 *   - username: string (required)
 *   - password: string (required)
 * 
 * Response:
 *   - success: boolean
 *   - token: string (JWT token)
 *   - user: { id, username, nombre, rol, email }
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 25.1
 */
router.post('/login', async (req, res, next) => {
  const startTime = Date.now();
  const { username, password } = req.body;
  
  try {
    // Validate input
    if (!username || !password) {
      console.log(`[AUTH] Login attempt failed - Missing credentials - Username: ${username || 'N/A'}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Usuario y contraseña son requeridos',
          details: {}
        }
      });
    }
    
    // Log authentication attempt (Requirement 25.1)
    console.log(`[AUTH] Login attempt - Username: ${username} - Timestamp: ${new Date().toISOString()}`);
    
    // Query user from database
    const result = await query(
      'SELECT id, username, password_hash, nombre, rol, email, activo FROM usuarios WHERE username = $1',
      [username]
    );
    
    // Check if user exists
    if (result.rows.length === 0) {
      const duration = Date.now() - startTime;
      console.log(`[AUTH] Login failed - User not found - Username: ${username} - Duration: ${duration}ms`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Credenciales inválidas',
          details: {}
        }
      });
    }
    
    const user = result.rows[0];
    
    // Check if user is active
    if (!user.activo) {
      const duration = Date.now() - startTime;
      console.log(`[AUTH] Login failed - User inactive - Username: ${username} - Duration: ${duration}ms`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Usuario inactivo',
          details: {}
        }
      });
    }
    
    // Verify password
    const passwordMatch = await comparePassword(password, user.password_hash);
    
    if (!passwordMatch) {
      const duration = Date.now() - startTime;
      console.log(`[AUTH] Login failed - Invalid password - Username: ${username} - Duration: ${duration}ms`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Credenciales inválidas',
          details: {}
        }
      });
    }
    
    // Generate JWT token
    const tokenPayload = {
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      rol: user.rol
    };
    
    const token = generateToken(tokenPayload, '24h');
    
    // Update last session timestamp
    await query(
      'UPDATE usuarios SET ultima_sesion = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    const duration = Date.now() - startTime;
    console.log(`[AUTH] Login successful - Username: ${username} - Role: ${user.rol} - Duration: ${duration}ms`);
    
    // Return success response with token and user data
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        rol: user.rol,
        email: user.email
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[AUTH ERROR] Login error - Username: ${username} - Duration: ${duration}ms`);
    console.error(`[AUTH ERROR] ${error.message}`);
    console.error(`[AUTH ERROR] Stack: ${error.stack}`);
    next(error);
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout user (client-side token removal)
 * 
 * Note: Since we're using stateless JWT tokens, logout is primarily handled
 * client-side by removing the token from storage. This endpoint exists for
 * logging purposes and future session management if needed.
 * 
 * Headers:
 *   - Authorization: Bearer <token>
 * 
 * Response:
 *   - success: boolean
 *   - message: string
 * 
 * Validates: Requirements 1.1, 25.1
 */
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    const user = req.user;
    
    // Log logout event (Requirement 25.1)
    console.log(`[AUTH] Logout - Username: ${user.username} - User ID: ${user.id} - Timestamp: ${new Date().toISOString()}`);
    
    res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
    
  } catch (error) {
    console.error(`[AUTH ERROR] Logout error - User ID: ${req.user?.id || 'N/A'}`);
    console.error(`[AUTH ERROR] ${error.message}`);
    next(error);
  }
});

/**
 * GET /api/v1/auth/verify
 * Verify JWT token validity and return user data
 * 
 * Headers:
 *   - Authorization: Bearer <token>
 * 
 * Response:
 *   - success: boolean
 *   - valid: boolean
 *   - user: { id, username, nombre, rol }
 * 
 * Validates: Requirements 1.1, 1.5, 1.6
 */
router.get('/verify', authenticateToken, async (req, res, next) => {
  try {
    const user = req.user;
    
    // Token is already verified by authenticateToken middleware
    // Check if user still exists and is active in database
    const result = await query(
      'SELECT id, username, nombre, rol, email, activo FROM usuarios WHERE id = $1',
      [user.id]
    );
    
    if (result.rows.length === 0 || !result.rows[0].activo) {
      console.log(`[AUTH] Token verification failed - User not found or inactive - User ID: ${user.id}`);
      return res.status(401).json({
        success: false,
        valid: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Usuario no encontrado o inactivo',
          details: {}
        }
      });
    }
    
    const dbUser = result.rows[0];
    
    console.log(`[AUTH] Token verified - Username: ${dbUser.username} - User ID: ${dbUser.id}`);
    
    res.status(200).json({
      success: true,
      valid: true,
      user: {
        id: dbUser.id,
        username: dbUser.username,
        nombre: dbUser.nombre,
        rol: dbUser.rol,
        email: dbUser.email
      }
    });
    
  } catch (error) {
    console.error(`[AUTH ERROR] Token verification error - User ID: ${req.user?.id || 'N/A'}`);
    console.error(`[AUTH ERROR] ${error.message}`);
    next(error);
  }
});

module.exports = router;
