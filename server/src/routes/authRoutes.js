const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  loginWithOtp,
  getMe,
  checkUsername,
  sendOtp,
  verifyOtp,
  resetPassword,
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Compound key generator for multi-dimensional rate limiting (IP + Account/Email)
const compoundKey = (req) => {
  const account = (req.body?.identifier || req.body?.email || req.body?.username || '').trim().toLowerCase();
  return `${req.ip}_${account}`;
};

// Multi-dimensional rate limiters for auth & OTP operations
const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 6, // Limit each IP + Account to 6 OTP requests per 10 mins
  keyGenerator: compoundKey,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests. Please wait a few minutes before requesting another code.' },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 12, // Limit each IP + Account to 12 verification attempts per 10 mins
  keyGenerator: compoundKey,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification attempts. Please wait a few minutes before trying again.' },
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit password reset attempts to 5 per 15 mins
  keyGenerator: compoundKey,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset attempts. Please try again after 15 minutes.' },
});

// Public auth routes with dedicated protection
router.post('/register', register);
router.post('/login', login);
router.post('/login-otp', otpVerifyLimiter, loginWithOtp);
router.get('/check-username', checkUsername);
router.post('/send-otp', otpSendLimiter, sendOtp);
router.post('/verify-otp', otpVerifyLimiter, verifyOtp);
router.post('/reset-password', passwordResetLimiter, resetPassword);

// Protected auth route
router.get('/me', authenticateToken, getMe);

module.exports = router;
