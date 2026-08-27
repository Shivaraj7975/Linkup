require('dotenv').config();
const http = require('http');
const app = require('./app');
const { testConnection } = require('./config/db');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 5000;

// Create HTTP server manually to pass to Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

server.listen(PORT, async () => {
  console.log(`🚀 MELD API Server running on port ${PORT}`);
  console.log(`📡 Health Check URL: http://localhost:${PORT}/api/health`);

  // Startup check for PostgreSQL connection
  const dbCheck = await testConnection();
  if (dbCheck.connected) {
    console.log(`🐘 PostgreSQL connected successfully at ${dbCheck.timestamp}`);
  } else {
    console.log(`⚠️  PostgreSQL status: ${dbCheck.error} (Ensure database is running)`);
  }
});
