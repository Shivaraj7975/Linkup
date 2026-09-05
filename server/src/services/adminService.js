const { query } = require('../config/db');

/**
 * Get aggregate statistics for Admin Dashboard
 */
const getPlatformStats = async () => {
  const usersCountRes = await query('SELECT COUNT(*) FROM users');
  const meldsCountRes = await query('SELECT COUNT(*) FROM melds');
  const openMeldsRes = await query("SELECT COUNT(*) FROM melds WHERE current_status = 'OPEN'");
  const verifiedUsersRes = await query("SELECT COUNT(*) FROM student_verifications WHERE status = 'VERIFIED'");
  const invitationsCountRes = await query('SELECT COUNT(*) FROM meld_invitations');

  const totalUsers = parseInt(usersCountRes.rows[0].count, 10) || 0;
  const totalMelds = parseInt(meldsCountRes.rows[0].count, 10) || 0;
  const openMelds = parseInt(openMeldsRes.rows[0].count, 10) || 0;
  const verifiedUsers = parseInt(verifiedUsersRes.rows[0].count, 10) || 0;
  const totalInvitations = parseInt(invitationsCountRes.rows[0].count, 10) || 0;

  return {
    totalUsers,
    totalMelds,
    openMelds,
    verifiedUsers,
    totalInvitations,
    verifiedPercentage: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
  };
};

/**
 * Fetch list of all registered users with college profiles
 */
const getAllUsers = async (search = '') => {
  let sql = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.role,
      u.created_at AS "createdAt",
      sp.college,
      sp.degree,
      (SELECT year_of_study FROM student_profiles sp WHERE sp.user_id = u.id) AS "yearOfStudy",
      COALESCE((SELECT status FROM student_verifications sv WHERE sv.user_id = u.id ORDER BY created_at DESC LIMIT 1), 'UNVERIFIED') AS "verificationStatus",
      (SELECT COUNT(*) FROM meld_members lm WHERE lm.user_id = u.id AND lm.status = 'ACTIVE') AS "meldsJoinedCount",
      (SELECT COUNT(*) FROM melds l WHERE l.creator_id = u.id) AS "meldsCreatedCount"
    FROM users u
    LEFT JOIN student_profiles sp ON u.id = sp.user_id
  `;

  const params = [];
  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    sql += ` WHERE LOWER(u.name) LIKE $1 OR LOWER(u.email) LIKE $1 OR LOWER(sp.college) LIKE $1`;
    params.push(term);
  }

  sql += ` ORDER BY u.created_at DESC LIMIT 100`;

  const res = await query(sql, params);
  return res.rows;
};

/**
 * Delete user account and cascade dependencies
 */
const deleteUser = async (userId) => {
  const res = await query('DELETE FROM users WHERE id = $1 RETURNING id, name, email', [userId]);
  if (res.rows.length === 0) {
    throw new Error('User not found.');
  }
  return res.rows[0];
};

/**
 * Toggle or set User Role (USER or ADMIN)
 */
const updateUserRole = async (userId, newRole) => {
  if (!['USER', 'ADMIN'].includes(newRole)) {
    throw new Error('Invalid role specified. Must be USER or ADMIN.');
  }
  const res = await query(
    'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, role',
    [newRole, userId]
  );
  if (res.rows.length === 0) {
    throw new Error('User not found.');
  }
  return res.rows[0];
};

/**
 * Toggle User Verification Status (VERIFIED or UNVERIFIED)
 */
const updateUserVerification = async (userId, newStatus) => {
  const validStatus = newStatus === 'VERIFIED' ? 'VERIFIED' : 'UNVERIFIED';

  const check = await query('SELECT id FROM student_verifications WHERE user_id = $1', [userId]);
  if (check.rows.length === 0) {
    // Insert record if missing
    await query(
      `INSERT INTO student_verifications (user_id, status, method, verified_at)
       VALUES ($1, $2, 'MANUAL_REVIEW', $3)`,
      [userId, validStatus, validStatus === 'VERIFIED' ? new Date() : null]
    );
  } else {
    await query(
      `UPDATE student_verifications 
       SET status = $1, method = $2, verified_at = $3, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $4`,
      [validStatus, validStatus === 'VERIFIED' ? 'MANUAL_REVIEW' : null, validStatus === 'VERIFIED' ? new Date() : null, userId]
    );
  }

  return { userId, status: validStatus };
};

/**
 * Fetch all MELD projects for admin management
 */
const getAllMelds = async (search = '', status = '') => {
  let sql = `
    SELECT 
      l.id,
      l.title,
      l.description,
      l.category,
      l.max_members AS "maxMembers",
      l.current_status AS "currentStatus",
      l.created_at AS "createdAt",
      u.name AS "creatorName",
      u.email AS "creatorEmail",
      u.id AS "creatorId",
      (SELECT COUNT(*) FROM meld_members lm WHERE lm.meld_id = l.id AND lm.status = 'ACTIVE') AS "memberCount"
    FROM melds l
    LEFT JOIN users u ON l.creator_id = u.id
  `;

  const whereConditions = [];
  const params = [];

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    whereConditions.push(`(LOWER(l.title) LIKE $${params.length} OR LOWER(l.category) LIKE $${params.length} OR LOWER(u.name) LIKE $${params.length})`);
  }

  if (status && ['OPEN', 'FULL', 'CLOSED'].includes(status)) {
    params.push(status);
    whereConditions.push(`l.current_status = $${params.length}`);
  }

  if (whereConditions.length > 0) {
    sql += ` WHERE ${whereConditions.join(' AND ')}`;
  }

  sql += ` ORDER BY l.created_at DESC LIMIT 100`;

  const res = await query(sql, params);
  return res.rows;
};

/**
 * Delete a MELD project
 */
const deleteMeld = async (meldId) => {
  const res = await query('DELETE FROM melds WHERE id = $1 RETURNING id, title', [meldId]);
  if (res.rows.length === 0) {
    throw new Error('MELD project not found.');
  }
  return res.rows[0];
};

/**
 * Update MELD status (OPEN, FULL, CLOSED)
 */
const updateMeldStatus = async (meldId, newStatus) => {
  if (!['OPEN', 'FULL', 'CLOSED'].includes(newStatus)) {
    throw new Error('Invalid MELD status.');
  }
  const res = await query(
    'UPDATE melds SET current_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, title, current_status AS "currentStatus"',
    [newStatus, meldId]
  );
  if (res.rows.length === 0) {
    throw new Error('MELD project not found.');
  }
  return res.rows[0];
};

module.exports = {
  getPlatformStats,
  getAllUsers,
  deleteUser,
  updateUserRole,
  updateUserVerification,
  getAllMelds,
  deleteMeld,
  updateMeldStatus,
};
