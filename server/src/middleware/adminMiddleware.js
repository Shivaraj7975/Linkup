/**
 * Middleware ensuring current authenticated user has ADMIN role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied. Administrator privileges are required to perform this action.',
    });
  }
  next();
};

module.exports = {
  requireAdmin,
};
