/**
 * Script to create a test user with proper password hash
 */

require('dotenv').config({ path: '../.env' });
const { query } = require('../config/database');
const { hashPassword } = require('../utils/auth');

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    // Hash the password "password123"
    const hashedPassword = await hashPassword('password123');
    console.log('Password hashed successfully');
    
    // Insert or update admin user with proper hash
    const result = await query(
      `INSERT INTO usuarios (username, password_hash, nombre, rol, email, activo)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (username) DO UPDATE 
       SET password_hash = $2
       RETURNING id, username, nombre, rol`,
      ['admin', hashedPassword, 'Admin User', 'Administrador', 'admin@test.com', true]
    );
    
    if (result.rows.length > 0) {
      console.log('✓ Test user created/updated successfully:');
      console.log(`  Username: ${result.rows[0].username}`);
      console.log(`  Name: ${result.rows[0].nombre}`);
      console.log(`  Role: ${result.rows[0].rol}`);
      console.log(`  Password: password123`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error.message);
    process.exit(1);
  }
}

createTestUser();
