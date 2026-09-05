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

    const secret = process.env.NODE_ENV === 'production'
      ? process.env.JWT_SECRET
      : (process.env.JWT_SECRET || 'linkup_jwt_super_secret_key_2026_dev');
      
    if (!secret) {
      throw new Error('JWT_SECRET is required in production');
    }
    
    const decoded = jwt.verify(token, secret);

    // Fetch user from DB to ensure user still exists
    const userResult = await query(
      'SELECT id, name, username, email, role, created_at, updated_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
      });
    }

    // Attach user to req object (never including password_hash)
    req.user = userResult.rows[0];
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

    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed.',
    });
  }
};

module.exports = {
  authenticateToken,
};
