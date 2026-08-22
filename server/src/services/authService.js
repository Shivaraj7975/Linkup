const { pool, query } = require('../config/db');

/**
 * Register new user & default student_verifications record in a PostgreSQL transaction
 * @param {Object} userData - { name, email, passwordHash }
 */
const createUserWithVerification = async ({ name, email, passwordHash }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert user
    const insertUserText = `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at, updated_at;
    `;
    const userRes = await client.query(insertUserText, [name, email.toLowerCase(), passwordHash]);
    const newUser = userRes.rows[0];

    // 2. Create default student_verifications record with status 'UNVERIFIED'
    const insertVerificationText = `
      INSERT INTO student_verifications (user_id, status)
      VALUES ($1, 'UNVERIFIED')
      RETURNING id, status, created_at;
    `;
    await client.query(insertVerificationText, [newUser.id]);

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
  const text = 'SELECT id, name, email, password_hash FROM users WHERE LOWER(email) = LOWER($1)';
  const res = await query(text, [email]);
  return res.rows[0] || null;
};

/**
 * Find user by ID (excluding password_hash)
 */
const findUserById = async (id) => {
  const text = 'SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1';
  const res = await query(text, [id]);
  return res.rows[0] || null;
};

/**
 * Check if student profile is complete for user
 */
const isProfileComplete = async (userId) => {
  const text = 'SELECT 1 FROM student_profiles WHERE user_id = $1 LIMIT 1';
  const res = await query(text, [userId]);
  return res.rows.length > 0;
};

module.exports = {
  createUserWithVerification,
  findUserByEmail,
  findUserById,
  isProfileComplete,
};
