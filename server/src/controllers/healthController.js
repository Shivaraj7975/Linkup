const { testConnection } = require('../config/db');

/**
 * Health check controller
 * GET /api/health
 */
const getHealthStatus = async (req, res) => {
  // Test DB connection quietly for diagnostics
  const dbStatus = await testConnection();

  return res.status(200).json({
    success: true,
    message: "Linkup API is running",
    database: dbStatus.connected ? "connected" : "disconnected"
  });
};

module.exports = {
  getHealthStatus,
};
