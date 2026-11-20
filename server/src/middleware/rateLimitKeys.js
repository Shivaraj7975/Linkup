const { ipKeyGenerator } = require('express-rate-limit');

/**
 * Rate-limit key helpers for account-aware limiters.
 *
 * - The IP part goes through ipKeyGenerator so IPv6 clients are bucketed by /56 subnet.
 *   Raw req.ip let one host rotate addresses inside its IPv6 range for fresh buckets.
 * - The account part must come from the SAME body field the handler reads. Keying
 *   register/verify-otp on `identifier` while the handler reads `email` let a junk
 *   `identifier` value give every attempt a new bucket.
 */
const normalizeAccount = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const pickAccount = (body, fields) => {
  for (const field of fields) {
    const value = normalizeAccount(body?.[field]);
    if (value) return value;
  }
  return '';
};

// Body fields each auth handler actually uses, in the handler's precedence order
const HANDLER_ACCOUNT_FIELDS = [
  [/\/auth\/register\/?$/, ['email']],
  [/\/auth\/verify-otp\/?$/, ['email']],
];
const DEFAULT_ACCOUNT_FIELDS = ['identifier', 'email', 'username'];

const accountFieldsForPath = (path = '') => {
  const match = HANDLER_ACCOUNT_FIELDS.find(([pattern]) => pattern.test(path));
  return match ? match[1] : DEFAULT_ACCOUNT_FIELDS;
};

const ipAccountKey = (req) => {
  const path = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;
  const account = pickAccount(req.body, accountFieldsForPath(path));
  return `${ipKeyGenerator(req.ip || '')}_${account}`;
};

module.exports = { ipAccountKey, accountFieldsForPath };
