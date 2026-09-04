const { pool, query } = require('../config/db');

const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'root', 'api', 'meld', 'linkup', 'system',
  'discover', 'login', 'register', 'onboarding', 'profile', 'support', 'help'
]);

/**
 * Validate username format:
 * - Must start with a letter
 * - Must fulfill AT LEAST ONE of:
 *     (a) At least 8 letters (alphabetic), OR
 *     (b) At least 5 letters AND at least 2 numbers (digits)
 * - Only letters, numbers, and underscores
 * - Length between 7 and 30 characters
 * - Cannot be a reserved word
 */
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: 'Username is required.' };
  }
  const clean = username.trim();
  if (clean.length < 7 || clean.length > 30) {
    return { valid: false, message: 'Username must be between 7 and 30 characters.' };
  }
  if (!/^[a-zA-Z]/.test(clean)) {
    return { valid: false, message: 'Username must start with a letter.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
    return { valid: false, message: 'Username can only contain letters, numbers, and underscores.' };
  }

  const letterCount = (clean.match(/[a-zA-Z]/g) || []).length;
  const digitCount = (clean.match(/[0-9]/g) || []).length;

  const hasAtLeast8Letters = letterCount >= 8;
  const has5LettersAnd2Digits = letterCount >= 5 && digitCount >= 2;

  if (!hasAtLeast8Letters && !has5LettersAnd2Digits) {
    if (letterCount >= 5 && digitCount < 2) {
      return {
        valid: false,
        message: `Username needs either at least 8 letters, or at least 2 numbers (currently has ${digitCount}/2 numbers).`,
      };
    }
    return {
      valid: false,
      message: 'Username must have either at least 8 letters, or at least 5 letters and 2 numbers.',
    };
  }

  if (RESERVED_USERNAMES.has(clean.toLowerCase())) {
    return { valid: false, message: 'This username is reserved and cannot be chosen.' };
  }
  return { valid: true, cleanUsername: clean.toLowerCase() };
};

/**
 * Check if a username is available (case-insensitive)
 */
const isUsernameAvailable = async (username, excludeUserId = null) => {
  let queryText = 'SELECT id FROM users WHERE LOWER(username) = LOWER($1)';
  const params = [username.trim()];
  if (excludeUserId) {
    queryText += ' AND id != $2';
    params.push(excludeUserId);
  }
  const res = await query(queryText, params);
  return res.rows.length === 0;
};

/**
 * Register new user & default student_verifications record in a PostgreSQL transaction
 * @param {Object} userData - { name, email, passwordHash, username, collegeEmail, isCollegeVerified }
 */
const createUserWithVerification = async ({ name, email, passwordHash, username = null, collegeEmail = null, isCollegeVerified = false }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert user with optional username
    const insertUserText = `
      INSERT INTO users (name, username, email, password_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, username, email, role, created_at, updated_at;
    `;
    const userRes = await client.query(insertUserText, [
      name.trim(),
      username ? username.trim().toLowerCase() : null,
      email.toLowerCase(),
      passwordHash
    ]);
    const newUser = userRes.rows[0];

    // 2. Create student_verifications record
    const verStatus = isCollegeVerified ? 'VERIFIED' : 'UNVERIFIED';
    const verMethod = isCollegeVerified ? 'COLLEGE_EMAIL' : null;
    const verifiedAt = isCollegeVerified ? new Date() : null;

    const insertVerificationText = `
      INSERT INTO student_verifications (user_id, status, method, verified_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, status, created_at;
    `;
    await client.query(insertVerificationText, [newUser.id, verStatus, verMethod, verifiedAt]);

    // 3. Create initial student_profiles entry with is_completed = false
    await client.query(
      `INSERT INTO student_profiles (user_id, college_email, college, degree, year_of_study, is_completed, onboarding_step)
       VALUES ($1, $2, '', '', '', FALSE, 1)
       ON CONFLICT (user_id) DO UPDATE SET 
         college_email = COALESCE(EXCLUDED.college_email, student_profiles.college_email)`,
      [newUser.id, collegeEmail ? collegeEmail.toLowerCase() : null]
    );

    await client.query('COMMIT');
    return newUser;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Find user by email (including password_hash for authentication)
 */
const findUserByEmail = async (email) => {
  const text = 'SELECT id, name, username, email, role, password_hash FROM users WHERE LOWER(email) = LOWER($1)';
  const res = await query(text, [email]);
  return res.rows[0] || null;
};

/**
 * Find user by ID (excluding password_hash)
 */
const findUserById = async (id) => {
  const text = 'SELECT id, name, username, email, role, created_at, updated_at FROM users WHERE id = $1';
  const res = await query(text, [id]);
  return res.rows[0] || null;
};

/**
 * Check if student profile is complete for user
 * Requires: username set, is_completed = true, college and degree filled.
 */
const isProfileComplete = async (userId) => {
  const text = `
    SELECT u.username, sp.is_completed, sp.college, sp.degree
    FROM users u
    LEFT JOIN student_profiles sp ON u.id = sp.user_id
    WHERE u.id = $1
  `;
  const res = await query(text, [userId]);
  if (!res.rows[0]) return false;
  const row = res.rows[0];
  return !!(row.username && row.is_completed === true && row.college && row.degree);
};

/**
 * Update user password
 */
const updateUserPassword = async (email, passwordHash) => {
  const text = 'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE LOWER(email) = LOWER($2)';
  await query(text, [passwordHash, email]);
};

module.exports = {
  validateUsername,
  isUsernameAvailable,
  createUserWithVerification,
  findUserByEmail,
  findUserById,
  isProfileComplete,
  updateUserPassword,
};
