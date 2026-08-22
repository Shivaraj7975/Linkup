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

module.exports = {
  calculateSkillMatch,
  calculateInterestMatch,
  calculateAvailabilityMatch,
  calculateProfileMatch,
  calculateFinalScore,
  calculateMatch,
  parseHoursPerWeek,
};
