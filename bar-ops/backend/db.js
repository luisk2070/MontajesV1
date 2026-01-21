import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Pool de conexión preparado para Render (requiere SSL en producción)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

pool.on('connect', () => {
  console.log('📦 Conectado a PostgreSQL');
});

pool.on('error', (error) => {
  console.error('❌ Error inesperado en PostgreSQL', error);
});

export default pool;
