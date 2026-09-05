const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'meld_db',
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running social links migration...');
    await client.query(`
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(255);
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS youtube_url VARCHAR(255);
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS website_url VARCHAR(255);
    `);
    console.log('✅ Social links columns added successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
