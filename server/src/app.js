const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const meldRoutes = require('./routes/meldRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1);
// Disable x-powered-by banner
app.disable('x-powered-by');

// 1. Helmet HTTP Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // Allowed for cross-origin API integration
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. Configure CORS
const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: function (origin, callback) {
    if (process.env.NODE_ENV === 'production') {
      const configuredOrigin = process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.replace(/\/$/, '') : null;
      if (!origin || origin === configuredOrigin || origin === allowedOrigin) {
        return callback(null, true);
      }
      // If they forgot to set it, log a warning but don't break the entire live site
      if (!configuredOrigin) {
        console.warn(`CORS Warning: CLIENT_ORIGIN is not set in production. Allowing origin: ${origin}`);
        return callback(null, true);
      }
      console.error(`CORS Blocked: ${origin} does not match ${configuredOrigin}`);
      return callback(new Error('Not allowed by CORS'));
    } else {
      return callback(null, true);
    }
  },
  credentials: true,
}));

// 3. Rate Limiting (General & Auth)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 25 login/register attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again after 15 minutes.' }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parser middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Register routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', meldRoutes);
app.use('/api/melds', chatRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

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
