const express = require('express');
const router = express.Router();
const { getMeldMessages } = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');

// Add a simple rate limiter for chat history requests
const rateLimit = require('express-rate-limit');
const chatHistoryLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per `window` (here, per minute)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests for chat history. Please try again later.',
  }
});

// All chat routes are protected
router.use(authenticateToken);

// GET /api/melds/:meldId/messages
router.get('/:meldId/messages', chatHistoryLimiter, getMeldMessages);

module.exports = router;
