/**
 * Database Migration Script — Custom Usernames & Resumable Onboarding
 * 
 * 1. Adds `username VARCHAR(30)` to `users` table.
 * 2. Adds `is_completed BOOLEAN DEFAULT FALSE` and `onboarding_step INT DEFAULT 1` to `student_profiles`.
 * 3. Safely populates unique usernames for existing users using their first name + random 3-5 digit number.
 * 4. Marks existing completed student profiles as `is_completed = TRUE`.
 * 5. Creates case-insensitive UNIQUE index on LOWER(username).
 * 
 * Usage:
 *   node server/src/db/migrate_username.js
 */

const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

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

const clientConfig = (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD)
  ? {
      host: host === 'localhost' ? '127.0.0.1' : host,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'linkup_db',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    }
  : {
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    };

const client = new Client(clientConfig);

// Helper to generate random 3 to 5 digit number (100 to 99999)
const getRandom3to5Digits = () => {
  const digits = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(min + Math.random() * (max - min + 1));
};

async function runMigration() {
  console.log('🚀 Starting Username & Onboarding Migration...');
  try {
    await client.connect();
    console.log('✅ Connected to database.');

    await client.query('BEGIN');

    // 1. Add username column to users if not exists
    console.log('⚙️ Ensuring `username` column in `users` table...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(30);
    `);

    // 2. Add is_completed and onboarding_step to student_profiles
    console.log('⚙️ Ensuring `is_completed` and `onboarding_step` columns in `student_profiles`...');
    await client.query(`
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS onboarding_step INT NOT NULL DEFAULT 1;
    `);

    // 3. Query all users that need a username
    const existingUsersRes = await client.query(`
      SELECT id, name, email FROM users WHERE username IS NULL OR username = ''
    `);
    const usersToUpdate = existingUsersRes.rows;
    console.log(`📋 Found ${usersToUpdate.length} user(s) requiring a username.`);

    // Get all currently used usernames in database
    const takenUsernamesRes = await client.query(`
      SELECT LOWER(username) as username FROM users WHERE username IS NOT NULL AND username != ''
    `);
    const takenSet = new Set(takenUsernamesRes.rows.map(r => r.username));

    for (const u of usersToUpdate) {
      const rawFirst = (u.name || '').trim().split(/\s+/)[0];
      let base = rawFirst.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (base.length < 3) base = 'user';
      if (base.length > 20) base = base.substring(0, 20);

      let candidate = '';
      let attempts = 0;
      do {
        const num = getRandom3to5Digits();
        candidate = `${base}${num}`.substring(0, 30);
        attempts++;
        if (attempts > 500) {
          candidate = `${base}${Date.now().toString().slice(-5)}`.substring(0, 30);
          break;
        }
      } while (takenSet.has(candidate.toLowerCase()));

      takenSet.add(candidate.toLowerCase());

      await client.query(
        'UPDATE users SET username = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [candidate, u.id]
      );
      console.log(`  👤 Assigned username @${candidate} to user "${u.name}" (${u.email})`);
    }

    // 4. Mark existing users who have already entered college/degree as completed
    console.log('⚙️ Syncing existing completed profiles...');
    const syncRes = await client.query(`
      UPDATE student_profiles
      SET is_completed = TRUE, onboarding_step = 5
      WHERE college IS NOT NULL AND college != '' 
        AND degree IS NOT NULL AND degree != ''
        AND is_completed = FALSE;
    `);
    console.log(`  ✨ Marked ${syncRes.rowCount} existing profile(s) as completed.`);

    // 5. Create unique case-insensitive index on username
    console.log('⚙️ Creating unique index on LOWER(username)...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
    `);

    await client.query('COMMIT');
    console.log('🎉 Migration successful! All users have unique usernames and onboarding fields are configured.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

runMigration().catch((err) => {
  console.error(err);
  process.exit(1);
});
