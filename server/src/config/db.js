require('dotenv').config();
const { Pool } = require('pg');

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'meld_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',

      // Azure PostgreSQL requires an encrypted connection
      ssl: {
        rejectUnauthorized: false,
      },
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
