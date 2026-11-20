/**
 * Size limits for list fields that fan out into per-item DB writes.
 *
 * Each skill/interest item runs its own INSERTs inside one transaction, so an
 * unbounded array let a single user hold pooled connections for minutes
 * (5 requests with 100k skills took the API offline) and flood the shared
 * skills catalogue. Limits sit well above anything the UI produces.
 */
const LIMITS = {
  skills: 100,
  interests: 100,
  requiredSkills: 50,
  nameLength: 100,
};

const itemName = (item) => {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object' && typeof item.name === 'string') return item.name;
  return '';
};

/**
 * Returns an error message for the first oversized list in `body`, or null.
 * Only checks fields that are present; non-array values are left to existing handling.
 */
const findListLimitViolation = (body, fields) => {
  if (!body || typeof body !== 'object') return null;
  for (const field of fields) {
    const list = body[field];
    if (!Array.isArray(list)) continue;
    const max = LIMITS[field];
    if (list.length > max) {
      return `Too many ${field}: at most ${max} are allowed.`;
    }
    if (list.some((item) => itemName(item).trim().length > LIMITS.nameLength)) {
      return `Each entry in ${field} must be at most ${LIMITS.nameLength} characters.`;
    }
  }
  return null;
};

module.exports = { LIMITS, findListLimitViolation };
