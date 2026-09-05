-- =================================================================
-- MELD Master Non-Destructive Database Migration Script (v1.1.0)
-- 
-- SAFE FOR EXISTING DATABASES:
-- - Uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
-- - Uses `CREATE TABLE IF NOT EXISTS`
-- - Uses `CREATE INDEX IF NOT EXISTS`
-- - DOES NOT DROP ANY TABLES OR DELETE ANY EXISTING ROWS
-- =================================================================

-- 1. EXTENSIONS & TYPES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE verification_status AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_method') THEN
    CREATE TYPE verification_method AS ENUM ('COLLEGE_EMAIL', 'COLLEGE_ID', 'MANUAL_REVIEW');
  END IF;
END$$;

-- 2. CREATE CORE TABLES IF NOT ALREADY EXISTING
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    username VARCHAR(30) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    college_email VARCHAR(255),
    college VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    degree VARCHAR(255) NOT NULL,
    year_of_study VARCHAR(50) NOT NULL,
    bio TEXT,
    availability VARCHAR(100),
    github_url VARCHAR(255),
    linkedin_url VARCHAR(255),
    instagram_url VARCHAR(255),
    youtube_url VARCHAR(255),
    website_url VARCHAR(255),
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_step INT NOT NULL DEFAULT 1,
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

-- 3. ADD NEW COLUMNS TO EXISTING TABLES
-- Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'USER';

-- Student Profiles
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(255);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS youtube_url VARCHAR(255);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS website_url VARCHAR(255);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS onboarding_step INT NOT NULL DEFAULT 1;

-- Melds
ALTER TABLE melds ADD COLUMN IF NOT EXISTS commitment_level VARCHAR(100) NOT NULL DEFAULT 'Moderate (5-10 hrs/week)';
ALTER TABLE melds ADD COLUMN IF NOT EXISTS project_duration VARCHAR(100) NOT NULL DEFAULT '1-3 Months';
ALTER TABLE melds ADD COLUMN IF NOT EXISTS current_status VARCHAR(20) NOT NULL DEFAULT 'OPEN';

-- 4. BACKFILL VALUES SAFELY
-- Backfill usernames for existing users who have NULL username
UPDATE users
SET username = LOWER(REGEXP_REPLACE(SPLIT_PART(name, ' ', 1), '[^a-zA-Z0-9]', '', 'g')) || SUBSTRING(id::text, 1, 4)
WHERE username IS NULL OR username = '';

-- Backfill profile completion flag for users who already filled profile
UPDATE student_profiles
SET is_completed = TRUE, onboarding_step = 5
WHERE college IS NOT NULL AND college != '' 
  AND degree IS NOT NULL AND degree != ''
  AND is_completed = FALSE;

-- 5. PERFORMANCE & DEDUPLICATION INDEXES
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

-- 6. TRIGGERS
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
