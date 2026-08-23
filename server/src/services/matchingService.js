/**
 * matchingService.js
 * 
 * Deterministic AI Matching Engine (Phase 2)
 * 
 * Component Weights:
 * - Skill Match: 50%
 * - Interest/Category Match: 25%
 * - Availability Match: 15%
 * - Profile/Bio Relevance: 10%
 */

const { query } = require('../config/db');

// Weight constants for deterministic scoring
const WEIGHTS = {
  skill: 0.50,
  interest: 0.25,
  availability: 0.15,
  profile: 0.10,
};

// Standard English stop words to filter out when tokenizing bio/text
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot', 'could',
  'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t',
  'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t',
  'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s',
  'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is',
  'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most',
  'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over',
  'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should',
  'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their',
  'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they',
  'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d',
  'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when',
  'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom',
  'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d',
  'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Normalizes input items into an array of lowercase strings.
 * Supports string arrays, objects with `name` properties, or comma-delimited strings.
 * 
 * @param {Array|string|null|undefined} input 
 * @returns {string[]}
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
 * Tokenizes text and extracts meaningful keywords (lowercased, punctuation removed, stop words omitted).
 * 
 * @param {string} text 
 * @returns {string[]} Unique array of keywords
 */
function extractKeywords(text) {
  if (!text || typeof text !== 'string') return [];
  const cleaned = text.toLowerCase().replace(/[^a-z0-9+#.-]/g, ' ');
  const words = cleaned.split(/\s+/).filter(word => {
    return word.length > 1 && !STOP_WORDS.has(word);
  });
  return Array.from(new Set(words));
}

/**
 * Parses availability string into numeric hours per week.
 * MUST require explicit hour context (e.g. "10 hrs/week", "5 hr", "10 hours").
 * Will NOT interpret arbitrary numbers or non-hour text as hours (e.g. "3 months" -> null, "Flexible" -> null).
 * 
 * @param {string|number|null|undefined} availability 
 * @returns {number|null}
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

  // Range matching with explicit hour context: e.g., "10-20 hrs/week", "10 to 15 hours"
  const rangeMatch = str.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|hr)(?:\s*(?:\/|per)\s*(?:week|wk))?(?:$|\s|[.,!])/i);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (!isNaN(min) && !isNaN(max)) {
      return (min + max) / 2;
    }
  }

  // Single value matching with explicit hour context: e.g., "10 hrs/week", "5 hr", "7.5 hours", "10 hours/week"
  const singleMatch = str.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|hr)(?:\s*(?:\/|per)\s*(?:week|wk))?(?:$|\s|[.,!])/i);
  if (singleMatch) {
    const val = parseFloat(singleMatch[1]);
    return isNaN(val) ? null : val;
  }

  return null;
}

/**
 * Calculates Skill Match Score (0 - 100).
 * Weight in final score: 50%
 * 
 * @param {Array|Object} targetSkills Target requirement or required skills array
 * @param {Array|Object} candidateSkills Candidate skills array or profile object
 * @returns {number} 0 - 100
 */
function calculateSkillMatch(targetSkills, candidateSkills) {
  const req = normalizeStringArray(
    Array.isArray(targetSkills) ? targetSkills : targetSkills?.requiredSkills || targetSkills?.skills
  );
  const cand = normalizeStringArray(
    Array.isArray(candidateSkills) ? candidateSkills : candidateSkills?.skills
  );

  if (req.length === 0) {
    return 100;
  }
  if (cand.length === 0) {
    return 0;
  }

  const candSet = new Set(cand);
  const matched = req.filter(skill => candSet.has(skill));
  const score = (matched.length / req.length) * 100;
  return Number(score.toFixed(2));
}

/**
 * Calculates Interest / Domain Category Match Score (0 - 100).
 * Weight in final score: 25%
 * 
 * @param {Array|Object} targetInterests Target requirement or required interests array
 * @param {Array|Object} candidateInterests Candidate interests array or profile object
 * @returns {number} 0 - 100
 */
function calculateInterestMatch(targetInterests, candidateInterests) {
  const req = normalizeStringArray(
    Array.isArray(targetInterests) ? targetInterests : targetInterests?.requiredInterests || targetInterests?.interests || targetInterests?.categories
  );
  const cand = normalizeStringArray(
    Array.isArray(candidateInterests) ? candidateInterests : candidateInterests?.interests
  );

  if (req.length === 0) {
    return 100;
  }
  if (cand.length === 0) {
    return 0;
  }

  const candSet = new Set(cand);
  const matched = req.filter(interest => candSet.has(interest));
  const score = (matched.length / req.length) * 100;
  return Number(score.toFixed(2));
}

/**
 * Calculates Availability Match Score (0 - 100).
 * Weight in final score: 15%
 * 
 * @param {string|number|Object} targetAvailability Required availability
 * @param {string|number|Object} candidateAvailability Candidate availability
 * @returns {number} 0 - 100
 */
function calculateAvailabilityMatch(targetAvailability, candidateAvailability) {
  const targetRaw = (targetAvailability && typeof targetAvailability === 'object' && !Array.isArray(targetAvailability))
    ? (targetAvailability.requiredAvailability ?? targetAvailability.availability ?? targetAvailability.hoursPerWeek)
    : targetAvailability;

  const candRaw = (candidateAvailability && typeof candidateAvailability === 'object' && !Array.isArray(candidateAvailability))
    ? (candidateAvailability.availability ?? candidateAvailability.profile?.availability ?? candidateAvailability.hoursPerWeek)
    : candidateAvailability;

  const targetHours = parseHoursPerWeek(targetRaw);
  const candHours = parseHoursPerWeek(candRaw);

  // If target does not specify required hours, any candidate matches 100%
  if (targetHours === null || targetHours <= 0) {
    return 100;
  }

  // If target requires hours but candidate hours cannot be parsed or is 0
  if (candHours === null || candHours <= 0) {
    return 0;
  }

  // If candidate has enough or more hours than required, 100%
  if (candHours >= targetHours) {
    return 100;
  }

  // Partial score based on proportion of required hours
  const score = (candHours / targetHours) * 100;
  return Number(score.toFixed(2));
}

/**
 * Calculates Profile / Bio Relevance Match Score (0 - 100).
 * Uses candidate BIO ONLY because the database has no experience field.
 * Weight in final score: 10%
 * 
 * @param {string|Array|Object} targetProfile Target description, bio, or keywords
 * @param {string|Object} candidateBio Candidate bio text or profile object
 * @returns {number} 0 - 100
 */
function calculateProfileMatch(targetProfile, candidateBio) {
  let targetText = '';
  if (typeof targetProfile === 'string') {
    targetText = targetProfile;
  } else if (Array.isArray(targetProfile)) {
    targetText = targetProfile.join(' ');
  } else if (targetProfile && typeof targetProfile === 'object') {
    targetText = targetProfile.description || targetProfile.bio || targetProfile.profileRelevance || targetProfile.keywords || '';
    if (Array.isArray(targetText)) targetText = targetText.join(' ');
  }

  let candText = '';
  if (typeof candidateBio === 'string') {
    candText = candidateBio;
  } else if (candidateBio && typeof candidateBio === 'object') {
    candText = candidateBio.bio || candidateBio.profile?.bio || '';
  }

  const targetKeywords = extractKeywords(targetText);
  const candKeywords = extractKeywords(candText);

  if (targetKeywords.length === 0) {
    return 100;
  }
  if (candKeywords.length === 0) {
    return 0;
  }

  const candSet = new Set(candKeywords);
  const matched = targetKeywords.filter(kw => candSet.has(kw));
  const score = (matched.length / targetKeywords.length) * 100;
  return Number(score.toFixed(2));
}

/**
 * Calculates final weighted composite score (0 - 100).
 * 
 * Weights:
 * - Skill Match: 50%
 * - Interest Match: 25%
 * - Availability Match: 15%
 * - Profile Match: 10%
 * 
 * @param {number|Object} skillScoreOrScores Object with scores or individual skill score
 * @param {number} [interestScore]
 * @param {number} [availabilityScore]
 * @param {number} [profileScore]
 * @returns {number} Composite score (0 - 100)
 */
function calculateFinalScore(skillScoreOrScores, interestScore, availabilityScore, profileScore) {
  let skill = 0;
  let interest = 0;
  let availability = 0;
  let profile = 0;

  if (typeof skillScoreOrScores === 'object' && skillScoreOrScores !== null) {
    skill = skillScoreOrScores.skillMatch ?? skillScoreOrScores.skillScore ?? skillScoreOrScores.skill ?? 0;
    interest = skillScoreOrScores.interestMatch ?? skillScoreOrScores.interestScore ?? skillScoreOrScores.interest ?? 0;
    availability = skillScoreOrScores.availabilityMatch ?? skillScoreOrScores.availabilityScore ?? skillScoreOrScores.availability ?? 0;
    profile = skillScoreOrScores.profileMatch ?? skillScoreOrScores.profileScore ?? skillScoreOrScores.profile ?? 0;
  } else {
    skill = typeof skillScoreOrScores === 'number' ? skillScoreOrScores : 0;
    interest = typeof interestScore === 'number' ? interestScore : 0;
    availability = typeof availabilityScore === 'number' ? availabilityScore : 0;
    profile = typeof profileScore === 'number' ? profileScore : 0;
  }

  const finalScore = (
    skill * WEIGHTS.skill +
    interest * WEIGHTS.interest +
    availability * WEIGHTS.availability +
    profile * WEIGHTS.profile
  );

  return Number(finalScore.toFixed(2));
}

/**
 * Calculates complete match between a target opportunity/project and a candidate.
 * 
 * @param {Object} target Target requirements
 * @param {Object} candidate Candidate profile
 * @returns {Object} Structured matching report with scores, weights, and match details
 */
function calculateMatch(target = {}, candidate = {}) {
  const skillMatch = calculateSkillMatch(target, candidate);
  const interestMatch = calculateInterestMatch(target, candidate);
  const availabilityMatch = calculateAvailabilityMatch(target, candidate);
  const profileMatch = calculateProfileMatch(target, candidate);

  const finalScore = calculateFinalScore({
    skillMatch,
    interestMatch,
    availabilityMatch,
    profileMatch,
  });

  const reqSkills = normalizeStringArray(target?.requiredSkills || target?.skills);
  const candSkills = normalizeStringArray(candidate?.skills);
  const candSkillSet = new Set(candSkills);
  const matchedSkills = reqSkills.filter(s => candSkillSet.has(s));
  const missingSkills = reqSkills.filter(s => !candSkillSet.has(s));

  const reqInterests = normalizeStringArray(target?.requiredInterests || target?.interests || target?.categories);
  const candInterests = normalizeStringArray(candidate?.interests);
  const candInterestSet = new Set(candInterests);
  const matchedInterests = reqInterests.filter(i => candInterestSet.has(i));

  const targetHours = parseHoursPerWeek(target?.requiredAvailability ?? target?.availability ?? target?.hoursPerWeek);
  const candHours = parseHoursPerWeek(candidate?.availability ?? candidate?.profile?.availability ?? candidate?.hoursPerWeek);

  return {
    score: finalScore,
    breakdown: {
      skillMatch,
      interestMatch,
      availabilityMatch,
      profileMatch,
    },
    weights: { ...WEIGHTS },
    details: {
      matchedSkills,
      missingSkills,
      matchedInterests,
      targetHours,
      candidateHours: candHours,
    },
  };
}

/**
 * Generates human-readable match reasons array for a candidate
 * 
 * @param {Object} matchResult Result from calculateMatch
 * @param {Object} target Linkup target requirement
 * @param {Object} candidate Candidate profile
 * @returns {Array<string>} Array of concise reason strings
 */
function generateMatchReasons(matchResult, target, candidate) {
  const reasons = [];
  const details = matchResult.details || {};
  const matchedSkills = details.matchedSkills || [];
  const reqSkills = normalizeStringArray(target?.requiredSkills || target?.skills);

  if (reqSkills.length > 0) {
    if (matchedSkills.length > 0) {
      const formattedSkills = matchedSkills
        .slice(0, 3)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(', ');
      reasons.push(`Has ${matchedSkills.length} of ${reqSkills.length} required skills (${formattedSkills})`);
    } else {
      reasons.push('Missing primary required skills');
    }
  }

  const matchedInterests = details.matchedInterests || [];
  if (matchedInterests.length > 0) {
    const formattedInterests = matchedInterests
      .slice(0, 2)
      .map((i) => i.charAt(0).toUpperCase() + i.slice(1))
      .join(' & ');
    reasons.push(`Interested in ${formattedInterests}`);
  } else if (target?.category) {
    reasons.push(`Category alignment with ${target.category}`);
  }

  if (matchResult.breakdown?.availabilityMatch >= 80) {
    reasons.push('Availability matches the project commitment level');
  }

  if (matchResult.breakdown?.profileMatch >= 50) {
    reasons.push('Bio description shows relevant background for project goals');
  }

  return reasons;
}

/**
 * PHASE 3: Candidate Filtering using PostgreSQL
 * 
 * Queries PostgreSQL to find relevant students for a Linkup using SQL priority filtering.
 * Never sends entire user database to AI models.
 * 
 * Filtering Priority:
 * 1. Students with matching required skills
 * 2. Students with matching interests
 * 3. Students with compatible availability
 * 4. Exclude Linkup creator
 * 5. Exclude students already in the team
 * 6. Exclude duplicate or invalid candidates
 * 
 * @param {string|Object} linkupOrId Linkup ID (UUID) or Linkup object
 * @param {number} [limit=20] Maximum candidate profiles to return (default: 20)
 * @returns {Promise<Array<Object>>} Filtered and ranked candidate student profiles with match scores
 */
const filterCandidateStudents = async (linkupOrId, limit = 20) => {
  let linkupId = null;
  let linkupObj = null;

  if (typeof linkupOrId === 'string') {
    linkupId = linkupOrId;
  } else if (linkupOrId && typeof linkupOrId === 'object') {
    linkupId = linkupOrId.id || linkupOrId.linkupId;
    linkupObj = linkupOrId;
  }

  if (!linkupId) {
    throw new Error('Invalid Linkup ID provided for candidate filtering.');
  }

  // 1. Fetch Linkup details if not provided
  if (!linkupObj || !linkupObj.creatorId) {
    const lRes = await query(
      `SELECT id, creator_id, title, description, category, commitment_level, project_duration, max_members, current_status
       FROM linkups WHERE id = $1`,
      [linkupId]
    );
    if (lRes.rows.length === 0) {
      throw new Error(`Linkup not found with ID: ${linkupId}`);
    }
    const row = lRes.rows[0];
    linkupObj = {
      id: row.id,
      creatorId: row.creator_id,
      title: row.title,
      description: row.description,
      category: row.category,
      commitmentLevel: row.commitment_level,
      projectDuration: row.project_duration,
      maxMembers: row.max_members,
      currentStatus: row.current_status,
    };
  }

  // Fetch required skills for Linkup if not attached
  if (!linkupObj.requiredSkills) {
    const sRes = await query(
      `SELECT s.id, s.name 
       FROM linkup_skills ls 
       JOIN skills s ON ls.skill_id = s.id 
       WHERE ls.linkup_id = $1`,
      [linkupId]
    );
    linkupObj.requiredSkills = sRes.rows;
  }

  // 2. Fetch excluded user IDs (Linkup creator + existing team members)
  const memberRes = await query(
    `SELECT DISTINCT user_id FROM linkup_members WHERE linkup_id = $1`,
    [linkupId]
  );
  const excludedUserIds = new Set(memberRes.rows.map((r) => r.user_id));
  if (linkupObj.creatorId) {
    excludedUserIds.add(linkupObj.creatorId);
  }
  const excludedArray = Array.from(excludedUserIds);

  // 3. Extract required skill IDs & names
  const reqSkillIds = [];
  if (Array.isArray(linkupObj.requiredSkills)) {
    for (const sk of linkupObj.requiredSkills) {
      if (typeof sk === 'object' && sk.id) {
        const parsedId = parseInt(sk.id, 10);
        if (!isNaN(parsedId)) reqSkillIds.push(parsedId);
      }
    }
  }

  const categoryStr = (linkupObj.category || '').trim();
  const maxLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

  // 4. Execute SQL priority candidate query
  const filterQueryText = `
    SELECT 
      u.id, u.name,
      sp.college, sp.degree, sp.year_of_study, sp.bio, sp.availability,
      sp.github_url, sp.linkedin_url,
      COALESCE(sv.status, 'UNVERIFIED') as verification_status,
      (
        CASE 
          WHEN $2::int[] IS NOT NULL AND CARDINALITY($2::int[]) > 0 THEN
            (SELECT COUNT(*)::int FROM user_skills us WHERE us.user_id = u.id AND us.skill_id = ANY($2::int[]))
          ELSE 0
        END
      ) as skill_match_count,
      (
        CASE 
          WHEN $3::text IS NOT NULL AND $3::text <> '' THEN
            (SELECT COUNT(*)::int FROM user_interests ui JOIN interests i ON ui.interest_id = i.id WHERE ui.user_id = u.id AND i.name ILIKE '%' || $3 || '%')
          ELSE 0
        END
      ) as interest_match_count
    FROM users u
    JOIN student_profiles sp ON u.id = sp.user_id
    LEFT JOIN student_verifications sv ON u.id = sv.user_id
    WHERE ($1::uuid[] IS NULL OR CARDINALITY($1::uuid[]) = 0 OR NOT (u.id = ANY($1::uuid[])))
    ORDER BY skill_match_count DESC, interest_match_count DESC, u.created_at DESC
    LIMIT $4
  `;

  const candidatesRes = await query(filterQueryText, [
    excludedArray,
    reqSkillIds,
    categoryStr,
    maxLimit,
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

  // 7. Format candidate profiles and calculate match scores
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
      skills: candidateSkillsMap[row.id] || [],
      interests: candidateInterestsMap[row.id] || [],
    };

    const matchResult = calculateMatch(linkupObj, candidateObj);
    return {
      userId: candidateObj.id,
      name: candidateObj.name,
      college: candidateObj.college,
      degree: candidateObj.degree,
      yearOfStudy: candidateObj.yearOfStudy,
      verificationStatus: candidateObj.verificationStatus,
      matchPercentage: Math.round(matchResult.score),
      breakdown: matchResult.breakdown,
      reasons: generateMatchReasons(matchResult, linkupObj, candidateObj),
      candidate: candidateObj,
    };
  });

  // Sort descending by matchPercentage
  formattedCandidates.sort((a, b) => b.matchPercentage - a.matchPercentage);

  return formattedCandidates.slice(0, maxLimit);
};

/**
 * Emergency Fallback Deterministic Matcher (Used ONLY when AI calls completely fail)
 */
const getFallbackDeterministicMatches = (linkup, candidates) => {
  const formattedMatches = candidates.map((item) => {
    const candidateObj = item.candidate || item;
    const matchResult = calculateMatch(linkup, candidateObj);

    const matchedSkills = matchResult.details?.matchedSkills || [];
    const missingSkills = matchResult.details?.missingSkills || [];

    return {
      userId: String(candidateObj.id || candidateObj.userId),
      name: candidateObj.name || 'Student Candidate',
      college: candidateObj.college || 'University Student',
      degree: candidateObj.degree || '',
      yearOfStudy: candidateObj.yearOfStudy || candidateObj.year_of_study || '',
      verificationStatus: candidateObj.verificationStatus || candidateObj.verification_status || 'UNVERIFIED',
      matchPercentage: Math.round(matchResult.score),
      reasons: generateMatchReasons(matchResult, linkup, candidateObj),
      strengths: matchedSkills.map((s) => `Matched skill: ${s}`),
      concerns: missingSkills.map((s) => `Missing skill: ${s}`),
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
  calculateSkillMatch,
  calculateInterestMatch,
  calculateAvailabilityMatch,
  calculateProfileMatch,
  calculateFinalScore,
  calculateMatch,
  parseHoursPerWeek,
  generateMatchReasons,
  filterCandidateStudents,
  getFallbackDeterministicMatches,
};
