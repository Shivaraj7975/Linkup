const { pool, query } = require('../config/db');

/**
 * Fetch all available skills
 */
const getAllSkills = async () => {
  const res = await query('SELECT id, name FROM skills ORDER BY name ASC');
  return res.rows;
};

/**
 * Fetch all available interests
 */
const getAllInterests = async () => {
  const res = await query('SELECT id, name FROM interests ORDER BY name ASC');
  return res.rows;
};

/**
 * Get full user profile including academic info, skills, interests, and verification status
 */
const getProfileByUserId = async (userId) => {
  // 1. Fetch user base info
  const userRes = await query(
    'SELECT id, name, email, created_at FROM users WHERE id = $1',
    [userId]
  );
  if (userRes.rows.length === 0) return null;
  const user = userRes.rows[0];

  // 2. Fetch student profile record
  const profileRes = await query(
    'SELECT id, college_email, college, city, state, country, degree, year_of_study, bio, availability, github_url, linkedin_url, created_at, updated_at FROM student_profiles WHERE user_id = $1',
    [userId]
  );
  const studentProfile = profileRes.rows[0] || null;

  // 3. Fetch user skills
  const skillsRes = await query(
    `SELECT s.id, s.name 
     FROM skills s 
     JOIN user_skills us ON s.id = us.skill_id 
     WHERE us.user_id = $1 
     ORDER BY s.name ASC`,
    [userId]
  );

  // 4. Fetch user interests
  const interestsRes = await query(
    `SELECT i.id, i.name 
     FROM interests i 
     JOIN user_interests ui ON i.id = ui.interest_id 
     WHERE ui.user_id = $1 
     ORDER BY i.name ASC`,
    [userId]
  );

  // 5. Fetch verification record
  const verRes = await query(
    'SELECT status, method, verified_at FROM student_verifications WHERE user_id = $1',
    [userId]
  );
  const verification = verRes.rows[0] || { status: 'UNVERIFIED', method: null, verified_at: null };

  const isComplete = Boolean(
    studentProfile &&
    studentProfile.college &&
    studentProfile.degree &&
    studentProfile.year_of_study
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
    },
    profile: studentProfile,
    skills: skillsRes.rows,
    interests: interestsRes.rows,
    verification,
    isProfileComplete: isComplete,
  };
};

/**
 * Upsert student profile, skills, and interests in a single transaction
 */
const updateStudentProfile = async (userId, data) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      college_email,
      college,
      city,
      state,
      country,
      degree,
      year_of_study,
      bio,
      availability,
      github_url,
      linkedin_url,
      skills = [], // Array of skill names or skill objects
      interests = [], // Array of interest IDs or interest objects
    } = data;

    // 1. Upsert student_profiles
    const profileUpsertText = `
      INSERT INTO student_profiles (
        user_id, college_email, college, city, state, country, degree, year_of_study, bio, availability, github_url, linkedin_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (user_id) DO UPDATE SET
        college_email = COALESCE(EXCLUDED.college_email, student_profiles.college_email),
        college = COALESCE(EXCLUDED.college, student_profiles.college),
        city = COALESCE(EXCLUDED.city, student_profiles.city),
        state = COALESCE(EXCLUDED.state, student_profiles.state),
        country = COALESCE(EXCLUDED.country, student_profiles.country),
        degree = COALESCE(EXCLUDED.degree, student_profiles.degree),
        year_of_study = COALESCE(EXCLUDED.year_of_study, student_profiles.year_of_study),
        bio = EXCLUDED.bio,
        availability = EXCLUDED.availability,
        github_url = EXCLUDED.github_url,
        linkedin_url = EXCLUDED.linkedin_url,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    await client.query(profileUpsertText, [
      userId,
      college_email || null,
      college || '',
      city || '',
      state || '',
      country || '',
      degree || '',
      year_of_study || '',
      bio || '',
      availability || '',
      github_url || '',
      linkedin_url || '',
    ]);

    // 2. Handle skills update
    if (Array.isArray(skills)) {
      // Resolve skill IDs (create skill if name doesn't exist)
      const skillIds = [];
      for (const item of skills) {
        let skillName = typeof item === 'string' ? item.trim() : item.name?.trim();
        let skillId = typeof item === 'object' && item.id ? item.id : null;

        if (skillId) {
          skillIds.push(skillId);
        } else if (skillName) {
          // Insert skill if missing
          const insertSkill = await client.query(
            `INSERT INTO skills (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
            [skillName]
          );
          skillIds.push(insertSkill.rows[0].id);
        }
      }

      // Delete old user_skills and re-insert
      await client.query('DELETE FROM user_skills WHERE user_id = $1', [userId]);
      for (const sid of skillIds) {
        await client.query(
          'INSERT INTO user_skills (user_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, sid]
        );
      }
    }

    // 3. Handle interests update
    if (Array.isArray(interests)) {
      const interestIds = [];
      for (const item of interests) {
        let rawId = typeof item === 'number' ? item : typeof item === 'object' && item.id ? item.id : null;
        let interestId =
          rawId && !isNaN(Number(rawId)) && !String(rawId).startsWith('custom-')
            ? parseInt(rawId, 10)
            : null;
        let interestName = typeof item === 'string' ? item.trim() : item.name?.trim();

        if (interestId) {
          interestIds.push(interestId);
        } else if (interestName) {
          const insertInt = await client.query(
            `INSERT INTO interests (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
            [interestName]
          );
          interestIds.push(insertInt.rows[0].id);
        }
      }

      await client.query('DELETE FROM user_interests WHERE user_id = $1', [userId]);
      for (const iid of interestIds) {
        if (iid) {
          await client.query(
            'INSERT INTO user_interests (user_id, interest_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userId, iid]
          );
        }
      }
    }

    await client.query('COMMIT');
    return await getProfileByUserId(userId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Public profile data retriever (for Discovery, AI Teammate Matching, Team Management)
 * Strict Privacy: Excludes email, college_email, password, hashes, and private docs
 */
const getPublicStudentProfileByUserId = async (userId) => {
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) return null;

  // 1. Fetch user base info (id, name ONLY)
  const userRes = await query('SELECT id, name FROM users WHERE id = $1', [userId]);
  if (userRes.rows.length === 0) return null;
  const user = userRes.rows[0];

  // 2. Fetch student profile record
  const profileRes = await query(
    'SELECT college, city, state, country, degree, year_of_study, bio, availability, github_url, linkedin_url FROM student_profiles WHERE user_id = $1',
    [userId]
  );
  const p = profileRes.rows[0] || {};

  // 3. Fetch skills names
  const skillsRes = await query(
    `SELECT s.name 
     FROM skills s 
     JOIN user_skills us ON s.id = us.skill_id 
     WHERE us.user_id = $1 
     ORDER BY s.name ASC`,
    [userId]
  );

  // 4. Fetch interests names
  const interestsRes = await query(
    `SELECT i.name 
     FROM interests i 
     JOIN user_interests ui ON i.id = ui.interest_id 
     WHERE ui.user_id = $1 
     ORDER BY i.name ASC`,
    [userId]
  );

  // 5. Fetch verification status
  const verRes = await query(
    'SELECT status FROM student_verifications WHERE user_id = $1',
    [userId]
  );
  const verificationStatus = verRes.rows[0]?.status || 'UNVERIFIED';

  return {
    id: user.id,
    name: user.name,
    college: p.college || '',
    city: p.city || '',
    state: p.state || '',
    country: p.country || '',
    degree: p.degree || '',
    yearOfStudy: p.year_of_study || '',
    bio: p.bio || '',
    skills: skillsRes.rows.map((row) => row.name),
    interests: interestsRes.rows.map((row) => row.name),
    availability: p.availability || 'Flexible',
    githubUrl: p.github_url || '',
    linkedinUrl: p.linkedin_url || '',
    verificationStatus,
  };
};

const linkCollegeEmail = async (userId, collegeEmail) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update college_email in student_profiles
    await client.query(
      `INSERT INTO student_profiles (user_id, college_email, college, degree, year_of_study)
       VALUES ($1, $2, '', '', '')
       ON CONFLICT (user_id) DO UPDATE SET college_email = EXCLUDED.college_email`,
      [userId, collegeEmail.toLowerCase()]
    );

    // 2. Update student_verifications status to VERIFIED
    await client.query(
      `INSERT INTO student_verifications (user_id, status, method, verified_at)
       VALUES ($1, 'VERIFIED', 'COLLEGE_EMAIL', NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         status = 'VERIFIED',
         method = 'COLLEGE_EMAIL',
         verified_at = NOW()`,
      [userId]
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const unlinkCollegeEmail = async (userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Clear college_email in student_profiles
    await client.query(
      `UPDATE student_profiles SET college_email = NULL WHERE user_id = $1`,
      [userId]
    );

    // 2. Update student_verifications status to UNVERIFIED
    await client.query(
      `UPDATE student_verifications SET status = 'UNVERIFIED', method = NULL, verified_at = NULL WHERE user_id = $1`,
      [userId]
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  getAllSkills,
  getAllInterests,
  getProfileByUserId,
  getPublicStudentProfileByUserId,
  updateStudentProfile,
  linkCollegeEmail,
  unlinkCollegeEmail,
};
