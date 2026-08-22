require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/db');

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Linkup API Server running on port ${PORT}`);
  console.log(`📡 Health Check URL: http://localhost:${PORT}/api/health`);

  // Optional startup check for PostgreSQL connection
  const dbCheck = await testConnection();
  if (dbCheck.connected) {
    console.log(`🐘 PostgreSQL connected successfully at ${dbCheck.timestamp}`);
  } else {
    console.log(`⚠️  PostgreSQL status: ${dbCheck.error} (Ensure database is running)`);
  }
});
