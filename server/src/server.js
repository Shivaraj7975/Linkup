require('dotenv').config();
const http = require('http');
const app = require('./app');
const { pool, testConnection } = require('./config/db');
const { initSocket, getIo } = require('./socket');

const PORT = process.env.PORT || 5000;
const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT_MS, 10) || 10000;

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

/**
 * Graceful shutdown: Azure App Service / containers send SIGTERM on restart and
 * deploy. Stop accepting connections, let in-flight requests finish, close
 * sockets and drain the pg pool, then exit. A hard timeout guarantees exit.
 */
let shuttingDown = false;
const shutdown = (signal, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`🛑 ${signal} received: shutting down gracefully...`);

  const forceExit = setTimeout(() => {
    console.error(`⚠️  Graceful shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms; forcing exit.`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  const closeHttp = new Promise((resolve) => {
    const io = getIo();
    // io.close() disconnects all sockets and also closes the attached HTTP server.
    if (io) io.close(() => resolve());
    else server.close(() => resolve());
    // Close idle keep-alive connections so server.close() can complete.
    if (typeof server.closeIdleConnections === 'function') server.closeIdleConnections();
  });

  closeHttp
    .then(() => pool.end())
    .then(() => {
      console.log('✅ Shutdown complete.');
      process.exit(exitCode);
    })
    .catch((err) => {
      console.error('Error during shutdown:', err?.message || err);
      process.exit(1);
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

