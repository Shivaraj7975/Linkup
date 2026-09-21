/**
 * matchingService.js
 * 
 * Hybrid Matchmaking Engine & Deterministic Scoring Service for MELD.
 * 
 * Formula:
 * finalScore = round(
 *   0.35 * skillScore +
 *   0.20 * roleFitScore +
 *   0.15 * projectRelevanceScore +
 *   0.10 * interestScore +
 *   0.10 * availabilityScore +
 *   0.10 * teamComplementScore
 * )
 */

const { query } = require('../config/db');
const { normalizeSkillArray, getCanonicalSkillKey } = require('../utils/skillNormalizer');
const { deriveProjectRoles, analyzeTeamComplement } = require('../utils/roleDerivation');
const { calculateSemanticRelevance } = require('../utils/semanticMatcher');

// Standard Weight Configuration
const WEIGHTS = {
  skill: 0.35,
  roleFit: 0.20,
  projectRelevance: 0.15,
  interest: 0.10,
  availability: 0.10,
  teamComplement: 0.10,
};

/**
 * Normalizes string array input
 */
function normalizeStringArray(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map(item => {
        if (typeof item === 'string') return item.trim().toLowerCase();
        if (item && typeof item === 'object' && typeof item.name === 'string') {
          return item.name.trim().toLowerCase();
        }
        return '';
      })
      .filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(/[,;\n]+/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

/**
 * Parses availability string into numeric hours per week.
 */
function parseHoursPerWeek(availability) {
  if (availability === null || availability === undefined) {
    return null;
  }
  if (typeof availability === 'number') {
    return !isNaN(availability) && availability >= 0 ? availability : null;
  }
  if (typeof availability !== 'string') {
    return null;
  }

  const str = availability.trim();
  if (!str) return null;

  const rangeMatch = str.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|hr)(?:\s*(?:\/|per)\s*(?:week|wk))?(?:$|\s|[.,!])/i);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (!isNaN(min) && !isNaN(max)) {
      return (min + max) / 2;
    }
  }

  const singleMatch = str.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|hr)(?:\s*(?:\/|per)\s*(?:week|wk))?(?:$|\s|[.,!])/i);
  if (singleMatch) {
    const val = parseFloat(singleMatch[1]);
    return isNaN(val) ? null : val;
  }

  return null;
}

/**
 * Calculates Skill Match Score (0 - 100) using canonical skill normalization.
 */
function calculateSkillMatch(targetSkills, candidateSkills) {
  const req = normalizeSkillArray(
    Array.isArray(targetSkills) ? targetSkills : targetSkills?.requiredSkills || targetSkills?.skills
  );
  const cand = normalizeSkillArray(
    Array.isArray(candidateSkills) ? candidateSkills : candidateSkills?.skills
  );

  if (req.length === 0) return 100;
  if (cand.length === 0) return 0;

  const candSet = new Set(cand.map(s => getCanonicalSkillKey(s)));
  const matched = req.filter(skill => candSet.has(getCanonicalSkillKey(skill)));
  const score = (matched.length / req.length) * 100;
  return Math.min(Math.max(Math.round(score), 0), 100);
}

/**
 * Calculates Interest / Category Match Score (0 - 100).
 */
function calculateInterestMatch(targetInterests, candidateInterests) {
  const req = normalizeStringArray(
    Array.isArray(targetInterests) ? targetInterests : targetInterests?.requiredInterests || targetInterests?.interests || targetInterests?.category
  );
  const cand = normalizeStringArray(
    Array.isArray(candidateInterests) ? candidateInterests : candidateInterests?.interests
  );

  if (req.length === 0) return 100;
  if (cand.length === 0) return 0;

  const candSet = new Set(cand);
  const matched = req.filter(interest => {
    return candSet.has(interest) || Array.from(candSet).some(c => c.includes(interest) || interest.includes(c));
  });

  const score = (matched.length / req.length) * 100;
  return Math.min(Math.max(Math.round(score), 0), 100);
}

/**
 * Calculates Availability Match Score (0 - 100).
 */
function calculateAvailabilityMatch(targetAvailability, candidateAvailability) {
  const targetRaw = (targetAvailability && typeof targetAvailability === 'object' && !Array.isArray(targetAvailability))
    ? (targetAvailability.projectDuration ?? targetAvailability.requiredAvailability ?? targetAvailability.availability)
    : targetAvailability;

  const candRaw = (candidateAvailability && typeof candidateAvailability === 'object' && !Array.isArray(candidateAvailability))
    ? (candidateAvailability.availability ?? candidateAvailability.profile?.availability)
    : candidateAvailability;

  const candStr = String(candRaw || '').toLowerCase();
  if (candStr.includes('flexible') || candStr.includes('full-time') || candStr.includes('sprint')) {
    return 100;
  }

  const targetHours = parseHoursPerWeek(targetRaw);
  const candHours = parseHoursPerWeek(candRaw);

  if (targetHours === null || targetHours <= 0) return 100;
  if (candHours === null || candHours <= 0) return 50; // Partial baseline for unparsed availability

  if (candHours >= targetHours) return 100;

  const score = (candHours / targetHours) * 100;
  return Math.min(Math.max(Math.round(score), 0), 100);
}

/**
 * Calculates Role Fit Score & Best Fit Role (0 - 100).
 */
function calculateRoleFit(project, candidate) {
  const derivedRoles = deriveProjectRoles(project);
  const candSkills = normalizeSkillArray(candidate.skills || []);
  const candSkillSet = new Set(candSkills.map(s => getCanonicalSkillKey(s)));

  let bestRole = derivedRoles[0]?.name || 'Project Contributor';
  let highestScore = 0;

  for (const role of derivedRoles) {
    if (!role.skills || role.skills.length === 0) continue;
    const matched = role.skills.filter(s => candSkillSet.has(getCanonicalSkillKey(s)));
    const fitPercentage = (matched.length / role.skills.length) * 100;

    if (fitPercentage > highestScore) {
      highestScore = fitPercentage;
      bestRole = role.name;
    }
  }

  // If candidate has some skills but not exact role skills
  if (highestScore === 0 && candSkills.length > 0) {
    highestScore = 30;
  }

  return {
    score: Math.min(Math.max(Math.round(highestScore), 0), 100),
    bestFitRole: bestRole,
  };
}

/**
 * Calculates Team Complement Score (0 - 100).
 * High score if candidate fulfills unmet gaps; lower score if candidate only duplicates already-filled roles.
 */
function calculateTeamComplement(project, candidate, teamContext) {
  const teamAnalysis = teamContext || analyzeTeamComplement(project, project.members || []);
  const candSkills = normalizeSkillArray(candidate.skills || []);
  const candSkillSet = new Set(candSkills.map(s => getCanonicalSkillKey(s)));

  const unmetNeeds = teamAnalysis.unmetNeeds || [];
  if (unmetNeeds.length === 0) {
    // Team already covers basic needs; candidate contributes to overall skill capacity
    return 80;
  }

  // Check how many unmet missing skills candidate covers
  let coveredUnmetSkills = 0;
  let totalMissingSkills = 0;

  for (const gap of unmetNeeds) {
    for (const s of (gap.missingSkills || [])) {
      totalMissingSkills++;
      if (candSkillSet.has(getCanonicalSkillKey(s))) {
        coveredUnmetSkills++;
      }
    }
  }

  if (totalMissingSkills === 0) return 85;

  const gapFillRatio = (coveredUnmetSkills / totalMissingSkills);
  const score = Math.round(50 + gapFillRatio * 50);
  return Math.min(Math.max(score, 0), 100);
}

/**
 * Backend-Controlled Compatibility Score Formula.
 * 
 * finalScore = round(
 *   0.35 * skillScore +
 *   0.20 * roleFitScore +
 *   0.15 * projectRelevanceScore +
 *   0.10 * interestScore +
 *   0.10 * availabilityScore +
 *   0.10 * teamComplementScore
 * )
 */
function calculateFinalBackendScore(scores = {}) {
  const skill = Math.min(Math.max(Number(scores.skillScore) || 0, 0), 100);
  const roleFit = Math.min(Math.max(Number(scores.roleFitScore) || 0, 0), 100);
  const projectRelevance = Math.min(Math.max(Number(scores.projectRelevanceScore) || 0, 0), 100);
  const interest = Math.min(Math.max(Number(scores.interestScore) || 0, 0), 100);
  const availability = Math.min(Math.max(Number(scores.availabilityScore) || 0, 0), 100);
  const teamComplement = Math.min(Math.max(Number(scores.teamComplementScore) || 0, 0), 100);

  const weighted = (
    WEIGHTS.skill * skill +
    WEIGHTS.roleFit * roleFit +
    WEIGHTS.projectRelevance * projectRelevance +
    WEIGHTS.interest * interest +
    WEIGHTS.availability * availability +
    WEIGHTS.teamComplement * teamComplement
  );

  return Math.min(Math.max(Math.round(weighted), 0), 100);
}

/**
 * Calculates complete match report for a project and candidate.
 */
function calculateMatch(project = {}, candidate = {}, teamContext = null) {
  const skillScore = calculateSkillMatch(project, candidate);
  const interestScore = calculateInterestMatch(project, candidate);
  const availabilityScore = calculateAvailabilityMatch(project, candidate);
  const projectRelevanceScore = calculateSemanticRelevance(project, candidate);
  const { score: roleFitScore, bestFitRole } = calculateRoleFit(project, candidate);
  const teamComplementScore = calculateTeamComplement(project, candidate, teamContext);

  const finalScore = calculateFinalBackendScore({
    skillScore,
    roleFitScore,
    projectRelevanceScore,
    interestScore,
    availabilityScore,
    teamComplementScore,
  });

  const reqSkills = normalizeSkillArray(project.requiredSkills || project.skills || []);
  const candSkills = normalizeSkillArray(candidate.skills || []);
  const candSkillSet = new Set(candSkills.map(s => getCanonicalSkillKey(s)));

  const matchedSkills = reqSkills.filter(s => candSkillSet.has(getCanonicalSkillKey(s)));
  const missingSkills = reqSkills.filter(s => !candSkillSet.has(getCanonicalSkillKey(s)));

  return {
    score: finalScore,
    roleName: bestFitRole,
    breakdown: {
      skillScore,
      roleFitScore,
      projectRelevanceScore,
      interestScore,
      availabilityScore,
      teamComplementScore,
    },
    weights: { ...WEIGHTS },
    details: {
      matchedSkills,
      missingSkills,
      bestFitRole,
    },
  };
}

/**
 * Generates human-readable match reasons array for a candidate
 */
function generateMatchReasons(matchResult, project, candidate) {
  const reasons = [];
  const details = matchResult.details || {};
  const breakdown = matchResult.breakdown || {};
  const matchedSkills = details.matchedSkills || [];
  const reqSkills = normalizeSkillArray(project.requiredSkills || project.skills || []);

  if (matchedSkills.length > 0) {
    const formatted = matchedSkills.slice(0, 3).join(', ');
    reasons.push(`Strong alignment with required skills: ${formatted}`);
  } else if (reqSkills.length > 0) {
    reasons.push('Shows foundational background for project goals');
  }

  if (details.bestFitRole) {
    reasons.push(`Well-suited for the ${details.bestFitRole} role`);
  }

  if (breakdown.teamComplementScore >= 70) {
    reasons.push('Fills essential skill gaps on the current team');
  }

  if (breakdown.availabilityScore >= 80) {
    reasons.push('Availability aligns with project schedule needs');
  }

  if (breakdown.projectRelevanceScore >= 60) {
    reasons.push('Bio and experience match project domain');
  }

  return reasons.slice(0, 4);
}

/**
 * Helper to construct parameterized SQL WHERE clauses for candidate filtering.
 */
function buildCandidateFilterClauses(filters = {}, startParamIdx = 5) {
  const whereClauses = [];
  const params = [];
  let paramIdx = startParamIdx;

  if (filters.city && typeof filters.city === 'string' && filters.city.trim()) {
    whereClauses.push(`sp.city ILIKE $${paramIdx++}`);
    params.push(`%${filters.city.trim()}%`);
  }

  if (filters.college && typeof filters.college === 'string' && filters.college.trim()) {
    whereClauses.push(`sp.college ILIKE $${paramIdx++}`);
    params.push(`%${filters.college.trim()}%`);
  }

  if (filters.branch && typeof filters.branch === 'string' && filters.branch.trim()) {
    whereClauses.push(`sp.degree ILIKE $${paramIdx++}`);
    params.push(`%${filters.branch.trim()}%`);
  }

  if (filters.year && typeof filters.year === 'string' && filters.year.trim()) {
    whereClauses.push(`sp.year_of_study ILIKE $${paramIdx++}`);
    params.push(`%${filters.year.trim()}%`);
  }

  const skillsList = normalizeSkillArray(filters.skills || []);
  if (skillsList.length > 0) {
    const lowerSkills = skillsList.map(s => s.toLowerCase());
    const mode = (filters.skillMatchMode || 'any').toLowerCase();

    if (mode === 'all') {
      whereClauses.push(`(
        SELECT COUNT(DISTINCT LOWER(s.name))::int 
        FROM user_skills us 
        JOIN skills s ON us.skill_id = s.id 
        WHERE us.user_id = u.id AND LOWER(s.name) = ANY($${paramIdx++}::text[])
      ) >= $${paramIdx++}`);
      params.push(lowerSkills, lowerSkills.length);
    } else {
      whereClauses.push(`EXISTS (
        SELECT 1 
        FROM user_skills us 
        JOIN skills s ON us.skill_id = s.id 
        WHERE us.user_id = u.id AND LOWER(s.name) = ANY($${paramIdx++}::text[])
      )`);
      params.push(lowerSkills);
    }
  }

  return {
    whereSql: whereClauses.length > 0 ? `AND ${whereClauses.join(' AND ')}` : '',
    params,
  };
}

/**
 * Counts the number of eligible candidates matching structured filters before AI execution.
 */
const countEligibleCandidates = async (linkupOrId, filters = {}) => {
  let linkupId = null;
  let linkupObj = null;

  if (typeof linkupOrId === 'string') {
    linkupId = linkupOrId;
  } else if (linkupOrId && typeof linkupOrId === 'object') {
    linkupId = linkupOrId.id || linkupOrId.linkupId;
    linkupObj = linkupOrId;
  }

  if (!linkupId) {
    throw new Error('Invalid MELD ID provided for candidate count.');
  }

  if (!linkupObj || !linkupObj.creatorId) {
    const lRes = await query(`SELECT id, creator_id FROM melds WHERE id = $1`, [linkupId]);
    if (lRes.rows.length === 0) {
      throw new Error(`MELD not found with ID: ${linkupId}`);
    }
    linkupObj = { id: lRes.rows[0].id, creatorId: lRes.rows[0].creator_id };
  }

  const memberRes = await query(
    `SELECT user_id FROM meld_members WHERE meld_id = $1 AND status = 'ACTIVE'`,
    [linkupId]
  );
  const excludedUserIds = new Set(memberRes.rows.map(r => r.user_id));
  if (linkupObj.creatorId) {
    excludedUserIds.add(linkupObj.creatorId);
  }
  const excludedArray = Array.from(excludedUserIds);

  const filterResult = buildCandidateFilterClauses(filters, 2);
  const countQuery = `
    SELECT COUNT(DISTINCT u.id)::int as total_count
    FROM users u
    JOIN student_profiles sp ON u.id = sp.user_id
    WHERE ($1::uuid[] IS NULL OR CARDINALITY($1::uuid[]) = 0 OR NOT (u.id = ANY($1::uuid[])))
    ${filterResult.whereSql}
  `;

  const countRes = await query(countQuery, [excludedArray, ...filterResult.params]);
  return countRes.rows[0]?.total_count || 0;
};

/**
 * STAGE 1: Broad Candidate Retrieval using PostgreSQL (50 - 100 candidates)
 * 
 * Uses canonical skill IDs, category overlap, availability compatibility,
 * applies pre-AI eligibility filters, and excludes project creator + existing team members.
 */
const filterCandidateStudents = async (linkupOrId, limit = 50, filters = {}) => {
  let linkupId = null;
  let linkupObj = null;

  if (typeof linkupOrId === 'string') {
    linkupId = linkupOrId;
  } else if (linkupOrId && typeof linkupOrId === 'object') {
    linkupId = linkupOrId.id || linkupOrId.linkupId;
    linkupObj = linkupOrId;
  }

  if (!linkupId) {
    throw new Error('Invalid MELD ID provided for candidate filtering.');
  }

  // 1. Fetch Linkup details if not provided
  if (!linkupObj || !linkupObj.creatorId) {
    const lRes = await query(
      `SELECT id, creator_id, title, description, category, project_duration, max_members, current_status
       FROM melds WHERE id = $1`,
      [linkupId]
    );
    if (lRes.rows.length === 0) {
      throw new Error(`MELD not found with ID: ${linkupId}`);
    }
    const row = lRes.rows[0];
    linkupObj = {
      id: row.id,
      creatorId: row.creator_id,
      title: row.title,
      description: row.description,
      category: row.category,
      projectDuration: row.project_duration,
      maxMembers: row.max_members,
      currentStatus: row.current_status,
    };
  }

  // Fetch required skills for Linkup if not attached
  if (!linkupObj.requiredSkills) {
    const sRes = await query(
      `SELECT s.id, s.name 
       FROM meld_skills ls 
       JOIN skills s ON ls.skill_id = s.id 
       WHERE ls.meld_id = $1`,
      [linkupId]
    );
    linkupObj.requiredSkills = sRes.rows;
  }

  // Fetch existing team members
  const memberRes = await query(
    `SELECT mm.user_id, mm.role, u.name,
            COALESCE(
              (SELECT json_agg(s.name) FROM user_skills us JOIN skills s ON us.skill_id = s.id WHERE us.user_id = mm.user_id),
              '[]'::json
            ) as skills
     FROM meld_members mm
     JOIN users u ON mm.user_id = u.id
     WHERE mm.meld_id = $1 AND mm.status = 'ACTIVE'`,
    [linkupId]
  );
  linkupObj.members = memberRes.rows.map(r => ({
    userId: r.user_id,
    id: r.user_id,
    name: r.name,
    role: r.role,
    skills: Array.isArray(r.skills) ? r.skills : [],
  }));

  // 2. Fetch excluded user IDs (MELD creator + existing active team members)
  const excludedUserIds = new Set(linkupObj.members.map((r) => r.userId));
  if (linkupObj.creatorId) {
    excludedUserIds.add(linkupObj.creatorId);
  }
  const excludedArray = Array.from(excludedUserIds);

  // 3. Extract normalized required skills
  const reqSkills = normalizeSkillArray(linkupObj.requiredSkills || []);
  const categoryStr = (linkupObj.category || '').trim();
  const maxLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 10), 100);

  // 4. Build custom candidate filter clauses (Stage 1)
  const filterClausesResult = buildCandidateFilterClauses(filters, 5);

  const filterQueryText = `
    SELECT 
      u.id, u.name,
      sp.college, sp.degree, sp.year_of_study, sp.bio, sp.availability,
      sp.github_url, sp.linkedin_url,
      COALESCE(sv.status, 'UNVERIFIED') as verification_status,
      (
        CASE 
          WHEN $2::text[] IS NOT NULL AND CARDINALITY($2::text[]) > 0 THEN
            (SELECT COUNT(*)::int FROM user_skills us JOIN skills s ON us.skill_id = s.id 
             WHERE us.user_id = u.id AND LOWER(s.name) = ANY($2::text[]))
          ELSE 0
        END
      ) as skill_match_count,
      (
        CASE 
          WHEN $3::text IS NOT NULL AND $3::text <> '' THEN
            (SELECT COUNT(*)::int FROM user_interests ui JOIN interests i ON ui.interest_id = i.id 
             WHERE ui.user_id = u.id AND i.name ILIKE '%' || $3 || '%')
          ELSE 0
        END
      ) as interest_match_count
    FROM users u
    JOIN student_profiles sp ON u.id = sp.user_id
    LEFT JOIN student_verifications sv ON u.id = sv.user_id
    WHERE ($1::uuid[] IS NULL OR CARDINALITY($1::uuid[]) = 0 OR NOT (u.id = ANY($1::uuid[])))
    ${filterClausesResult.whereSql}
    ORDER BY skill_match_count DESC, interest_match_count DESC, u.created_at DESC
    LIMIT $4
  `;

  const candidatesRes = await query(filterQueryText, [
    excludedArray,
    reqSkills.map(s => s.toLowerCase()),
    categoryStr,
    maxLimit,
    ...filterClausesResult.params,
  ]);

  if (candidatesRes.rows.length === 0) {
    return [];
  }

  const candidateUserIds = candidatesRes.rows.map((row) => row.id);

  // 5. Fetch candidate skills
  const csRes = await query(
    `SELECT us.user_id, s.name 
     FROM user_skills us 
     JOIN skills s ON us.skill_id = s.id 
     WHERE us.user_id = ANY($1::uuid[]) 
     ORDER BY s.name ASC`,
    [candidateUserIds]
  );
  const candidateSkillsMap = {};
  for (const row of csRes.rows) {
    if (!candidateSkillsMap[row.user_id]) candidateSkillsMap[row.user_id] = [];
    candidateSkillsMap[row.user_id].push(row.name);
  }

  // 6. Fetch candidate interests
  const ciRes = await query(
    `SELECT ui.user_id, i.name 
     FROM user_interests ui 
     JOIN interests i ON ui.interest_id = i.id 
     WHERE ui.user_id = ANY($1::uuid[]) 
     ORDER BY i.name ASC`,
    [candidateUserIds]
  );
  const candidateInterestsMap = {};
  for (const row of ciRes.rows) {
    if (!candidateInterestsMap[row.user_id]) candidateInterestsMap[row.user_id] = [];
    candidateInterestsMap[row.user_id].push(row.name);
  }

  // Pre-calculate team complement context
  const teamContext = analyzeTeamComplement(linkupObj, linkupObj.members || []);

  // 7. Format candidate profiles and compute scores
  const formattedCandidates = candidatesRes.rows.map((row) => {
    const candidateObj = {
      id: row.id,
      userId: row.id,
      name: row.name,
      college: row.college || '',
      degree: row.degree || '',
      yearOfStudy: row.year_of_study || '',
      bio: row.bio || '',
      availability: row.availability || 'Flexible',
      githubUrl: row.github_url || '',
      linkedinUrl: row.linkedin_url || '',
      verificationStatus: row.verification_status,
      skills: normalizeSkillArray(candidateSkillsMap[row.id] || []),
      interests: candidateInterestsMap[row.id] || [],
    };

    const matchResult = calculateMatch(linkupObj, candidateObj, teamContext);
    const matchedSkills = matchResult.details?.matchedSkills || [];
    const missingSkills = matchResult.details?.missingSkills || [];

    return {
      userId: candidateObj.id,
      name: candidateObj.name,
      college: candidateObj.college,
      degree: candidateObj.degree,
      yearOfStudy: candidateObj.yearOfStudy,
      verificationStatus: candidateObj.verificationStatus,
      matchPercentage: matchResult.score,
      roleName: matchResult.roleName,
      breakdown: matchResult.breakdown,
      reasons: generateMatchReasons(matchResult, linkupObj, candidateObj),
      strengths: matchedSkills.map(s => `Skill match: ${s}`),
      concerns: missingSkills.slice(0, 2).map(s => `Lacks ${s}`),
      candidate: candidateObj,
    };
  });

  // Sort by matchPercentage descending
  formattedCandidates.sort((a, b) => b.matchPercentage - a.matchPercentage);

  return formattedCandidates.slice(0, maxLimit);
};

/**
 * Emergency Fallback Deterministic Matcher (Used ONLY when AI calls completely fail)
 */
const getFallbackDeterministicMatches = (project, candidates) => {
  const teamContext = analyzeTeamComplement(project, project.members || []);

  const formattedMatches = candidates.map((item) => {
    const candidateObj = item.candidate || item;
    const matchResult = calculateMatch(project, candidateObj, teamContext);

    const matchedSkills = matchResult.details?.matchedSkills || [];
    const missingSkills = matchResult.details?.missingSkills || [];

    return {
      userId: String(candidateObj.id || candidateObj.userId),
      name: candidateObj.name || 'Student Candidate',
      college: candidateObj.college || 'University Student',
      degree: candidateObj.degree || '',
      yearOfStudy: candidateObj.yearOfStudy || candidateObj.year_of_study || '',
      verificationStatus: candidateObj.verificationStatus || candidateObj.verification_status || 'UNVERIFIED',
      matchPercentage: matchResult.score,
      roleName: matchResult.roleName,
      skillScore: matchResult.breakdown.skillScore,
      roleFitScore: matchResult.breakdown.roleFitScore,
      projectRelevanceScore: matchResult.breakdown.projectRelevanceScore,
      interestScore: matchResult.breakdown.interestScore,
      availabilityScore: matchResult.breakdown.availabilityScore,
      teamComplementScore: matchResult.breakdown.teamComplementScore,
      reasons: generateMatchReasons(matchResult, project, candidateObj),
      strengths: matchedSkills.map((s) => `Skill match: ${s}`),
      concerns: missingSkills.slice(0, 2).map((s) => `Lacks ${s}`),
      generatedBy: 'FALLBACK',
      candidate: candidateObj,
    };
  });

  formattedMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);

  return {
    success: true,
    generatedBy: 'FALLBACK',
    matches: formattedMatches,
  };
};

module.exports = {
  WEIGHTS,
  calculateSkillMatch,
  calculateInterestMatch,
  calculateAvailabilityMatch,
  calculateRoleFit,
  calculateTeamComplement,
  calculateFinalBackendScore,
  calculateMatch,
  parseHoursPerWeek,
  generateMatchReasons,
  buildCandidateFilterClauses,
  countEligibleCandidates,
  filterCandidateStudents,
  getFallbackDeterministicMatches,
};

