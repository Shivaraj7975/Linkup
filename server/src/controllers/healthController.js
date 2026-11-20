const { testConnection } = require('../config/db');

/**
 * Health check controller
 * GET /api/health
 */
const getHealthStatus = async (req, res) => {
  // Test DB connection quietly for diagnostics
  const dbStatus = await testConnection();

  // 503 when the database is unreachable so load balancers / Azure health
  // checks can take the instance out of rotation instead of seeing "healthy".
  return res.status(dbStatus.connected ? 200 : 503).json({
    success: dbStatus.connected,
    message: dbStatus.connected ? "Linkup API is running" : "Linkup API is running but the database is unreachable",
    database: dbStatus.connected ? "connected" : "disconnected"
  });
};

module.exports = {
  getHealthStatus,
};
