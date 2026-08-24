-- Enable pgcrypto for UUID generation if needed (gen_random_uuid is built-in in PostgreSQL 13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if re-initializing (in reverse dependency order)
DROP TABLE IF EXISTS linkup_invitations CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS join_requests CASCADE;
DROP TABLE IF EXISTS linkup_members CASCADE;
DROP TABLE IF EXISTS linkup_skills CASCADE;
DROP TABLE IF EXISTS linkups CASCADE;
DROP TABLE IF EXISTS student_verifications CASCADE;
DROP TABLE IF EXISTS user_interests CASCADE;
DROP TABLE IF EXISTS interests CASCADE;
DROP TABLE IF EXISTS user_skills CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS student_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS verification_status CASCADE;
DROP TYPE IF EXISTS verification_method CASCADE;

-- Create custom ENUM types for verification
CREATE TYPE verification_status AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE verification_method AS ENUM ('COLLEGE_EMAIL', 'COLLEGE_ID', 'MANUAL_REVIEW');

-- 1. USERS Table (email = personal/primary email used for login)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. STUDENT_PROFILES Table (1-to-1 with USERS)
-- college_email = institutional email used for student verification
CREATE TABLE student_profiles (
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. SKILLS Table
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 4. USER_SKILLS Table (Many-to-Many join table)
CREATE TABLE user_skills (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, skill_id)
);

-- 5. INTERESTS Table
CREATE TABLE interests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 6. USER_INTERESTS Table (Many-to-Many join table)
CREATE TABLE user_interests (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interest_id INT NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, interest_id)
);

-- 7. STUDENT_VERIFICATIONS Table (1-to-1 with USERS)
CREATE TABLE student_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status verification_status NOT NULL DEFAULT 'UNVERIFIED',
    method verification_method,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. LINKUPS Table
CREATE TABLE linkups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    max_members INT NOT NULL DEFAULT 4 CHECK (max_members >= 2),
    current_status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (current_status IN ('OPEN', 'FULL', 'CLOSED')),
    commitment_level VARCHAR(100) NOT NULL,
    project_duration VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. LINKUP_SKILLS Table (Many-to-Many join table)
CREATE TABLE linkup_skills (
    linkup_id UUID NOT NULL REFERENCES linkups(id) ON DELETE CASCADE,
    skill_id INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (linkup_id, skill_id)
);

-- 10. LINKUP_MEMBERS Table
CREATE TABLE linkup_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    linkup_id UUID NOT NULL REFERENCES linkups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL DEFAULT 'Member',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_linkup_member UNIQUE (linkup_id, user_id)
);

-- 11. JOIN_REQUESTS Table
CREATE TABLE join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    linkup_id UUID NOT NULL REFERENCES linkups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_join_request UNIQUE (linkup_id, user_id)
);

-- 12. MATCHES Table (Phase 7 AI Match Results Persistence & Caching)
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    linkup_id UUID NOT NULL REFERENCES linkups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_percentage INT NOT NULL CHECK (match_percentage >= 0 AND match_percentage <= 100),
    match_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    generated_by VARCHAR(50) NOT NULL DEFAULT 'AI' CHECK (generated_by IN ('AI', 'FALLBACK')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_linkup_user_match UNIQUE (linkup_id, user_id)
);

-- 13. LINKUP_INVITATIONS Table
CREATE TABLE linkup_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    linkup_id UUID NOT NULL REFERENCES linkups(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_linkup_invitee UNIQUE (linkup_id, invitee_id)
);

-- 14. OTP_VERIFICATIONS Table
CREATE TABLE otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- 'REGISTRATION' | 'COLLEGE_VERIFICATION'
    expires_at TIMESTAMPTZ NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX idx_student_profiles_college ON student_profiles(college);
CREATE INDEX idx_student_profiles_city ON student_profiles(city);
CREATE INDEX idx_student_profiles_state ON student_profiles(state);
CREATE INDEX idx_student_profiles_country ON student_profiles(country);
CREATE INDEX idx_student_profiles_college_email ON student_profiles(college_email);
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill_id ON user_skills(skill_id);
CREATE INDEX idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX idx_user_interests_interest_id ON user_interests(interest_id);
CREATE INDEX idx_student_verifications_user_id ON student_verifications(user_id);
CREATE INDEX idx_student_verifications_status ON student_verifications(status);

CREATE INDEX idx_linkups_creator_id ON linkups(creator_id);
CREATE INDEX idx_linkups_category ON linkups(category);
CREATE INDEX idx_linkups_status ON linkups(current_status);
CREATE INDEX idx_linkup_skills_linkup_id ON linkup_skills(linkup_id);
CREATE INDEX idx_linkup_skills_skill_id ON linkup_skills(skill_id);
CREATE INDEX idx_linkup_members_linkup_id ON linkup_members(linkup_id);
CREATE INDEX idx_linkup_members_user_id ON linkup_members(user_id);
CREATE INDEX idx_join_requests_linkup_id ON join_requests(linkup_id);
CREATE INDEX idx_join_requests_user_id ON join_requests(user_id);
CREATE INDEX idx_join_requests_status ON join_requests(status);

CREATE INDEX idx_matches_linkup_id ON matches(linkup_id);
CREATE INDEX idx_matches_user_id ON matches(user_id);
CREATE INDEX idx_matches_percentage ON matches(match_percentage);

CREATE INDEX idx_linkup_invitations_linkup_id ON linkup_invitations(linkup_id);
CREATE INDEX idx_linkup_invitations_invitee_id ON linkup_invitations(invitee_id);

-- Function and Triggers for automatic updated_at timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_verifications_updated_at BEFORE UPDATE ON student_verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_linkups_updated_at BEFORE UPDATE ON linkups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_join_requests_updated_at BEFORE UPDATE ON join_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_linkup_invitations_updated_at BEFORE UPDATE ON linkup_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
