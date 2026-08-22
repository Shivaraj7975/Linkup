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

    const secret = process.env.JWT_SECRET || 'linkup_jwt_super_secret_key_2026_dev';
    const decoded = jwt.verify(token, secret);

    const userResult = await query(
      'SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length > 0) {
      req.user = userResult.rows[0];
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
