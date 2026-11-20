const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Optional authentication middleware:
 * Attaches req.user if a valid Bearer token is provided, but does not block requests if token is absent or invalid.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) return next();

    const secret = process.env.JWT_SECRET;
    if (!secret) return next();
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

    let userResult;
    try {
      userResult = await query(
        'SELECT id, name, username, email, COALESCE(token_version, 1) AS token_version, created_at, updated_at FROM users WHERE id = $1',
        [decoded.id]
      );
    } catch (dbErr) {
      if (dbErr.message && dbErr.message.includes('token_version')) {
        userResult = await query(
          'SELECT id, name, username, email, created_at, updated_at FROM users WHERE id = $1',
          [decoded.id]
        );
      } else {
        throw dbErr;
      }
    }

    if (userResult.rows.length > 0) {
      const dbUser = userResult.rows[0];
      // Treat tokens invalidated by a password reset as anonymous (same rule as authenticateToken)
      const isStale =
        typeof decoded.tokenVersion === 'number' &&
        typeof dbUser.token_version === 'number' &&
        decoded.tokenVersion < dbUser.token_version;
      if (!isStale) {
        req.user = dbUser;
      }
    }
    next();
  } catch (error) {
    // If token invalid/expired, continue without user attached
    next();
  }
};

module.exports = {
  optionalAuth,
};
