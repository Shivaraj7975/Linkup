const express = require('express');
const router = express.Router();
const { register, login, getMe, checkUsername, sendOtp, verifyOtp, resetPassword } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public auth routes
router.post('/register', register);
router.post('/login', login);
router.get('/check-username', checkUsername);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

// Protected auth route
router.get('/me', authenticateToken, getMe);

module.exports = router;
