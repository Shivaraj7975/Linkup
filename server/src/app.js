const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const linkupRoutes = require('./routes/linkupRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Configure CORS
const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origin === allowedOrigin || allowedOrigin === '*') {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', linkupRoutes);
app.use('/api/invitations', invitationRoutes);

// Root route welcome message
app.get('/', (req, res) => {
  res.json({
    name: 'Linkup API',
    version: '1.0.0',
    status: 'online',
    healthCheck: '/api/health',
  });
});

// Fallback 404 & Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
