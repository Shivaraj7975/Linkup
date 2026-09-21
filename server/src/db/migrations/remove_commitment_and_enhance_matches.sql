-- Migration: remove_commitment_and_enhance_matches.sql
-- Removes commitment_level from melds and enriches matches with component scores

-- 1. Alter melds table: make commitment_level nullable
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'melds' AND column_name = 'commitment_level'
    ) THEN
        ALTER TABLE melds ALTER COLUMN commitment_level DROP NOT NULL;
    END IF;
END $$;

-- 2. Enhance matches table with component scores and metadata
ALTER TABLE matches ADD COLUMN IF NOT EXISTS skill_score INT DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS role_fit_score INT DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS project_relevance_score INT DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS interest_score INT DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS availability_score INT DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_complement_score INT DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS role_name VARCHAR(100) DEFAULT NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS algorithm_version VARCHAR(20) DEFAULT '2';

-- 3. Drop restrictive CHECK constraint on generated_by if present so all AI providers and fallbacks can be logged
DO $$
BEGIN
    ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_generated_by_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- 4. Create index on algorithm_version
CREATE INDEX IF NOT EXISTS idx_matches_algorithm_version ON matches(algorithm_version);
