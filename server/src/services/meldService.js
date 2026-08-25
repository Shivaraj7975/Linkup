const { pool, query } = require('../config/db');
const { getPublicStudentProfileByUserId } = require('./profileService');
const { filterCandidateStudents, getFallbackDeterministicMatches } = require('./matchingService');
const { matchCandidates, buildCompactPayload } = require('./ai/aiMatchingService');
const crypto = require('crypto');

const inFlightLocks = new Map();

/**
 * Helper to fetch skills associated with a set of Linkup IDs
 */
const getSkillsForLinkups = async (linkupIds) => {
  if (!linkupIds || linkupIds.length === 0) return {};
  const res = await query(
    `SELECT ls.meld_id, s.id as skill_id, s.name 
     FROM meld_skills ls 
     JOIN skills s ON ls.skill_id = s.id 
     WHERE ls.meld_id = ANY($1::uuid[]) 
     ORDER BY s.name ASC`,
    [linkupIds]
  );
  const skillsMap = {};
  for (const row of res.rows) {
    if (!skillsMap[row.meld_id]) skillsMap[row.meld_id] = [];
    skillsMap[row.meld_id].push({ id: row.skill_id, name: row.name });
  }
  return skillsMap;
};

/**
 * Helper to fetch member counts for a set of Linkup IDs
 */
const getMemberCountsForLinkups = async (linkupIds) => {
  if (!linkupIds || linkupIds.length === 0) return {};
  const res = await query(
    `SELECT meld_id, COUNT(*)::int as count 
     FROM meld_members 
     WHERE meld_id = ANY($1::uuid[]) 
     GROUP BY meld_id`,
    [linkupIds]
  );
  const countsMap = {};
  for (const row of res.rows) {
    countsMap[row.meld_id] = row.count;
  }
  return countsMap;
};

/**
 * Create a new Linkup (with required skills & creator as first member)
 */
const createLinkup = async (creatorId, data) => {
  const {
    title,
    description,
    category,
    requiredSkills = [],
    maxMembers = 4,
    commitmentLevel,
    projectDuration,
  } = data;

  const parsedMaxMembers = parseInt(maxMembers, 10);
  if (isNaN(parsedMaxMembers) || parsedMaxMembers < 2) {
    throw new Error('Maximum members must be a number greater than or equal to 2.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert Linkup
    const linkupInsert = await client.query(
      `INSERT INTO melds (
        creator_id, title, description, category, max_members, current_status, commitment_level, project_duration
      ) VALUES ($1, $2, $3, $4, $5, 'OPEN', $6, $7)
      RETURNING *`,
      [creatorId, title.trim(), description.trim(), category.trim(), parsedMaxMembers, commitmentLevel.trim(), projectDuration.trim()]
    );

    const linkup = linkupInsert.rows[0];
    const linkupId = linkup.id;

    // 2. Process & Insert required skills
    if (Array.isArray(requiredSkills) && requiredSkills.length > 0) {
      for (const item of requiredSkills) {
        let skillId = typeof item === 'object' && item.id ? item.id : null;
        let skillName = typeof item === 'string' ? item.trim() : item.name?.trim();

        if (!skillId && skillName) {
          const insertSkill = await client.query(
            `INSERT INTO skills (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
            [skillName]
          );
          skillId = insertSkill.rows[0].id;
        }

        if (skillId) {
          await client.query(
            `INSERT INTO meld_skills (meld_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [linkupId, skillId]
          );
        }
      }
    }

    // 3. Add creator as initial team member
    await client.query(
      `INSERT INTO meld_members (meld_id, user_id, role, status) VALUES ($1, $2, 'Creator', 'ACTIVE')`,
      [linkupId, creatorId]
    );

    await client.query('COMMIT');
    return await getLinkupById(linkupId, creatorId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get Linkups list with optional filtering and search
 */
const getLinkups = async (filters = {}) => {
  const { category, skill, status, search, college, availability, creatorId, memberUserId } = filters;
  const whereClauses = [];
  const params = [];
  let paramIdx = 1;

  if (creatorId && creatorId.trim()) {
    whereClauses.push(`l.creator_id = $${paramIdx++}`);
    params.push(creatorId.trim());
  }

  if (memberUserId && memberUserId.trim()) {
    whereClauses.push(`l.id IN (SELECT meld_id FROM meld_members WHERE user_id = $${paramIdx++}) AND l.creator_id != $${paramIdx++}`);
    params.push(memberUserId.trim(), memberUserId.trim());
  }

  if (category && category.trim()) {
    whereClauses.push(`l.category = $${paramIdx++}`);
    params.push(category.trim());
  }

  if (status && status.trim()) {
    whereClauses.push(`l.current_status = $${paramIdx++}`);
    params.push(status.trim());
  }

  if (college && college.trim()) {
    whereClauses.push(`sp.college ILIKE $${paramIdx++}`);
    params.push(`%${college.trim()}%`);
  }

  if (availability && availability.trim()) {
    whereClauses.push(`(sp.availability ILIKE $${paramIdx} OR l.commitment_level ILIKE $${paramIdx})`);
    paramIdx++;
    params.push(`%${availability.trim()}%`);
  }

  if (search && search.trim()) {
    const searchPattern = `%${search.trim()}%`;
    whereClauses.push(`(l.title ILIKE $${paramIdx} OR l.description ILIKE $${paramIdx})`);
    paramIdx++;
    params.push(searchPattern);
  }

  if (skill && skill.trim()) {
    whereClauses.push(`l.id IN (
      SELECT ls.meld_id 
      FROM meld_skills ls 
      JOIN skills s ON ls.skill_id = s.id 
      WHERE s.name ILIKE $${paramIdx++}
    )`);
    params.push(`%${skill.trim()}%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const queryText = `
    SELECT 
      l.id, l.creator_id, l.title, l.description, l.category, 
      l.max_members, l.current_status, l.commitment_level, l.project_duration, 
      l.created_at, l.updated_at,
      u.name as creator_name,
      sp.college as creator_college,
      sp.availability as creator_availability,
      COALESCE(sv.status, 'UNVERIFIED') as creator_verification_status
    FROM melds l
    JOIN users u ON l.creator_id = u.id
    LEFT JOIN student_profiles sp ON u.id = sp.user_id
    LEFT JOIN student_verifications sv ON u.id = sv.user_id
    ${whereSql}
    ORDER BY l.created_at DESC
  `;

  const res = await query(queryText, params);
  if (res.rows.length === 0) return [];

  const linkupIds = res.rows.map((row) => row.id);
  const skillsMap = await getSkillsForLinkups(linkupIds);
  const memberCountsMap = await getMemberCountsForLinkups(linkupIds);

  return res.rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    maxMembers: row.max_members,
    currentStatus: row.current_status,
    commitmentLevel: row.commitment_level,
    projectDuration: row.project_duration,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    currentMemberCount: memberCountsMap[row.id] || 0,
    requiredSkills: skillsMap[row.id] || [],
    creator: {
      id: row.creator_id,
      name: row.creator_name,
      college: row.creator_college || 'University Student',
      verificationStatus: row.creator_verification_status,
    },
  }));
};

/**
 * Get detailed single Linkup by ID
 */
const getLinkupById = async (id, currentUserId = null) => {
  const linkupRes = await query(
    `SELECT 
      l.id, l.creator_id, l.title, l.description, l.category, 
      l.max_members, l.current_status, l.commitment_level, l.project_duration, 
      l.created_at, l.updated_at
     FROM melds l
     WHERE l.id = $1`,
    [id]
  );

  if (linkupRes.rows.length === 0) return null;
  const l = linkupRes.rows[0];

  // Fetch creator public profile
  const creatorProfile = await getPublicStudentProfileByUserId(l.creator_id);

  // Fetch required skills
  const skillsRes = await query(
    `SELECT s.id, s.name 
     FROM meld_skills ls 
     JOIN skills s ON ls.skill_id = s.id 
     WHERE ls.meld_id = $1 
     ORDER BY s.name ASC`,
    [id]
  );

  // Fetch team members with public profile snippets
  const membersRes = await query(
    `SELECT 
      lm.id as member_table_id, lm.user_id, lm.role, lm.status, lm.joined_at,
      u.name, sp.college, COALESCE(sv.status, 'UNVERIFIED') as verification_status
     FROM meld_members lm
     JOIN users u ON lm.user_id = u.id
     LEFT JOIN student_profiles sp ON u.id = sp.user_id
     LEFT JOIN student_verifications sv ON u.id = sv.user_id
     WHERE lm.meld_id = $1
     ORDER BY lm.joined_at ASC`,
    [id]
  );

  // Attach skills to members
  const memberUserIds = membersRes.rows.map((m) => m.user_id);
  let memberSkillsMap = {};
  if (memberUserIds.length > 0) {
    const msRes = await query(
      `SELECT us.user_id, s.name 
       FROM user_skills us 
       JOIN skills s ON us.skill_id = s.id 
       WHERE us.user_id = ANY($1::uuid[])`,
      [memberUserIds]
    );
    for (const row of msRes.rows) {
      if (!memberSkillsMap[row.user_id]) memberSkillsMap[row.user_id] = [];
      memberSkillsMap[row.user_id].push(row.name);
    }
  }

  const members = membersRes.rows.map((m) => ({
    id: m.member_table_id,
    userId: m.user_id,
    name: m.name,
    college: m.college || 'University Student',
    role: m.role,
    status: m.status,
    joinedAt: m.joined_at,
    verificationStatus: m.verification_status,
    skills: memberSkillsMap[m.user_id] || [],
  }));

  // Contextual status for authenticated user
  let isCreator = false;
  let isMember = false;
  let userJoinRequestStatus = null;

  if (currentUserId) {
    isCreator = l.creator_id === currentUserId;
    isMember = members.some((m) => m.userId === currentUserId);

    if (!isCreator && !isMember) {
      const reqRes = await query(
        `SELECT status FROM join_requests WHERE meld_id = $1 AND user_id = $2`,
        [id, currentUserId]
      );
      if (reqRes.rows.length > 0) {
        userJoinRequestStatus = reqRes.rows[0].status;
      }
    }
  }

  return {
    id: l.id,
    creatorId: l.creator_id,
    title: l.title,
    description: l.description,
    category: l.category,
    maxMembers: l.max_members,
    currentStatus: l.current_status,
    commitmentLevel: l.commitment_level,
    projectDuration: l.project_duration,
    createdAt: l.created_at,
    updatedAt: l.updated_at,
    requiredSkills: skillsRes.rows,
    creator: creatorProfile,
    members,
    currentMemberCount: members.length,
    isCreator,
    isMember,
    userJoinRequestStatus,
  };
};

/**
 * Update Linkup (Creator ONLY)
 */
const updateLinkup = async (id, creatorId, data) => {
  const existing = await query('SELECT creator_id FROM melds WHERE id = $1', [id]);
  if (existing.rows.length === 0) throw new Error('Linkup not found.');
  if (existing.rows[0].creator_id !== creatorId) throw new Error('Unauthorized. Only creator can edit Linkup.');

  const {
    title,
    description,
    category,
    requiredSkills = [],
    maxMembers,
    commitmentLevel,
    projectDuration,
    currentStatus,
  } = data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updateSql = `
      UPDATE melds SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        max_members = COALESCE($4, max_members),
        commitment_level = COALESCE($5, commitment_level),
        project_duration = COALESCE($6, project_duration),
        current_status = COALESCE($7, current_status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 AND creator_id = $9
      RETURNING *;
    `;

    await client.query(updateSql, [
      title ? title.trim() : null,
      description ? description.trim() : null,
      category ? category.trim() : null,
      maxMembers ? parseInt(maxMembers, 10) : null,
      commitmentLevel ? commitmentLevel.trim() : null,
      projectDuration ? projectDuration.trim() : null,
      currentStatus ? currentStatus.trim() : null,
      id,
      creatorId,
    ]);

    if (Array.isArray(requiredSkills)) {
      await client.query('DELETE FROM meld_skills WHERE meld_id = $1', [id]);
      for (const item of requiredSkills) {
        let skillId = typeof item === 'object' && item.id ? item.id : null;
        let skillName = typeof item === 'string' ? item.trim() : item.name?.trim();

        if (!skillId && skillName) {
          const insertSkill = await client.query(
            `INSERT INTO skills (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
            [skillName]
          );
          skillId = insertSkill.rows[0].id;
        }

        if (skillId) {
          await client.query(
            `INSERT INTO meld_skills (meld_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [id, skillId]
          );
        }
      }
    }

    await client.query('COMMIT');
    return await getLinkupById(id, creatorId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Delete Linkup (Creator ONLY)
 */
const deleteLinkup = async (id, creatorId) => {
  const res = await query(
    'DELETE FROM melds WHERE id = $1 AND creator_id = $2 RETURNING id',
    [id, creatorId]
  );
  if (res.rows.length === 0) {
    throw new Error('Linkup not found or unauthorized.');
  }
  return true;
};

/**
 * Create Join Request
 */
const createJoinRequest = async (linkupId, userId, message) => {
  // 1. Fetch linkup info & current capacity
  const linkupRes = await query(
    `SELECT id, creator_id, max_members, current_status FROM melds WHERE id = $1`,
    [linkupId]
  );
  if (linkupRes.rows.length === 0) throw new Error('Linkup not found.');
  const linkup = linkupRes.rows[0];

  // Requirement: Creator cannot send join request to their own Linkup
  if (linkup.creator_id === userId) {
    throw new Error('Creators cannot send a join request to their own Linkup.');
  }

  // Requirement: User cannot join if Linkup is closed or full
  if (linkup.current_status !== 'OPEN') {
    throw new Error(`Cannot submit join request. This Linkup is currently ${linkup.current_status}.`);
  }

  // Check if user is already a member
  const memberCheck = await query(
    `SELECT id FROM meld_members WHERE meld_id = $1 AND user_id = $2`,
    [linkupId, userId]
  );
  if (memberCheck.rows.length > 0) {
    throw new Error('You are already a member of this Linkup.');
  }

  // Requirement: Duplicate join requests prohibited
  const existingReq = await query(
    `SELECT id, status FROM join_requests WHERE meld_id = $1 AND user_id = $2`,
    [linkupId, userId]
  );
  if (existingReq.rows.length > 0) {
    throw new Error(`You have already submitted a join request for this Linkup (Status: ${existingReq.rows[0].status}).`);
  }

  // Check team capacity
  const countRes = await query(
    `SELECT COUNT(*)::int as count FROM meld_members WHERE meld_id = $1`,
    [linkupId]
  );
  const currentCount = countRes.rows[0].count;
  if (currentCount >= linkup.max_members) {
    // Automatically flag as FULL
    await query(`UPDATE melds SET current_status = 'FULL' WHERE id = $1`, [linkupId]);
    throw new Error('Cannot join. This Linkup has reached maximum capacity.');
  }

  // Create PENDING request
  const reqInsert = await query(
    `INSERT INTO join_requests (meld_id, user_id, message, status)
     VALUES ($1, $2, $3, 'PENDING')
     RETURNING id, meld_id as linkup_id, user_id, message, status, created_at`,
    [linkupId, userId, message ? message.trim() : '']
  );

  return reqInsert.rows[0];
};

/**
 * Get Join Requests for a Linkup (Creator ONLY)
 */
const getLinkupRequests = async (linkupId, creatorId) => {
  // Check authorization
  const linkupRes = await query(`SELECT creator_id FROM melds WHERE id = $1`, [linkupId]);
  if (linkupRes.rows.length === 0) throw new Error('Linkup not found.');
  if (linkupRes.rows[0].creator_id !== creatorId) {
    throw new Error('Unauthorized. Only the Linkup creator can view join requests.');
  }

  const reqsRes = await query(
    `SELECT id, meld_id as linkup_id, user_id, message, status, created_at, updated_at
     FROM join_requests
     WHERE meld_id = $1
     ORDER BY created_at DESC`,
    [linkupId]
  );

  // Fetch applicant public profiles
  const requestsWithProfiles = [];
  for (const r of reqsRes.rows) {
    const applicantProfile = await getPublicStudentProfileByUserId(r.user_id);
    requestsWithProfiles.push({
      id: r.id,
      linkupId: r.linkup_id,
      userId: r.user_id,
      message: r.message,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      applicant: applicantProfile,
    });
  }

  return requestsWithProfiles;
};

/**
 * Accept Join Request (Creator ONLY, Transactional)
 */
const acceptJoinRequest = async (requestId, creatorId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch join request & check existence
    const reqRes = await client.query(
      `SELECT jr.id, jr.meld_id as linkup_id, jr.user_id, jr.status, l.creator_id, l.max_members, l.current_status
       FROM join_requests jr
       JOIN melds l ON jr.meld_id = l.id
       WHERE jr.id = $1`,
      [requestId]
    );

    if (reqRes.rows.length === 0) throw new Error('Join request not found.');
    const reqInfo = reqRes.rows[0];

    // 2. Verify creator ownership
    if (reqInfo.creator_id !== creatorId) {
      throw new Error('Unauthorized. Only the Linkup creator can accept join requests.');
    }

    if (reqInfo.status === 'ACCEPTED') {
      throw new Error('This join request has already been accepted.');
    }

    // 3. Check capacity
    const memberCountRes = await client.query(
      `SELECT COUNT(*)::int as count FROM meld_members WHERE meld_id = $1`,
      [reqInfo.linkup_id]
    );
    const currentMemberCount = memberCountRes.rows[0].count;
    if (currentMemberCount >= reqInfo.max_members) {
      await client.query(`UPDATE melds SET current_status = 'FULL' WHERE id = $1`, [reqInfo.linkup_id]);
      throw new Error('Cannot accept candidate. The team is already at maximum capacity.');
    }

    // 4. Add candidate to meld_members
    await client.query(
      `INSERT INTO meld_members (meld_id, user_id, role, status)
       VALUES ($1, $2, 'Member', 'ACTIVE')
       ON CONFLICT (meld_id, user_id) DO NOTHING`,
      [reqInfo.linkup_id, reqInfo.user_id]
    );

    // 5. Update request status to ACCEPTED
    await client.query(
      `UPDATE join_requests SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [requestId]
    );

    // 6. Recalculate member count and auto-update status to FULL if max capacity reached
    const newMemberCountRes = await client.query(
      `SELECT COUNT(*)::int as count FROM meld_members WHERE meld_id = $1`,
      [reqInfo.linkup_id]
    );
    const newCount = newMemberCountRes.rows[0].count;

    if (newCount >= reqInfo.max_members) {
      await client.query(`UPDATE melds SET current_status = 'FULL' WHERE id = $1`, [reqInfo.linkup_id]);
    }

    await client.query('COMMIT');
    return {
      requestId,
      linkupId: reqInfo.linkup_id,
      candidateId: reqInfo.user_id,
      status: 'ACCEPTED',
      currentMemberCount: newCount,
      isFull: newCount >= reqInfo.max_members,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Reject Join Request (Creator ONLY)
 */
const rejectJoinRequest = async (requestId, creatorId) => {
  const reqRes = await query(
    `SELECT jr.id, jr.meld_id as linkup_id, l.creator_id 
     FROM join_requests jr 
     JOIN melds l ON jr.meld_id = l.id 
     WHERE jr.id = $1`,
    [requestId]
  );

  if (reqRes.rows.length === 0) throw new Error('Join request not found.');
  if (reqRes.rows[0].creator_id !== creatorId) {
    throw new Error('Unauthorized. Only the Linkup creator can reject join requests.');
  }

  await query(
    `UPDATE join_requests SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [requestId]
  );

  return { requestId, status: 'REJECTED' };
};
/**
 * Remove Team Member (Creator ONLY)
 */
const removeTeamMember = async (linkupId, memberUserId, creatorId) => {
  const linkupRes = await query(`SELECT creator_id, current_status FROM melds WHERE id = $1`, [linkupId]);
  if (linkupRes.rows.length === 0) throw new Error('Linkup not found.');
  const linkup = linkupRes.rows[0];

  if (linkup.creator_id !== creatorId) {
    throw new Error('Unauthorized. Only the creator can remove team members.');
  }

  if (memberUserId === creatorId) {
    throw new Error('Creators cannot remove themselves from their own Linkup.');
  }

  const delRes = await query(
    `DELETE FROM meld_members WHERE meld_id = $1 AND user_id = $2 RETURNING id`,
    [linkupId, memberUserId]
  );

  if (delRes.rows.length === 0) {
    throw new Error('Team member not found.');
  }

  // Re-open Linkup status if it was FULL
  if (linkup.current_status === 'FULL') {
    await query(`UPDATE melds SET current_status = 'OPEN' WHERE id = $1`, [linkupId]);
  }

  return { success: true, removedUserId: memberUserId };
};

/**
 * GET /api/linkups/:linkupId/matches implementation (Phase 7 with DB Caching & Persistence)
 */
const getMatchesForLinkup = async (linkupId, currentUserId = null, forceRefresh = false) => {
  const totalStartTime = Date.now();

  // 1. Retrieve Linkup details
  const linkup = await getLinkupById(linkupId, currentUserId);
  if (!linkup) {
    throw new Error('Linkup not found.');
  }

  // 2. Filter relevant candidates using PostgreSQL (10-20 candidates max)
  const candDbStartTime = Date.now();
  const candidateResults = await filterCandidateStudents(linkup, 20);
  const candDbDuration = Date.now() - candDbStartTime;
  console.log(`[AI MATCH] Candidate DB query: ${candDbDuration}ms (${candidateResults.length} candidates retrieved)`);

  if (!candidateResults || candidateResults.length === 0) {
    return {
      cached: false,
      generatedBy: 'DETERMINISTIC',
      matches: [],
    };
  }

  // 3. Build compact AI payload & Generate input hash
  const { compactPayload, candidateIdsSet, candidateLookupMap } = buildCompactPayload(linkup, candidateResults);
  const inputHash = crypto.createHash('sha256').update(JSON.stringify(compactPayload)).digest('hex');

  // Helper to fetch valid cache
  const checkCache = async () => {
    if (forceRefresh) return null;
    const cachedMatchesRes = await query(
      `SELECT m.id, m.meld_id as linkup_id, m.user_id, m.match_percentage, m.match_data, m.generated_by, m.created_at,
              u.name, sp.college, sp.degree, sp.year_of_study, COALESCE(sv.status, 'UNVERIFIED') as verification_status
       FROM matches m
       JOIN users u ON m.user_id = u.id
       JOIN student_profiles sp ON u.id = sp.user_id
       LEFT JOIN student_verifications sv ON u.id = sv.user_id
       WHERE m.meld_id = $1 AND m.match_data->>'inputHash' = $2
       ORDER BY m.match_percentage DESC`,
      [linkupId, inputHash]
    );

    if (cachedMatchesRes.rows.length > 0) {
      const cachedMatches = cachedMatchesRes.rows.map((row) => {
        const matchData = typeof row.match_data === 'string' ? JSON.parse(row.match_data) : (row.match_data || {});
        return {
          userId: row.user_id,
          name: row.name,
          college: row.college || '',
          degree: row.degree || '',
          yearOfStudy: row.year_of_study || '',
          verificationStatus: row.verification_status,
          matchPercentage: row.match_percentage,
          reasons: matchData.reasons || [],
          strengths: matchData.strengths || [],
          concerns: matchData.concerns || [],
        };
      });
      return {
        cached: true,
        generatedBy: cachedMatchesRes.rows[0].generated_by,
        matches: cachedMatches,
      };
    }
    return null;
  };

  // 4. Initial Cache Check
  let cachedResult = await checkCache();
  if (cachedResult) {
    console.log(`[AI MATCH] Cache HIT for Linkup ${linkupId} (${cachedResult.matches.length} matches, total: ${Date.now() - totalStartTime}ms)`);
    return cachedResult;
  }

  // 5. In-flight Request Locking
  if (inFlightLocks.has(linkupId)) {
    console.log(`[AI MATCH] Waiting for in-flight generation for Linkup ${linkupId}...`);
    try {
      await inFlightLocks.get(linkupId);
    } catch (err) {
      // Ignored, we just re-check cache or proceed
    }
    cachedResult = await checkCache();
    if (cachedResult) {
      console.log(`[AI MATCH] Cache HIT (after wait) for Linkup ${linkupId} (${cachedResult.matches.length} matches, total: ${Date.now() - totalStartTime}ms)`);
      return cachedResult;
    }
  }

  // 6. Generate Match (Wrapped in Lock)
  const generatePromise = (async () => {
    let aiAnalysis = null;
    try {
      aiAnalysis = await matchCandidates(compactPayload, candidateIdsSet, candidateLookupMap);
    } catch (aiErr) {
      console.warn(`⚠️ AI Pipeline failed (${aiErr.message}). Falling back to emergency deterministic matcher.`);
      aiAnalysis = getFallbackDeterministicMatches(linkup, candidateResults);
    }

    // Clean match items (Direct AI matchPercentage output, NO JS re-scoring!)
    const formattedMatches = (aiAnalysis.matches || []).map((m) => {
      return {
        userId: String(m.userId),
        name: m.name || m.candidate?.name || 'Student Candidate',
        college: m.college || m.candidate?.college || 'University Student',
        degree: m.degree || m.candidate?.degree || '',
        yearOfStudy: m.yearOfStudy || m.candidate?.yearOfStudy || m.candidate?.year_of_study || '',
        verificationStatus: m.verificationStatus || m.candidate?.verificationStatus || 'UNVERIFIED',
        matchPercentage: Math.min(Math.max(parseInt(m.matchPercentage, 10) || 0, 0), 100),
        reasons: Array.isArray(m.reasons) ? m.reasons : [],
        strengths: Array.isArray(m.strengths) ? m.strengths : [],
        concerns: Array.isArray(m.concerns) ? m.concerns : [],
      };
    });

    formattedMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);
    const generatedByTag = aiAnalysis.generatedBy || 'FALLBACK';

    // Save to DB
    try {
      await query(`DELETE FROM matches WHERE meld_id = $1`, [linkupId]);

      for (const matchItem of formattedMatches) {
        await query(
          `INSERT INTO matches (meld_id, user_id, match_percentage, match_data, generated_by)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (meld_id, user_id) DO UPDATE SET
             match_percentage = EXCLUDED.match_percentage,
             match_data = EXCLUDED.match_data,
             generated_by = EXCLUDED.generated_by,
             created_at = CURRENT_TIMESTAMP`,
          [
            linkupId,
            matchItem.userId,
            matchItem.matchPercentage,
            JSON.stringify({
              inputHash,
              reasons: matchItem.reasons,
              strengths: matchItem.strengths,
              concerns: matchItem.concerns,
            }),
            generatedByTag,
          ]
        );
      }
    } catch (dbErr) {
      console.error(`[AI MATCH] Error saving matches to database:`, dbErr.message);
    }

    return {
      cached: false,
      generatedBy: generatedByTag,
      matches: formattedMatches,
    };
  })();

  inFlightLocks.set(linkupId, generatePromise);

  try {
    const result = await generatePromise;
    const totalDuration = Date.now() - totalStartTime;
    console.log(`[AI MATCH] Total getMatchesForLinkup Execution: ${totalDuration}ms`);
    return result;
  } finally {
    inFlightLocks.delete(linkupId);
  }
};

/**
 * Leave a Linkup
 */
const leaveLinkup = async (linkupId, userId) => {
  // Check if member exists
  const memberCheck = await query(
    `SELECT * FROM meld_members WHERE meld_id = $1 AND user_id = $2`,
    [linkupId, userId]
  );
  
  if (memberCheck.rows.length === 0) {
    throw new Error('You are not a member of this Linkup.');
  }

  const linkup = await getLinkupById(linkupId);
  if (linkup.creatorId === userId) {
    throw new Error('Creators cannot leave their own Linkup. Delete the Linkup instead.');
  }

  // Delete member
  await query(
    `DELETE FROM meld_members WHERE meld_id = $1 AND user_id = $2`,
    [linkupId, userId]
  );

  // If linkup was full, reopen it
  if (linkup.currentStatus === 'FULL') {
    await query(
      `UPDATE melds SET current_status = 'OPEN' WHERE id = $1`,
      [linkupId]
    );
  }

  return { success: true };
};

module.exports = {
  createLinkup,
  getLinkups,
  getLinkupById,
  updateLinkup,
  deleteLinkup,
  createJoinRequest,
  getLinkupRequests,
  acceptJoinRequest,
  rejectJoinRequest,
  removeTeamMember,
  getMatchesForLinkup,
  leaveLinkup,
};
