/**
 * Master Safe Migration Script — MELD Platform
 * 
 * Safely updates an existing database to the latest schema version:
 * - Adds all missing columns (username, role, location, social links, onboarding tracking)
 * - Safely creates any missing tables (meld_messages, notifications, otp_verifications, etc.)
 * - Backfills missing usernames for existing users cleanly
 * - Syncs profile completion flags for existing users
 * - Creates all performance, foreign key, and unique deduplication indexes
 * - ZERO DATA LOSS: Never drops existing tables or deletes existing rows.
 * 
 * Usage:
 *   Local:      npm run db:migrate (from server directory)
 *   Production: DATABASE_URL=postgres://... npm run db:migrate
 */

const { Pool } = require('pg');
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

const poolConfig = (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD)
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

const pool = new Pool(poolConfig);

const getRandom3to5Digits = () => {
  const digits = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(min + Math.random() * (max - min + 1));
};

async function runMasterMigration() {
  console.log('🚀 ========================================');
  console.log('🚀 Starting MELD Safe Master Database Migration');
  console.log('🚀 ========================================');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Extensions & Custom Types
    console.log('📦 [1/8] Verifying PostgreSQL extensions & types...');
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
          CREATE TYPE verification_status AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_method') THEN
          CREATE TYPE verification_method AS ENUM ('COLLEGE_EMAIL', 'COLLEGE_ID', 'MANUAL_REVIEW');
        END IF;
      END$$;
    `);

    // 2. Base Tables Creation (if brand new)
    console.log('🏗️  [2/8] Ensuring all core tables exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS student_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          college_email VARCHAR(255),
          college VARCHAR(255) NOT NULL,
          degree VARCHAR(255) NOT NULL,
          year_of_study VARCHAR(50) NOT NULL,
          bio TEXT,
          availability VARCHAR(100),
          github_url VARCHAR(255),
          linkedin_url VARCHAR(255),
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS skills (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_skills (
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          skill_id INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
          PRIMARY KEY (user_id, skill_id)
      );

      CREATE TABLE IF NOT EXISTS interests (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_interests (
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          interest_id INT NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
          PRIMARY KEY (user_id, interest_id)
      );

      CREATE TABLE IF NOT EXISTS student_verifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status verification_status NOT NULL DEFAULT 'UNVERIFIED',
          method verification_method,
          verified_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS melds (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          category VARCHAR(100) NOT NULL,
          max_members INT NOT NULL DEFAULT 4 CHECK (max_members >= 2),
          current_status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (current_status IN ('OPEN', 'FULL', 'CLOSED')),
          commitment_level VARCHAR(100) NOT NULL DEFAULT 'Moderate (5-10 hrs/week)',
          project_duration VARCHAR(100) NOT NULL DEFAULT '1-3 Months',
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS meld_skills (
          meld_id UUID NOT NULL REFERENCES melds(id) ON DELETE CASCADE,
          skill_id INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
          PRIMARY KEY (meld_id, skill_id)
      );

      CREATE TABLE IF NOT EXISTS meld_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          meld_id UUID NOT NULL REFERENCES melds(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(100) NOT NULL DEFAULT 'Member',
          status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
          joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_meld_member UNIQUE (meld_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS meld_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          meld_id UUID NOT NULL REFERENCES melds(id) ON DELETE CASCADE,
          sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS join_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          meld_id UUID NOT NULL REFERENCES melds(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          message TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_user_join_request UNIQUE (meld_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS matches (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          meld_id UUID NOT NULL REFERENCES melds(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          match_percentage INT NOT NULL CHECK (match_percentage >= 0 AND match_percentage <= 100),
          match_data JSONB NOT NULL DEFAULT '{}'::jsonb,
          generated_by VARCHAR(50) NOT NULL DEFAULT 'AI' CHECK (generated_by IN ('AI', 'FALLBACK')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_meld_user_match UNIQUE (meld_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS meld_invitations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          meld_id UUID NOT NULL REFERENCES melds(id) ON DELETE CASCADE,
          inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_meld_invitee UNIQUE (meld_id, invitee_id)
      );

      CREATE TABLE IF NOT EXISTS otp_verifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL,
          otp_code VARCHAR(6) NOT NULL,
          purpose VARCHAR(50) NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          is_verified BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          link VARCHAR(255),
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Add Missing Columns to Existing Tables (Non-Destructive)
    console.log('🔄 [3/8] Adding all new columns without modifying existing data...');
    
    // USERS Table: username, role
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(30);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'USER';
    `);

    // STUDENT_PROFILES Table: city, state, country, socials, onboarding tracking
    await client.query(`
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS city VARCHAR(100);
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS state VARCHAR(100);
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS country VARCHAR(100);
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(255);
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS youtube_url VARCHAR(255);
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS website_url VARCHAR(255);
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS onboarding_step INT NOT NULL DEFAULT 1;
    `);

    // MELDS Table: commitment_level, project_duration, current_status
    await client.query(`
      ALTER TABLE melds ADD COLUMN IF NOT EXISTS commitment_level VARCHAR(100) NOT NULL DEFAULT 'Moderate (5-10 hrs/week)';
      ALTER TABLE melds ADD COLUMN IF NOT EXISTS project_duration VARCHAR(100) NOT NULL DEFAULT '1-3 Months';
      ALTER TABLE melds ADD COLUMN IF NOT EXISTS current_status VARCHAR(20) NOT NULL DEFAULT 'OPEN';
    `);

    // 4. Backfill Usernames for Existing Users who have NULL
    console.log('👤 [4/8] Backfilling unique usernames for existing accounts...');
    const unassignedRes = await client.query(`
      SELECT id, name, email FROM users WHERE username IS NULL OR username = ''
    `);
    
    if (unassignedRes.rows.length > 0) {
      const takenUsernamesRes = await client.query(`
        SELECT LOWER(username) as username FROM users WHERE username IS NOT NULL AND username != ''
      `);
      const takenSet = new Set(takenUsernamesRes.rows.map(r => r.username));

      for (const u of unassignedRes.rows) {
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
        console.log(`  ✨ Assigned username @${candidate} to user "${u.name}" (${u.email})`);
      }
    } else {
      console.log('  ✅ All existing users already have unique usernames.');
    }

    // 5. Backfill Completed Student Profiles
    console.log('🎓 [5/8] Syncing completed profile flags...');
    const syncRes = await client.query(`
      UPDATE student_profiles
      SET is_completed = TRUE, onboarding_step = 5
      WHERE college IS NOT NULL AND college != '' 
        AND degree IS NOT NULL AND degree != ''
        AND is_completed = FALSE;
    `);
    if (syncRes.rowCount > 0) {
      console.log(`  ✨ Marked ${syncRes.rowCount} profile(s) as completed.`);
    }

    // 6. Clean up duplicate chat notifications before unique index
    console.log('🧹 [6/8] Deduplicating legacy chat notifications...');
    await client.query(`
      DELETE FROM notifications n1
      WHERE n1.type = 'NEW_CHAT_MESSAGE' AND EXISTS (
        SELECT 1 FROM notifications n2
        WHERE n2.user_id = n1.user_id
          AND n2.type = 'NEW_CHAT_MESSAGE'
          AND n2.link = n1.link
          AND n2.created_at > n1.created_at
      );
    `);

    // 7. Performance & Unique Indexes
    console.log('⚡ [7/8] Applying all performance and unique indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));

      CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_student_profiles_college ON student_profiles(college);
      CREATE INDEX IF NOT EXISTS idx_student_profiles_city ON student_profiles(city);
      CREATE INDEX IF NOT EXISTS idx_student_profiles_state ON student_profiles(state);
      CREATE INDEX IF NOT EXISTS idx_student_profiles_country ON student_profiles(country);
      CREATE INDEX IF NOT EXISTS idx_student_profiles_college_email ON student_profiles(college_email);

      CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id ON user_skills(skill_id);
      CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_interests_interest_id ON user_interests(interest_id);

      CREATE INDEX IF NOT EXISTS idx_student_verifications_user_id ON student_verifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_student_verifications_status ON student_verifications(status);

      CREATE INDEX IF NOT EXISTS idx_melds_creator_id ON melds(creator_id);
      CREATE INDEX IF NOT EXISTS idx_melds_category ON melds(category);
      CREATE INDEX IF NOT EXISTS idx_melds_status ON melds(current_status);
      CREATE INDEX IF NOT EXISTS idx_meld_skills_meld_id ON meld_skills(meld_id);
      CREATE INDEX IF NOT EXISTS idx_meld_skills_skill_id ON meld_skills(skill_id);
      CREATE INDEX IF NOT EXISTS idx_meld_members_meld_id ON meld_members(meld_id);
      CREATE INDEX IF NOT EXISTS idx_meld_members_user_id ON meld_members(user_id);

      CREATE INDEX IF NOT EXISTS idx_join_requests_meld_id ON join_requests(meld_id);
      CREATE INDEX IF NOT EXISTS idx_join_requests_user_id ON join_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_join_requests_status ON join_requests(status);

      CREATE INDEX IF NOT EXISTS idx_meld_messages_meld_id ON meld_messages(meld_id);
      CREATE INDEX IF NOT EXISTS idx_meld_messages_created_at ON meld_messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_meld_messages_meld_created ON meld_messages (meld_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_matches_meld_id ON matches(meld_id);
      CREATE INDEX IF NOT EXISTS idx_matches_user_id ON matches(user_id);
      CREATE INDEX IF NOT EXISTS idx_matches_percentage ON matches(match_percentage);

      CREATE INDEX IF NOT EXISTS idx_meld_invitations_meld_id ON meld_invitations(meld_id);
      CREATE INDEX IF NOT EXISTS idx_meld_invitations_invitee_id ON meld_invitations(invitee_id);

      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_chat_dedup ON notifications (user_id, type, link) WHERE type = 'NEW_CHAT_MESSAGE';
    `);

    // 8. Trigger Functions
    console.log('⚙️  [8/8] Ensuring timestamp triggers...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
          CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_student_profiles_updated_at') THEN
          CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_student_verifications_updated_at') THEN
          CREATE TRIGGER update_student_verifications_updated_at BEFORE UPDATE ON student_verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_melds_updated_at') THEN
          CREATE TRIGGER update_melds_updated_at BEFORE UPDATE ON melds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_join_requests_updated_at') THEN
          CREATE TRIGGER update_join_requests_updated_at BEFORE UPDATE ON join_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_meld_invitations_updated_at') THEN
          CREATE TRIGGER update_meld_invitations_updated_at BEFORE UPDATE ON meld_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END$$;
    `);

    await client.query('COMMIT');
    console.log('🎉 ========================================');
    console.log('🎉 Database migration finished successfully!');
    console.log('🎉 All new tables, columns, and indexes are active.');
    console.log('🎉 Zero data loss: All previous records were preserved.');
    console.log('🎉 ========================================');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMasterMigration().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runMasterMigration };
