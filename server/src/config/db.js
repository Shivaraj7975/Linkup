const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';
const host = process.env.DB_HOST || '127.0.0.1';

const isRemoteHost = (h) => {
  if (!h) return false;
  return (
    h.includes('azure') ||
    h.includes('render') ||
    h.includes('neon') ||
    h.includes('supabase') ||
    h.includes('amazonaws')
  );
};

const useSsl =
  isProduction ||
  process.env.DB_SSL === 'true' ||
  isRemoteHost(host) ||
  Boolean(process.env.DATABASE_URL);

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    }
  : {
      host: host === 'localhost' ? '127.0.0.1' : host,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'linkup_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error(
    'Unexpected PostgreSQL pool client error:',
    err.message
  );
});

const query = (text, params) => pool.query(text, params);

const testConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW()');

    return {
      connected: true,
      timestamp: res.rows[0].now,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
    };
  }
};

module.exports = {
  pool,
  query,
  testConnection,
};
