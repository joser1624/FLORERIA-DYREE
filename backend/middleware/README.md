# Middleware

Este directorio contiene middleware de Express para el backend de la florería.

## auth.js

Middleware de autenticación JWT para proteger endpoints administrativos.

### Uso

```javascript
const express = require('express');
const { authenticateToken } = require('./middleware/auth');

const app = express();

// Endpoint público (sin autenticación)
app.get('/api/v1/productos', (req, res) => {
  // Cualquiera puede ver productos
  res.json({ productos: [] });
});

// Endpoint protegido (requiere autenticación)
app.post('/api/v1/productos', authenticateToken, (req, res) => {
  // Solo usuarios autenticados pueden crear productos
  // Los datos del usuario están disponibles en req.user
  console.log('Usuario autenticado:', req.user);
  res.json({ success: true });
});

// Proteger múltiples rutas
const router = express.Router();
router.use(authenticateToken); // Aplica a todas las rutas del router

router.get('/ventas', (req, res) => {
  // Requiere autenticación
});

router.post('/ventas', (req, res) => {
  // Requiere autenticación
});

app.use('/api/v1/admin', router);
```

### Formato del Token

El middleware espera que el token JWT se envíe en el header `Authorization` con el formato:

```
Authorization: Bearer <token>
```

### Respuestas de Error

**401 - Token ausente:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token de autenticación requerido",
    "details": {}
  }
}
```

**401 - Token inválido o expirado:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token de autenticación inválido o expirado",
    "details": {}
  }
}
```

### Datos del Usuario

Cuando la autenticación es exitosa, el middleware adjunta los datos del usuario decodificados del token a `req.user`:

```javascript
app.get('/api/v1/perfil', authenticateToken, (req, res) => {
  // req.user contiene: { id, username, role, ... }
  res.json({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role
  });
});
```

### Validación de Roles

Para validar roles específicos, puedes crear middleware adicional:

```javascript
function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'No tiene permisos para realizar esta operación',
          details: { required_role: role, user_role: req.user.role }
        }
      });
    }
    next();
  };
}

// Solo administradores pueden eliminar productos
app.delete('/api/v1/productos/:id', 
  authenticateToken, 
  requireRole('Administrador'), 
  (req, res) => {
    // Eliminar producto
  }
);
```
