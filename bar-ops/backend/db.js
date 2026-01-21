import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Pool de conexión preparado para Render (requiere SSL en producción)
const isRender = process.env.DATABASE_URL?.includes('render.com');
const requiresSsl = process.env.NODE_ENV === 'production' || isRender || process.env.PGSSLMODE === 'require';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: requiresSsl ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('📦 Conectado a PostgreSQL');
});

pool.on('error', (error) => {
  console.error('❌ Error inesperado en PostgreSQL', error);
});

export default pool;
