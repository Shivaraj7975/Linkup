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

// 1. Helmet HTTP Security Headers with explicit CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        process.env.CLIENT_ORIGIN || 'http://localhost:5173',
        'ws:',
        'wss:',
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. Configure CORS - Fail closed in production if CLIENT_ORIGIN is missing
const configuredOrigin = process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.replace(/\/$/, '') : null;
if (process.env.NODE_ENV === 'production' && !configuredOrigin) {
  console.error('FATAL SECURITY WARNING: CLIENT_ORIGIN is not configured in production. Rejecting untrusted origins.');
}

app.use(cors({
  origin: function (origin, callback) {
    if (process.env.NODE_ENV === 'production') {
      if (!configuredOrigin) {
        return callback(new Error('CORS blocked: CLIENT_ORIGIN environment variable is not configured on the server.'));
      }
      if (!origin || origin === configuredOrigin) {
        return callback(null, true);
      }
      console.error(`CORS Blocked: Origin ${origin} does not match configured origin ${configuredOrigin}`);
      return callback(new Error('Not allowed by CORS'));
    } else {
      return callback(null, true);
    }
  },
  credentials: true,
}));

// 3. Body parser middleware (must precede account-aware rate limiters)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 4. Endpoint-specific Rate Limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP + Account to 15 authentication attempts per 15 mins
  keyGenerator: (req) => {
    const account = (req.body?.identifier || req.body?.email || req.body?.username || '').trim().toLowerCase();
    return `${req.ip}_${account}`;
  },
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again after 15 minutes.' }
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 OTP generation/verification requests per 15 mins
  keyGenerator: (req) => {
    const account = (req.body?.identifier || req.body?.email || '').trim().toLowerCase();
    return `${req.ip}_${account}`;
  },
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests for this account. Please wait 15 minutes.' }
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 reset attempts per 15 mins
  keyGenerator: (req) => {
    const account = (req.body?.identifier || req.body?.email || '').trim().toLowerCase();
    return `${req.ip}_${account}`;
  },
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset attempts. Please wait 15 minutes.' }
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Max 60 user searches per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Search rate limit exceeded. Please slow down.' }
});

const aiMatchingLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // Max 30 AI matching calls per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'AI matching rate limit exceeded. Please wait a few minutes before generating more matches.' }
});

// Apply rate limiters
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/login-otp', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/send-otp', otpLimiter);
app.use('/api/auth/verify-otp', otpLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);
app.use('/api/users/search', searchLimiter);
app.use('/api/melds/:id/matches', aiMatchingLimiter);

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
