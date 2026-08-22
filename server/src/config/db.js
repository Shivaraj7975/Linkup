require('dotenv').config();
const { Pool } = require('pg');

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'linkup_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    };

const pool = new Pool(poolConfig);

// Suppress unexpected pool client errors to avoid unhandled process crash
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool client error:', err.message);
});

/**
 * Utility method to run database queries
 * @param {string} text 
 * @param {Array} params 
 */
const query = (text, params) => pool.query(text, params);

/**
 * Check database connection status
 * @returns {Promise<boolean>}
 */
const testConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    return { connected: true, timestamp: res.rows[0].now };
  } catch (error) {
    return { connected: false, error: error.message };
  }
};

module.exports = {
  pool,
  query,
  testConnection,
};
