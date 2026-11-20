const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Authentication middleware verifying JWT tokens
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing.',
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

    // Fetch user from DB to ensure user still exists and check session token version
    let userResult;
    try {
      userResult = await query(
        'SELECT id, name, username, email, role, COALESCE(token_version, 1) as token_version, created_at, updated_at FROM users WHERE id = $1',
        [decoded.id]
      );
    } catch (dbErr) {
      if (dbErr.message && dbErr.message.includes('token_version')) {
        userResult = await query(
          'SELECT id, name, username, email, role, created_at, updated_at FROM users WHERE id = $1',
          [decoded.id]
        );
      } else {
        throw dbErr;
      }
    }

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
      });
    }

    const dbUser = userResult.rows[0];

    // Session Invalidation: Reject tokens issued prior to password reset
    if (
      typeof decoded.tokenVersion === 'number' &&
      typeof dbUser.token_version === 'number' &&
      decoded.tokenVersion < dbUser.token_version
    ) {
      return res.status(401).json({
        success: false,
        message: 'Session invalidated due to password change. Please log in again.',
      });
    }

    // Attach user to req object (never including password_hash)
    req.user = dbUser;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired. Please log in again.',
      });
    }

    if (error.name === 'NotBeforeError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    // Anything else (DB unreachable, pool timeout, missing JWT_SECRET) is a
    // server problem, not a bad credential. Answering 401 here made clients
    // log every user out during a database blip; let errorHandler send 5xx.
    console.error('Auth middleware error:', error?.message || error);
    return next(error);
  }
};

module.exports = {
  authenticateToken,
};
