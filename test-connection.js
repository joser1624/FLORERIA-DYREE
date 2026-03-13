// Script simple para verificar conexión a PostgreSQL
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'floreria_encantos_eternos',
  user: 'postgres',
  password: 'betojose243',
});

async function testConnection() {
  console.log('='.repeat(60));
  console.log('VERIFICACIÓN DE CONEXIÓN AL SERVIDOR POSTGRESQL');
  console.log('='.repeat(60));
  console.log('');
  console.log('Configuración:');
  console.log(`  Host: localhost`);
  console.log(`  Puerto: 5432`);
  console.log(`  Base de datos: floreria_encantos_eternos`);
  console.log(`  Usuario: postgres`);
  console.log('');
  
  try {
    console.log('Intentando conectar...');
    const client = await pool.connect();
    console.log('✅ CONEXIÓN EXITOSA');
    console.log('');
    
    // Obtener versión de PostgreSQL
    const versionResult = await client.query('SELECT version()');
    console.log('Versión del servidor:');
    console.log(`  ${versionResult.rows[0].version}`);
    console.log('');
    
    // Obtener hora del servidor
    const timeResult = await client.query('SELECT NOW() as server_time');
    console.log('Hora del servidor:');
    console.log(`  ${timeResult.rows[0].server_time}`);
    console.log('');
    
    // Contar tablas
    const tablesResult = await client.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tablas en la base de datos:');
    console.log(`  ${tablesResult.rows[0].table_count} tablas encontradas`);
    console.log('');
    
    client.release();
    
    console.log('='.repeat(60));
    console.log('✅ SERVIDOR CONECTADO Y FUNCIONANDO CORRECTAMENTE');
    console.log('='.repeat(60));
    
    await pool.end();
    process.exit(0);
    
  } catch (err) {
    console.log('❌ ERROR DE CONEXIÓN');
    console.log('');
    console.log('Detalles del error:');
    console.log(`  Mensaje: ${err.message}`);
    console.log(`  Código: ${err.code || 'N/A'}`);
    console.log('');
    console.log('='.repeat(60));
    console.log('❌ NO SE PUDO CONECTAR AL SERVIDOR');
    console.log('='.repeat(60));
    
    await pool.end();
    process.exit(1);
  }
}

testConnection();
