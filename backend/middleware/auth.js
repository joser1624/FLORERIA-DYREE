const { verifyToken } = require('../utils/auth');

/**
 * Middleware to authenticate requests using JWT tokens
 * Validates: Requirements 1.5, 1.6
 * 
 * Extracts JWT token from Authorization header, verifies it,
 * and attaches user data to req.user for downstream handlers.
 * Returns 401 if token is missing or invalid.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function authenticateToken(req, res, next) {
  // Extract token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
  
  // Return 401 if token is absent
  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token de autenticación requerido',
        details: {}
      }
    });
  }
  
  try {
    // Verify token and extract payload
    const decoded = verifyToken(token);
    
    // Attach user data to request object
    req.user = decoded;
    
    // Continue to next middleware/handler
    next();
  } catch (error) {
    // Return 401 if token is invalid or expired
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token de autenticación inválido o expirado',
        details: {}
      }
    });
  }
}

module.exports = {
  authenticateToken
};
