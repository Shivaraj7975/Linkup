const fs = require('fs');
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

/**
 * Configure TLS certificate verification safely
 */
const getSslConfig = () => {
  if (!useSsl) return false;

  const ssl = {};

  // Support custom CA certificate passed via environment variable or file
  if (process.env.DB_SSL_CA) {
    ssl.ca = process.env.DB_SSL_CA;
  } else if (process.env.DB_CA_CERT) {
    ssl.ca = process.env.DB_CA_CERT;
  } else if (process.env.DB_SSL_CA_PATH) {
    try {
      ssl.ca = fs.readFileSync(process.env.DB_SSL_CA_PATH, 'utf-8');
    } catch (e) {
      console.warn('⚠️ Could not load DB_SSL_CA_PATH certificate file.');
    }
  }

  // Determine certificate validation behavior
  // Secure by default: in production, reject unauthorized certificates
  if (process.env.DB_SSL_REJECT_UNAUTHORIZED !== undefined) {
    ssl.rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true';
  } else if (process.env.DB_REJECT_UNAUTHORIZED !== undefined) {
    ssl.rejectUnauthorized = process.env.DB_REJECT_UNAUTHORIZED === 'true';
  } else if (isProduction && ssl.ca) {
    ssl.rejectUnauthorized = true;
  } else if (isProduction) {
    ssl.rejectUnauthorized = true;
  } else {
    ssl.rejectUnauthorized = false;
  }

  return ssl;
};

const sslConfig = getSslConfig();

const poolConfig = (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD)
  ? {
      host: host === 'localhost' ? '127.0.0.1' : host,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'linkup_db',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: sslConfig,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  // Never log raw connection strings or database credentials
  console.error(
    'Unexpected PostgreSQL pool client error:',
    err?.message || 'Database connection error'
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
  getSslConfig,
};
