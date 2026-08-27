/**
 * Database Migration Script — v1.01 Release (Chat Integration)
 * 
 * Safely creates the new `meld_messages` table for real-time chat
 * without dropping any existing data.
 * 
 * Usage:
 *   Set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in server/.env
 *   Then run: node server/src/db/migrate_v1_01.js
 */

const { Client } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

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

const host = process.env.DB_HOST || '127.0.0.1';
const useSsl =
  process.env.NODE_ENV === 'production' ||
  process.env.DB_SSL === 'true' ||
  isRemoteHost(host) ||
  Boolean(process.env.DATABASE_URL);

const clientConfig = process.env.DATABASE_URL
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

const client = new Client(clientConfig);

const migrationQuery = `
-- 10.5 MELD_MESSAGES Table (Real-time Group Chat)
CREATE TABLE IF NOT EXISTS meld_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meld_id UUID NOT NULL REFERENCES melds(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meld_messages_meld_id ON meld_messages(meld_id);
CREATE INDEX IF NOT EXISTS idx_meld_messages_created_at ON meld_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_meld_messages_meld_created ON meld_messages (meld_id, created_at DESC);
`;

console.log('🚀 Starting v1.01 Database Migration...');

client.connect()
  .then(() => {
    console.log('✅ Connected to database.');
    console.log('⚙️ Executing SQL migration...');
    return client.query(migrationQuery);
  })
  .then(() => { 
    console.log('🎉 Migration successful! `meld_messages` table is ready.'); 
    client.end(); 
  })
  .catch(e => { 
    console.error('❌ Migration failed:', e); 
    client.end(); 
  });
