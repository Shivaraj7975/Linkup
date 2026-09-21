/**
 * matchingConstants.js
 * 
 * Centralized constants and thresholds for MELD AI Matchmaking & Candidate Pre-Filtering.
 */

const POOL_THRESHOLDS = {
  ZERO: 0,
  SMALL_WARN_MAX: 2,
  NORMAL_MIN: 3,
};

const SKILL_MATCH_MODES = {
  ANY: 'any',
  ALL: 'all',
};

module.exports = {
  POOL_THRESHOLDS,
  SKILL_MATCH_MODES,
};
