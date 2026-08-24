const express = require('express');
const router = express.Router();
const { register, login, getMe, sendOtp, verifyOtp } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

// Protected auth route
router.get('/me', authenticateToken, getMe);

module.exports = router;
